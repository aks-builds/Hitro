# Migration Guide

## Database migrations

Hitro stores all persistent data in a SQLite database (`hitro.db`) in the Electron `userData` directory.

When the schema needs to change between versions, add a version-guarded migration in `src/main/database.ts`.

### Schema version table

Add a `schema_version` table if it does not exist, and gate each migration on the current version:

```typescript
// In database.ts initialization
db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`)
const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
const currentVersion = row?.version ?? 0

if (currentVersion < 1) {
  db.exec(`ALTER TABLE requests ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`)
  db.prepare('INSERT INTO schema_version (version) VALUES (1)').run()
}
```

Increment the version number for each release that changes the schema.

### Rules

- Migrations must be **additive only** (add columns / tables). Never drop or rename columns in a patch release.
- If a breaking schema change is required, bump the major version and document the data loss in `CHANGELOG.md`.
- Test migrations against a pre-migration database file in CI.

---

## v1.0.0 → future

No migrations defined yet. The initial schema is created in `src/main/database.ts`.

---

## Manual database reset

If you need a clean database during development:

```bash
# macOS / Linux
rm ~/Library/Application\ Support/Hitro/hitro.db   # macOS
rm ~/.config/Hitro/hitro.db                         # Linux

# Windows (PowerShell)
Remove-Item "$env:APPDATA\Hitro\hitro.db"
```

The application will recreate the schema on next launch.

---

## Environment migrations

Environments are stored as JSON in the `environments` table. If the `KeyValue` interface changes shape, add a migration that reads existing rows, transforms the JSON, and writes them back.
