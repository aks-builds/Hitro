import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // ── Platform info ──────────────────────────────────────────────────────────
  platform: process.platform,

  // ── Window controls ────────────────────────────────────────────────────────
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose:    () => ipcRenderer.send('window:close'),

  // ── Execute ────────────────────────────────────────────────────────────────
  execute:          (req: any)                           => ipcRenderer.invoke('execute', req),
  wsSend:           (requestId: string, msg: string)     => ipcRenderer.invoke('ws-send', { requestId, msg }),
  wsClose:          (requestId: string)                  => ipcRenderer.invoke('ws-close', requestId),
  onStreamEvent:    (cb: (e: any) => void)               => ipcRenderer.on('stream-event', (_, e) => cb(e)),
  offStreamEvents:  ()                                   => ipcRenderer.removeAllListeners('stream-event'),

  // ── Collections ────────────────────────────────────────────────────────────
  saveCollection:     (c: any)      => ipcRenderer.invoke('db-save-collection', c),
  getCollections:     ()            => ipcRenderer.invoke('db-get-collections'),
  deleteCollection:   (id: string)  => ipcRenderer.invoke('db-delete-collection', id),

  // ── Requests ───────────────────────────────────────────────────────────────
  saveRequest:        (r: any)      => ipcRenderer.invoke('db-save-request', r),
  deleteRequest:      (id: string)  => ipcRenderer.invoke('db-delete-request', id),

  // ── History ────────────────────────────────────────────────────────────────
  getHistory:         ()            => ipcRenderer.invoke('db-get-history'),
  clearHistory:       ()            => ipcRenderer.invoke('db-clear-history'),

  // ── Environments ───────────────────────────────────────────────────────────
  saveEnvironment:    (e: any)      => ipcRenderer.invoke('db-save-environment', e),
  getEnvironments:    ()            => ipcRenderer.invoke('db-get-environments'),
  deleteEnvironment:  (id: string)  => ipcRenderer.invoke('db-delete-environment', id),

  // ── Global variables ───────────────────────────────────────────────────────
  getGlobalVars:      ()            => ipcRenderer.invoke('db-get-global-vars'),
  saveGlobalVars:     (vars: any)   => ipcRenderer.invoke('db-save-global-vars', vars),

  // ── Collection runner ──────────────────────────────────────────────────────
  collectionRun:      (collectionId: string) => ipcRenderer.invoke('collection-run', { collectionId }),
  onRunnerProgress:   (cb: (r: any) => void) => ipcRenderer.on('runner-progress', (_, r) => cb(r)),
  offRunnerProgress:  () => ipcRenderer.removeAllListeners('runner-progress'),

  // ── Snapshots ──────────────────────────────────────────────────────────────
  snapshotSave:       (payload: any)        => ipcRenderer.invoke('snapshot-save', payload),
  snapshotGet:        (requestId: string)   => ipcRenderer.invoke('snapshot-get', requestId),
  snapshotDelete:     (id: string)          => ipcRenderer.invoke('snapshot-delete', id),

  // ── Mock servers ───────────────────────────────────────────────────────────
  mockSave:           (server: any)         => ipcRenderer.invoke('mock-save', server),
  mockGetAll:         ()                    => ipcRenderer.invoke('mock-get-all'),
  mockDelete:         (id: string)          => ipcRenderer.invoke('mock-delete', id),
  mockStart:          (server: any)         => ipcRenderer.invoke('mock-start', server),
  mockStop:           (id: string)          => ipcRenderer.invoke('mock-stop', id),
  mockRunning:        ()                    => ipcRenderer.invoke('mock-running'),

  // ── Load testing ───────────────────────────────────────────────────────────
  loadTest:           (cfg: any)            => ipcRenderer.invoke('load-test', cfg),
  onLoadTestProgress: (cb: (p: any) => void) => ipcRenderer.on('load-test-progress', (_, p) => cb(p)),
  offLoadTestProgress: ()                   => ipcRenderer.removeAllListeners('load-test-progress'),

  // ── Tools ──────────────────────────────────────────────────────────────────
  toCurl:             (req: any)               => ipcRenderer.invoke('tool-to-curl', req),
  generateCode:       (req: any, lang: string) => ipcRenderer.invoke('tool-codegen', { req, lang }),
  importCurl:         (curl: string)           => ipcRenderer.invoke('tool-import-curl', curl),
  importOpenApi:      (spec: any)              => ipcRenderer.invoke('tool-import-openapi', spec),
  importHar:          (har: any)               => ipcRenderer.invoke('tool-import-har', har),
  importDotenv:       (content: string, name?: string) => ipcRenderer.invoke('tool-import-dotenv', { content, name }),
  importCollection:   (json: any)              => ipcRenderer.invoke('tool-import-collection', json),
  exportCollection:   (col: any)               => ipcRenderer.invoke('tool-export-collection', col),

  // ── File system ────────────────────────────────────────────────────────────
  openFile:           (opts?: any)             => ipcRenderer.invoke('open-file', opts),
  readFile:           (path: string)           => ipcRenderer.invoke('read-file', path),
  saveFile:           (opts: any)              => ipcRenderer.invoke('save-file', opts),
})
