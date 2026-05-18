import { SseConfig, PikoResponse, StreamEvent } from '../../shared/types'
import { runAssertions } from '../../shared/assertions'
import { Assertion } from '../../shared/types'

export async function executeSse(
  config: SseConfig,
  assertions: Assertion[],
  onStreamEvent: (e: StreamEvent) => void,
): Promise<PikoResponse> {
  const start = Date.now()

  const headers: Record<string, string> = { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' }
  config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })

  return new Promise(async resolve => {
    let settled = false
    let count = 0

    const done = (res: PikoResponse) => {
      if (settled) return
      settled = true
      resolve(res)
    }

    const controller = new AbortController()
    const overallTimeout = setTimeout(() => {
      controller.abort()
      done({ body: { eventsReceived: count }, rawBody: `Received ${count} SSE events (timeout)`, duration: Date.now() - start, timestamp: Date.now() })
    }, 60000)

    try {
      const response = await fetch(config.url, { headers, signal: controller.signal })
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((v, k) => { responseHeaders[k.toLowerCase()] = v })

      if (!response.ok || !response.body) {
        clearTimeout(overallTimeout)
        return done({ status: response.status, statusText: response.statusText, headers: responseHeaders, duration: Date.now() - start, timestamp: Date.now(), error: `HTTP ${response.status} ${response.statusText}` })
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let lastEventId = ''
      let eventType = 'message'
      let dataLines: string[] = []

      const dispatchEvent = () => {
        if (!dataLines.length) return
        const data = dataLines.join('\n')
        onStreamEvent({ id: `sse-${count}`, type: 'received', data: eventType !== 'message' ? `[${eventType}] ${data}` : data, timestamp: Date.now() })
        count++
        dataLines = []
        eventType = 'message'
        if (count >= config.maxEvents) {
          clearTimeout(overallTimeout)
          reader.cancel()
          done({ status: response.status, statusText: response.statusText, headers: responseHeaders, body: { eventsReceived: count }, rawBody: `Received ${count} SSE events`, duration: Date.now() - start, timestamp: Date.now(), assertionResults: runAssertions(assertions, { status: response.status, headers: responseHeaders, body: { eventsReceived: count } }) })
        }
      }

      while (!settled) {
        const { done: readerDone, value } = await reader.read()
        if (readerDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line === '') { dispatchEvent(); continue }
          if (line.startsWith(':')) continue
          const colonIdx = line.indexOf(':')
          const field = colonIdx >= 0 ? line.slice(0, colonIdx) : line
          const val = colonIdx >= 0 ? line.slice(colonIdx + 1).replace(/^ /, '') : ''
          if (field === 'data') dataLines.push(val)
          else if (field === 'event') eventType = val
          else if (field === 'id') lastEventId = val
        }
      }

      if (!settled) {
        clearTimeout(overallTimeout)
        done({ status: response.status, headers: responseHeaders, body: { eventsReceived: count }, rawBody: `Received ${count} SSE events`, duration: Date.now() - start, timestamp: Date.now(), assertionResults: runAssertions(assertions, { status: response.status, headers: responseHeaders, body: { eventsReceived: count } }) })
      }
    } catch (err: any) {
      clearTimeout(overallTimeout)
      if (!settled) done({ error: err.name === 'AbortError' ? 'Aborted' : err.message, duration: Date.now() - start, timestamp: Date.now() })
    }
  })
}
