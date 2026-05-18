import mqtt from 'mqtt'
import { MqttConfig, PikoResponse, StreamEvent } from '../../shared/types'

export async function executeMqtt(
  config: MqttConfig,
  onStreamEvent: (e: StreamEvent) => void,
): Promise<PikoResponse> {
  const start = Date.now()

  return new Promise(resolve => {
    let settled = false
    const done = (res: PikoResponse) => {
      if (settled) return
      settled = true
      client.end(true)
      resolve(res)
    }

    const clientId = config.clientId || `hitro_${Date.now()}`
    const connectOpts: mqtt.IClientOptions = { clientId }
    if (config.username) connectOpts.username = config.username
    if (config.password) connectOpts.password = config.password

    const client = mqtt.connect(config.brokerUrl, connectOpts)

    const connectTimeout = setTimeout(
      () => done({ error: 'Connection timeout', duration: Date.now() - start, timestamp: Date.now() }),
      15000,
    )

    client.on('error', err => {
      clearTimeout(connectTimeout)
      done({ error: err.message, duration: Date.now() - start, timestamp: Date.now() })
    })

    client.on('connect', () => {
      clearTimeout(connectTimeout)

      if (config.mode === 'publish') {
        client.publish(config.topic, config.message, { qos: config.qos, retain: config.retain }, err => {
          if (err) done({ error: err.message, duration: Date.now() - start, timestamp: Date.now() })
          else done({ body: { published: true, topic: config.topic, message: config.message }, rawBody: `Published to ${config.topic}`, duration: Date.now() - start, timestamp: Date.now() })
        })
        return
      }

      client.subscribe(config.topic, { qos: config.qos }, err => {
        if (err) { done({ error: err.message, duration: Date.now() - start, timestamp: Date.now() }); return }

        let count = 0
        const maxTimeout = setTimeout(
          () => done({ body: { received: count, topic: config.topic }, rawBody: `Received ${count} messages`, duration: Date.now() - start, timestamp: Date.now() }),
          30000,
        )

        client.on('message', (topic, payload) => {
          const data = payload.toString()
          onStreamEvent({ id: `mqtt-${count}`, type: 'received', data: `[${topic}] ${data}`, timestamp: Date.now() })
          count++
          if (count >= config.maxMessages) {
            clearTimeout(maxTimeout)
            done({ body: { received: count, topic }, rawBody: `Received ${count} messages`, duration: Date.now() - start, timestamp: Date.now() })
          }
        })
      })
    })
  })
}
