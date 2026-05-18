# Runbook

Operational procedures for building, releasing, and debugging Hitro.

---

## Build and release

### Local development build

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
# outputs to dist/renderer/ and dist/main/
```

### Package for distribution

```bash
npm run dist:win    # Windows NSIS installer → release/
npm run dist:mac    # macOS DMG → release/
npm run dist        # auto-detects current platform
```

Electron-builder reads `package.json#build` for icons, app ID, and output config.

### Release checklist

1. Update `CHANGELOG.md` with the new version entry.
2. Bump the version in `package.json`.
3. Commit: `chore: release vX.Y.Z`
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. The GitHub Actions release workflow (`.github/workflows/release.yml`) triggers automatically, builds installers for all platforms, and attaches them to the GitHub Release.

---

## Debugging

### Open DevTools

In a running dev build, press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS), or set `NEXUS_DEV_TOOLS=1` to open them automatically on launch.

### Main process logs

Main process `console.log` output appears in the terminal where you ran `npm run dev`.

### SQLite inspection

```bash
# macOS / Linux
sqlite3 ~/Library/Application\ Support/Hitro/hitro.db
sqlite3 ~/.config/Hitro/hitro.db

# Windows (PowerShell) — requires sqlite3 CLI
sqlite3 "$env:APPDATA\Hitro\hitro.db"
```

Useful queries:

```sql
SELECT * FROM collections;
SELECT id, name, protocol, updatedAt FROM requests ORDER BY updatedAt DESC LIMIT 10;
SELECT COUNT(*) FROM history;
```

### IPC debugging

In the renderer DevTools console:
```javascript
window.hitroAPI   // inspect the full bridge surface
```

To trace IPC calls, add temporary `console.log` statements in `src/main/ipc.ts` handler bodies during development (remove before committing).

---

## Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| White screen on launch | Renderer dev server not ready | Wait for `vite` to print "ready" before Electron opens the window |
| `Cannot find module 'dist/main/index.js'` | Main process not compiled | Run `npm run build:main` |
| gRPC `ENOENT: no such file or directory` | Proto path is incorrect | Use an absolute path; the file must exist before sending the request |
| Kafka `KafkaJSConnectionError` | Broker unreachable | Check that the broker string is `host:9092`, not just `host` |
| SQLite `SQLITE_BUSY` | Two instances of Hitro running | Close the other instance |
| App window too small on 4K | DPI scaling | Set `autoHiDPI: true` in `BrowserWindow` or adjust `zoomFactor` |

---

## Resetting to a clean state

```bash
# 1. Delete the SQLite database (see paths above)
# 2. Delete node_modules and reinstall
rm -rf node_modules && npm install
# 3. Delete build output
rm -rf dist release
```
