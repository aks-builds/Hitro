import { io } from 'socket.io-client'
import { SocketIoConfig, PikoResponse, StreamEvent } from '../../shared/types'

export async function executeSocketIo(
  config: SocketIoConfig,
  onStreamEvent: (e: StreamEvent) => void,
): Promise<PikoResponse> {
  const start = Date.now()

  return new Promise(resolve => {
    let settled = false
    let count = 0

    const done = (res: PikoResponse) => {
      if (settled) return
      settled = true
      socket.disconnect()
      resolve(res)
    }

    const socket = io(config.url, { transports: ['websocket'] })

    const connectTimeout = setTimeout(
      () => done({ error: 'Connection timeout', duration: Date.now() - start, timestamp: Date.now() }),
      15000,
    )

    socket.on('connect_error', err => {
      clearTimeout(connectTimeout)
      done({ error: err.message, duration: Date.now() - start, timestamp: Date.now() })
    })

    socket.on('connect', () => {
      clearTimeout(connectTimeout)
      onStreamEvent({ id: 'sio-connect', type: 'connected', data: `Connected to ${config.url}`, timestamp: Date.now() })

      if (config.mode === 'emit') {
        let payload: any = config.message
        try { payload = JSON.parse(config.message) } catch { /* keep as string */ }
        socket.emit(config.emitEvent, payload)
        done({ body: { emitted: true, event: config.emitEvent }, rawBody: `Emitted "${config.emitEvent}"`, duration: Date.now() - start, timestamp: Date.now() })
        return
      }

      // listen mode
      const listenTimeout = setTimeout(
        () => done({ body: { received: count, event: config.listenEvent }, rawBody: `Received ${count} events`, duration: Date.now() - start, timestamp: Date.now() }),
        30000,
      )

      socket.on(config.listenEvent, (data: any) => {
        onStreamEvent({ id: `sio-${count}`, type: 'received', data, timestamp: Date.now() })
        count++
        if (count >= config.maxMessages) {
          clearTimeout(listenTimeout)
          done({ body: { received: count, event: config.listenEvent }, rawBody: `Received ${count} events`, duration: Date.now() - start, timestamp: Date.now() })
        }
      })
    })

    socket.on('disconnect', reason => {
      if (!settled) onStreamEvent({ id: 'sio-disconnect', type: 'disconnected', data: reason, timestamp: Date.now() })
    })
  })
}
