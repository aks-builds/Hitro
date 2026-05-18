import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

export let db: Database.Database

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'hitro.db')
  db = new Database(dbPath)

  // Track which schema migrations have been applied so they never run twice
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version   INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      folders TEXT DEFAULT '[]',
      pre_script TEXT DEFAULT '',
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      collection_id TEXT,
      folder_id TEXT,
      config TEXT NOT NULL,
      assertions TEXT DEFAULT '[]',
      pre_script TEXT DEFAULT '',
      post_script TEXT DEFAULT '',
      chain_rules TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      request TEXT NOT NULL,
      response TEXT NOT NULL,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS global_vars (
      id TEXT PRIMARY KEY DEFAULT 'global',
      variables TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      name TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS mock_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      port INTEGER NOT NULL,
      endpoints TEXT DEFAULT '[]',
      created_at INTEGER
    );

    INSERT OR IGNORE INTO global_vars (id, variables) VALUES ('global', '[]');

    CREATE TABLE IF NOT EXISTS global_headers (
      id      TEXT PRIMARY KEY DEFAULT 'global',
      headers TEXT DEFAULT '[]'
    );

    INSERT OR IGNORE INTO global_headers (id, headers) VALUES ('global', '[]');
  `)

  const appliedVersions = new Set(
    (db.prepare('SELECT version FROM schema_version').all() as { version: number }[]).map(r => r.version)
  )

  const migrations: Array<{ version: number; sql: string }> = [
    { version: 1, sql: `ALTER TABLE collections ADD COLUMN folders TEXT DEFAULT '[]'` },
    { version: 2, sql: `ALTER TABLE collections ADD COLUMN pre_script TEXT DEFAULT ''` },
    { version: 3, sql: `ALTER TABLE requests ADD COLUMN folder_id TEXT` },
    { version: 4, sql: `ALTER TABLE requests ADD COLUMN pre_script TEXT DEFAULT ''` },
    { version: 5, sql: `ALTER TABLE requests ADD COLUMN post_script TEXT DEFAULT ''` },
    { version: 6, sql: `ALTER TABLE requests ADD COLUMN updated_at INTEGER` },
    { version: 7, sql: `ALTER TABLE requests ADD COLUMN chain_rules TEXT DEFAULT '[]'` },
    { version: 8, sql: `ALTER TABLE requests ADD COLUMN sort_order INTEGER DEFAULT 0` },
  ]

  const insertVersion = db.prepare(`INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)`)
  for (const m of migrations) {
    if (appliedVersions.has(m.version)) continue
    try {
      db.exec(m.sql)
    } catch {
      // Column already exists from a prior run before versioning was introduced
    }
    insertVersion.run(m.version, new Date().toISOString())
  }
}
