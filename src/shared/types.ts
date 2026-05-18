export type Protocol = 'rest' | 'grpc' | 'graphql' | 'websocket' | 'kafka' | 'sqs' | 'mqtt' | 'sse' | 'socketio'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface KeyValue {
  id: string; key: string; value: string; enabled: boolean
}

export interface Assertion {
  id: string; field: string
  operator: 'eq' | 'ne' | 'contains' | 'matches' | 'exists' | 'not_exists' | 'gt' | 'lt'
           | 'gte' | 'lte' | 'startsWith' | 'endsWith' | 'type' | 'length' | 'isEmpty' | 'isNull'
  expected: string; enabled: boolean
}

export interface AssertionResult {
  assertion: Assertion; passed: boolean; actual?: any; error?: string
}

export interface ScriptLog {
  level: 'log' | 'warn' | 'error'; message: string; timestamp: number
}

// A chain rule extracts a value from the response and writes it to an env variable
export interface ChainRule {
  id: string
  responseField: string   // e.g. "body.token", "header.x-request-id", "status"
  variableName: string    // name of the env variable to set
  enabled: boolean
}

export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; placement: 'header' | 'query' }
  | { type: 'oauth2'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string; accessToken?: string; authUrl?: string; grantType?: 'client_credentials' | 'pkce' }
  | { type: 'digest'; username: string; password: string }
  | { type: 'awssigv4'; accessKeyId: string; secretAccessKey: string; region: string; service: string; sessionToken?: string }
  | { type: 'mtls'; certPath: string; keyPath: string; caPath?: string }

export interface RestConfig {
  method: HttpMethod; url: string; params: KeyValue[]; headers: KeyValue[]
  body: string; bodyType: 'json' | 'xml' | 'text' | 'urlencoded' | 'form' | 'none'
  formFields: KeyValue[]; auth: AuthConfig; timeout: number; followRedirects: boolean
}

export interface GrpcConfig {
  host: string; protoPath: string; service: string; method: string
  metadata: KeyValue[]; body: string; tls: boolean
}

export interface GraphqlConfig {
  url: string; headers: KeyValue[]; query: string; variables: string; operationName?: string
}

export interface WebSocketConfig { url: string; headers: KeyValue[] }

export interface KafkaConfig {
  brokers: string; topic: string; groupId: string; mode: 'produce' | 'consume'
  message: string; headers: KeyValue[]; fromBeginning: boolean; maxMessages: number
}

export interface SqsConfig {
  region: string; queueUrl: string; accessKeyId: string; secretAccessKey: string
  mode: 'send' | 'receive'; message: string; maxMessages: number; attributes: KeyValue[]
}

export interface MqttConfig {
  brokerUrl: string; topic: string; mode: 'publish' | 'subscribe'; message: string
  qos: 0 | 1 | 2; retain: boolean; clientId: string; username: string; password: string; maxMessages: number
}

export interface SseConfig { url: string; headers: KeyValue[]; maxEvents: number }

export interface SocketIoConfig {
  url: string; mode: 'emit' | 'listen'; emitEvent: string; listenEvent: string
  message: string; maxMessages: number
}

export type ProtocolConfig =
  | RestConfig | GrpcConfig | GraphqlConfig
  | WebSocketConfig | KafkaConfig | SqsConfig
  | MqttConfig | SseConfig | SocketIoConfig

export interface PikoRequest {
  id: string; name: string; protocol: Protocol; collectionId?: string; folderId?: string
  config: ProtocolConfig; assertions: Assertion[]; preScript: string; postScript: string
  chainRules: ChainRule[]
  createdAt: number; updatedAt: number
}

export interface StreamEvent {
  id: string; type: 'sent' | 'received' | 'connected' | 'disconnected' | 'error'
  data: any; timestamp: number
}

export interface PikoResponse {
  status?: number; statusText?: string; headers?: Record<string, string>
  body?: any; rawBody?: string; duration: number; size?: number; timestamp: number
  assertionResults?: AssertionResult[]; events?: StreamEvent[]
  scriptLogs?: ScriptLog[]; error?: string
}

export interface CollectionFolder {
  id: string; name: string; requests: PikoRequest[]
}

export interface Collection {
  id: string; name: string; requests: PikoRequest[]; folders: CollectionFolder[]
  variables: KeyValue[]; preScript: string; createdAt: number
}

export interface Environment {
  id: string; name: string; variables: KeyValue[]; isActive: boolean
}

export interface CollectionRunResult {
  requestId: string; requestName: string; response?: PikoResponse
  error?: string; passed: boolean; duration: number
}

// ── Snapshot testing ──────────────────────────────────────────────────────────

