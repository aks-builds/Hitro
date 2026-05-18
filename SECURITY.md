# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing **its.aks@outlook.com** with:

- A description of the vulnerability
- Steps to reproduce it
- The version of Hitro you're running
- Your operating system

We aim to acknowledge all reports within **2 business days** and to release a patch within **14 days** for confirmed critical issues.

## Known security model

Hitro is a desktop application that runs entirely on your machine. It intentionally operates outside a browser sandbox to reach local network services, proto files, and AWS credentials. The following are design decisions, not vulnerabilities:

- **Credential storage** — AWS SQS `accessKeyId` / `secretAccessKey` and gRPC metadata are stored in plain text in the local SQLite database (`hitro.db`). The database is located in your OS user-data directory and is not sent to any remote server. If you need stronger at-rest protection, encrypt your home directory.
- **No telemetry** — Hitro does not phone home. No analytics, no crash reporting, no usage metrics are collected.
- **Local-only** — All network traffic is initiated explicitly by the user. Hitro does not open any listening sockets.

## Electron security hardening

- `nodeIntegration` is disabled in the renderer.
- `contextIsolation` is enabled.
- The preload script exposes only the minimum IPC surface via `contextBridge`.
- `webSecurity` follows Electron defaults (enabled).
