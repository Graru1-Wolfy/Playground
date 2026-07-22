# Cursor Cloud Agents + Acode on Android

Use Cursor Cloud Agents from an Android browser, edit the same repository in
Acode, and synchronize both sides through Git:

```text
Cursor Cloud Agent ↔ hosted Git repository ↔ native Termux checkout ↔ Acode
```

This workflow does **not** install Cursor in Acode or on Android. It also does
not require NetHunter, Ubuntu PRoot, Termux:X11, AcodeX, or a second computer.

The repository includes one setup and synchronization script:

- [Download `setup-cursor-cloud-acode.sh`](../scripts/setup-cursor-cloud-acode.sh)
- [Direct raw download](https://raw.githubusercontent.com/Graru1-Wolfy/Playground/main/scripts/setup-cursor-cloud-acode.sh)

## Requirements

- Android with [Termux](https://github.com/termux/termux-app) from F-Droid or
  the official GitHub releases.
- [Acode](https://acode.app/) for editing. Its F-Droid build is the practical
  choice when Android shared-storage access is required.
- A Git repository connected to
  [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent).
- The repository clone URL and, when an agent already created one, its exact
  branch name.
- Git-host authentication in Termux. SSH is recommended for repeated pushes.

Run the script in the **native Termux app**, where packages use `pkg`. Acode's
built-in terminal is an Alpine PRoot environment and uses `apk`; it is not
Termux.

> [!IMPORTANT]
> Install Termux and all Termux plugins from the same source family. Their
> signatures must match. This workflow does not require the Termux:API Android
> app.

## Storage choice

The default parent folder is:

```text
~/storage/shared/Cursor_Space
```

That makes the checkout visible in Android's file picker and Acode as:

```text
Internal storage/Cursor_Space/<repository>
```

Android shared storage does not provide normal Unix permissions, executable
bits, or symlink behavior. It is suitable for ordinary source editing, but
some build tools and repositories will not work correctly there.

For a Unix-capable private checkout, use:

```bash
--workspace "$HOME/Cursor_Space"
```

Acode may need AcodeX or a storage-provider path to reach a private Termux
folder. Regardless of workspace location, keep SSH private keys, tokens,
`.env` files, and other credentials under Termux's private `$HOME`; never put
them in shared storage or commit them.

## Recommended: download, inspect, then run

Run these commands in native Termux:

```bash
pkg install -y curl
curl -fsSLo "$HOME/setup-cursor-cloud-acode.sh" \
  "https://raw.githubusercontent.com/Graru1-Wolfy/Playground/main/scripts/setup-cursor-cloud-acode.sh"
less "$HOME/setup-cursor-cloud-acode.sh"
chmod 700 "$HOME/setup-cursor-cloud-acode.sh"
"$HOME/setup-cursor-cloud-acode.sh"
```

The interactive prompts request:

1. The Git clone URL.
2. The Cloud Agent branch, if one already exists.
3. The Cursor Cloud Agent URL, if it should open automatically.

The script requests Android storage permission on first use, installs only
missing Termux command packages, clones or updates the repository, checks out
the selected remote branch, and opens the validated Cursor URL.

## Non-interactive example

Replace all placeholders with values from your Git provider and Cursor:

```bash
"$HOME/setup-cursor-cloud-acode.sh" \
  --non-interactive \
  --repo "git@github.com:OWNER/REPOSITORY.git" \
  --branch "cursor/AGENT-BRANCH" \
  --agent-url "https://cursor.com/agents?selectedBcId=AGENT_ID"
```

The agent URL is optional. The script only opens HTTPS URLs on
`cursor.com/agents`; it will not open an arbitrary supplied site.

### One-line convenience command

Inspect-before-run is safer. If you have reviewed the repository version and
accept that `main` can change, the equivalent one-line command is:

<!-- markdownlint-disable MD013 -->

```bash
curl -fsSL \
  "https://raw.githubusercontent.com/Graru1-Wolfy/Playground/main/scripts/setup-cursor-cloud-acode.sh" \
  | bash -s -- \
      --non-interactive \
      --repo "git@github.com:OWNER/REPOSITORY.git" \
      --branch "cursor/AGENT-BRANCH" \
      --agent-url "https://cursor.com/agents?selectedBcId=AGENT_ID"
```

<!-- markdownlint-enable MD013 -->

For reproducible automation, replace `main` in the raw URL with a reviewed
commit SHA.

## Options

<!-- markdownlint-disable MD013 -->

| Option | Purpose |
| ------ | ------- |
| `--repo URL` | Git clone URL. Required for a new checkout. |
| `--branch NAME` | Local/remote Cloud Agent branch to track. |
| `--agent-url URL` | Cursor Cloud Agent URL to open after synchronization. |
| `--workspace PATH` | Repository parent; defaults to `~/storage/shared/Cursor_Space`. |
| `--destination PATH` | Exact checkout directory. Reuses its `origin` when it already exists. |
| `--no-open` | Do not open the Cloud Agent URL. |
| `--non-interactive` | Disable prompts. |
| `--verbose` | Print Git commands and extra status. |
| `-h`, `--help` | Show built-in help. |

<!-- markdownlint-enable MD013 -->

When `--branch` is omitted, the clone's default branch or the existing
checkout's current branch remains active.

## Safety behavior

The script is intentionally conservative:

- It fetches from `origin` and pulls with `--ff-only`.
- It never resets, force-pulls, auto-stashes, commits, pushes, or deletes work.
- It stops when local changes could be overwritten or switched away from.
- It refuses a non-empty destination that is not a Git checkout.
- It refuses to reuse a checkout when its `origin` differs from `--repo`.
- It validates branch syntax and confirms the branch exists before switching.
- It accepts only a Cursor Agents URL for automatic browser opening.

If synchronization stops, read the reported Git status and resolve it
manually. Do not bypass the check with a hard reset unless you intend to
discard the listed work.

## Open the project in Acode

After the script finishes:

1. Open Acode.
2. Choose **Open folder** or **Add path**.
3. Select **Internal storage → Cursor_Space → `<repository>`**.
4. Edit and save files in Acode.
5. Return to native Termux for Git commands.

AcodeX is optional. It is useful only when you want an Acode terminal connected
to Termux. It is not the connection to Cursor Cloud Agents; Git is.

## Daily synchronization loop

### Bring Cloud Agent work to Android

Copy the exact branch name from Cursor, then rerun:

```bash
"$HOME/setup-cursor-cloud-acode.sh" \
  --destination "$HOME/storage/shared/Cursor_Space/REPOSITORY" \
  --branch "cursor/AGENT-BRANCH" \
  --agent-url "https://cursor.com/agents?selectedBcId=AGENT_ID"
```

An existing `--destination` reuses its configured `origin`, so `--repo` is not
required.

### Review local state

```bash
cd "$HOME/storage/shared/Cursor_Space/REPOSITORY"
git status
git diff
git log --oneline --decorate -10
```

Run the repository's documented tests before accepting or merging agent work.
Cloud Agents execute repository instructions and have read-write repository
access, so review their diffs and test evidence.

### Send Acode edits to the Git remote

The setup script never commits or pushes for you:

```bash
git status
git diff
git add <reviewed-files>
git commit -m "Describe the change"
git push
```

The Cloud Agent can see the pushed commit after its branch or task refreshes.
Avoid editing the same lines concurrently on Android and in the Cloud Agent.

## Git authentication

For GitHub over SSH, create a key only if one does not already exist:

```bash
pkg install -y openssh
test -f "$HOME/.ssh/id_ed25519" || \
  ssh-keygen -t ed25519 -a 100 -C "termux-android"
cat "$HOME/.ssh/id_ed25519.pub"
```

Add only the displayed `.pub` key to your Git provider. Never share
`~/.ssh/id_ed25519`, the private key. Compare the first-connection host
fingerprint with the provider's published fingerprint before accepting it.

Test GitHub with:

```bash
ssh -T git@github.com
```

Use the corresponding official host and instructions for another provider.

## Troubleshooting

### “This script must run in the native Termux app”

You ran it in Acode's Alpine terminal or another shell. Open the Termux Android
app and rerun it. An AcodeX terminal is acceptable only when it is actually
connected to native Termux.

### Shared storage is not ready

Run in Termux:

```bash
termux-setup-storage
```

Approve Android's permission prompt, confirm `~/storage/shared` exists, and
rerun the script. If Termux has no storage permission in Android Settings,
grant it there first.

### Git authentication failed

Test the clone URL directly:

```bash
git ls-remote "git@github.com:OWNER/REPOSITORY.git"
```

For SSH, confirm the public key is registered and the host fingerprint is
correct. For HTTPS, use the Git provider's supported credential flow; do not
place access tokens in the script command or shared storage.

### Branch was not found

Copy the exact branch from Cursor or the Git provider. Fetch and inspect remote
branches:

```bash
git fetch origin --prune
git branch --remotes
```

Then rerun with the full branch name after `origin/`, without the `origin/`
prefix.

### Local changes are present

The script stopped to preserve Acode edits. Review them:

```bash
git status
git diff
```

Commit the work, or stash it manually if that is appropriate, then rerun.

### Shared-storage build errors

Move the checkout to private Termux storage:

```bash
"$HOME/setup-cursor-cloud-acode.sh" \
  --repo "git@github.com:OWNER/REPOSITORY.git" \
  --workspace "$HOME/Cursor_Space" \
  --branch "cursor/AGENT-BRANCH"
```

Use AcodeX or Acode's storage-provider access if Acode must edit that private
folder.

### The Cloud Agent page did not open

Open the supplied URL manually in Chrome, or verify:

```bash
command -v termux-open-url
```

The script installs `termux-tools` when this command is missing.

## Security notes

- Grant Cloud Agents access only to repositories they need.
- Keep credentials in Cursor Runtime or Build Secrets, not in Git.
- Treat repository files, issues, dependencies, and generated content as
  potentially untrusted prompt input.
- Restrict Cloud Agent network egress when the project permits it.
- Review changes and test before merging.
- Revoke device keys, Git sessions, Cursor sessions, and stored secrets if the
  Android device is lost.

## First-party references

- [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent)
- [Cursor mobile access](https://cursor.com/docs/cloud-agent/mobile)
- [Cursor Cloud Agent security](https://cursor.com/docs/cloud-agent/security)
- [Cursor network and secrets controls](https://cursor.com/docs/cloud-agent/security-network)
- [Termux app](https://github.com/termux/termux-app)
- [Termux execution environment](https://github.com/termux/termux-packages/wiki/Termux-execution-environment)
- [Acode terminal guide](https://docs.acode.app/user-guide/terminal)
- [AcodeX community plugin](https://github.com/bajrangCoder/acode-plugin-acodex)

Last reviewed: **2026-07-22**
