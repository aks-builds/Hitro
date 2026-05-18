import crypto from 'crypto'
import { Kafka, logLevel } from 'kafkajs'
import { KafkaConfig, PikoResponse, StreamEvent } from '../../shared/types'

export async function executeKafka(
  config: KafkaConfig,
  onEvent?: (e: StreamEvent) => void,
): Promise<PikoResponse> {
  const start = Date.now()
  const brokers = config.brokers.split(',').map(b => b.trim()).filter(Boolean)

  const kafka = new Kafka({ clientId: 'hitro', brokers, logLevel: logLevel.ERROR })

  try {
    if (config.mode === 'produce') {
      const producer = kafka.producer()
      await producer.connect()

      const headers: Record<string, string> = {}
      config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })

      const result = await producer.send({
        topic: config.topic,
        messages: [{ value: config.message, headers }],
      })
      await producer.disconnect()

      const body = { partition: result[0]?.partition, offset: result[0]?.baseOffset, topic: config.topic }
      const rawBody = JSON.stringify(body, null, 2)
      return { status: 200, statusText: 'Message Produced', body, rawBody, duration: Date.now() - start, timestamp: Date.now() }

    } else {
      const consumer = kafka.consumer({ groupId: config.groupId || 'hitro-consumer' })
      await consumer.connect()
      await consumer.subscribe({ topic: config.topic, fromBeginning: config.fromBeginning })

      const events: StreamEvent[] = []
      const max = config.maxMessages || 10

      return new Promise(resolve => {
        let settled = false

        const done = async () => {
          if (settled) return
          settled = true
          clearTimeout(timeoutId)
          await consumer.disconnect().catch(() => {})
          const body = events.map(e => e.data)
          resolve({
            status: 200, statusText: `${events.length} messages`,
            body, rawBody: JSON.stringify(body, null, 2),
            duration: Date.now() - start, timestamp: Date.now(), events,
          })
        }

        const timeoutId = setTimeout(done, 15000)

        consumer.run({
          eachMessage: async ({ message }) => {
            let value: any = message.value?.toString()
            try { value = JSON.parse(value) } catch { /* keep string */ }
            const data = { key: message.key?.toString(), value, offset: message.offset, timestamp: message.timestamp }
            const e: StreamEvent = { id: crypto.randomUUID(), type: 'received', data, timestamp: Date.now() }
            events.push(e)
            onEvent?.(e)
            if (events.length >= max) await done()
          },
        }).catch(err => {
          if (!settled) {
            settled = true
            clearTimeout(timeoutId)
            consumer.disconnect().catch(() => {})
            resolve({ error: err.message, duration: Date.now() - start, timestamp: Date.now() })
          }
        })
      })
    }
  } catch (err: any) {
    return { error: err.message, duration: Date.now() - start, timestamp: Date.now() }
  }
}
