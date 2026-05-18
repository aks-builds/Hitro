# Architecture

Hitro is a desktop application built on [Electron](https://electronjs.org/). It has two isolated JavaScript runtimes that communicate via Inter-Process Communication (IPC).

---

## Process model

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer process  (Chromium — sandboxed)                   │
│                                                             │
│   React 18 + Zustand + Vite HMR                             │
│   └── components/                                           │
│       ├── Layout, Sidebar, TabBar                           │
│       ├── RequestBuilder  ─── protocol config panels        │
│       ├── ResponsePanel                                     │
│       └── AssertionEditor                                   │
│                                                             │
│   window.hitroAPI  (exposed by preload via contextBridge)   │
└──────────────────────────┬──────────────────────────────────┘
                           │  contextBridge / ipcRenderer
                    (serialised JSON)
┌──────────────────────────┴──────────────────────────────────┐
│  Preload script  (runs in renderer, can call ipcRenderer)   │
│  src/main/preload.ts                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │  ipcMain.handle / ipcRenderer.invoke
┌──────────────────────────┴──────────────────────────────────┐
│  Main process  (Node.js — full OS access)                   │
│                                                             │
│   src/main/index.ts     BrowserWindow creation              │
│   src/main/ipc.ts       IPC handler registrations           │
│   src/main/database.ts  SQLite via better-sqlite3           │
│   src/main/adapters/    Protocol implementations            │
│       rest.ts           axios                               │
│       grpc.ts           @grpc/grpc-js + proto-loader        │
│       graphql.ts        axios (GraphQL over HTTP)           │
│       websocket.ts      ws                                  │
│       kafka.ts          kafkajs                             │
│       sqs.ts            @aws-sdk/client-sqs                 │
└─────────────────────────────────────────────────────────────┘
```

**Key security choices:**
- `nodeIntegration: false` — the renderer cannot call Node APIs directly.
- `contextIsolation: true` — the preload script runs in a separate context from the page.
- The contextBridge exposes only the minimum surface needed.

---

## IPC contract

All communication is asynchronous invoke/handle pairs. Channel names follow `<protocol>:<action>`:

| Channel | Direction | Payload | Return |
|---------|-----------|---------|--------|
| `rest:execute` | renderer → main | `{ config: RestConfig, assertions: Assertion[] }` | `HitroResponse` |
| `grpc:execute` | renderer → main | `{ config: GrpcConfig, assertions: Assertion[] }` | `HitroResponse` |
| `graphql:execute` | renderer → main | `{ config: GraphqlConfig, assertions: Assertion[] }` | `HitroResponse` |
| `websocket:execute` | renderer → main | `{ config: WebSocketConfig }` | `HitroResponse` |
| `kafka:execute` | renderer → main | `{ config: KafkaConfig }` | `HitroResponse` |
| `sqs:execute` | renderer → main | `{ config: SqsConfig }` | `HitroResponse` |
| `db:getCollections` | renderer → main | — | `Collection[]` |
| `db:saveCollection` | renderer → main | `Collection` | `void` |
| `db:deleteCollection` | renderer → main | `{ id: string }` | `void` |
| `db:getRequests` | renderer → main | `{ collectionId?: string }` | `PikoRequest[]` |
| `db:saveRequest` | renderer → main | `PikoRequest` | `void` |
| `db:deleteRequest` | renderer → main | `{ id: string }` | `void` |
| `db:getHistory` | renderer → main | — | `HitroResponse[]` |
| `db:addHistory` | renderer → main | `HitroResponse` | `void` |
| `db:getEnvironments` | renderer → main | — | `Environment[]` |
| `db:saveEnvironment` | renderer → main | `Environment` | `void` |
| `db:deleteEnvironment` | renderer → main | `{ id: string }` | `void` |
| `db-get-history` | renderer → main | — | `{ request, response, timestamp }[]` |
| `db-clear-history` | renderer → main | — | `{ ok: boolean }` |
| `stream-event` | main → renderer | `{ requestId: string; event: StreamEvent }` | — (push) |

---

## State management

`src/renderer/store/appStore.ts` is the single Zustand store. All renderer state lives here.

Key slices:
- **tabs** — open request tabs (transient, not persisted); each tab carries a `streamEvents` ring buffer (capped at 1 000 entries) and an `isDirty` flag shown as an amber dot in the tab bar
- **activeTabId** — currently visible tab
- **collections** — loaded from SQLite on startup
- **environments** — loaded from SQLite on startup
- **activeEnvironmentId** — which env's variables are substituted; the active name is shown as a badge in the title bar
- **globalVariables** — cross-environment key-value pairs

---

## Database schema (SQLite)

Tables live in `hitro.db` in Electron's `userData` directory.

```sql
CREATE TABLE collections (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  variables  TEXT NOT NULL,  -- JSON: KeyValue[]
  createdAt  INTEGER NOT NULL
);

CREATE TABLE requests (
  id           TEXT PRIMARY KEY,
  collectionId TEXT,
  name         TEXT NOT NULL,
  protocol     TEXT NOT NULL,
  config       TEXT NOT NULL,   -- JSON: ProtocolConfig
  assertions   TEXT NOT NULL,   -- JSON: Assertion[]
  createdAt    INTEGER NOT NULL,
  updatedAt    INTEGER NOT NULL
);

CREATE TABLE history (
  id        TEXT PRIMARY KEY,
  response  TEXT NOT NULL,  -- JSON: HitroResponse
  timestamp INTEGER NOT NULL
);

CREATE TABLE environments (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  variables TEXT NOT NULL,  -- JSON: KeyValue[]
  isActive  INTEGER NOT NULL
);
```

---

## Environment variable substitution

When the renderer sends a request config, the store replaces `{{varName}}` tokens with values from the active environment before invoking the IPC channel. Substitution is shallow string replacement — no expression evaluation.

---

## Assertion engine (`src/shared/assertions.ts`)

`runAssertions(assertions, context)` maps over enabled assertions and evaluates each against a context object containing `status`, `headers`, and `body`.

Field paths use dot notation:
- `status` → HTTP status code
- `header.content-type` → response header (lowercased)
- `body.users[0].id` → nested body path (via recursive key descent)

---

## Build pipeline

```
npm run build
 ├── build:renderer  → vite build → dist/renderer/
 └── build:main      → tsc (tsconfig.main.json) → dist/main/

npm run dist[:win|:mac]
 └── electron-builder → release/<platform-installer>
```

Vite bundles the renderer into `dist/renderer/`. The main TypeScript compiles to `dist/main/`. Electron-builder packages both together with `node_modules` into a native installer.

---

## Adding a protocol adapter

See the [Contributing guide](../CONTRIBUTING.md#adding-a-protocol-adapter) for step-by-step instructions.
