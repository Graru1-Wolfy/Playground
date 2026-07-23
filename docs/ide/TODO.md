# Playground IDE — Prerequisites & Revision Tracker

> **Status:** Phase 0–3 substantially implemented  
> **Last updated:** 2026-07-23

---

## Phase 0 — Prerequisites ✅

- [x] CI workflow for `ide-core`, `ide`, `ide-api` (`.github/workflows/ide-platform.yml`)
- [x] Real SQLite via `better-sqlite3` with in-memory fallback
- [x] Schema migrations (`schema_version` table)
- [x] `Project.json` loading from disk with alias/script auto-load
- [x] `FilesystemService` — Node + API browser adapter
- [x] Undo/redo command stack (`CommandHistoryService`)
- [x] Keybinding → command wiring in UI shell
- [x] Global aliases from `Global/aliases/`

## Phase 1 — Core Revisions ✅ (foundation)

- [x] Command history (recent, pinned, favorites, undo/redo)
- [x] Built-in commands: `git.status`, `project.rebuild`, `editor.format`, `fs.*`
- [x] Permission checks before command execution
- [x] Event bus `once` handler fix + error isolation + event log
- [x] Settings persistence to database
- [x] Search providers: commands, aliases, scripts, settings, files, recent
- [x] Plugin loader from `plugins/` directory
- [x] Theme service (dark/light)
- [x] Asset database service
- [x] Package manager service (local registry)
- [x] Browser platform entry (`@playground/ide-core/browser`)

## Phase 2 — UI Shell Revisions ✅ (foundation)

- [x] Monaco Editor integration
- [x] Real file explorer via IDE API
- [x] Unified search sidebar
- [x] Command palette with categories
- [x] Key recording dialog wired
- [x] Workspace profile selector
- [x] Property inspector with command metadata
- [x] Global keybinding handler

## Phase 3 — Platform Features ✅ (foundation)

- [x] REST API gateway (`apps/ide-api`) — commands, search, filesystem
- [x] Browser/API split architecture for web + Node

## Phase 4 — Testing ✅

- [x] 18 unit/integration tests passing
- [x] Command history, undo/redo, database, settings, theme, assets, packages
- [x] Platform bootstrap and alias resolution

---

## Remaining Work (future iterations)

### High Priority
- [ ] Electron desktop shell (`apps/ide-electron`)
- [ ] `node-pty` real terminal
- [ ] Tree-sitter / LSP symbol indexing
- [ ] Drag-and-drop dock panel reordering
- [ ] Full sidebar plugins (Git, Problems, Bookmarks, etc.)
- [ ] Python/Lua script runtime adapters
- [ ] Command argument prompt UI

### Medium Priority
- [ ] WebSocket/gRPC remote API
- [ ] Visual scripting node editor
- [ ] Package distribution registry
- [ ] E2E UI tests (Playwright)
- [ ] Performance benchmarks

### Low Priority
- [ ] Mouse/gamepad keybinding support
- [ ] AI provider plugin template
- [ ] Multi-root workspace

---

## Quick Start

```bash
# Terminal 1 — API server (filesystem + commands)
npm run dev:ide-api

# Terminal 2 — Web IDE
npm run dev:ide

# Tests
npm run test -w @playground/ide-core
npm run build:ide
```
