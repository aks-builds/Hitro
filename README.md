# Hitro

> **Nine protocols. Zero context switching.**

Hitro is an open-source desktop API client for testing REST, gRPC, GraphQL, WebSocket, Kafka, SQS, MQTT, SSE, and Socket.IO from a single unified interface. Built with Electron + React + TypeScript.

[![Build](https://github.com/duckcreek/hitro/actions/workflows/build.yml/badge.svg)](https://github.com/duckcreek/hitro/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-31-47848F)](https://www.electronjs.org/)

---

## Features

### Supported protocols

| Protocol | Capabilities |
|----------|-------------|
| **REST** | All HTTP methods · JSON / XML / text / form-data / URL-encoded bodies · Query params & custom headers |
| **gRPC** | Proto file loading · TLS · Service/method selection · Metadata |
| **GraphQL** | Queries & mutations · Variables editor · Operation name · Custom headers |
| **WebSocket** | Connect / send / disconnect · Real-time event log |
| **Kafka** | Produce & consume · Consumer group · fromBeginning · Max-message cap |
| **AWS SQS** | Send & receive · Region + queue URL · Message attributes · Custom credentials |
| **MQTT** | Publish & subscribe · QoS 0/1/2 · Retain flag · Broker auth |
| **SSE** | Server-Sent Events streaming · Custom headers · Max-event cap |
| **Socket.IO** | Emit & listen modes · Custom events · Payload JSON |

### Authentication

All auth types available for REST:

| Type | Fields |
|------|--------|
| None | — |
| Bearer Token | Token string |
| Basic Auth | Username + password |
| API Key | Key, value, header or query placement |
| OAuth 2.0 | Token URL, client ID/secret, scope — token fetched automatically |
| Digest Auth | Username + password |

### Developer tools

| Feature | Description |
|---------|-------------|
| **Collections** | Organise requests by project or domain, with folder support |
| **Collection Runner** | Run all requests in a collection sequentially, see pass/fail per request |
| **Environments** | Named variable sets; reference with `{{varName}}` |
| **Global Variables** | Cross-environment variables always available |
| **Assertions** | 8 operators against status, headers, and JSON body paths |
| **Pre/Post Scripts** | JavaScript sandboxed execution with `pm` API (Postman-compatible) |
| **History** | Last 100 requests persisted locally in SQLite |
| **Code Generation** | Export as cURL, JS fetch, Python requests, Node.js axios, PHP |
| **cURL Import** | Paste a `curl` command to create a request |
| **OpenAPI Import** | Import an OpenAPI 3.0 JSON spec to create a full collection |
| **Collection Export** | Export any collection to JSON |
| **Tabs** | Work on multiple requests simultaneously |
| **Console tab** | View `console.log()` output from scripts |

---

## Installation

### Download a release (recommended)

Go to [Releases](https://github.com/duckcreek/hitro/releases) and download the installer for your platform:

| Platform | File |
|----------|------|
| Windows | `Hitro-Setup-x.y.z.exe` (NSIS installer) |
| macOS | `Hitro-x.y.z.dmg` |
| Linux | `Hitro-x.y.z.AppImage` |

### Build from source

```bash
git clone https://github.com/duckcreek/hitro.git
cd Hitro
npm install           # also runs electron-rebuild automatically
npm run dist:win      # Windows .exe
npm run dist:mac      # macOS .dmg
npm run dist:linux    # Linux .AppImage
```

Installers are written to `release/`.

---

## Development

```bash
npm install
npm run dev
```

Starts the Vite dev server on `:5173` and launches Electron once ready. Hot-module replacement is active for the renderer.

```bash
npm run dev:main      # tsc --watch on main process only
npm run dev:renderer  # vite dev server only
```

---

## Scripts API (Pre/Post Scripts)

Hitro supports JavaScript scripts that run before a request is sent or after a response is received. The API is Postman-compatible:

```javascript
// Pre-request script
pm.variables.set('token', 'abc123')
pm.variables.get('baseUrl')

// Post-response script
const body = pm.response.json()
pm.variables.set('userId', body.id)

// Assertions in scripts
pm.test('status is 200', () => {
  pm.expect(pm.response.code).to.equal(200)
})

// Console output (visible in Console tab)
console.log('response body:', pm.response.json())
```

---

## Directory structure

```
src/
├── main/                   Electron main process
│   ├── adapters/           One file per protocol
│   │   ├── rest.ts         REST (axios, OAuth 2.0, all body types)
│   │   ├── grpc.ts         gRPC (@grpc/grpc-js)
│   │   ├── graphql.ts      GraphQL
│   │   ├── websocket.ts    WebSocket (ws)
│   │   ├── kafka.ts        Kafka (kafkajs)
│   │   ├── sqs.ts          AWS SQS (@aws-sdk/client-sqs)
│   │   ├── mqtt.ts         MQTT (mqtt)
│   │   ├── sse.ts          SSE (native fetch streaming)
│   │   └── socketio.ts     Socket.IO (socket.io-client)
│   ├── scripts.ts          Sandboxed JS execution (vm module)
│   ├── tools.ts            cURL import/export, OpenAPI import, code generation
│   ├── index.ts            App entry — BrowserWindow
│   ├── database.ts         SQLite schema and CRUD helpers
│   ├── ipc.ts              IPC handler registrations
│   └── preload.ts          Context bridge
├── renderer/               React frontend
│   ├── components/         UI components
│   │   ├── protocols/      Per-protocol config panels
│   │   ├── Sidebar.tsx     Collections, environments, global vars, import
│   │   ├── RequestBuilder.tsx
│   │   ├── ResponsePanel.tsx
│   │   ├── CollectionRunner.tsx
│   │   └── ImportModal.tsx
│   ├── store/appStore.ts   Zustand state
│   └── App.tsx
└── shared/
    ├── types.ts            All TypeScript interfaces
    └── assertions.ts       Assertion evaluation engine
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 20 LTS |
| npm | 10 |
| Git | 2.40 |

> **macOS:** Xcode Command Line Tools required (`xcode-select --install`)  
> **Linux:** `libgtk-3-0 libxss1 libnss3 libasound2 libgbm1`  
> **Windows:** No extra dependencies needed

---

## CI / Releases

GitHub Actions builds native installers on each platform's own runner:

| Trigger | What happens |
|---------|-------------|
| Push tag `v*` | Builds Windows + macOS + Linux, creates a GitHub Release |
| `workflow_dispatch` | Manual build — creates a draft release by default |

See [`.github/workflows/build.yml`](.github/workflows/build.yml).

To cut a release:

```bash
git tag v1.2.0
git push origin v1.2.0
```

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

## License

[MIT](LICENSE) © 2026 aks-builds
