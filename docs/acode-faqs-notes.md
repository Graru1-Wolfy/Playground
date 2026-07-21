# Acode FAQ notes (for Termux + Cursor Agent setup)

Source: https://acode.app/faqs (and official Acode docs / marketing pages)

Last reviewed: 2026-07-21

## Key points for this project

### Acode is not just an editor

- Built-in **Alpine Linux terminal** (proot, `apk`) — separate from Termux.
- **250+ plugins** (Settings → Plugins → `+` → Local / Remote / Store).
- **F-Droid build recommended** over Play Store: Play version lacks full internal storage access for the built-in terminal (Android 10+ All Files Access only on F-Droid).

### Acode terminal vs Termux

| | Acode built-in terminal | Termux |
|--|-------------------------|--------|
| Linux | Alpine (proot) | Debian/Bionic userspace, `pkg` |
| Cursor Agent CLI | **Does not work** (needs Termux + glibc) | **Works** (our setup) |
| Claude Code / Codex / OpenCode | Supported in Acode terminal | Can run in Termux too |
| Link to editor | Native (`acode .`) | Via **AcodeX** plugin + `acodex-server` |

**Conclusion:** Keep Termux for Cursor Agent; use Acode for editing. Do not expect `agent` in Acode’s built-in Alpine terminal.

### Termux + Acode integration (official pattern)

1. Install **AcodeX** plugin in Acode.
2. In Termux: `curl -sL .../acode-plugin-acodex/main/installServer.sh | bash`
3. Run `acodex-server` (alias `axs`) in Termux before using terminal in Acode.
4. Acode: `Ctrl+K` or command palette → Open Terminal.

Docs: https://docs.acode.app/tutorials/how-to-run-java (same AcodeX flow)

### Storage / project folders

- Open projects via **Documents** (shared workspace) or **Add path → Termux → home**.
- Play Store Acode: terminal may run from sandbox temp dir — use **F-Droid** + All Files Access if paths break.
- Prefer **F-Droid Acode** + `termux-setup-storage` + shared workspace (`Documents/cursor-workspace`).

### AI on Acode (official positioning)

- Acode promotes **Claude Code, Codex, OpenCode** in its terminal — not Cursor CLI.
- **Shellular** (acode.app) — remote control for agents/terminals/files/ports from phone (Codex, Claude Code, OpenCode). Alternative to custom Cursor+Acode plugin for some users.

### Plugin development

- JS/TS plugins: https://docs.acode.app/docs/getting-started/create-plugin
- Install: Settings → Plugins → `+` (Local zip, Remote URL, or Store).
- Cursor integration would be a **custom plugin + Termux bridge** (see conversation re: Phase 1 / ACP).

### Useful Acode shortcuts

- `Ctrl+Shift+P` — command palette
- `Ctrl+P` — file search
- `Ctrl+K` — terminal (with AcodeX)
- `acode .` — open cwd in editor from terminal

## Implications for setup-termux-x11-cursor.sh

1. Document **F-Droid Acode** in prerequisites.
2. Cursor Agent commands must run in **Termux** (or AcodeX → Termux), not Acode Alpine terminal.
3. Workspace **shared mode** aligns with Acode/Files access to `Documents/cursor-workspace`.
4. Future **acode-cursor plugin** should depend on **AcodeX** or a small Termux server, not built-in Executor alone.
