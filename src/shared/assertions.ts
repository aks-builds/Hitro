import { Assertion, AssertionResult } from './types'

function getByPath(context: { status?: number; headers?: Record<string, string>; body?: any }, path: string): any {
  if (path === 'status') return context.status
  if (path.startsWith('header.')) return context.headers?.[path.slice(7).toLowerCase()]

  const bodyPath = path.startsWith('body.') ? path.slice(5) : path
  const parts = bodyPath.split('.')
  let cur = context.body
  for (const part of parts) {
    if (cur == null) return undefined
    cur = cur[part]
  }
  return cur
}

export function runAssertions(
  assertions: Assertion[],
  context: { status?: number; headers?: Record<string, string>; body?: any },
): AssertionResult[] {
  return assertions.filter(a => a.enabled).map(a => {
    try {
      const actual = getByPath(context, a.field)
      let passed = false
      switch (a.operator) {
        case 'eq':        passed = String(actual) === String(a.expected); break
        case 'ne':        passed = String(actual) !== String(a.expected); break
        case 'contains':  passed = String(actual).includes(a.expected); break
        case 'matches':   passed = new RegExp(a.expected).test(String(actual)); break
        case 'exists':    passed = actual !== undefined && actual !== null; break
        case 'not_exists':passed = actual === undefined || actual === null; break
        case 'gt': {
          const nAct = Number(actual), nExp = Number(a.expected)
          if (isNaN(nAct) || isNaN(nExp)) throw new Error(`gt requires numeric values; got "${actual}" and "${a.expected}"`)
          passed = nAct > nExp; break
        }
        case 'lt': {
          const nAct = Number(actual), nExp = Number(a.expected)
          if (isNaN(nAct) || isNaN(nExp)) throw new Error(`lt requires numeric values; got "${actual}" and "${a.expected}"`)
          passed = nAct < nExp; break
        }
      }
      return { assertion: a, passed, actual }
    } catch (err: any) {
      return { assertion: a, passed: false, error: err.message }
    }
  })
}
