# Definition of Done

A change is "done" only when **all** items below are checked off.

## Code

- [ ] Compiles without TypeScript errors on both `tsconfig.json` and `tsconfig.main.json`
- [ ] No `any` types introduced without an explanatory comment
- [ ] No Node.js built-in modules imported in renderer-side files
- [ ] No console.log / console.error left in production code paths
- [ ] All new IPC channels are listed in `docs/ARCHITECTURE.md`

## Tests

- [ ] Unit tests pass (`npm run test:unit`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] New behaviour is covered by at least one test
- [ ] Bug fixes include a regression test
- [ ] Assertions engine line coverage remains 100 %

## Security

- [ ] No credentials or tokens are logged
- [ ] User-controlled strings are not passed to `eval` or `Function()`
- [ ] File paths from user input are validated / sandboxed before OS use
- [ ] AWS credentials remain in the main-process config object only

## Documentation

- [ ] `CHANGELOG.md` entry added under the appropriate version header
- [ ] `docs/ARCHITECTURE.md` updated if IPC channels or the data model changed
- [ ] `README.md` updated if user-facing behaviour changed
- [ ] Inline comments added for non-obvious logic only

## Review

- [ ] PR description links related issues
- [ ] CI passes (type-check + tests)
- [ ] One maintainer approval received
- [ ] Branch is up to date with `main`
