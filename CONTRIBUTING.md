# Contributing to Hitro

Thank you for taking the time to contribute! Whether it's a bug fix, a new protocol adapter, or improved docs — all contributions matter.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Commit conventions](#commit-conventions)
- [Pull request process](#pull-request-process)
- [Adding a protocol adapter](#adding-a-protocol-adapter)
- [Code style](#code-style)
- [Reporting bugs](#reporting-bugs)
- [Requesting features](#requesting-features)

---

## Code of conduct

This project follows a standard [Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

---

## Getting started

1. Fork and clone the repo:
   ```bash
   git clone https://github.com/<your-username>/Hitro.git
   cd Hitro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev build:
   ```bash
   npm run dev
   ```

4. Verify everything compiles cleanly:
   ```bash
   npx tsc -p tsconfig.json --noEmit
   npx tsc -p tsconfig.main.json --noEmit
   ```

---

## Development workflow

| Branch | Purpose |
|--------|---------|
| `main` | Stable, always releasable |
| `feat/<short-name>` | Feature branches |
| `fix/<short-name>` | Bug fix branches |
| `docs/<short-name>` | Documentation-only changes |
| `chore/<short-name>` | Tooling / dependency updates |

1. Branch off `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make focused, atomic commits (see [commit conventions](#commit-conventions)).

3. Run the test suite before pushing:
   ```bash
   npm test
   ```

4. Open a pull request against `main`.

---

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

**Scopes (optional but recommended):**
- `rest`, `grpc`, `graphql`, `websocket`, `kafka`, `sqs` — protocol adapters
- `ui` — renderer components
- `ipc` — Electron IPC layer
- `db` — SQLite / database
- `store` — Zustand state
- `assertions` — assertion engine

**Examples:**
```
feat(grpc): support streaming RPCs
fix(rest): honour Content-Type for PATCH requests
docs: add gRPC quickstart to README
chore(deps): bump electron to 32.x
```

---

## Pull request process

1. Fill in the PR template completely.
2. Link any related issues (`Closes #123`).
3. Ensure CI passes (type-check, lint, tests).
4. One approving review is required from a maintainer.
5. Maintainers squash-merge to keep history clean.

**Do not** force-push to `main` or to someone else's PR branch.

---

## Adding a protocol adapter

Hitro is designed to be extensible. To add a new protocol:

1. **Shared types** (`src/shared/types.ts`) — add a `XxxConfig` interface and extend `ProtocolConfig`, `Protocol`, and `PROTOCOL_META`.

2. **Main adapter** (`src/main/adapters/xxx.ts`) — export an `executeXxx(config, assertions)` function returning `Promise<HitroResponse>`.

3. **IPC handler** (`src/main/ipc.ts`) — register `ipcMain.handle('xxx:execute', ...)`.

4. **UI config panel** (`src/renderer/components/protocols/XxxConfig.tsx`) — a React component rendering the protocol's fields.

5. **RequestBuilder** (`src/renderer/components/RequestBuilder.tsx`) — add a `case 'xxx':` to the protocol switcher.

6. **Tests** — add unit tests for the adapter and E2E tests for the UI flow.

See `ARCHITECTURE.md` for the full IPC contract.

---

## Code style

- **TypeScript strict mode** is enforced — no `any` without a comment explaining why.
- Prefer functional components and hooks; no class components.
- State mutations go through Zustand actions in `appStore.ts`, not local component state (except truly ephemeral UI state).
- No default exports from files with more than one export.
- Keep adapter files focused: one file per protocol, no shared state between adapters.

There are no automated formatters configured yet. Match the surrounding code style until a formatter is added.

---

## Reporting bugs

Open an issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml). Please include:

- Hitro version (visible in the app title bar)
- Operating system and version
- Steps to reproduce
- Expected vs actual behaviour
- Relevant logs (Help → Open Dev Tools → Console tab)

---

## Requesting features

Open an issue using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml). Describe the problem you're trying to solve, not just the solution.
