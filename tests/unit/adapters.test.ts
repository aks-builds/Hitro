import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── REST adapter ────────────────────────────────────────────────────────────

vi.mock('axios', () => {
  const mockAxios = vi.fn()
  return { default: mockAxios }
})

import axios from 'axios'
import { executeRest } from '../../src/main/adapters/rest'
import type { RestConfig } from '../../src/shared/types'

function restConfig(overrides: Partial<RestConfig> = {}): RestConfig {
  return {
    method: 'GET', url: 'https://example.com/api',
    params: [], headers: [], body: '', bodyType: 'json',
    auth: { type: 'none' },
    ...overrides,
  }
}

describe('executeRest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets Bearer Authorization header when auth type is bearer', async () => {
    const mockAxios = vi.mocked(axios)
    mockAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} })

    await executeRest(restConfig({ auth: { type: 'bearer', token: 'mytoken' } }), [])

    const callArgs = mockAxios.mock.calls[0][0] as any
    expect(callArgs.headers['Authorization']).toBe('Bearer mytoken')
  })

  it('sets Basic Authorization header when auth type is basic', async () => {
    const mockAxios = vi.mocked(axios)
    mockAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} })

    await executeRest(restConfig({ auth: { type: 'basic', username: 'user', password: 'pass' } }), [])

    const callArgs = mockAxios.mock.calls[0][0] as any
    const expected = 'Basic ' + Buffer.from('user:pass').toString('base64')
    expect(callArgs.headers['Authorization']).toBe(expected)
  })

  it('filters disabled params (only enabled && key rows are sent)', async () => {
    const mockAxios = vi.mocked(axios)
    mockAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: {}, headers: {} })

    await executeRest(restConfig({
      params: [
        { id: '1', key: 'foo', value: 'bar', enabled: true },
        { id: '2', key: 'skip', value: 'x', enabled: false },
        { id: '3', key: '', value: 'nokey', enabled: true },
      ],
    }), [])

    const callArgs = mockAxios.mock.calls[0][0] as any
    expect(callArgs.params).toEqual({ foo: 'bar' })
  })

  it('returns error in HitroResponse when axios throws', async () => {
    const mockAxios = vi.mocked(axios)
    mockAxios.mockRejectedValueOnce(new Error('Network unreachable'))

    const result = await executeRest(restConfig(), [])

    expect(result.error).toBe('Network unreachable')
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it('sets Content-Type application/json for POST with json body type', async () => {
    const mockAxios = vi.mocked(axios)
    mockAxios.mockResolvedValueOnce({ status: 201, statusText: 'Created', data: {}, headers: {} })

    await executeRest(restConfig({ method: 'POST', bodyType: 'json', body: '{"a":1}' }), [])

    const callArgs = mockAxios.mock.calls[0][0] as any
    expect(callArgs.headers['Content-Type']).toBe('application/json')
  })

  it('runs assertions against the response', async () => {
    const mockAxios = vi.mocked(axios)
    mockAxios.mockResolvedValueOnce({ status: 200, statusText: 'OK', data: { id: 1 }, headers: {} })

    const result = await executeRest(restConfig(), [
      { id: '1', field: 'status', operator: 'eq', expected: '200', enabled: true },
      { id: '2', field: 'body.id', operator: 'eq', expected: '1', enabled: true },
    ])

    expect(result.assertionResults).toHaveLength(2)
    expect(result.assertionResults?.every(r => r.passed)).toBe(true)
  })
})

// ─── gRPC adapter ────────────────────────────────────────────────────────────

vi.mock('@grpc/proto-loader', () => ({
  loadSync: vi.fn(() => ({})),
}))

vi.mock('@grpc/grpc-js', () => {
  const Metadata = class { add(_k: string, _v: string) {} }
  return {
    credentials: { createSsl: () => ({}), createInsecure: () => ({}) },
    Metadata,
    loadPackageDefinition: (_pkg: any) => ({}),
  }
})

import { executeGrpc } from '../../src/main/adapters/grpc'
import type { GrpcConfig } from '../../src/shared/types'

describe('executeGrpc', () => {
  it('returns error when service is not found in proto', async () => {
    const config: GrpcConfig = {
      host: 'localhost:50051', protoPath: 'test.proto',
      service: 'missing.Service', method: 'SayHello',
      metadata: [], body: '{}', tls: false,
    }
    const result = await executeGrpc(config, [])
    expect(result.error).toMatch(/not found in proto/)
  })
})

// ─── SQS adapter ─────────────────────────────────────────────────────────────

vi.mock('@aws-sdk/client-sqs', () => {
  const mockSend = vi.fn()
  const SQSClient = vi.fn(() => ({ send: mockSend }))
  const SendMessageCommand = vi.fn()
  const ReceiveMessageCommand = vi.fn()
  return { SQSClient, SendMessageCommand, ReceiveMessageCommand, _mockSend: mockSend }
})

import { executeSqs } from '../../src/main/adapters/sqs'
import type { SqsConfig } from '../../src/shared/types'

function sqsConfig(overrides: Partial<SqsConfig> = {}): SqsConfig {
  return {
    region: 'us-east-1', queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/test',
    accessKeyId: 'AKID', secretAccessKey: 'SECRET',
    mode: 'send', message: 'hello', maxMessages: 1, attributes: [],
    ...overrides,
  }
}

describe('executeSqs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error in HitroResponse when send throws', async () => {
    const { _mockSend } = await import('@aws-sdk/client-sqs') as any
    _mockSend.mockRejectedValueOnce(new Error('SQS unavailable'))

    const result = await executeSqs(sqsConfig(), [])
    expect(result.error).toBe('SQS unavailable')
  })

  it('filters disabled attributes (only enabled && key rows are sent)', async () => {
    const { _mockSend } = await import('@aws-sdk/client-sqs') as any
    _mockSend.mockResolvedValueOnce({ MessageId: 'msg-1', MD5OfMessageBody: 'abc' })
    const { SendMessageCommand } = await import('@aws-sdk/client-sqs')

    await executeSqs(sqsConfig({
      attributes: [
        { id: '1', key: 'Source', value: 'Hitro', enabled: true },
        { id: '2', key: 'Skip', value: 'x', enabled: false },
        { id: '3', key: '', value: 'nokey', enabled: true },
      ],
    }), [])

    const cmdArg = vi.mocked(SendMessageCommand).mock.calls[0][0] as any
    expect(Object.keys(cmdArg.MessageAttributes ?? {})).toEqual(['Source'])
  })
})

// ─── Kafka adapter ────────────────────────────────────────────────────────────

describe('Kafka broker parsing', () => {
  it('splits and trims broker list', () => {
    const raw = '  localhost:9092 , broker2:9092 , '
    const brokers = raw.split(',').map(b => b.trim()).filter(Boolean)
    expect(brokers).toEqual(['localhost:9092', 'broker2:9092'])
  })
})
