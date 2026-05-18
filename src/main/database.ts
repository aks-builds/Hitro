import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

export let db: Database.Database

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'hitro.db')
  db = new Database(dbPath)

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
  `)

  const migrations = [
    `ALTER TABLE collections ADD COLUMN folders TEXT DEFAULT '[]'`,
    `ALTER TABLE collections ADD COLUMN pre_script TEXT DEFAULT ''`,
    `ALTER TABLE requests ADD COLUMN folder_id TEXT`,
    `ALTER TABLE requests ADD COLUMN pre_script TEXT DEFAULT ''`,
    `ALTER TABLE requests ADD COLUMN post_script TEXT DEFAULT ''`,
    `ALTER TABLE requests ADD COLUMN updated_at INTEGER`,
    `ALTER TABLE requests ADD COLUMN chain_rules TEXT DEFAULT '[]'`,
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }
}
