# Acode FAQ notes (for Termux + Cursor Agent setup)

Sources: [Acode FAQs](https://acode.app/faqs), official Acode documentation,
and the community AcodeX repositories linked below.

Last reviewed: 2026-07-22

User-facing workflow:
[Cursor Cloud Agents + Acode on Android](./cursor-cloud-acode.md)

## Key points for this project

### Acode is not just an editor

- Built-in **Alpine Linux terminal** (proot, `apk`) — separate from Termux.
- **250+ plugins** (Settings → Plugins → `+` → Local / Remote / Store).
- **F-Droid build recommended** over Play Store: the Play version lacks full
  internal-storage access for the built-in terminal. Android 10+ All Files
  Access is available only in the F-Droid build.

### Acode terminal vs Termux

<!-- markdownlint-disable MD013 -->

| | Acode built-in terminal | Termux |
| -- | ----------------------- | ------ |
| Environment | Alpine (PRoot), `apk` | Android/bionic with Termux packages, `pkg` |
| Cursor Agent CLI | Not documented or supported by Cursor | Experimental compatibility setup in this repository |
| Claude Code / Codex / OpenCode | Supported in Acode terminal | Can run in Termux too |
| Link to editor | Native (`acode .`) | Via **AcodeX** plugin + `acodex-server` |

<!-- markdownlint-enable MD013 -->

**Conclusion:** Run this repository's Cursor tooling in native Termux and use
Acode for editing. Do not treat Acode's built-in Alpine terminal as Termux or
assume Cursor supports it.

### Termux + AcodeX integration (community bridge)

1. Install **AcodeX** plugin in Acode.
2. In Termux: `curl -sL .../acode-plugin-acodex/main/installServer.sh | bash`
3. Run `acodex-server` (alias `axs`) in Termux before using terminal in Acode.
4. Acode: `Ctrl+K` or command palette → Open Terminal.

Acode's documentation demonstrates this flow, but AcodeX and `axs` are
community projects. Review and pin third-party installers before running them.

References:

- [Acode Java/AcodeX tutorial](https://docs.acode.app/tutorials/how-to-run-java)
- [AcodeX plugin repository](https://github.com/bajrangCoder/acode-plugin-acodex)
- [AcodeX server repository](https://github.com/bajrangCoder/acodex_server)

### Storage / project folders

- Open projects via **Documents** (shared workspace) or
  **Add path → Termux → home**.
- Play Store Acode: the terminal may run from a sandbox temporary directory.
  Use **F-Droid** plus All Files Access if paths break.
- The Cloud Agent + Acode guide defaults to
  `Internal storage/Cursor_Space/<repository>`.
- The separate native Agent/X11 installer defaults to
  `Documents/cursor-workspace`.
- Prefer private Termux storage for repositories that need Unix permissions,
  symlinks, executable bits, or reliable dependency tooling.

### AI on Acode (official positioning)

- Acode promotes **Claude Code, Codex, OpenCode** in its terminal — not Cursor CLI.
- **Shellular** (acode.app) — remote control for agents, terminals, files, and
  ports from a phone (Codex, Claude Code, OpenCode). It is an alternative to a
  custom Cursor+Acode plugin for some users.

### Plugin development

- [JS/TS plugin guide](https://docs.acode.app/docs/getting-started/create-plugin)
- Install: Settings → Plugins → `+` (Local zip, Remote URL, or Store).
- Cursor integration would be a **custom plugin + Termux bridge** (see the
  conversation about Phase 1 / ACP).

### Useful Acode shortcuts

- `Ctrl+Shift+P` — command palette
- `Ctrl+P` — file search
- `Ctrl+K` — terminal (with AcodeX)
- `acode .` — open cwd in editor from terminal

## Implications for setup-termux-x11-cursor.sh

1. Document **F-Droid Acode** in prerequisites.
2. This repository's Cursor Agent commands must run in **Termux** (or
   AcodeX → Termux), not Acode's Alpine terminal.
3. Shared workspaces align with Acode/Files access, but private Termux storage
   is safer for Unix-dependent repositories.
4. A future **acode-cursor plugin** should depend on **AcodeX** or a small
   Termux server, not built-in Executor alone.
