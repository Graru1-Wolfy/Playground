# Playground IDE — Prerequisites & Revision Tracker

> **Status:** Foundation complete (PR #96)  
> **Last updated:** 2026-07-23  
> **Legend:** `[P]` prerequisite · `[R]` revision of existing work · `[N]` new feature

---

## Phase 0 — Prerequisites (must complete before major work)

These block most downstream features. Complete in order where dependencies exist.

### P0.1 Toolchain & Workspace

- [ ] **P** Add `apps/ide` to CI workflow (build + typecheck on push)
- [ ] **P** Add `packages/ide-core` to CI test matrix
- [ ] **P** Pin shared TypeScript version across `ide-core` and `ide` workspaces
- [ ] **P** Document Node ≥20 requirement in `docs/ide/README.md`
- [ ] **P** Add `npm run dev:ide` smoke test script (headless build verification)

### P0.2 Persistence Layer

- [ ] **P** Replace in-memory SQLite with `better-sqlite3` (Node/Electron target)
- [ ] **P** Add `sql.js` fallback adapter for browser-only builds
- [ ] **P** Wire `DatabaseService` CRUD for settings, aliases, history, bookmarks
- [ ] **P** Implement database migration versioning (`schema_version` table)
- [ ] **P** Persist platform state to `~/.playground-ide/` (global) and `Project/database/` (project)

### P0.3 Project Lifecycle

- [ ] **P** Load `Project.json` from disk on `project.open`
- [ ] **P** Auto-load project aliases from `Project/aliases/`
- [ ] **P** Auto-load project scripts from `Project/scripts/`
- [ ] **P** Auto-load project settings from `Project/settings/`
- [ ] **P** Emit `OnProjectOpened` / `OnProjectClosed` with real project data
- [ ] **P** Validate `Project.json` against JSON Schema

### P0.4 Filesystem Service (new — blocks explorer, git, remote)

- [ ] **P** Create `FilesystemService` interface in `ide-core` (no UI dependency)
- [ ] **P** Implement local file read/write/watch
- [ ] **P** Expose filesystem via commands: `fs.read`, `fs.write`, `fs.list`, `fs.rename`, `fs.delete`
- [ ] **P** Connect `EditorService` to real file load/save
- [ ] **P** Replace `SAMPLE_TREE` in Explorer with `FilesystemService` data

### P0.5 Command Execution Pipeline

- [ ] **P** Implement undo/redo stack in `CommandRegistry` (types exist, logic missing)
- [ ] **P** Wire keybindings to `platform.executeCommand()` in UI shell
- [ ] **P** Wire command palette shortcuts display to `KeybindingManager`
- [ ] **P** Connect alias auto-load from `Project.json` → `AliasRegistry.importAliases()`
- [ ] **P** Add command argument prompt UI (for commands requiring args)

---

## Phase 1 — Core Revisions (fix/improve existing foundation)

### R1.1 Command System

- [ ] **R** Add `CommandHistoryService` (recent, pinned, favorites)
- [ ] **R** Register missing built-in commands: `git.status`, `project.rebuild`, `editor.format`
- [ ] **R** Add command categories metadata registry (discoverable via `info.commands`)
- [ ] **R** Implement permission checks before command execution
- [ ] **R** Add command documentation renderer (markdown in metadata)
- [ ] **R** Return structured errors with diagnostic codes

### R1.2 Alias System

- [ ] **R** Load global aliases from `Global/aliases/` on startup
- [ ] **R** Support alias argument templates (`gs --branch=$1`)
- [ ] **R** Add alias import/export commands (`alias.export`, `alias.import`)
- [ ] **R** Add alias enable/disable without unregistering
- [ ] **R** Surface alias conflicts in `info.aliases`

### R1.3 Event Bus

- [ ] **R** Fix `once` handler cleanup (currently broken in `DefaultEventBus`)
- [ ] **R** Add event history/log for debugging
- [ ] **R** Support async handler error isolation (don't block other handlers)
- [ ] **R** Wire UI lifecycle events (palette open, sidebar change, etc.)

### R1.4 Settings Service

- [ ] **R** Persist settings to database (currently in-memory only)
- [ ] **R** Add settings schema validation on register
- [ ] **R** Add settings search provider
- [ ] **R** Generate property inspector fields from `SettingDefinition` metadata
- [ ] **R** Support settings profiles (import/export)

### R1.5 Workspace Service

- [ ] **R** Persist workspace profiles to disk
- [ ] **R** Restore open files and editor state on profile switch
- [ ] **R** Restore dock layout in UI shell from `WorkspaceProfile.dockLayout`
- [ ] **R** Add workspace profiles: Database, Level Design, Animation, Documentation
- [ ] **R** Bind theme selection to settings/CSS variables

### R1.6 Plugin Manager

- [ ] **R** Implement dynamic plugin loading from `plugins/` directory
- [ ] **R** Add plugin manifest validation (`plugin.json`)
- [ ] **R** Implement `registerService` in `PluginContext`
- [ ] **R** Add plugin enable/disable persistence
- [ ] **R** Add plugin dependency resolution and load ordering
- [ ] **R** Sandbox plugin execution (separate context/worker)

### R1.7 Script Engine

- [ ] **R** Parse script metadata from file headers (name, version, permissions)
- [ ] **R** Enforce permissions via `PermissionService` before execution
- [ ] **R** Add script discovery/search provider
- [ ] **R** Connect Python adapter (subprocess or embedded runtime)
- [ ] **R** Connect Lua adapter (fengari or native binding)
- [ ] **R** Expose User Library modules to script runtime
- [ ] **R** Add script debugging hooks (breakpoints, step)

### R1.8 Symbol Database

- [ ] **R** Replace regex indexer with tree-sitter or LSP integration
- [ ] **R** Index comments and documentation strings
- [ ] **R** Implement rename symbol command (with reference updates)
- [ ] **R** Add call hierarchy provider
- [ ] **R** Wire outline sidebar to `SymbolDatabase.getOutline()`
- [ ] **R** Add symbol search provider to unified search

### R1.9 Search Service

- [ ] **R** Add file search provider (ripgrep integration)
- [ ] **R** Add alias search provider
- [ ] **R** Add script search provider
- [ ] **R** Add settings search provider
- [ ] **R** Add recent files search provider
- [ ] **R** Add documentation search provider
- [ ] **R** Implement search index persistence in database

### R1.10 Keybinding Manager

- [ ] **R** Fix scope priority order (spec says global→user→workspace→project; code uses project first)
- [ ] **R** Add mouse button binding support
- [ ] **R** Add gamepad/tablet binding support
- [ ] **R** Wire `KeyRecordingDialog` into settings UI
- [ ] **R** Add keybinding profiles (import/export)
- [ ] **R** Show conflicts inline in keybinding editor

### R1.11 Info Commands

- [ ] **R** Add `info.menus`, `info.memory` (detailed), `info.settings`
- [ ] **R** Expose info commands via searchable command palette category
- [ ] **R** Return JSON Schema alongside info results
- [ ] **R** Add `info.keybindings` alias for `info.bindings`

### R1.12 User Library

- [ ] **R** Implement actual module files under `UserLibrary/` categories
- [ ] **R** Add library versioning and dependency resolution
- [ ] **R** Add library search/browse commands
- [ ] **R** Package manager foundation (local registry)

---

## Phase 2 — UI Shell Revisions

### R2.1 Editor

- [ ] **R** Replace `<textarea>` with Monaco Editor
- [ ] **R** Add syntax highlighting per language
- [ ] **R** Add minimap, line numbers, bracket matching
- [ ] **R** Wire go-to-definition and find references
- [ ] **R** Add multi-cursor and split editor views
- [ ] **R** Auto-save with configurable delay

### R2.2 Docking & Layout

- [ ] **R** Implement drag-and-drop dock panel reordering
- [ ] **R** Support panel split (horizontal/vertical)
- [ ] **R** Persist layout changes to workspace profile
- [ ] **R** Add floating/detached panel support
- [ ] **R** Add zen mode / fullscreen editor

### R2.3 Sidebars (convert placeholders to plugins)

- [ ] **R** Explorer — real file tree, git status icons, context menus
- [ ] **R** Search — unified search results with filters by type
- [ ] **R** Outline — symbol tree from `SymbolDatabase`
- [ ] **R** Git — status, diff, stage, commit (plugin)
- [ ] **R** Database — connection browser (plugin)
- [ ] **R** Scripts — script list, run, edit permissions (plugin)
- [ ] **R** Assets — asset browser with preview (plugin)
- [ ] **R** Properties — selection-driven inspector (plugin)
- [ ] **R** Bookmarks — persistent bookmarks (plugin)
- [ ] **R** History — file/command history (plugin)
- [ ] **R** Extensions — install/enable/disable plugins (plugin)
- [ ] **R** Problems — diagnostics list (plugin)
- [ ] **R** Terminal — real shell via node-pty (plugin)
- [ ] **R** Profiler — performance data (plugin)
- [ ] **R** Inspector — metadata editor for any selection (plugin)

### R2.4 Command Palette

- [ ] **R** Show alias results alongside commands
- [ ] **R** Show script results
- [ ] **R** Add recent/pinned/favorites sections
- [ ] **R** Display plugin source per item
- [ ] **R** Fuzzy matching (fzf-style scoring)
- [ ] **R** Bind `Ctrl+Shift+P` globally in shell

### R2.5 Property Inspector

- [ ] **R** Drive all fields from metadata schema (not hardcoded command list)
- [ ] **R** React to `OnSelectionChanged` events
- [ ] **R** Support nested object/array property editors
- [ ] **R** Add enum dropdowns and file picker fields
- [ ] **R** Inspector works for: command, alias, script, plugin, project, database, workspace

### R2.6 Terminal

- [ ] **R** Integrate `node-pty` for real shell execution
- [ ] **R** Support profiles: bash, zsh, PowerShell, cmd, Python
- [ ] **R** Tab management with persistent state
- [ ] **R** Scripts can execute terminal commands (with permission)

### R2.7 Theming

- [ ] **R** Theme service with metadata (name, colors, author)
- [ ] **R** Light/dark/high-contrast built-in themes
- [ ] **R** Plugin-contributed themes
- [ ] **R** CSS variable generation from theme JSON

---

## Phase 3 — New Platform Features

### N3.1 Desktop Shell

- [ ] **N** Electron wrapper (`apps/ide-electron`)
- [ ] **N** Native menus via commands
- [ ] **N** Native file dialogs
- [ ] **N** Auto-updater
- [ ] **N** Single-instance and crash recovery

### N3.2 Package Manager

- [ ] **N** Local package registry service
- [ ] **N** Install/update/remove plugins and libraries
- [ ] **N** Dependency resolution
- [ ] **N** Version pinning per project

### N3.3 Asset Database

- [ ] **N** `AssetDatabase` service (typed asset entries)
- [ ] **N** Thumbnail generation and preview
- [ ] **N** Virtual folders and favorites
- [ ] **N** Drag-and-drop into editor/scenes

### N3.4 Diagnostics & Logging

- [ ] **N** Structured log shipping to database
- [ ] **N** Performance profiler service
- [ ] **N** Error reporting with stack traces
- [ ] **N** Problems panel wired to `DiagnosticsService`

### N3.5 Remote API

- [ ] **N** REST gateway over `executeCommand()`
- [ ] **N** WebSocket event stream
- [ ] **N** gRPC service definitions
- [ ] **N** API authentication and rate limiting

### N3.6 AI Integration (no special APIs)

- [ ] **N** AI client uses existing command/script/search APIs
- [ ] **N** Optional: register AI provider as a plugin
- [ ] **N** Command suggestion via search + info APIs

### N3.7 Visual Scripting (Future Logic Runtime)

- [ ] **N** Node graph editor UI
- [ ] **N** Pin type system
- [ ] **N** Graph execution engine (reuses `ScriptEngine` APIs)
- [ ] **N** Node types: function, loop, condition, event, variable, pipeline, query, macro
- [ ] **N** Export graph to script / import script to graph

---

## Phase 4 — Testing & Quality

### T4.1 Unit Tests

- [ ] Undo/redo command stack
- [ ] Settings persistence round-trip
- [ ] Plugin load/unload lifecycle
- [ ] Permission grant/deny flow
- [ ] Script permission enforcement
- [ ] Workspace profile save/restore
- [ ] Database migration tests
- [ ] Event bus `once` handler

### T4.2 Integration Tests

- [ ] Full project open → edit → save → close flow
- [ ] Alias resolution → command execution chain
- [ ] Plugin registers command → palette finds it
- [ ] Keybinding → command execution
- [ ] Script calls library → returns result

### T4.3 E2E / UI Tests

- [ ] Command palette open, search, execute
- [ ] Explorer file open in editor
- [ ] Key recording dialog assigns binding
- [ ] Workspace profile switch restores layout
- [ ] Property inspector reflects selection

### T4.4 Performance

- [ ] Symbol index benchmark (10k+ symbols)
- [ ] Search latency target: <100ms for local index
- [ ] Startup time budget: <2s cold start
- [ ] Memory profile for large projects

---

## Phase 5 — Documentation & DevEx

- [ ] Plugin authoring guide
- [ ] Command authoring guide
- [ ] Script metadata specification
- [ ] Alias file format specification
- [ ] Project.json JSON Schema published
- [ ] API reference generated from TypeScript
- [ ] Architecture decision records (ADRs)
- [ ] Contribution guide for `ide-core` vs `ide` boundaries

---

## Dependency Graph (critical path)

```
P0.1 Toolchain
    └── P0.2 Persistence
            └── P0.3 Project Lifecycle
                    └── P0.4 Filesystem Service
                            ├── P0.5 Command Pipeline
                            ├── R2.1 Monaco Editor
                            ├── R2.3 Explorer (real files)
                            └── R1.8 Symbol Database (real indexing)
                                    └── R2.3 Outline sidebar

P0.5 Command Pipeline
    └── R2.4 Command Palette (full)
    └── R1.10 Keybindings (wired)
    └── N3.5 Remote API

R1.6 Plugin Manager (dynamic load)
    └── R2.3 All sidebar plugins
    └── N3.2 Package Manager

R1.7 Script Engine (Python/Lua)
    └── N3.7 Visual Scripting
```

---

## Revision Priority (recommended order)

| Priority | ID | Task | Effort |
|----------|-----|------|--------|
| 🔴 Critical | P0.2 | Real SQLite persistence | Medium |
| 🔴 Critical | P0.4 | Filesystem service | Medium |
| 🔴 Critical | P0.3 | Project.json loading | Small |
| 🟠 High | P0.5 | Undo/redo + keybinding wiring | Medium |
| 🟠 High | R2.1 | Monaco editor | Medium |
| 🟠 High | R1.6 | Dynamic plugin loading | Large |
| 🟡 Medium | R1.8 | Tree-sitter symbol indexing | Large |
| 🟡 Medium | R2.3 | Sidebar plugins | Large |
| 🟡 Medium | R2.6 | Real terminal (node-pty) | Medium |
| 🟢 Low | N3.5 | Remote API | Large |
| 🟢 Low | N3.7 | Visual scripting | Very Large |

---

## Completed (foundation — PR #96)

- [x] Service-oriented `ide-core` package with DI container
- [x] Command registry with metadata, search, execution
- [x] Alias registry with scoped resolution
- [x] Event bus with 15 standard events
- [x] Database abstraction + schema (in-memory SQLite)
- [x] Settings, project, workspace services (in-memory)
- [x] Keybinding manager with conflict detection
- [x] Search service with provider pattern
- [x] Script engine with JS adapter + Python/Lua stubs
- [x] Symbol database with regex indexer
- [x] Permission service
- [x] Plugin manager skeleton
- [x] Info commands (11 topics)
- [x] User library registry
- [x] React IDE shell (palette, inspector, docking layout, terminal UI)
- [x] Project template + architecture docs
- [x] 9 unit tests passing
