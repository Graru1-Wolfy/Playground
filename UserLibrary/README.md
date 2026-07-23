# User Library

Reusable modules shared across projects. Projects import libraries via `Project.json`.

## Structure

```
UserLibrary/
  Filesystem/   — file I/O utilities
  Database/     — database helpers
  Git/          — version control automation
  Networking/   — HTTP and remote APIs
  Assets/       — asset pipeline utilities
  Materials/    — material definitions
  Math/         — vector and matrix math
  Utilities/    — UUID, paths, collections
  UI/           — notification and dialog helpers
```

## Usage

Reference modules in `Project.json`:

```json
{
  "libraries": ["util.uuid", "fs.read", "git.status"]
}
```

Scripts and commands can call library exports through the Script Engine.

## Future

- Versioning and dependency resolution
- Package distribution registry
- Signed packages with permission manifests