export interface SnapshotFieldDiff {
  field: string; saved: string; current: string; changed: boolean
}

export interface SnapshotDiff {
  hasDiffs: boolean; diffs: SnapshotFieldDiff[]
}

export interface Snapshot {
  id: string; requestId: string; name: string
  response: PikoResponse; createdAt: number
}

// ── Mock server ───────────────────────────────────────────────────────────────

export interface MockEndpoint {
  id: string; method: HttpMethod | 'ANY'; path: string
  status: number; body: string; contentType: string
  headers: KeyValue[]; delay: number; enabled: boolean
}

export interface MockServer {
  id: string; name: string; port: number
  endpoints: MockEndpoint[]; createdAt: number
}

// ── Load testing ──────────────────────────────────────────────────────────────

export interface LoadTestConfig {
  concurrency: number; duration: number   // duration in seconds
  requestConfig: RestConfig
}

export interface LoadTestResult {
  totalRequests: number; successCount: number; errorCount: number
  avgDuration: number; p50: number; p95: number; p99: number
  minDuration: number; maxDuration: number; throughput: number
  errors: string[]; durations: number[]
}

export function defaultConfig(protocol: Protocol): ProtocolConfig {
  switch (protocol) {
    case 'rest':      return { method: 'GET', url: '', params: [], headers: [], body: '', bodyType: 'json', formFields: [], auth: { type: 'none' }, timeout: 30000, followRedirects: true }
    case 'grpc':      return { host: '', protoPath: '', service: '', method: '', metadata: [], body: '{}', tls: false }
    case 'graphql':   return { url: '', headers: [], query: '', variables: '' }
    case 'websocket': return { url: '', headers: [] }
    case 'kafka':     return { brokers: '', topic: '', groupId: 'hitro-group', mode: 'produce', message: '', headers: [], fromBeginning: false, maxMessages: 10 }
    case 'sqs':       return { region: 'us-east-1', queueUrl: '', accessKeyId: '', secretAccessKey: '', mode: 'send', message: '', maxMessages: 1, attributes: [] }
    case 'mqtt':      return { brokerUrl: '', topic: '', mode: 'publish', message: '', qos: 0, retain: false, clientId: '', username: '', password: '', maxMessages: 10 }
    case 'sse':       return { url: '', headers: [], maxEvents: 100 }
    case 'socketio':  return { url: '', mode: 'emit', emitEvent: 'message', listenEvent: 'message', message: '', maxMessages: 10 }
  }
}

export const PROTOCOL_META: Record<Protocol, { label: string; color: string; bg: string }> = {
  rest:      { label: 'REST',      color: '#6366F1', bg: 'rgba(99,102,241,0.1)'   },
  grpc:      { label: 'gRPC',      color: '#7C3AED', bg: 'rgba(124,58,237,0.1)'   },
  graphql:   { label: 'GraphQL',   color: '#DB2777', bg: 'rgba(219,39,119,0.1)'   },
  websocket: { label: 'WS',        color: '#059669', bg: 'rgba(16,185,129,0.1)'   },
  kafka:     { label: 'Kafka',     color: '#B45309', bg: 'rgba(180,83,9,0.1)'     },
  sqs:       { label: 'SQS',       color: '#EA580C', bg: 'rgba(234,88,12,0.1)'    },
  mqtt:      { label: 'MQTT',      color: '#0891B2', bg: 'rgba(8,145,178,0.1)'    },
  sse:       { label: 'SSE',       color: '#16A34A', bg: 'rgba(22,163,74,0.1)'    },
  socketio:  { label: 'Socket.IO', color: '#C026D3', bg: 'rgba(192,38,211,0.1)'   },
}

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export const METHOD_STYLES: Record<HttpMethod, { color: string; bg: string }> = {
  GET:     { color: '#059669', bg: 'rgba(16,185,129,0.1)'  },
  POST:    { color: '#6366F1', bg: 'rgba(99,102,241,0.1)'  },
  PUT:     { color: '#D97706', bg: 'rgba(245,158,11,0.1)'  },
  PATCH:   { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)'  },
  DELETE:  { color: '#DC2626', bg: 'rgba(220,38,38,0.1)'   },
  HEAD:    { color: '#4B5563', bg: 'rgba(75,85,99,0.1)'    },
  OPTIONS: { color: '#DB2777', bg: 'rgba(219,39,119,0.1)'  },
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-400', POST: 'text-indigo-400', PUT: 'text-amber-400',
  PATCH: 'text-violet-400', DELETE: 'text-red-400', HEAD: 'text-slate-400', OPTIONS: 'text-pink-400',
}
