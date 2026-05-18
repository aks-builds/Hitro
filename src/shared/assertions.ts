import { Assertion, AssertionResult } from './types'

function getByPath(context: { status?: number; headers?: Record<string, string>; body?: any; duration?: number }, path: string): any {
  if (path === 'status')   return context.status
  if (path === 'duration') return context.duration
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
  context: { status?: number; headers?: Record<string, string>; body?: any; duration?: number },
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
        case 'gte': {
          const nAct = Number(actual), nExp = Number(a.expected)
          if (isNaN(nAct) || isNaN(nExp)) throw new Error(`gte requires numeric values; got "${actual}" and "${a.expected}"`)
          passed = nAct >= nExp; break
        }
        case 'lte': {
          const nAct = Number(actual), nExp = Number(a.expected)
          if (isNaN(nAct) || isNaN(nExp)) throw new Error(`lte requires numeric values; got "${actual}" and "${a.expected}"`)
          passed = nAct <= nExp; break
        }
        case 'startsWith': passed = String(actual).startsWith(a.expected); break
        case 'endsWith':   passed = String(actual).endsWith(a.expected); break
        case 'type':       passed = typeof actual === a.expected; break
        case 'length': {
          const len = actual?.length
          if (len === undefined) throw new Error(`length operator requires a string or array; got ${typeof actual}`)
          passed = len === Number(a.expected); break
        }
        case 'isEmpty':    passed = actual == null || actual === '' || (Array.isArray(actual) && actual.length === 0); break
        case 'isNull':     passed = actual == null; break
      }
      return { assertion: a, passed, actual }
    } catch (err: any) {
      return { assertion: a, passed: false, error: err.message }
    }
  })
}
