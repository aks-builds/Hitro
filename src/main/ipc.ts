import { ipcMain, dialog, BrowserWindow } from 'electron'
import { db } from './database'
import { executeRest } from './adapters/rest'
import { executeGrpc } from './adapters/grpc'
import { executeGraphql } from './adapters/graphql'
import { executeWebSocket, sendWsMessage, closeWs } from './adapters/websocket'
import { executeKafka } from './adapters/kafka'
import { executeSqs } from './adapters/sqs'
import { executeMqtt } from './adapters/mqtt'
import { executeSse } from './adapters/sse'
import { executeSocketIo } from './adapters/socketio'
import { runScript } from './scripts'
import { startMockServer, stopMockServer, isRunning, runningServers } from './mockServer'
import { toCurl, generateCode, importCurl, importOpenApi, importHar, importDotenv, exportCollection, importCollection, CodeLang } from './tools'
import { StreamEvent, PikoResponse, ScriptLog, Collection, ChainRule, LoadTestConfig } from '../shared/types'

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback } catch { return fallback }
}

// Resolves {{varName}} tokens; scriptVars take priority over env, then globals
function resolveVars(
  str: string,
  scriptVars: Record<string, string>,
  envVars: { key: string; value: string; enabled: boolean }[],
  globalVars: { key: string; value: string; enabled: boolean }[]
): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in scriptVars) return scriptVars[key]
    const ev = envVars.find(v => v.key === key && v.enabled)
    if (ev) return ev.value
    const gv = globalVars.find(v => v.key === key && v.enabled)
    if (gv) return gv.value
    return `{{${key}}}`
  })
}

// Extracts a dot-path value from a response (e.g. "body.user.id", "header.x-token", "status")
function extractChainValue(response: PikoResponse, field: string): string | undefined {
  const parts = field.split('.')
  const root = parts[0]

  if (root === 'status') return String(response.status ?? '')

  if (root === 'header' && parts[1]) {
    return response.headers?.[parts[1].toLowerCase()]
  }

  if (root === 'body') {
    let val: any = response.body
    for (const part of parts.slice(1)) {
      if (val == null) return undefined
      // support array indexing: "body.items.0.id"
      val = val[isNaN(Number(part)) ? part : Number(part)]
    }
    return val == null ? undefined : (typeof val === 'object' ? JSON.stringify(val) : String(val))
  }

  return undefined
}

