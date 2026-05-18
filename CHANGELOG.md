# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2024-07-01

### Added

- **REST adapter** — full HTTP method support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS), JSON/XML/text/form bodies, Bearer and Basic auth, query params, custom headers.
- **gRPC adapter** — proto file loading via `@grpc/proto-loader`, TLS toggle, metadata key-value pairs.
- **GraphQL adapter** — query and mutation execution, variables editor, operation name, custom headers.
- **WebSocket adapter** — connect/send/disconnect lifecycle with real-time event stream.
- **Kafka adapter** — producer and consumer modes, consumer groups, `fromBeginning` option, max-message cap.
- **AWS SQS adapter** — send and receive modes, message attributes, region + queue URL configuration.
- **Collections** — organise requests by project, persistent via SQLite.
- **Environments** — named variable sets with `{{varName}}` substitution in request configs.
- **Assertions** — 8 operators (`eq`, `ne`, `contains`, `matches`, `exists`, `not_exists`, `gt`, `lt`) against status, headers, and body.
- **Request history** — last 100 executions persisted locally.
- **Tab system** — work on multiple requests simultaneously.
- **Dark theme** — per-protocol colour coding across the UI.
- SQLite persistence via `better-sqlite3` in Electron `userData`.
- Context-isolated IPC bridge (no `nodeIntegration`).

[1.0.0]: https://github.com/duckcreek/hitro/releases/tag/v1.0.0
