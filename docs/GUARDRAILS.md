# Guardrails

Security and quality constraints that must be preserved as the codebase evolves.

---

## Electron security

| Guardrail | Current state | Do not change unless |
|-----------|--------------|----------------------|
| `nodeIntegration: false` | Enforced in `src/main/index.ts` | You have a specific reason and an updated threat model |
| `contextIsolation: true` | Enforced in `src/main/index.ts` | Never — this is a hard requirement |
| `preload` script is the only bridge | `src/main/preload.ts` uses `contextBridge` | Adding a new IPC channel requires updating `preload.ts` |
| No `remote` module | Not used anywhere | Adding it widens the attack surface significantly |
| `webSecurity` default (enabled) | Not overridden | Disabling it allows renderer to bypass CORS |

---

## Credential handling

AWS SQS credentials (`accessKeyId`, `secretAccessKey`) are entered by the user and stored in SQLite in the `requests` table. This is acceptable for a local-only desktop tool — the threat model assumes the user's machine is trusted.

**Guardrails:**
- Credentials must never be sent over the IPC channel as bare strings outside of the typed config objects.
- Credentials must never be logged (neither to the main-process console nor to the renderer DevTools).
- If telemetry is ever added, credentials must be explicitly excluded from any payload.

---

## IPC surface

The `contextBridge` in `preload.ts` is the complete list of renderer-to-main capabilities. Any new capability requires:
1. A new `ipcMain.handle()` in `src/main/ipc.ts`
2. A corresponding entry in `src/main/preload.ts`
3. A type declaration in `window.hitroAPI`

Do not use `ipcRenderer.sendSync` — it blocks the UI thread.

---

## Input validation

| Input source | Validation required |
|---|---|
| User-entered URLs (REST, GraphQL, WebSocket) | Validated at the adapter level — `axios` and `ws` handle malformed URLs with thrown errors, caught and surfaced in `HitroResponse.error` |
| Proto file path (gRPC) | Must be an absolute path to an existing file; validate before passing to `proto-loader` |
| Kafka brokers string | Split on commas; each segment must be `host:port`-shaped |
| Assertion `matches` operator | `new RegExp(expected)` can throw — wrap in try/catch (already done in `assertions.ts`) |

---

## Dependency policy

- Only add a new production dependency if the functionality cannot reasonably be achieved with existing deps.
- Prefer packages with active maintenance, a security-aware team, and minimal transitive deps.
- Run `npm audit` before releasing; address all `high` and `critical` advisories.

---

## Data persistence

- The SQLite database schema must be migrated forward-compatibly. See `MIGRATION.md`.
- Do not open a second `better-sqlite3` connection to the same file from the main process.
- Never access the database from the renderer — all DB operations go through IPC.
