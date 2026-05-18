import crypto from 'crypto'
import WebSocket from 'ws'
import { WebSocketConfig, PikoResponse, StreamEvent } from '../../shared/types'

const _connections = new Map<string, WebSocket>()

export function executeWebSocket(
  config: WebSocketConfig,
  requestId: string,
  onEvent: (e: StreamEvent) => void,
): Promise<PikoResponse> {
  const start = Date.now()

  const existing = _connections.get(requestId)
  if (existing) { existing.close(); _connections.delete(requestId) }

  return new Promise(resolve => {
    const headers: Record<string, string> = {}
    config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })

    const ws = new WebSocket(config.url, { headers })
    _connections.set(requestId, ws)
    const events: StreamEvent[] = []

    const emit = (type: StreamEvent['type'], data: any) => {
      const e: StreamEvent = { id: crypto.randomUUID(), type, data, timestamp: Date.now() }
      events.push(e)
      onEvent(e)
    }

    ws.on('open',    ()    => emit('connected', 'Connected'))
    ws.on('message', data  => {
      let parsed: any = data.toString()
      try { parsed = JSON.parse(parsed) } catch { /* keep string */ }
      emit('received', parsed)
    })
    ws.on('close', () => {
      emit('disconnected', 'Connection closed')
      _connections.delete(requestId)
      resolve({ duration: Date.now() - start, timestamp: Date.now(), events })
    })
    ws.on('error', err => {
      emit('error', err.message)
      _connections.delete(requestId)
      resolve({ error: err.message, duration: Date.now() - start, timestamp: Date.now(), events })
    })
  })
}

export function sendWsMessage(requestId: string, msg: string) {
  const ws = _connections.get(requestId)
  if (ws?.readyState === WebSocket.OPEN) ws.send(msg)
}

export function closeWs(requestId: string) {
  _connections.get(requestId)?.close()
  _connections.delete(requestId)
}
