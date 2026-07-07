#!/usr/bin/env python3
"""Sync docs/roadmap.json to GitHub Milestones and Issues.

Creates one milestone per release and one issue per roadmap task.
Re-running is idempotent (matches issues by task id in body).

Usage:
  python3 scripts/sync_roadmap_to_github.py
  python3 scripts/sync_roadmap_to_github.py --dry-run

Requires: gh CLI authenticated with repo issue/milestone permissions.
GitHub Projects: create/link manually (see docs/github-roadmap.md) — token needs `project` scope.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = "Graru1-Wolfy/Playground"
ROADMAP_PATH = Path(__file__).resolve().parents[1] / "docs" / "roadmap.json"

RELEASE_TITLES = {
    "v0.1.0": "v0.1.0 — Simulation foundation",
    "v0.2.0": "v0.2.0 — Fast analytical engine",
    "v0.3.0": "v0.3.0 — Setup search & data pipeline",
    "v0.4.0": "v0.4.0 — Validation (zlog)",
    "v0.5.0": "v0.5.0 — Web MVP",
    "v1.0.0": "v1.0.0 — Full release",
}

AREA_LABELS = {
    "sim": "area:sim",
    "engine-fast": "area:engine-fast",
    "engine-sim": "area:engine-sim",
    "schema": "area:schema",
    "validation": "area:validation",
    "infra": "area:infra",
    "cli": "area:cli",
    "frontend": "area:frontend",
    "data": "area:data",
    "docs": "area:docs",
    "sourcemod": "area:sourcemod",
}


def run(cmd: list[str], *, dry_run: bool = False) -> str:
    if dry_run:
        print("DRY:", " ".join(cmd))
        return ""
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd)}\n{result.stderr}")
    return result.stdout.strip()


def gh_api(endpoint: str, *, method: str = "GET", fields: dict[str, str] | None = None, dry_run: bool = False):
    cmd = ["gh", "api", endpoint]
    if method != "GET":
        cmd.extend(["-X", method])
    for k, v in (fields or {}).items():
        cmd.extend(["-f", f"{k}={v}"])
    out = run(cmd, dry_run=dry_run)
    if dry_run or not out:
        return None
    return json.loads(out)


def gh_cmd(cmd: list[str], *, dry_run: bool = False):
    out = run(["gh"] + cmd + ["--repo", REPO], dry_run=dry_run)
    if dry_run or not out:
        return None
    return json.loads(out)


def ensure_label(name: str, color: str = "ededed", *, dry_run: bool) -> None:
    labels = gh_cmd(["label", "list", "--limit", "200", "--json", "name"], dry_run=dry_run)
    if dry_run or labels is None:
        return
    if any(l["name"] == name for l in labels):
        return
    run(["gh", "label", "create", name, "--color", color, "--repo", REPO], dry_run=dry_run)


def get_milestones(*, dry_run: bool) -> dict[str, dict]:
    if dry_run:
        return {}
    proc = subprocess.run(
        [
            "gh",
            "api",
            f"repos/{REPO}/milestones?state=all&per_page=100",
            "--paginate",
            "--slurp",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(proc.stdout)
    if data and isinstance(data[0], list):
        data = data[0]
    return {m["title"]: m for m in data}


def ensure_milestone(title: str, description: str, *, dry_run: bool) -> None:
    """Ensure milestone exists and is open (gh cannot assign issues to closed milestones)."""
    existing = get_milestones(dry_run=dry_run)
    if title in existing:
        m = existing[title]
        if m["state"] != "open" and not dry_run:
            gh_api(f"repos/{REPO}/milestones/{m['number']}", method="PATCH", fields={"state": "open"})
        return
    gh_api(
        f"repos/{REPO}/milestones",
        method="POST",
        fields={"title": title, "description": description, "state": "open"},
        dry_run=dry_run,
    )


def finalize_milestones(releases: list[dict], *, dry_run: bool) -> None:
    """Close milestones for completed releases after issues are synced."""
    if dry_run:
        return
    existing = get_milestones(dry_run=False)
    for release in releases:
        if release.get("status") not in {"complete", "done"}:
            continue
        title = RELEASE_TITLES[release["version"]]
        m = existing.get(title) or get_milestones(dry_run=False).get(title)
        if m and m["state"] == "open":
            gh_api(f"repos/{REPO}/milestones/{m['number']}", method="PATCH", fields={"state": "closed"})


def list_roadmap_issues(*, dry_run: bool) -> dict[str, int]:
    if dry_run:
        return {}
    issues = gh_cmd(
        ["issue", "list", "--label", "roadmap", "--limit", "500", "--json", "number,body,state"],
        dry_run=False,
    )
    mapping: dict[str, int] = {}
    for issue in issues or []:
        match = re.search(r"<!-- roadmap-id:([^ ]+) -->", issue.get("body") or "")
        if match:
            mapping[match.group(1)] = issue["number"]
    return mapping


def issue_body(task_id: str, release: str, area: str, status: str) -> str:
    return f"""<!-- roadmap-id:{task_id} -->

