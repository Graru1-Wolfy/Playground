# IDE Platform Architecture

## Overview

Playground IDE is a modular development platform comparable in architectural intent to JetBrains IDEs, VS Code, and Unreal Editor. It is designed as a **platform** that grows over many years — not a text editor.

## Layer Model

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer (apps/ide)                          │
│  React shell, docking, sidebars, palette, inspector     │
├─────────────────────────────────────────────────────────┤
│  Service Layer (@playground/ide-core)                   │
│  Commands, events, search, keybindings, plugins         │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  SQLite (abstracted), symbol index, settings store      │
├─────────────────────────────────────────────────────────┤
│  Extension Layer                                        │
│  Plugins, scripts, user library, future visual graphs   │
└─────────────────────────────────────────────────────────┘
```

**Critical rule:** The presentation layer never imports service internals directly. It resolves services through the DI container (`Tokens.*`).

## Dependency Injection

All services are registered in `DefaultServiceContainer` and resolved by token:

```typescript
import { createIdePlatform, Tokens } from '@playground/ide-core';

const platform = await createIdePlatform();
await platform.start();

const commands = platform.container.resolve(Tokens.CommandRegistry);
const result = await commands.execute('info.commands');
```

## Command System

Every IDE action is a command with:

- Metadata (UUID, name, category, permissions, visibility)
- Typed argument schema
- Handler with `CommandContext` (source: ui | api | script | alias | keybinding)
- Undo/redo support (when `undoable: true`)
- Script and API access flags
- Searchable documentation

Commands are the **single execution path** for UI, scripts, future REST/WebSocket APIs, and AI automation.

## Alias System

Aliases are stored separately from commands and resolved at execution time:

```
Global/aliases/     — user-wide shortcuts
Project/aliases/    — project-specific (loaded per Project.json)
```

Resolution order: project → workspace → user → global (by priority).

## Event Bus

Lifecycle and domain events (`OnProjectOpened`, `OnFileSaved`, `OnCommandExecuted`, etc.) decouple subsystems. Plugins subscribe to events without modifying core code.

## Database Abstraction

Initial provider: SQLite (in-memory for bootstrap; file-backed in production).

Schema tables: `commands`, `aliases`, `scripts`, `plugins`, `search_index`, `bookmarks`, `history`, `settings`, `diagnostics`.

The `DatabaseService` interface allows future PostgreSQL, MySQL, and remote providers without changing consumers.

## Script Engine

Language adapters implement `ScriptLanguageAdapter`:

| Language | Status |
|----------|--------|
| JavaScript | Active (in-process) |
| Python | Adapter stub (future subprocess/WASM) |
| Lua | Adapter stub (future embedded runtime) |

Scripts declare permissions; `PermissionService` gates filesystem, network, terminal, and project modification.

### Future Visual Scripting

`LogicNode` types (function, loop, condition, event, pipeline, graph, pin) share the same execution APIs as text scripts. No duplicated business logic.

## Plugin API

Plugins register through `PluginContext`:

- Commands
- Sidebar panels
- Menus, themes, services (future)
- Event handlers

Plugins are isolated — they cannot access other plugins' internals.

## Search

`SearchService` aggregates `SearchProvider` implementations. One query searches files, symbols, commands, aliases, scripts, settings, and documentation.

## Keybindings

Scoped layers: global → user → workspace → project.

`KeybindingManager` supports:

- Modifier chords (`Ctrl+Shift+P`)
- Sequences (`Ctrl+K Ctrl+S`)
- Conflict detection
- Import/export profiles

## Workspace Profiles

Named layouts (Programming, Debugging, Database, etc.) store:

- Dock panel arrangement
- Open files
- Terminal tabs
- Theme
- Window positions

## Remote API (Future)

REST, WebSocket, and gRPC gateways will call `platform.executeCommand()` — the same path as the UI. No special-case automation APIs.

## AI Integration (Future)

AI agents are automation clients. They use:

- Commands (`executeCommand`)
- Scripts (`ScriptEngine.execute`)
- Events (subscribe via EventBus)
- Search and Symbol APIs
- File APIs via commands

No architectural changes required.

## Testing Strategy

- **Unit tests:** command registry, aliases, events, keybindings, symbols
- **Integration tests:** platform bootstrap, info commands, alias resolution
- **UI tests:** command palette, docking (future)

## Module Boundaries

| Module | Depends On | Must Not Depend On |
|--------|-----------|-------------------|
| ide-core | — | React, DOM, Electron |
| ide (app) | ide-core | — |
| plugins | ide-core (API only) | ide app internals |
