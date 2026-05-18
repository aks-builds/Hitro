# Testing

Hitro uses [Playwright](https://playwright.dev/) for end-to-end (E2E) tests executed against the real Electron application, and [Vitest](https://vitest.dev/) for unit tests on pure logic.

---

## Running tests

```bash
# All tests
npm test

# Unit tests only (fast, no Electron)
npm run test:unit

# E2E tests (launches Electron)
npm run test:e2e

# E2E with UI reporter
npm run test:e2e -- --reporter=html
```

---

## Unit tests

Unit tests live alongside source files or in `tests/unit/`.

**What to unit test:**
- `src/shared/assertions.ts` — assertion operators against known inputs
- `src/shared/types.ts` — type guard utilities (if any)
- Adapter utility functions (URL building, header normalisation, etc.)

**What NOT to unit test:**
- IPC handlers (test these E2E)
- React components (test these E2E via the rendered UI)
- SQLite queries (use an in-memory database in integration tests)

### Writing a unit test

```typescript
// tests/unit/assertions.test.ts
import { describe, it, expect } from 'vitest'
import { runAssertions } from '../../src/shared/assertions'

describe('runAssertions', () => {
  it('eq passes when status matches', () => {
    const results = runAssertions(
      [{ id: '1', field: 'status', operator: 'eq', expected: '200', enabled: true }],
      { status: 200 }
    )
    expect(results[0].passed).toBe(true)
  })
})
```

---

## E2E tests

E2E tests live in `tests/e2e/`. They use `@playwright/test` with direct Electron launch.

### Configuration

`playwright.config.ts` at the repo root configures the Electron executable path and global test settings.

### Writing an E2E test

```typescript
// tests/e2e/rest.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('REST requests', () => {
  let app: Electron.ElectronApplication

  test.beforeAll(async () => {
    app = await electron.launch({ args: ['.'] })
  })

  test.afterAll(async () => {
    await app.close()
  })

  test('sends a GET request and shows status 200', async () => {
    const page = await app.firstWindow()
    // ... interact with the UI
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200')
  })
})
```

### Test IDs

Add `data-testid` attributes to components that tests need to query. Prefer `data-testid` over class selectors so tests survive style refactors.

---

## CI

The full test suite runs on every pull request and push to `main`. See `.github/workflows/ci.yml`.

Tests are skipped on documentation-only changes (files matching `**/*.md`, `docs/**`).

---

## Definition of Done for tests

- Every new protocol adapter must have at least one E2E smoke test.
- Every bug fix must include a regression test.
- Unit test coverage for the assertions engine must remain at 100 % line coverage.

See [DoD.md](DoD.md) for the full Definition of Done checklist.
