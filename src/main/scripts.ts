import vm from 'vm'
import { PikoRequest, PikoResponse, KeyValue, ScriptLog } from '../shared/types'

interface ScriptContext {
  request?: Partial<PikoRequest>
  response?: PikoResponse
  variables: Record<string, string>
}

interface ScriptResult {
  variables: Record<string, string>
  logs: ScriptLog[]
  error?: string
}

export function runScript(script: string, ctx: ScriptContext): ScriptResult {
  const logs: ScriptLog[] = []
  const variables = { ...ctx.variables }

  const sandbox = {
    pm: {
      request: ctx.request ?? {},
      variables: {
        get: (k: string) => variables[k],
        set: (k: string, v: string) => { variables[k] = String(v) },
        has: (k: string) => k in variables,
        unset: (k: string) => { delete variables[k] },
        toObject: () => ({ ...variables }),
      },
      environment: {
        get: (k: string) => variables[k],
        set: (k: string, v: string) => { variables[k] = String(v) },
      },
      test: (name: string, fn: () => void) => {
        try {
          fn()
          logs.push({ level: 'log', message: `✓ ${name}`, timestamp: Date.now() })
        } catch (e: any) {
          logs.push({ level: 'error', message: `✗ ${name}: ${e.message}`, timestamp: Date.now() })
        }
      },
      expect: (actual: any) => ({
        to: {
          equal: (expected: any) => { if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`) },
          eql: (expected: any) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Deep equal failed`) },
          include: (str: string) => { if (!String(actual).includes(str)) throw new Error(`Expected "${actual}" to include "${str}"`) },
          be: {
            ok: () => { if (!actual) throw new Error(`Expected truthy, got ${actual}`) },
            a: (t: string) => { if (typeof actual !== t) throw new Error(`Expected type ${t}, got ${typeof actual}`) },
          },
          have: {
            status: (code: number) => { if (ctx.response?.status !== code) throw new Error(`Expected status ${code}, got ${ctx.response?.status}`) },
            property: (key: string) => { if (!(key in (actual ?? {}))) throw new Error(`Expected property "${key}"`) },
          },
          not: {
            equal: (v: any) => { if (actual === v) throw new Error(`Expected not ${JSON.stringify(v)}`) },
            include: (str: string) => { if (String(actual).includes(str)) throw new Error(`Expected not to include "${str}"`) },
          },
        },
      }),
      response: {
        to: {
          have: {
            status: (code: number) => { if (ctx.response?.status !== code) throw new Error(`Expected status ${code}, got ${ctx.response?.status}`) },
            header: (k: string) => { if (!(k.toLowerCase() in (ctx.response?.headers ?? {}))) throw new Error(`Expected header ${k}`) },
          },
          be: {
            ok: () => { const s = ctx.response?.status ?? 0; if (s < 200 || s >= 300) throw new Error(`Expected 2xx, got ${s}`) },
          },
        },
        json: () => ctx.response?.body,
        text: () => ctx.response?.rawBody ?? '',
        code: ctx.response?.status,
        responseTime: ctx.response?.duration,
      },
    },
    console: (() => {
      // Serialize any value correctly — handles undefined, null, circular refs, functions
      const serialize = (x: any): string => {
        if (x === undefined)     return 'undefined'
        if (x === null)          return 'null'
        if (typeof x === 'function') return `[Function: ${x.name || 'anonymous'}]`
        if (typeof x !== 'object') return String(x)
        try { return JSON.stringify(x, null, 2) }
        catch { return '[Circular]' }
      }
      const log = (level: 'log' | 'warn' | 'error') =>
        (...a: any[]) => logs.push({ level, message: a.map(serialize).join(' '), timestamp: Date.now() })
      return { log: log('log'), warn: log('warn'), error: log('error') }
    })(),
    JSON,
    parseInt,
    parseFloat,
    Math,
    Date,
    setTimeout: undefined,
    setInterval: undefined,
    clearTimeout: undefined,
    clearInterval: undefined,
    fetch: undefined,
    require: undefined,
    process: undefined,
  }

  try {
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: 5000, filename: 'script.js' })
    return { variables, logs }
  } catch (err: any) {
    return { variables, logs, error: err.message }
  }
}
