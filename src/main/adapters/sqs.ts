import { SQSClient, SendMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs'
import { SqsConfig, Assertion, PikoResponse } from '../../shared/types'
import { runAssertions } from '../../shared/assertions'

export async function executeSqs(config: SqsConfig, assertions: Assertion[]): Promise<PikoResponse> {
  const start = Date.now()
  const client = new SQSClient({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  })

  try {
    if (config.mode === 'send') {
      const attrs: Record<string, any> = {}
      config.attributes.filter(a => a.enabled && a.key).forEach(a => {
        attrs[a.key] = { DataType: 'String', StringValue: a.value }
      })
      const res = await client.send(new SendMessageCommand({
        QueueUrl: config.queueUrl,
        MessageBody: config.message,
        MessageAttributes: Object.keys(attrs).length ? attrs : undefined,
      }))
      const body = { messageId: res.MessageId, md5: res.MD5OfMessageBody }
      return {
        status: 200, statusText: 'Message Sent', body,
        rawBody: JSON.stringify(body, null, 2),
        duration: Date.now() - start, timestamp: Date.now(),
        assertionResults: runAssertions(assertions, { status: 200, body }),
      }
    } else {
      const res = await client.send(new ReceiveMessageCommand({
        QueueUrl: config.queueUrl,
        MaxNumberOfMessages: config.maxMessages || 10,
        WaitTimeSeconds: 5,
      }))
      const messages = (res.Messages || []).map(m => {
        let body: any = m.Body
        try { body = JSON.parse(m.Body || '') } catch { /* keep string */ }
        return { messageId: m.MessageId, body, receiptHandle: m.ReceiptHandle }
      })
      return {
        status: 200, statusText: `${messages.length} message(s) received`, body: messages,
        rawBody: JSON.stringify(messages, null, 2),
        duration: Date.now() - start, timestamp: Date.now(),
        assertionResults: runAssertions(assertions, { status: 200, body: messages }),
      }
    }
  } catch (err: any) {
    return { error: err.message, duration: Date.now() - start, timestamp: Date.now() }
  }
}
