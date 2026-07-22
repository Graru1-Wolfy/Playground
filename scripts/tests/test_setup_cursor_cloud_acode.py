#!/usr/bin/env python3
"""Integration tests for the Cursor Cloud Agent + Acode Termux script."""

import os
import pathlib
import subprocess
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "setup-cursor-cloud-acode.sh"


def run(command, *, cwd=None, env=None, check=True):
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"command failed ({result.returncode}): {command}\n{result.stdout}"
        )
    return result


class CursorCloudAcodeScriptTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp_dir.name)
        self.home = self.root / "home"
        self.home.mkdir()
        self.fake_bin = self.root / "bin"
        self.fake_bin.mkdir()
        self.open_log = self.root / "opened-url.txt"
        self.pkg_log = self.root / "pkg.txt"

        self._write_executable(
            "pkg",
            '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$PKG_LOG"\n',
        )
        self._write_executable(
            "termux-setup-storage",
            '#!/usr/bin/env bash\nmkdir -p "$HOME/storage/shared"\n',
        )
        self._write_executable(
            "termux-open-url",
            '#!/usr/bin/env bash\nprintf "%s\\n" "$1" > "$OPEN_LOG"\n',
        )

        self.env = os.environ.copy()
        self.env.update(
            {
                "HOME": str(self.home),
                "PREFIX": str(self.root / "termux-prefix"),
                "TERMUX_VERSION": "test",
                "PATH": f"{self.fake_bin}:{self.env['PATH']}",
                "OPEN_LOG": str(self.open_log),
                "PKG_LOG": str(self.pkg_log),
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_TERMINAL_PROMPT": "0",
            }
        )

        self.remote = self.root / "sample.git"
        self.seed = self.root / "seed"
        run(["git", "init", "--bare", str(self.remote)], env=self.env)
        run(["git", "init", str(self.seed)], env=self.env)
        run(["git", "config", "user.name", "Test User"], cwd=self.seed, env=self.env)
        run(
            ["git", "config", "user.email", "test@example.com"],
            cwd=self.seed,
            env=self.env,
        )
        (self.seed / "README.md").write_text("main\n", encoding="utf-8")
        run(["git", "add", "README.md"], cwd=self.seed, env=self.env)
        run(["git", "commit", "-m", "main"], cwd=self.seed, env=self.env)
        run(["git", "branch", "-M", "main"], cwd=self.seed, env=self.env)
        run(
            ["git", "remote", "add", "origin", str(self.remote)],
            cwd=self.seed,
            env=self.env,
        )
        run(["git", "push", "-u", "origin", "main"], cwd=self.seed, env=self.env)
        run(
            ["git", "symbolic-ref", "HEAD", "refs/heads/main"],
            cwd=self.remote,
            env=self.env,
        )
        run(
            ["git", "switch", "-c", "cursor/test-agent"],
            cwd=self.seed,
            env=self.env,
        )
        (self.seed / "agent.txt").write_text("agent v1\n", encoding="utf-8")
        run(["git", "add", "agent.txt"], cwd=self.seed, env=self.env)
        run(["git", "commit", "-m", "agent"], cwd=self.seed, env=self.env)
        run(
            ["git", "push", "-u", "origin", "cursor/test-agent"],
            cwd=self.seed,
            env=self.env,
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def _write_executable(self, name, contents):
        path = self.fake_bin / name
        path.write_text(contents, encoding="utf-8")
        path.chmod(0o755)

    def script(self, *args, env=None, check=True):
        return run(
            ["bash", str(SCRIPT), *map(str, args)],
            env=env or self.env,
            check=check,
        )

    def clone_agent_branch(self, workspace_name):
        workspace = self.root / workspace_name
        self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--branch",
            "cursor/test-agent",
            "--workspace",
            workspace,
            "--no-open",
        )
        return workspace / "sample"

    def test_help_works_outside_termux_and_lists_every_option(self):
        env = self.env.copy()
        env.pop("PREFIX")
        env.pop("TERMUX_VERSION")
        result = self.script("--help", env=env)
        for option in (
            "--repo",
            "--branch",
            "--agent-url",
            "--workspace",
            "--destination",
            "--no-open",
            "--non-interactive",
            "--verbose",
            "--help",
        ):
            self.assertIn(option, result.stdout)

    def test_rejects_non_termux_environment(self):
        env = self.env.copy()
        env.pop("PREFIX")
        env.pop("TERMUX_VERSION")
        result = self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--no-open",
            env=env,
            check=False,
        )
        self.assertNotEqual(0, result.returncode)
        self.assertIn("native Termux app", result.stdout)
        self.assertIn("Alpine", result.stdout)

    def test_fresh_clone_tracks_agent_branch_and_reruns(self):
        destination = self.clone_agent_branch("workspace")
        self.assertTrue((destination / "agent.txt").is_file())
        branch = run(
            ["git", "branch", "--show-current"], cwd=destination, env=self.env
        ).stdout.strip()
        self.assertEqual("cursor/test-agent", branch)

        rerun = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/test-agent",
            "--no-open",
        )
        self.assertIn("Using existing checkout", rerun.stdout)

    def test_fast_forwards_remote_update(self):
        destination = self.clone_agent_branch("fast-forward")
        (self.seed / "agent.txt").write_text("agent v2\n", encoding="utf-8")
        run(["git", "add", "agent.txt"], cwd=self.seed, env=self.env)
        run(["git", "commit", "-m", "agent v2"], cwd=self.seed, env=self.env)
        run(["git", "push"], cwd=self.seed, env=self.env)

        self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/test-agent",
            "--no-open",
        )
        self.assertEqual(
            "agent v2\n",
            (destination / "agent.txt").read_text(encoding="utf-8"),
        )

    def test_dirty_worktree_is_never_overwritten(self):
        destination = self.clone_agent_branch("dirty")
        (destination / "agent.txt").write_text("local edit\n", encoding="utf-8")

        result = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/test-agent",
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Local changes are present", result.stdout)
        self.assertEqual(
            "local edit\n",
            (destination / "agent.txt").read_text(encoding="utf-8"),
        )

    def test_ignored_file_collision_is_never_overwritten(self):
        destination = self.clone_agent_branch("ignored")
        (destination / ".git/info/exclude").write_text(
            "secret.env\n", encoding="utf-8"
        )
        local_secret = destination / "secret.env"
        local_secret.write_text("local secret\n", encoding="utf-8")

        (self.seed / "secret.env").write_text("remote content\n", encoding="utf-8")
        run(["git", "add", "-f", "secret.env"], cwd=self.seed, env=self.env)
        run(["git", "commit", "-m", "remote secret path"], cwd=self.seed, env=self.env)
        run(["git", "push"], cwd=self.seed, env=self.env)

        result = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/test-agent",
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, result.returncode)
        self.assertEqual(
            "local secret\n",
            local_secret.read_text(encoding="utf-8"),
        )

    def test_diverged_branch_is_never_rewritten(self):
        destination = self.clone_agent_branch("diverged")
        run(
            ["git", "config", "user.name", "Local User"],
            cwd=destination,
            env=self.env,
        )
        run(
            ["git", "config", "user.email", "local@example.com"],
            cwd=destination,
            env=self.env,
        )
        (destination / "local.txt").write_text("local\n", encoding="utf-8")
        run(["git", "add", "local.txt"], cwd=destination, env=self.env)
        run(["git", "commit", "-m", "local"], cwd=destination, env=self.env)
        local_head = run(
            ["git", "rev-parse", "HEAD"], cwd=destination, env=self.env
        ).stdout.strip()

        (self.seed / "remote.txt").write_text("remote\n", encoding="utf-8")
        run(["git", "add", "remote.txt"], cwd=self.seed, env=self.env)
        run(["git", "commit", "-m", "remote"], cwd=self.seed, env=self.env)
        run(["git", "push"], cwd=self.seed, env=self.env)

        result = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/test-agent",
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, result.returncode)
        self.assertEqual(
            local_head,
            run(["git", "rev-parse", "HEAD"], cwd=destination, env=self.env)
            .stdout.strip(),
        )
        self.assertTrue((destination / "local.txt").is_file())

    def test_missing_invalid_and_local_only_branches_fail(self):
        workspace = self.root / "branch-errors"
        self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--workspace",
            workspace,
            "--no-open",
        )
        destination = workspace / "sample"

        missing = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/not-there",
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, missing.returncode)
        self.assertIn("Branch was not found", missing.stdout)

        run(["git", "switch", "-c", "local-only"], cwd=destination, env=self.env)
        local_only = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "local-only",
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, local_only.returncode)
        self.assertIn("Branch was not found on origin", local_only.stdout)

        invalid = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "bad..branch",
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, invalid.returncode)
        self.assertIn("Invalid Git branch name", invalid.stdout)

    def test_existing_origin_mismatch_and_non_git_directory_fail(self):
        workspace = self.root / "conflicts"
        self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--workspace",
            workspace,
            "--no-open",
        )
        destination = workspace / "sample"
        mismatch = self.script(
            "--non-interactive",
            "--repo",
            self.root / "other.git",
            "--destination",
            destination,
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, mismatch.returncode)
        self.assertIn("Existing origin does not match", mismatch.stdout)

        occupied = self.root / "occupied"
        occupied.mkdir()
        (occupied / "keep.txt").write_text("keep\n", encoding="utf-8")
        conflict = self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--destination",
            occupied,
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, conflict.returncode)
        self.assertIn("not empty", conflict.stdout)
        self.assertEqual(
            "keep\n", (occupied / "keep.txt").read_text(encoding="utf-8")
        )

    def test_nonexistent_nested_checkout_destination_fails(self):
        workspace = self.root / "nested"
        self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--workspace",
            workspace,
            "--no-open",
        )
        destination = workspace / "sample"
        nested = destination / "not-created/child"

        result = self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--destination",
            nested,
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, result.returncode)
        self.assertIn("inside a larger Git checkout", result.stdout)
        self.assertFalse(nested.exists())

    def test_non_origin_upstream_is_replaced(self):
        destination = self.clone_agent_branch("upstream")
        run(
            ["git", "remote", "add", "other", str(self.remote)],
            cwd=destination,
            env=self.env,
        )
        run(["git", "fetch", "other"], cwd=destination, env=self.env)
        run(
            [
                "git",
                "branch",
                "--set-upstream-to",
                "other/cursor/test-agent",
                "cursor/test-agent",
            ],
            cwd=destination,
            env=self.env,
        )

        (self.seed / "agent.txt").write_text("origin only\n", encoding="utf-8")
        run(["git", "add", "agent.txt"], cwd=self.seed, env=self.env)
        run(["git", "commit", "-m", "origin update"], cwd=self.seed, env=self.env)
        run(["git", "push"], cwd=self.seed, env=self.env)

        result = self.script(
            "--non-interactive",
            "--destination",
            destination,
            "--branch",
            "cursor/test-agent",
            "--no-open",
        )
        self.assertIn("Replacing non-origin upstream", result.stdout)
        upstream = run(
            ["git", "rev-parse", "--abbrev-ref", "@{upstream}"],
            cwd=destination,
            env=self.env,
        ).stdout.strip()
        self.assertEqual("origin/cursor/test-agent", upstream)
        self.assertEqual(
            "origin only\n",
            (destination / "agent.txt").read_text(encoding="utf-8"),
        )

    def test_agent_url_is_validated_and_opened(self):
        workspace = self.root / "url"
        invalid = self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--workspace",
            workspace,
            "--agent-url",
            "https://cursor.com.evil.example/agents",
            check=False,
        )
        self.assertNotEqual(0, invalid.returncode)
        self.assertIn("must be an https://cursor.com/agents URL", invalid.stdout)
        self.assertFalse(self.open_log.exists())

        valid_url = (
            "https://cursor.com/agents?selectedBcId="
            "bc-00000000-0000-0000-0000-000000000000"
        )
        self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--workspace",
            workspace,
            "--agent-url",
            valid_url,
        )
        self.assertEqual(
            valid_url,
            self.open_log.read_text(encoding="utf-8").strip(),
        )

    def test_default_shared_workspace_requires_pregranted_permission(self):
        missing_permission = self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--no-open",
            check=False,
        )
        self.assertNotEqual(0, missing_permission.returncode)
        self.assertIn(
            "Shared-storage permission is not ready",
            missing_permission.stdout,
        )

        (self.home / "storage/shared").mkdir(parents=True)
        self.script(
            "--non-interactive",
            "--repo",
            self.remote,
            "--no-open",
        )
        destination = self.home / "storage/shared/Cursor_Space/sample"
        self.assertTrue((destination / ".git").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