export function registerIpcHandlers() {
  // ── Execute request ────────────────────────────────────────────────────────
  ipcMain.handle('execute', async (event, request) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const { protocol, config, assertions = [], id, preScript = '', postScript = '', chainRules = [],
              _envVars = [], _globalVars = [] } = request
      const allLogs: ScriptLog[] = []
      let scriptVars: Record<string, string> = {}

      if (preScript.trim()) {
        const result = runScript(preScript, { request, variables: scriptVars })
        allLogs.push(...result.logs)
        scriptVars = result.variables
        if (result.error) allLogs.push({ level: 'error', message: `Pre-script: ${result.error}`, timestamp: Date.now() })
      }

      // Resolve {{tokens}} after pre-script so pm.variables.set() values take effect
      const resolvedConfig = JSON.parse(resolveVars(JSON.stringify(config), scriptVars, _envVars as any[], _globalVars as any[]))

      const onStreamEvent = (e: StreamEvent) =>
        win?.webContents.send('stream-event', { requestId: id, event: e })

      let response: PikoResponse
      switch (protocol) {
        case 'rest':      response = await executeRest(resolvedConfig, assertions); break
        case 'grpc':      response = await executeGrpc(resolvedConfig, assertions); break
        case 'graphql':   response = await executeGraphql(resolvedConfig, assertions); break
        case 'websocket': response = await executeWebSocket(resolvedConfig, id, onStreamEvent); break
        case 'kafka':     response = await executeKafka(resolvedConfig, onStreamEvent); break
        case 'sqs':       response = await executeSqs(resolvedConfig, assertions); break
        case 'mqtt':      response = await executeMqtt(resolvedConfig, onStreamEvent); break
        case 'sse':       response = await executeSse(resolvedConfig, assertions, onStreamEvent); break
        case 'socketio':  response = await executeSocketIo(resolvedConfig, onStreamEvent); break
        default:          response = { error: `Unknown protocol: ${protocol}`, duration: 0, timestamp: Date.now() }
      }

      if (postScript.trim()) {
        const result = runScript(postScript, { request, response, variables: scriptVars })
        allLogs.push(...result.logs)
        if (result.error) allLogs.push({ level: 'error', message: `Post-script: ${result.error}`, timestamp: Date.now() })
      }

      // apply chain rules: extract values from response and emit back to renderer
      const chainExtractions: Record<string, string> = {}
      if (!response.error && Array.isArray(chainRules)) {
        for (const rule of chainRules as ChainRule[]) {
          if (!rule.enabled || !rule.variableName || !rule.responseField) continue
          const val = extractChainValue(response, rule.responseField)
          if (val !== undefined) chainExtractions[rule.variableName] = val
        }
      }

      const histId = crypto.randomUUID()
      db.prepare('INSERT INTO history (id, request, response, timestamp) VALUES (?,?,?,?)').run(histId, JSON.stringify(request), JSON.stringify(response), Date.now())

      return { ...response, scriptLogs: allLogs.length ? allLogs : undefined, chainExtractions }
    } catch (err: any) {
      return { error: err.message, duration: 0, timestamp: Date.now() }
    }
  })

  ipcMain.handle('ws-send',  (_, { requestId, msg }) => sendWsMessage(requestId, msg))
  ipcMain.handle('ws-close', (_, requestId)           => closeWs(requestId))

  // ── Collections ────────────────────────────────────────────────────────────
  ipcMain.handle('db-save-collection', (_, c) => {
    db.prepare(`
      INSERT OR REPLACE INTO collections (id, name, variables, folders, pre_script, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      c.id, c.name,
      JSON.stringify(c.variables ?? []),
      JSON.stringify(c.folders ?? []),
      c.preScript ?? '',
      Date.now(),
    )
    return { ok: true }
  })

  ipcMain.handle('db-get-collections', () => {
    const cols = db.prepare('SELECT * FROM collections ORDER BY created_at DESC').all() as any[]
    const reqs = db.prepare('SELECT * FROM requests').all() as any[]

    const mapReq = (r: any) => ({
      id: r.id, name: r.name, protocol: r.protocol,
      collectionId: r.collection_id,
      folderId: r.folder_id ?? undefined,
      config: safeJsonParse(r.config, {}),
      assertions: safeJsonParse(r.assertions, []),
      chainRules: safeJsonParse(r.chain_rules, []),
      preScript: r.pre_script ?? '',
      postScript: r.post_script ?? '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })

    return cols.map(c => {
      const colReqs = reqs.filter(r => r.collection_id === c.id)

      // Top-level requests have no folder_id
      const topLevelReqs = colReqs.filter(r => !r.folder_id).map(mapReq)

      // Folder requests from requests table, grouped by folder_id
      const dbFolderMap: Record<string, ReturnType<typeof mapReq>[]> = {}
      for (const r of colReqs.filter(r => r.folder_id)) {
        if (!dbFolderMap[r.folder_id]) dbFolderMap[r.folder_id] = []
        dbFolderMap[r.folder_id].push(mapReq(r))
      }

      // Merge folder metadata (names) from JSON blob with requests from DB
      const blobFolders: any[] = safeJsonParse(c.folders, [])
      const seenFolderIds = new Set<string>()
      const folders = blobFolders.map((f: any) => {
        seenFolderIds.add(f.id)
        return {
          id: f.id,
          name: f.name ?? 'Folder',
          // DB requests are authoritative; fall back to blob requests for backwards compat
          requests: dbFolderMap[f.id] ?? (f.requests ?? []).map((br: any) => ({
            ...br,
            config: br.config ?? {},
            assertions: br.assertions ?? [],
            chainRules: br.chainRules ?? [],
            preScript: br.preScript ?? '',
            postScript: br.postScript ?? '',
          })),
        }
      })

      // Surface any folder groups from DB that aren't represented in the blob
      for (const [folderId, folderReqs] of Object.entries(dbFolderMap)) {
        if (!seenFolderIds.has(folderId)) {
          folders.push({ id: folderId, name: 'Folder', requests: folderReqs })
        }
      }

      return {
        id: c.id, name: c.name,
        variables: safeJsonParse(c.variables, []),
        preScript: c.pre_script ?? '',
        createdAt: c.created_at,
        folders,
        requests: topLevelReqs,
      }
    })
  })

  // ── Requests ───────────────────────────────────────────────────────────────
  ipcMain.handle('db-save-request', (_, r) => {
    db.prepare(`
      INSERT OR REPLACE INTO requests
        (id, name, protocol, collection_id, folder_id, config, assertions, pre_script, post_script, chain_rules, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      r.id, r.name, r.protocol,
      r.collectionId ?? null,
      r.folderId ?? null,
      JSON.stringify(r.config),
      JSON.stringify(r.assertions ?? []),
      r.preScript ?? '',
      r.postScript ?? '',
      JSON.stringify(r.chainRules ?? []),
      r.createdAt ?? Date.now(),
      Date.now(),
    )
    return { ok: true }
  })

  ipcMain.handle('db-delete-request', (_, id) => {
    db.prepare('DELETE FROM requests WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('db-delete-collection', (_, id) => {
    db.prepare('DELETE FROM collections WHERE id = ?').run(id)
    db.prepare('DELETE FROM requests WHERE collection_id = ?').run(id)
    return { ok: true }
  })

  // ── History ────────────────────────────────────────────────────────────────
  ipcMain.handle('db-get-history', () =>
    (db.prepare('SELECT * FROM history ORDER BY timestamp DESC LIMIT 200').all() as any[]).map(h => ({
      ...h, request: safeJsonParse(h.request, {}), response: safeJsonParse(h.response, {}),
    }))
  )

  ipcMain.handle('db-clear-history', () => {
    db.prepare('DELETE FROM history').run()
    return { ok: true }
  })

  // ── Environments ───────────────────────────────────────────────────────────
  ipcMain.handle('db-save-environment', (_, e) => {
    db.prepare('INSERT OR REPLACE INTO environments (id, name, variables, is_active) VALUES (?,?,?,?)').run(e.id, e.name, JSON.stringify(e.variables ?? []), e.isActive ? 1 : 0)
    return { ok: true }
  })

  ipcMain.handle('db-get-environments', () =>
    (db.prepare('SELECT * FROM environments').all() as any[]).map(e => ({
      id: e.id, name: e.name,
      variables: safeJsonParse(e.variables, []),
      isActive: e.is_active === 1,
    }))
  )

  ipcMain.handle('db-delete-environment', (_, id) => {
    db.prepare('DELETE FROM environments WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── Global variables ───────────────────────────────────────────────────────
  ipcMain.handle('db-get-global-vars', () => {
    const row = db.prepare('SELECT variables FROM global_vars WHERE id = ?').get('global') as any
    return safeJsonParse(row?.variables, [])
  })

  ipcMain.handle('db-save-global-vars', (_, variables) => {
    db.prepare('UPDATE global_vars SET variables = ? WHERE id = ?').run(JSON.stringify(variables), 'global')
    return { ok: true }
  })

  // ── Collection runner ──────────────────────────────────────────────────────
  ipcMain.handle('collection-run', async (event, { collectionId }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const reqs = db.prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY created_at ASC').all(collectionId) as any[]
    const results = []

    // Load env and global vars for {{token}} resolution across all requests
    const activeEnvRow = db.prepare('SELECT variables FROM environments WHERE is_active = 1').get() as any
    const envVars: { key: string; value: string; enabled: boolean }[] = safeJsonParse(activeEnvRow?.variables, [])
    const globalRow = db.prepare('SELECT variables FROM global_vars WHERE id = ?').get('global') as any
    const globalVars: { key: string; value: string; enabled: boolean }[] = safeJsonParse(globalRow?.variables, [])
    // Chain-extracted values accumulate and override env/global for subsequent requests
    const chainVars: Record<string, string> = {}

    for (const r of reqs) {
      const request = {
        id: r.id, name: r.name, protocol: r.protocol,
        config: safeJsonParse(r.config, {}),
        assertions: safeJsonParse(r.assertions, []),
        chainRules: safeJsonParse(r.chain_rules, []),
        preScript: r.pre_script ?? '',
        postScript: r.post_script ?? '',
      }
      const resolvedConfig = JSON.parse(resolveVars(JSON.stringify(request.config), chainVars, envVars, globalVars))
      const start = Date.now()
      try {
        let response: PikoResponse
        switch (request.protocol) {
          case 'rest':    response = await executeRest(resolvedConfig as any, request.assertions); break
          case 'graphql': response = await executeGraphql(resolvedConfig as any, request.assertions); break
          case 'grpc':    response = await executeGrpc(resolvedConfig as any, request.assertions); break
          case 'sqs':     response = await executeSqs(resolvedConfig as any, request.assertions); break
          default:        response = { body: 'Skipped (streaming protocol)', duration: 0, timestamp: Date.now() }
        }
        // Propagate chain-extracted values so subsequent requests can consume them
        if (!response.error && Array.isArray(request.chainRules)) {
          for (const rule of request.chainRules as ChainRule[]) {
            if (!rule.enabled || !rule.variableName || !rule.responseField) continue
            const val = extractChainValue(response, rule.responseField)
            if (val !== undefined) chainVars[rule.variableName] = val
          }
        }
        const passed = !response.error && (response.assertionResults?.every(a => a.passed) ?? true)
        const result = { requestId: r.id, requestName: r.name, response, passed, duration: Date.now() - start }
        results.push(result)
        win?.webContents.send('runner-progress', result)
      } catch (err: any) {
        const result = { requestId: r.id, requestName: r.name, error: err.message, passed: false, duration: Date.now() - start }
        results.push(result)
        win?.webContents.send('runner-progress', result)
      }
    }
    return results
  })

  // ── Snapshots ──────────────────────────────────────────────────────────────
  ipcMain.handle('snapshot-save', (_, { requestId, name, response }) => {
    const id = crypto.randomUUID()
    db.prepare('INSERT INTO snapshots (id, request_id, name, response, created_at) VALUES (?,?,?,?,?)').run(id, requestId, name, JSON.stringify(response), Date.now())
    return { ok: true, id }
  })

  ipcMain.handle('snapshot-get', (_, requestId: string) =>
    (db.prepare('SELECT * FROM snapshots WHERE request_id = ? ORDER BY created_at DESC').all(requestId) as any[]).map(s => ({
      id: s.id, requestId: s.request_id, name: s.name,
      response: safeJsonParse(s.response, {}),
      createdAt: s.created_at,
    }))
  )

  ipcMain.handle('snapshot-delete', (_, id: string) => {
    db.prepare('DELETE FROM snapshots WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── Mock servers ───────────────────────────────────────────────────────────
  ipcMain.handle('mock-save', (_, server) => {
    db.prepare(`
      INSERT OR REPLACE INTO mock_servers (id, name, port, endpoints, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      server.id, server.name, server.port,
      JSON.stringify(server.endpoints ?? []),
      server.createdAt ?? Date.now(),
    )
    return { ok: true }
  })

  ipcMain.handle('mock-get-all', () =>
    (db.prepare('SELECT * FROM mock_servers ORDER BY created_at DESC').all() as any[]).map(s => ({
      id: s.id, name: s.name, port: s.port,
      endpoints: safeJsonParse(s.endpoints, []),
      createdAt: s.created_at,
      isRunning: isRunning(s.id),
    }))
  )

  ipcMain.handle('mock-delete', (_, id: string) => {
    stopMockServer(id)
    db.prepare('DELETE FROM mock_servers WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('mock-start', async (_, server) => {
    try {
      const result = await startMockServer(server)
      return { ok: true, port: result.port }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('mock-stop', (_, id: string) => {
    stopMockServer(id)
    return { ok: true }
  })

  ipcMain.handle('mock-running', () => runningServers())

  // ── Load testing ───────────────────────────────────────────────────────────
  ipcMain.handle('load-test', async (event, cfg: LoadTestConfig) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const durations: number[] = []
    const errors: string[] = []
    const endTime = Date.now() + cfg.duration * 1000
    let totalDone = 0

    const worker = async () => {
      while (Date.now() < endTime) {
        const t0 = Date.now()
        try {
          const res = await executeRest({ ...cfg.requestConfig, timeout: (cfg.duration + 5) * 1000 }, [])
          if (res.error) errors.push(res.error)
        } catch (e: any) {
          errors.push(e.message)
        }
        durations.push(Date.now() - t0)
        totalDone++
        // report progress every 10 requests
        if (totalDone % 10 === 0) win?.webContents.send('load-test-progress', { done: totalDone })
      }
    }

    await Promise.all(Array.from({ length: cfg.concurrency }, () => worker()))

    const sorted = [...durations].sort((a, b) => a - b)
    const p = (pct: number) => sorted[Math.floor(sorted.length * pct / 100)] ?? 0

    return {
      totalRequests: durations.length,
      successCount: durations.length - errors.length,
      errorCount: errors.length,
      avgDuration: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
      p50: p(50), p95: p(95), p99: p(99),
      minDuration: sorted[0] ?? 0,
      maxDuration: sorted[sorted.length - 1] ?? 0,
      throughput: Math.round((durations.length / cfg.duration) * 10) / 10,
      errors: errors.slice(0, 20),
      durations,
    }
  })

  // ── Tools: codegen / import / export ──────────────────────────────────────
  ipcMain.handle('tool-to-curl',        (_, req)           => toCurl(req))
  ipcMain.handle('tool-codegen',        (_, { req, lang }) => generateCode(req, lang as CodeLang))
  ipcMain.handle('tool-import-curl',    (_, curl)          => importCurl(curl))
  ipcMain.handle('tool-import-openapi', (_, spec)          => importOpenApi(spec))
  ipcMain.handle('tool-import-har',     (_, har)           => importHar(har))
  ipcMain.handle('tool-import-dotenv',      (_, { content, name }) => importDotenv(content, name))
  ipcMain.handle('tool-import-collection',  (_, json)          => importCollection(json))
  ipcMain.handle('tool-export-collection',  (_, col)           => exportCollection(col))

  // ── File picker ────────────────────────────────────────────────────────────
  ipcMain.handle('open-file', async (event, opts?: { filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: opts?.filters ?? [{ name: 'All Files', extensions: ['*'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('read-file', async (_, filePath: string) => {
    const fs = require('fs') as typeof import('fs')
    return fs.readFileSync(filePath, 'utf-8')
  })

  ipcMain.handle('save-file', async (event, { defaultPath, content }: { defaultPath: string; content: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showSaveDialog(win, { defaultPath })
    if (result.canceled || !result.filePath) return { ok: false }
    const fs = require('fs') as typeof import('fs')
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { ok: true }
  })
}