**Roadmap task:** `{task_id}`  
**Release:** {release}  
**Area:** {area}  
**Status in roadmap.json:** {status}

Tracked in [docs/roadmap.json](../blob/main/docs/roadmap.json) and [ROADMAP.md](../blob/main/ROADMAP.md).

Milestones: https://github.com/{REPO}/milestones
"""


def sync_issue(
    task: dict,
    release_version: str,
    milestone_title: str,
    *,
    dry_run: bool,
    existing: dict[str, int],
) -> None:
    task_id = task["id"]
    title = f"[{task_id}] {task['title']}"
    area = task.get("area", "infra")
    status = task.get("status", "todo")
    labels = ["roadmap", AREA_LABELS.get(area, "area:infra")]
    if status == "backlog":
        labels.append("backlog")

    body = issue_body(task_id, release_version, area, status)
    should_close = status in {"done", "complete"}

    if task_id in existing:
        num = existing[task_id]
        if should_close and not dry_run:
            issue = gh_cmd(["issue", "view", str(num), "--json", "state"], dry_run=False)
            if issue and issue.get("state") == "OPEN":
                run(["gh", "issue", "close", str(num), "--repo", REPO, "--comment", "Completed per roadmap.json"], dry_run=dry_run)
        return

    cmd = [
        "gh",
        "issue",
        "create",
        "--repo",
        REPO,
        "--title",
        title,
        "--body",
        body,
        "--milestone",
        milestone_title,
    ]
    for label in labels:
        cmd.extend(["--label", label])

    if should_close:
        # Create open then close so it appears in milestone history
        if not dry_run:
            out = run(cmd, dry_run=False)
            match = re.search(r"/issues/(\d+)", out)
            if match:
                run(["gh", "issue", "close", match.group(1), "--repo", REPO], dry_run=False)
        else:
            run(cmd + ["# then close"], dry_run=True)
    else:
        run(cmd, dry_run=dry_run)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync roadmap.json to GitHub milestones/issues")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    roadmap = json.loads(ROADMAP_PATH.read_text())
    dry_run = args.dry_run

    run(["gh", "auth", "status"], dry_run=dry_run)

    ensure_label("roadmap", "1d76db", dry_run=dry_run)
    ensure_label("backlog", "fef2c0", dry_run=dry_run)
    for label in AREA_LABELS.values():
        ensure_label(label, dry_run=dry_run)

    existing_issues = list_roadmap_issues(dry_run=dry_run)

    for release in roadmap["releases"]:
        version = release["version"]
        milestone_title = RELEASE_TITLES[version]
        codename = release.get("codename", "")
        desc = f"{codename} — see ROADMAP.md" if codename else "TF2 Bounce Checker release"
        ensure_milestone(milestone_title, desc, dry_run=dry_run)

        for task in release.get("tasks", []):
            sync_issue(task, version, milestone_title, dry_run=dry_run, existing=existing_issues)

        for task in release.get("backlog", []):
            sync_issue(task, version, milestone_title, dry_run=dry_run, existing=existing_issues)

    finalize_milestones(roadmap["releases"], dry_run=dry_run)

    print("Sync complete.")
    print(f"Milestones: https://github.com/{REPO}/milestones")
    print(f"Issues:     https://github.com/{REPO}/issues?q=label%3Aroadmap")
    print("Projects:   https://github.com/Graru1-Wolfy/Playground/projects (create board — see docs/github-roadmap.md)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
