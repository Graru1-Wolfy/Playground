# Playground IDE Platform

Enterprise-grade, data-driven IDE platform designed for long-term evolution.

## Architecture

The IDE is built as a **service-oriented platform** where every subsystem communicates through interfaces and events — never through direct UI coupling.

```
IDE Platform
├── Workspace Service      — layout profiles, dock state
├── Project Service          — project-aware configuration
├── Editor Service           — document model (UI-agnostic)
├── Command System           — heart of the IDE
├── Alias System             — shell-style command shortcuts
├── Event Bus                — global pub/sub lifecycle
├── Database Layer           — SQLite (abstracted for future providers)
├── Symbol Database          — go-to-definition, references, outline
├── Script Engine            — Python, Lua, JavaScript adapters
├── Plugin Manager           — isolated extension loading
├── Search Service           — unified discovery
├── Keybinding Manager       — scoped bindings with conflict detection
├── Settings Service         — layered global/user/workspace/project
├── Permissions Service      — script capability grants
├── Info Commands            — structured introspection APIs
└── User Library             — shared automation modules
```

## Packages

| Package | Purpose |
|---------|---------|
| `@playground/ide-core` | Platform services, APIs, DI container |
| `@playground/ide` | Web shell (React + Vite) |

## Quick Start

```bash
# Install dependencies
npm install

# Build core platform
npm run build -w @playground/ide-core

# Run IDE dev server
npm run dev:ide

# Run tests
npm run test -w @playground/ide-core
```

## Design Principles

1. **Data-driven** — commands, aliases, menus, panels, settings, and plugins are structured data with metadata
2. **API-first** — everything exposed in UI is also available via commands and scripts
3. **No UI in core** — `@playground/ide-core` has zero UI dependencies
4. **AI-ready** — automation clients use the same command/script/event APIs as the UI
5. **Future logic runtime** — visual scripting will execute the same underlying APIs

## Project Structure

```
templates/ide-project/
  Project.json          — project configuration
  aliases/              — project-scoped aliases
  scripts/              — automation scripts
  settings/             — editor and feature settings
  workspace/            — workspace profile overrides
  database/             — project database files
  plugins/              — project-local plugins
  libraries/            — imported user library modules
```

## Info Commands

Structured introspection via `info.*` commands:

- `info.commands` — registered commands
- `info.aliases` — alias definitions
- `info.project` — current project
- `info.workspace` — workspace profiles
- `info.plugins` — loaded plugins
- `info.scripts` — script registry
- `info.database` — database connection state
- `info.memory` — runtime memory usage
- `info.editor` — editor state
- `info.bindings` — keybinding map
- `info.diagnostics` — diagnostic summary

## Documentation

See [docs/ide/architecture.md](./docs/ide/architecture.md) for detailed architecture documentation.
