# Hitro — context for AI coding assistants

## What this project is

Hitro is a desktop API client (Electron + React + TypeScript) that supports nine protocols: REST, gRPC, GraphQL, WebSocket, Kafka, AWS SQS, MQTT, SSE, and Socket.IO. It is a local-first application — all data is stored in a SQLite database (`hitro.db`) on the user's machine.

## Key files

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | All TypeScript interfaces; start here to understand the data model |
| `src/shared/assertions.ts` | Assertion evaluation logic; pure, unit-testable |
| `src/main/adapters/*.ts` | One file per protocol; each exports a single `executeXxx()` function |
| `src/main/ipc.ts` | All `ipcMain.handle()` registrations |
| `src/main/database.ts` | SQLite schema and query helpers |
| `src/main/preload.ts` | The only bridge between renderer and main process |
| `src/main/mockServer.ts` | Built-in HTTP mock server manager |
| `src/renderer/store/appStore.ts` | Single Zustand store; all renderer state lives here |
| `src/renderer/components/RequestBuilder.tsx` | Dispatches to per-protocol UI panels |
| `src/renderer/components/protocols/*.tsx` | Per-protocol config UI |
| `src/renderer/components/MockServerPanel.tsx` | Mock server management UI |
| `src/renderer/components/LoadTestPanel.tsx` | Load test configuration and results UI |

## Architecture in one paragraph

The renderer (Chromium, sandboxed) communicates with the main process (Node.js) exclusively through typed IPC channels defined in `preload.ts`. The main process owns all side effects: network calls, file I/O, SQLite, mock HTTP servers. The renderer owns all UI state via Zustand. Shared types (`src/shared/`) are imported by both processes.

## Conventions

- IPC channel names: `<protocol>:execute`, `db:<operation>`
- Adapters return `PikoResponse` — never throw; surface errors in the `error` field
- `KeyValue[]` arrays are used everywhere for user-editable pairs; filter by `enabled && key` before using
- `{{varName}}` tokens in config strings are replaced in the store before IPC dispatch
- Chain rules (`ChainRule[]` on `PikoRequest`) are applied after execution in ipc.ts and returned as `chainExtractions` on the response

## Key features added beyond baseline

| Feature | Where |
|---------|-------|
| AWS SigV4 auth | `src/main/adapters/rest.ts` — pure crypto, no SDK needed |
| mTLS auth | `src/main/adapters/rest.ts` — `https.Agent` with cert/key |
| Response snapshot testing | `snapshot-*` IPC handlers + `ResponsePanel.tsx` Snapshots tab |
| Built-in mock server | `src/main/mockServer.ts` + `MockServerPanel.tsx` |
| Load / performance testing | `load-test` IPC handler + `LoadTestPanel.tsx` |
| Request chaining | `ChainRule` on `PikoRequest`; extracted in ipc.ts, written to env in `RequestBuilder.tsx` |
| HAR file import | `importHar()` in `tools.ts` |
| .env file import | `importDotenv()` in `tools.ts` |

## Common tasks

**Add a new assertion operator:**
1. Add the literal type to `Assertion.operator` in `src/shared/types.ts`
2. Add the `case` in `runAssertions` in `src/shared/assertions.ts`
3. Add the option to the `<select>` in `src/renderer/components/AssertionEditor.tsx`

**Add a new protocol:**
See CONTRIBUTING.md → "Adding a protocol adapter" for the full checklist.

**Change the database schema:**
Edit `src/main/database.ts`. Add a migration guard with a version check if existing data must be preserved — do not just alter the schema in place.

## What to avoid

- Do not import Node built-ins in renderer files (`fs`, `path`, `os`, etc.) — the renderer is sandboxed
- Do not add shared mutable state between protocol adapters
- Do not store secrets (AWS keys, tokens) in the renderer store — they live only in config objects passed through IPC and stored in SQLite
