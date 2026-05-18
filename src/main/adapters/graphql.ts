import axios from 'axios'
import { GraphqlConfig, Assertion, PikoResponse } from '../../shared/types'
import { runAssertions } from '../../shared/assertions'

export async function executeGraphql(config: GraphqlConfig, assertions: Assertion[]): Promise<PikoResponse> {
  const start = Date.now()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })

  let variables = {}
  try { variables = JSON.parse(config.variables || '{}') } catch { /* ignore */ }

  const payload: any = { query: config.query, variables }
  if (config.operationName) payload.operationName = config.operationName

  try {
    const res = await axios.post(config.url, payload, { headers, validateStatus: () => true, timeout: 30000 })
    const duration = Date.now() - start
    const rawBody = JSON.stringify(res.data, null, 2)
    const responseHeaders: Record<string, string> = {}
    Object.entries(res.headers).forEach(([k, v]) => { responseHeaders[k.toLowerCase()] = String(v) })

    return {
      status: res.status, statusText: res.statusText,
      headers: responseHeaders, body: res.data, rawBody,
      duration, size: rawBody.length, timestamp: Date.now(),
      assertionResults: runAssertions(assertions, { status: res.status, headers: responseHeaders, body: res.data }),
    }
  } catch (err: any) {
    return { error: err.message, duration: Date.now() - start, timestamp: Date.now() }
  }
}
