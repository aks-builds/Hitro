# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Dark-cinema theme** — Deep navy design system (`#080C14` base) with new CSS tokens: `--pk-elevated`, `--pk-border-s`, `--pk-glow`, semantic `--pk-success / --pk-warning / --pk-error`.
- **New animations** — `scale-in`, `slide-down`, `slide-up-in`, `glow-pulse`, `pulse-soft` keyframes across all modals and panels.
- **Custom window controls** — Native minimize / maximize / close buttons on Windows; `platform` exposed via IPC bridge.
- **Scrollable TabBar** — Overflow detection with left/right chevron scroll arrows; active tab auto-scrolls into view.
- **Global keyboard shortcuts** — `Ctrl+N` new tab, `Ctrl+W` close tab, `Ctrl+Enter` send, `Ctrl+S` save, `Ctrl+[/]` navigate tabs.
- **Delete confirmation modal** — `ConfirmModal` component (Escape-to-cancel, danger variant) used for destructive actions.
- **Environment-required warning banner** — Sidebar warns when imported requests contain unresolved `{{variables}}`.
- **8 new assertion operators** — `gte`, `lte`, `startsWith`, `endsWith`, `type`, `length`, `isEmpty`, `isNull`.
- **History Browser** — Collapsible sidebar section to view, restore, and clear past request executions (was IPC-only, no UI before).
- **Delete Request / Delete Environment UI** — Previously orphaned IPC handlers now have sidebar actions with confirmation.
- **Duplicate Request** — One-click copy of any sidebar request into the same collection.
- **Active environment badge** — TitleBar pill shows which environment is currently active.
- **Stream event ring buffer** — WebSocket / SSE / Kafka events capped at 1 000 to prevent memory growth.
- **Database migration versioning** — `schema_version` table prevents migrations from re-running across restarts.
- **Docs folder** — Technical reference docs moved to `docs/` for a cleaner GitHub root.

### Fixed

- **Windows file dialog crash** — `BrowserWindow.fromWebContents()` null-fallback + `defaultPath: app.getPath('home')` prevents shell dialog error on Windows.
- **Unicode checkmarks in test output** — `✓` / `✗` were stored as corrupted bytes (`âœ"` / `âœ—`); now correct UTF-8.
- **Response size always zero** — REST adapter now computes size from `content-length` header or body byte length.

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
