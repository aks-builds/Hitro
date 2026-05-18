# Agent Development Notes

This file documents conventions for AI coding agents (Claude, Copilot, Cursor, etc.) working on the Hitro codebase.

## Before you start

1. Read `CLAUDE.md` for a concise codebase orientation.
2. Read `docs/ARCHITECTURE.md` for the Electron process model and IPC contract.
3. Run `npx tsc -p tsconfig.json --noEmit && npx tsc -p tsconfig.main.json --noEmit` to confirm the repo compiles before making changes.

## Boundaries

| Boundary | Rule |
|----------|------|
| Renderer ↔ Main | All cross-boundary calls go through the IPC channels declared in `preload.ts`. Never bypass via `remote` or `eval`. |
| Adapters | Each adapter is self-contained. Do not import one adapter from another. |
| Store | Renderer state mutations must go through Zustand actions, not direct object mutation. |
| Database | SQLite access is limited to `src/main/database.ts`. Do not open a second connection. See `docs/GUARDRAILS.md`. |

## Change checklist

Before marking a task complete:

- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] Existing tests pass (`npm test`)
- [ ] New behaviour is covered by a test
- [ ] No Node APIs imported in renderer files
- [ ] No secrets logged or exposed to the renderer beyond the minimum needed

## Scope creep guard

Work only on what was requested. If you identify a related improvement, note it in a comment or open a separate issue — do not fold it into the current change.

## Generating new adapters

Follow the exact pattern in an existing adapter (`src/main/adapters/rest.ts` is the simplest reference):

1. Accept `(config: XxxConfig, assertions: Assertion[])` — do not accept other arguments.
2. Return `Promise<HitroResponse>` — catch all errors and return `{ error: err.message, duration, timestamp }`.
3. Call `runAssertions` from `src/shared/assertions.ts` for applicable response types.
4. Export a single named function. No class, no default export.
