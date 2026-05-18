import type { PikoRequest, PikoResponse, Collection, Environment, StreamEvent, KeyValue, CollectionRunResult, Snapshot, MockServer, LoadTestConfig, LoadTestResult } from '@shared/types'

interface HitroApi {
  execute:           (request: PikoRequest) => Promise<PikoResponse & { chainExtractions?: Record<string, string> }>
  wsSend:            (requestId: string, msg: string) => Promise<void>
  wsClose:           (requestId: string) => Promise<void>
  onStreamEvent:     (cb: (payload: { requestId: string; event: StreamEvent }) => void) => void
  offStreamEvents:   () => void

  saveCollection:    (c: Collection) => Promise<{ ok: boolean }>
  getCollections:    () => Promise<Collection[]>
  deleteCollection:  (id: string) => Promise<{ ok: boolean }>

  saveRequest:       (r: PikoRequest) => Promise<{ ok: boolean }>
  deleteRequest:     (id: string) => Promise<{ ok: boolean }>

  getHistory:        () => Promise<{ request: PikoRequest; response: PikoResponse; timestamp: number }[]>
  clearHistory:      () => Promise<{ ok: boolean }>

  saveEnvironment:   (e: Environment) => Promise<{ ok: boolean }>
  getEnvironments:   () => Promise<Environment[]>
  deleteEnvironment: (id: string) => Promise<{ ok: boolean }>

  getGlobalVars:     () => Promise<KeyValue[]>
  saveGlobalVars:    (vars: KeyValue[]) => Promise<{ ok: boolean }>

  collectionRun:     (collectionId: string) => Promise<CollectionRunResult[]>
  onRunnerProgress:  (cb: (result: CollectionRunResult) => void) => void
  offRunnerProgress: () => void

  snapshotSave:      (payload: { requestId: string; name: string; response: PikoResponse }) => Promise<{ ok: boolean; id: string }>
  snapshotGet:       (requestId: string) => Promise<Snapshot[]>
  snapshotDelete:    (id: string) => Promise<{ ok: boolean }>

  mockSave:          (server: MockServer) => Promise<{ ok: boolean }>
  mockGetAll:        () => Promise<(MockServer & { isRunning: boolean })[]>
  mockDelete:        (id: string) => Promise<{ ok: boolean }>
  mockStart:         (server: MockServer) => Promise<{ ok: boolean; port?: number; error?: string }>
  mockStop:          (id: string) => Promise<{ ok: boolean }>
  mockRunning:       () => Promise<string[]>

  loadTest:          (cfg: LoadTestConfig) => Promise<LoadTestResult>
  onLoadTestProgress: (cb: (p: { done: number }) => void) => void
  offLoadTestProgress: () => void

  toCurl:            (req: PikoRequest) => Promise<string>
  generateCode:      (req: PikoRequest, lang: string) => Promise<string>
  importCurl:        (curl: string) => Promise<Partial<PikoRequest>>
  importOpenApi:     (spec: object) => Promise<Partial<Collection>>
  importHar:         (har: object) => Promise<Partial<Collection>>
  importDotenv:      (content: string, name?: string) => Promise<Partial<Environment>>
  importCollection:  (json: object) => Promise<Partial<Collection>>
  exportCollection:  (col: Collection) => Promise<string>

  openFile:          (opts?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
  readFile:          (path: string) => Promise<string>
  saveFile:          (opts: { defaultPath: string; content: string }) => Promise<{ ok: boolean }>
}

declare global {
  interface Window { api: HitroApi }
}
