export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS metadata_store (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS commands (
    uuid TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS aliases (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    data TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    UNIQUE(name, scope)
  )`,
  `CREATE TABLE IF NOT EXISTS scripts (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    data TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS plugins (
    uuid TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    version TEXT NOT NULL,
    data TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS search_index (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    score_boost REAL NOT NULL DEFAULT 1.0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
    uuid TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    label TEXT,
    data TEXT,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS history (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    reference TEXT NOT NULL,
    data TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (key, scope)
  )`,
  `CREATE TABLE IF NOT EXISTS diagnostics (
    uuid TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workspace_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(type)`,
  `CREATE INDEX IF NOT EXISTS idx_search_index_name ON search_index(name)`,
  `CREATE INDEX IF NOT EXISTS idx_history_type ON history(type)`,
  `CREATE INDEX IF NOT EXISTS idx_aliases_scope ON aliases(scope)`,
];
