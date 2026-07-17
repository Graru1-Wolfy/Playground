# Termux + Cursor on Android

A guided setup for using Termux with Cursor, from the easiest supported workflow to an experimental full desktop on Android.

> [!IMPORTANT]
> Cursor does not currently ship a native Android IDE. Native Termux uses Android's **bionic** C library, while Cursor's Linux desktop, CLI, and remote server expect a conventional Linux environment. Do not run random “Cursor for Termux,” “free VIP,” or cracked installer scripts.

## Choose your setup

| Route | What you get | Needs another computer? | Status | Typical space |
|---|---|---:|---|---:|
| [1. Termux + Cursor Web](#route-1-termux--cursor-web) | Local terminal and Git on Android; Cursor Cloud Agents in Chrome | No | Recommended Android-only route | 0.5–2 GB |
| [2. Cursor Desktop + Remote SSH](#route-2-cursor-desktop--remote-ssh) | Full Cursor IDE on a computer; code and tools run in Ubuntu on Android | Yes | Recommended full-IDE route; Android host is unofficial | 2–4 GB |
| [3. Cursor Desktop in Termux:X11](#route-3-cursor-desktop-in-termuxx11) | Full Linux Cursor window directly on Android | No | Experimental and unsupported | 6+ GB |

**Use Route 1** if you only have an Android device. **Use Route 2** if you have a laptop or desktop that can run Cursor. Try Route 3 only if you accept reduced security, higher battery use, and possible breakage after updates.

## Before you begin

You need:

- Android 7 or newer.
- A Cursor account.
- A Git repository hosted by a provider supported by Cursor, such as GitHub or GitLab.
- A reliable network connection.
- For Route 2: a computer with Cursor Desktop and an SSH client.
- For Route 3: an ARM64 or x64 Android device; at least 6 GB RAM is recommended.

### Install Termux from an official source

Install Termux from one of these sources:

- [Termux on F-Droid](https://f-droid.org/en/packages/com.termux/)
- [Official Termux GitHub releases](https://github.com/termux/termux-app/releases)

Do not mix F-Droid and GitHub builds of Termux or its plugins. They use different signing keys. If you switch sources, uninstall all Termux apps and plugins from the old source first.

### Bootstrap Termux

**Run in native Termux:**

```bash
pkg update
pkg upgrade -y
pkg install -y git openssh curl nano
mkdir -p "$HOME/projects"
```

Keep repositories under `~/projects`. Android shared storage, such as `/sdcard`, does not reliably support executable bits, symlinks, or Unix permissions.

Shared storage access is optional. Request it only if you need to exchange ordinary files with Android apps:

**Run in native Termux:**

```bash
termux-setup-storage
```

Approve the Android permission prompt. Continue to keep Git repositories under `$HOME`.

### Checkpoint: Termux is ready

**Run in native Termux:**

```bash
printf 'Architecture: '; uname -m
printf 'Home: '; printf '%s\n' "$HOME"
git --version
ssh -V
df -h "$HOME"
```

Expected results:

- Architecture is usually `aarch64`.
- Home starts with `/data/data/com.termux/files/home`.
- Git and OpenSSH print version information.
- Available storage is sufficient for your chosen route.

---

## Route 1: Termux + Cursor Web

This route uses Termux for local commands and Git. Cursor Cloud Agents work on the hosted repository, and you exchange changes through Git. Cursor code execution does **not** happen inside native Termux in this setup.

### Step 1: Configure Git

Replace the example name and email with your own.

**Run in native Termux:**

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

Verify:

**Run in native Termux:**

```bash
git config --global --list
```

### Step 2: Authenticate with your Git host

SSH keys avoid storing a source-control password in Termux.

**Run in native Termux:**

```bash
ssh-keygen -t ed25519 -a 100 -C "termux-android"
```

Press Enter to accept `~/.ssh/id_ed25519`. Set a passphrase when prompted.

Display the **public** key:

**Run in native Termux:**

```bash
cat "$HOME/.ssh/id_ed25519.pub"
```

Copy the single output line into your Git provider:

- GitHub: **Settings → SSH and GPG keys → New SSH key**
- GitLab: **Preferences → SSH Keys → Add new key**

Never share or upload `~/.ssh/id_ed25519`; that file is the private key.

Test GitHub:

**Run in native Termux:**

```bash
ssh -T git@github.com
```

For GitLab, use `ssh -T git@gitlab.com`. Confirm the host fingerprint only after comparing it with your provider's published fingerprint.

### Step 3: Clone your repository

Replace `<repo-url>` with the SSH clone URL shown by your Git provider.

**Run in native Termux:**

```bash
cd "$HOME/projects"
git clone <repo-url>
cd <repository-name>
git status
```

The final command should show a clean working tree.

### Step 4: Open Cursor Web on Android

1. Open [cursor.com/agents](https://cursor.com/agents) in Chrome.
2. Sign in to Cursor.
3. Connect your GitHub, GitLab, Bitbucket, or Azure DevOps account when prompted.
4. Select the repository you cloned in Termux.
5. Optional: Chrome menu → **Install app** to add Cursor Web to your home screen.

Cloud Agents may require an eligible Cursor plan and administrator approval for a team account.

### Step 5: Run a small first task

Start with a reviewable change, for example:

> Add a short “Local development” section to the README. Do not change application code. Validate Markdown formatting.

Wait for the agent to finish, then review its diff, test evidence, branch, and pull request before accepting anything.

### Step 6: Bring the agent branch into Termux

Copy the exact branch name from Cursor or the pull request.

**Run in native Termux, inside the repository:**

```bash
git fetch origin
git switch --track origin/<agent-branch>
git status
```

If the branch already exists locally:

**Run in native Termux:**

```bash
git switch <agent-branch>
git pull --ff-only
```

Run the test command documented by the repository. Common examples are:

```bash
npm test
pytest
cargo test
go test ./...
```

Use only the command appropriate for your project.

### Route 1 checkpoint

You are done when:

- Git authentication works in Termux.
- The same repository appears in Cursor Web.
- A Cloud Agent branch can be fetched in Termux.
- The repository's documented test command passes.

---

## Route 2: Cursor Desktop + Remote SSH

Cursor Desktop runs on your computer. Android hosts the repository and development tools inside an Ubuntu `proot-distro`.

> [!NOTE]
> Do not connect Cursor directly to native Termux on port 8022. Cursor Server may fail because Termux uses bionic rather than glibc. This route creates an Ubuntu SSH server on port `10022`.

### Step 1: Create the Ubuntu environment

**Run in native Termux:**

```bash
pkg install -y proot-distro
proot-distro install ubuntu
proot-distro login --isolated ubuntu
```

The prompt is now inside Ubuntu as its proot root user.

### Step 2: Install development and SSH packages

**Run inside Ubuntu proot as root:**

```bash
apt update
apt upgrade -y
apt install -y openssh-server git curl ca-certificates build-essential python3 sudo
```

Create a non-root development user:

**Run inside Ubuntu proot as root:**

```bash
id -u dev >/dev/null 2>&1 || useradd --create-home --shell /bin/bash dev
usermod -aG sudo dev
passwd dev
```

Set a strong temporary password when prompted. SSH password login will be disabled after key setup, but an unlocked account avoids OpenSSH account-lock issues and lets `sudo` prompt normally.

### Step 3: Create an SSH key on the Cursor computer

Skip key generation if the computer already has an ED25519 key you want to use.

**Run on the computer that runs Cursor Desktop:**

```bash
ssh-keygen -t ed25519 -a 100 -C "cursor-to-android"
cat "$HOME/.ssh/id_ed25519.pub"
```

On Windows PowerShell, display the public key with:

```powershell
Get-Content "$HOME\.ssh\id_ed25519.pub"
```

Copy the complete public-key line. Do not copy or expose the file without `.pub`.

### Step 4: Authorize the computer key in Ubuntu

**Run inside Ubuntu proot as root:**

```bash
install -d -m 700 -o dev -g dev /home/dev/.ssh
nano /home/dev/.ssh/authorized_keys
```

Paste the public-key line, save with `Ctrl+O`, Enter, then exit with `Ctrl+X`.

Set ownership and permissions:

**Run inside Ubuntu proot as root:**

```bash
chown dev:dev /home/dev/.ssh/authorized_keys
chmod 600 /home/dev/.ssh/authorized_keys
ssh-keygen -A
install -d -m 755 /run/sshd
```

### Step 5: Configure the Ubuntu SSH server

**Run inside Ubuntu proot as root:**

```bash
cat > /etc/ssh/sshd_config.d/termux-cursor.conf <<'EOF'
Port 10022
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers dev
EOF

/usr/sbin/sshd -t
```

No output from `sshd -t` means the configuration is valid.

### Step 6: Start SSH

Keep this Termux/proot session open. Android or PRoot may stop the server when the session ends.

**Run inside Ubuntu proot as root:**

```bash
/usr/sbin/sshd -D -e
```

This command intentionally stays in the foreground. Use a second Termux session for other phone-side commands.

For better reliability:

1. Run `termux-wake-lock` in a native Termux session.
2. Set Android **Settings → Apps → Termux → Battery** to **Unrestricted** or the closest vendor-specific option.
3. Keep the Termux notification/session active.

Android can still reclaim the process under memory pressure.

### Step 7: Choose a connection path

#### Same Wi-Fi

Find the phone's IP in Android **Settings → Wi-Fi → current network details**. The computer and phone must be on the same network, and client isolation must be off.

**Run on the Cursor computer:**

```bash
ssh -p 10022 dev@<android-ip>
```

#### USB with ADB

Enable Android Developer Options and USB debugging, connect the phone, then:

**Run on the Cursor computer:**

```bash
adb devices
adb forward tcp:10022 tcp:10022
ssh -p 10022 dev@127.0.0.1
```

#### Tailscale

Install Tailscale from its official Android and desktop sources, sign in to the same tailnet, and use the phone's Tailscale IP:

```bash
ssh -p 10022 dev@<tailscale-ip>
```

Do not expose port `10022` through public router port-forwarding. Use same-LAN, USB, or an authenticated private network.

### Step 8: Verify that SSH reaches Ubuntu

After connecting from the computer:

**Run in the remote SSH shell:**

```bash
whoami
cat /etc/os-release
getconf GNU_LIBC_VERSION
printf '%s\n' "$HOME"
```

Expected:

- User: `dev`
- OS: Ubuntu
- C library: `glibc 2.x`
- Home: `/home/dev`

If `getconf` is missing or reports Android/Termux paths, stop. Cursor is reaching native Termux instead of Ubuntu proot.

### Step 9: Add the SSH host to the computer

Edit `~/.ssh/config` on the Cursor computer:

```sshconfig
Host termux-ubuntu
    HostName <android-ip-or-tailscale-ip>
    User dev
    Port 10022
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

For USB forwarding, use `HostName 127.0.0.1`.

Test before opening Cursor:

**Run on the Cursor computer:**

```bash
ssh termux-ubuntu
```

### Step 10: Connect Cursor Desktop

1. Install Cursor from [cursor.com/downloads](https://cursor.com/downloads) on the computer and sign in.
2. Open Extensions and search for `@id:anysphere.remote-ssh`.
3. Install **Anysphere Remote SSH** if it is not already present.
4. Open the Command Palette.
5. Run **Remote-SSH: Connect to Host…**.
6. Choose `termux-ubuntu`.
7. When the remote window opens, choose **Open Folder** and open `/home/dev/projects`.

Cursor may take a few minutes to install its ARM64 or x64 server on the first connection.

### Step 11: Run an end-to-end smoke test

**Run in Cursor's remote integrated terminal:**

```bash
mkdir -p "$HOME/projects/cursor-smoke-test"
cd "$HOME/projects/cursor-smoke-test"
git init
printf 'print("Cursor + Termux works")\n' > hello.py
python3 hello.py
git status --short
```

Expected output includes:

```text
Cursor + Termux works
?? hello.py
```

Open `hello.py` in the editor, change the message, save it, and rerun `python3 hello.py`. This proves the editor, remote filesystem, and terminal all target Ubuntu on Android.

### Route 2 checkpoint

You are done when:

- Plain `ssh termux-ubuntu` works without a password.
- The remote shell reports Ubuntu and glibc.
- Cursor opens `/home/dev/projects`.
- Editing a file changes the output in Cursor's remote terminal.

---

## Route 3: Cursor Desktop in Termux:X11

> [!WARNING]
> This is an experimental, unsupported Android configuration. It runs a desktop Electron application under PRoot and will usually require `--no-sandbox`. That flag disables Chromium's process sandbox and weakens isolation. Use only trusted repositories and extensions. Prefer Route 1 or 2 for sensitive work.

Expect high memory use, heat, battery drain, imperfect touch controls, and occasional breakage after Cursor, Android, or Termux updates. A physical keyboard and mouse are strongly recommended.

### Step 1: Confirm a supported package architecture

**Run in native Termux:**

```bash
uname -m
```

Continue if the result is `aarch64` or `x86_64`. On most phones it is `aarch64`, which maps to Debian's `arm64`. Stop and use Route 1 if the device reports a different architecture.

### Step 2: Install Termux:X11 from official sources

1. Download the matching Android APK from the [official Termux:X11 releases](https://github.com/termux/termux-x11/releases).
2. Install it alongside Termux from the same source family.
3. Install the X11 packages:

**Run in native Termux:**

```bash
pkg install -y x11-repo
pkg install -y termux-x11-nightly pulseaudio proot-distro
```

### Step 3: Install Ubuntu

Skip installation if Route 2 already created the `ubuntu` distro.

**Run in native Termux:**

```bash
proot-distro install ubuntu
proot-distro login --shared-tmp ubuntu
```

### Step 4: Install XFCE and Cursor's prerequisites

**Run inside Ubuntu proot as root:**

```bash
apt update
apt upgrade -y
DEBIAN_FRONTEND=noninteractive apt install -y \
  xfce4 dbus-x11 sudo curl ca-certificates gnupg git
```

Create the desktop user if needed:

**Run inside Ubuntu proot as root:**

```bash
id -u dev >/dev/null 2>&1 || useradd --create-home --shell /bin/bash dev
usermod -aG sudo dev
passwd dev
install -d -m 700 -o dev -g dev /tmp/runtime-dev
```

### Step 5: Add Cursor's official APT repository

Check the package architecture:

**Run inside Ubuntu proot as root:**

```bash
dpkg --print-architecture
```

Continue only for `arm64` or `amd64`.

**Run inside Ubuntu proot as root:**

```bash
install -d -m 755 /etc/apt/keyrings
curl -fsSL https://downloads.cursor.com/keys/anysphere.asc \
  | gpg --dearmor --yes -o /etc/apt/keyrings/cursor.gpg

cat > /etc/apt/sources.list.d/cursor.list <<'EOF'
deb [arch=amd64,arm64 signed-by=/etc/apt/keyrings/cursor.gpg] https://downloads.cursor.com/aptrepo stable main
EOF

apt update
apt install -y cursor
cursor --version
```

These commands use Cursor's official repository. Do not substitute a third-party installer or prebuilt Ubuntu image.

### Step 6: Start Termux:X11 manually

Exit Ubuntu to return to native Termux:

**Run inside Ubuntu proot:**

```bash
exit
```

Start the X server:

**Run in native Termux:**

```bash
termux-wake-lock
export XDG_RUNTIME_DIR="$TMPDIR"
export DISPLAY=:0
termux-x11 :0 &
am start --user 0 -n com.termux.x11/com.termux.x11.MainActivity
```

Enter Ubuntu as the desktop user:

**Run in the same native Termux session:**

```bash
proot-distro login --shared-tmp --user dev ubuntu
```

Start XFCE:

**Run inside Ubuntu proot as `dev`:**

```bash
export DISPLAY=:0
export PULSE_SERVER=127.0.0.1
export XDG_RUNTIME_DIR=/tmp/runtime-dev
dbus-launch --exit-with-session startxfce4
```

Open the Termux:X11 Android app if it did not open automatically.

### Step 7: Launch Cursor

Open **Terminal Emulator** from the XFCE Applications menu.

Because PRoot cannot provide Electron's normal sandbox, Cursor will generally abort unless `--no-sandbox` is supplied. This weakens process isolation.

**Run in the XFCE terminal as `dev`:**

```bash
cursor --no-sandbox
```

If the window is blank or corrupted, close Cursor and retry with software rendering:

```bash
cursor --no-sandbox --disable-gpu
```

Sign in only through Cursor's official login flow.

### Step 8: Create a launcher after manual setup works

Exit the XFCE session and Ubuntu, then create this auditable launcher in native Termux:

**Run in native Termux:**

```bash
cat > "$HOME/start-cursor-desktop.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -eu

termux-wake-lock
export XDG_RUNTIME_DIR="$TMPDIR"
export DISPLAY=:0

termux-x11 :0 >/dev/null 2>&1 &
sleep 2
am start --user 0 \
  -n com.termux.x11/com.termux.x11.MainActivity >/dev/null

proot-distro login --shared-tmp --user dev ubuntu -- \
  env DISPLAY=:0 \
      PULSE_SERVER=127.0.0.1 \
      XDG_RUNTIME_DIR=/tmp/runtime-dev \
      dbus-launch --exit-with-session startxfce4
EOF

chmod 700 "$HOME/start-cursor-desktop.sh"
```

Daily start command:

**Run in native Termux:**

```bash
"$HOME/start-cursor-desktop.sh"
```

Then open XFCE Terminal and run `cursor --no-sandbox`.

### Route 3 checkpoint

You are done when:

- Termux:X11 displays the XFCE desktop.
- Cursor opens and signs in.
- A project under `/home/dev/projects` can be edited.
- A command in Cursor's integrated terminal changes or tests that project.

---

## Daily-use cheatsheet

### Route 1

```bash
cd "$HOME/projects/<repository-name>"
git fetch origin
git status
```

Open [cursor.com/agents](https://cursor.com/agents) in Chrome.

### Route 2

1. Open Termux.
2. Run `termux-wake-lock`.
3. Run `proot-distro login --isolated ubuntu`.
4. Inside Ubuntu, run `install -d -m 755 /run/sshd && /usr/sbin/sshd -D -e`.
5. On the computer, open Cursor and connect to `termux-ubuntu`.

Stop the server with `Ctrl+C` in the Ubuntu session. Then run `exit` to leave Ubuntu and `termux-wake-unlock` in native Termux.

### Route 3

1. Run `~/start-cursor-desktop.sh` in Termux.
2. Open Termux:X11.
3. Launch `cursor --no-sandbox` from XFCE Terminal.
4. Log out from XFCE when finished, then run `termux-wake-unlock` in native Termux.

## Troubleshooting

### “App not installed” or signature mismatch

Termux or a plugin came from a different source.

1. Back up files from `$HOME`.
2. Uninstall Termux and all Termux plugins.
3. Reinstall every component from F-Droid **or** every component from official GitHub releases.
4. Do not mix the two sources.

### `Permission denied (publickey)`

Check the public key and permissions inside Ubuntu:

**Run inside Ubuntu proot as root:**

```bash
namei -l /home/dev/.ssh/authorized_keys
ssh-keygen -lf /home/dev/.ssh/authorized_keys
```

Required permissions are `700` for `.ssh` and `600` for `authorized_keys`, owned by `dev`. Confirm the computer uses the matching private key with `ssh -v termux-ubuntu`.

### Connection refused

The Ubuntu SSH daemon is not running or the wrong port is configured.

**Run inside Ubuntu proot as root:**

```bash
/usr/sbin/sshd -t
ss -ltn
```

Port `10022` should be listening. Restart the foreground daemon only after correcting any reported configuration error.

### Connection timed out

- Confirm the phone and computer can reach each other.
- Recheck the Android Wi-Fi or Tailscale IP.
- Disable Wi-Fi client isolation or use USB forwarding.
- Reopen Termux and reacquire its wake lock.
- Confirm Android battery settings have not suspended Termux.

### Port already in use

Inspect the listener before changing anything:

**Run inside Ubuntu proot as root:**

```bash
ss -ltnp | awk '$4 ~ /:10022$/'
```

If the existing listener is the Ubuntu `sshd`, do not start a second copy. If another service owns the port, choose a different unprivileged port above 1024 in both `termux-cursor.conf` and the computer's SSH config.

### Cursor says the remote host is missing glibc

The connection probably targets native Termux rather than Ubuntu.

**Run in the remote shell:**

```bash
cat /etc/os-release
getconf GNU_LIBC_VERSION
printf '%s\n' "$HOME"
```

Reconnect to Ubuntu's port `10022`. Native Termux's SSH daemon normally uses `8022` and is not the target for Cursor Remote SSH.

### Android stops SSH or X11 in the background

- Set Termux battery use to **Unrestricted**.
- Run `termux-wake-lock`.
- Keep the active Termux session and notification.
- Reduce other memory-heavy apps.
- Reopen the relevant session and restart only the guide's SSH or X11 process.

Android may still stop processes under memory pressure; this cannot be completely prevented without device-level changes.

### Termux:X11 shows a black or blank screen

1. Confirm the Termux:X11 Android app and package came from matching official sources.
2. Confirm Ubuntu was entered with `--shared-tmp`.
3. Confirm both shells use `DISPLAY=:0`.
4. Log out of the failed XFCE session and start it again.
5. Retry Cursor with `--disable-gpu`.

### Cursor exits with a sandbox or namespace error

Under PRoot, launch it with:

```bash
cursor --no-sandbox
```

This is expected for Route 3 and reduces security. There is no equivalent Android kernel/AppArmor fix that restores Cursor's normal Electron sandbox inside PRoot.

### Low storage or memory

Check usage:

**Run in native Termux:**

```bash
df -h "$HOME"
du -sh "$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu" 2>/dev/null
```

Remove project build caches with each project's documented clean command. Do not delete arbitrary directories under the Ubuntu rootfs.

## Cleanup

### Remove only Cursor from Ubuntu

**Run inside Ubuntu proot as root:**

```bash
apt remove cursor
rm -f /etc/apt/sources.list.d/cursor.list
rm -f /etc/apt/keyrings/cursor.gpg
apt update
```

This keeps Ubuntu and project files.

### Remove the Route 3 launcher

**Run in native Termux:**

```bash
rm -f "$HOME/start-cursor-desktop.sh"
termux-wake-unlock
```

### Remove the Ubuntu environment

> [!CAUTION]
> This permanently deletes Ubuntu, `/home/dev`, repositories stored there, installed packages, and SSH configuration. Back up and push all work first.

List installed distributions, then remove only Ubuntu:

**Run in native Termux:**

```bash
proot-distro list
proot-distro remove ubuntu
```

### Lost device

From a trusted device:

1. Revoke the lost phone's SSH key from GitHub/GitLab.
2. Revoke active Cursor and Git-provider sessions.
3. Rotate any tokens or secrets that were stored on the phone.
4. Remove the device from Tailscale or another private network.

## First-party references

- [Cursor mobile and Android status](https://cursor.com/docs/cloud-agent/mobile)
- [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent)
- [Cursor downloads and Linux installation](https://cursor.com/docs/get-started/quickstart)
- [Cursor CLI supported installation platforms](https://cursor.com/docs/cli/installation)
- [Official Termux app](https://github.com/termux/termux-app)
- [Official proot-distro](https://github.com/termux/proot-distro)
- [Official Termux:X11](https://github.com/termux/termux-x11)
- [GitHub SSH setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [GitLab SSH setup](https://docs.gitlab.com/user/ssh/)

Last verified: **2026-07-17**
