# GitHub roadmap tracking

The canonical task list lives in [`docs/roadmap.json`](./roadmap.json).  
**GitHub Milestones and Issues** are the live execution tracker.

## Links

| View | URL |
|------|-----|
| **Milestones** | https://github.com/Graru1-Wolfy/Playground/milestones |
| **Roadmap issues** | https://github.com/Graru1-Wolfy/Playground/issues?q=label%3Aroadmap |
| **Projects** | https://github.com/Graru1-Wolfy/Playground/projects |

## Milestones (one per release)

| Milestone | Release |
|-----------|---------|
| v0.1.0 — Simulation foundation | Physics core + SDK audit |
| v0.2.0 — Fast analytical engine | `engine-fast` / bcheck math |
| v0.3.0 — Setup search & data pipeline | `engine-sim` + `.bin.gz` data |
| v0.4.0 — Validation (zlog) | Empirical 64-bit TF2 checks |
| v0.5.0 — Web MVP | `apps/web` hybrid checker |
| v1.0.0 — Full release | 0–6999 data + CI/CD |

Completed releases use a **closed** milestone; active work uses an **open** milestone.

## Issues

Each roadmap task becomes an issue:

- Title: `[0.5.5] Deploy to GitHub Pages`
- Labels: `roadmap`, `area:frontend` (etc.)
- Milestone: matching release
- Body contains `<!-- roadmap-id:0.5.5 -->` for sync idempotency

Filter open roadmap work:

```
is:open label:roadmap
```

## Sync script

After editing `docs/roadmap.json` or `ROADMAP.md` checkboxes:

```bash
python3 scripts/sync_roadmap_to_github.py
```

Dry run:

```bash
python3 scripts/sync_roadmap_to_github.py --dry-run
```

Requires `gh` authenticated as a user with issue/milestone permissions on the repo.

## GitHub Projects (board)

The Cloud Agent token cannot create Projects (`project` scope required). Set up once in the browser:

1. Open https://github.com/Graru1-Wolfy/Playground/projects
2. **New project** → Table or Board → name: **TF2 Bounce Checker Roadmap**
3. **Add items** → filter issues with label `roadmap`
4. Optional columns: **Status** (Todo / In progress / Done), **Milestone**, **Area** (from labels)
5. **Link repository** → `Graru1-Wolfy/Playground`

To enable CLI project management locally:

```bash
gh auth refresh -s project
gh project create --owner Graru1-Wolfy --title "TF2 Bounce Checker Roadmap"
```

Then add issues: `gh project item-add <project-number> --owner Graru1-Wolfy --url <issue-url>`

## Workflow

1. Pick work from the **current milestone** (see `currentTarget` in `roadmap.json`)
2. Implement on a feature branch → PR references issue (`Closes #12`)
3. Update `docs/roadmap.json` task `status` when done
4. Run `sync_roadmap_to_github.py` to close/sync issues
5. Update `ROADMAP.md` checkboxes for human-readable changelog

## Labels

| Label | Meaning |
|-------|---------|
| `roadmap` | Auto-synced from roadmap.json |
| `area:sim` | Simulation / tf2sim |
| `area:engine-fast` | Analytical engine |
| `area:engine-sim` | Setup search / generation |
| `area:frontend` | Web UI |
| `area:data` | Generated tables |
| `area:validation` | zlog / cross-checks |
| `area:infra` | CI / deploy |
| `backlog` | v1.x deferred items |
