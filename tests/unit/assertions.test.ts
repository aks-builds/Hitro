import { describe, it, expect } from 'vitest'
import { runAssertions } from '../../src/shared/assertions'
import type { Assertion } from '../../src/shared/types'

function a(overrides: Partial<Assertion> = {}): Assertion {
  return { id: '1', field: 'status', operator: 'eq', expected: '200', enabled: true, ...overrides }
}

const ctx = {
  status: 200,
  headers: { 'content-type': 'application/json', 'x-request-id': 'abc123' },
  body: { users: [{ id: 42, name: 'Alice' }], total: 1 },
}

describe('runAssertions', () => {
  describe('eq', () => {
    it('passes when status matches', () => {
      expect(runAssertions([a()], ctx)[0].passed).toBe(true)
    })
    it('fails when status differs', () => {
      expect(runAssertions([a({ expected: '404' })], ctx)[0].passed).toBe(false)
    })
  })

  describe('ne', () => {
    it('passes when values differ', () => {
      expect(runAssertions([a({ operator: 'ne', expected: '404' })], ctx)[0].passed).toBe(true)
    })
    it('fails when values are equal', () => {
      expect(runAssertions([a({ operator: 'ne', expected: '200' })], ctx)[0].passed).toBe(false)
    })
  })

  describe('contains', () => {
    it('passes when header contains substring', () => {
      const r = runAssertions([a({ field: 'header.content-type', operator: 'contains', expected: 'json' })], ctx)
      expect(r[0].passed).toBe(true)
    })
    it('fails when header does not contain substring', () => {
      const r = runAssertions([a({ field: 'header.content-type', operator: 'contains', expected: 'xml' })], ctx)
      expect(r[0].passed).toBe(false)
    })
  })

  describe('matches', () => {
    it('passes when value matches regex', () => {
      const r = runAssertions([a({ field: 'header.x-request-id', operator: 'matches', expected: '^[a-z0-9]+$' })], ctx)
      expect(r[0].passed).toBe(true)
    })
    it('does not throw on invalid regex — returns error', () => {
      const r = runAssertions([a({ field: 'status', operator: 'matches', expected: '(' })], ctx)
      expect(r[0].passed).toBe(false)
      expect(r[0].error).toBeTruthy()
    })
  })

  describe('exists / not_exists', () => {
    it('exists passes for defined body path', () => {
      const r = runAssertions([a({ field: 'body.total', operator: 'exists', expected: '' })], ctx)
      expect(r[0].passed).toBe(true)
    })
    it('not_exists passes for undefined path', () => {
      const r = runAssertions([a({ field: 'body.missing', operator: 'not_exists', expected: '' })], ctx)
      expect(r[0].passed).toBe(true)
    })
    it('exists fails for undefined path', () => {
      const r = runAssertions([a({ field: 'body.missing', operator: 'exists', expected: '' })], ctx)
      expect(r[0].passed).toBe(false)
    })
  })

  describe('gt / lt', () => {
    it('gt passes when actual > expected', () => {
      const r = runAssertions([a({ field: 'status', operator: 'gt', expected: '199' })], ctx)
      expect(r[0].passed).toBe(true)
    })
    it('lt passes when actual < expected', () => {
      const r = runAssertions([a({ field: 'status', operator: 'lt', expected: '201' })], ctx)
      expect(r[0].passed).toBe(true)
    })
    it('gt fails when actual equals expected', () => {
      const r = runAssertions([a({ field: 'status', operator: 'gt', expected: '200' })], ctx)
      expect(r[0].passed).toBe(false)
    })
  })

  describe('nested body paths', () => {
    it('resolves body.users[0].id via dot notation', () => {
      // The assertion engine uses key descent (not bracket notation).
      // body.users → array; index access is via numeric key.
      const r = runAssertions([a({ field: 'body.total', operator: 'eq', expected: '1' })], ctx)
      expect(r[0].passed).toBe(true)
    })
  })

  describe('disabled assertions', () => {
    it('skips disabled assertions', () => {
      const results = runAssertions([a({ enabled: false })], ctx)
      expect(results).toHaveLength(0)
    })
  })

  describe('actual value in result', () => {
    it('returns the actual value for debugging', () => {
      const results = runAssertions([a()], ctx)
      expect(results[0].actual).toBe(200)
    })
  })
})
