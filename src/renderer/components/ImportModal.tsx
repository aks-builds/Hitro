import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { PikoRequest, Collection, Environment } from '@shared/types'

type ImportMode = 'curl' | 'openapi' | 'har' | 'dotenv' | 'collection' | 'insomnia'

// Scans all request configs in a partial collection for {{varName}} tokens
function detectEnvVars(partial: Partial<Collection>): string[] {
  const allConfigs = [
    ...(partial.requests ?? []).map(r => JSON.stringify(r.config)),
    ...(partial.folders ?? []).flatMap(f => (f.requests ?? []).map(r => JSON.stringify(r.config))),
  ]
  const matches = new Set<string>()
  for (const str of allConfigs) {
    for (const m of str.matchAll(/\{\{(\w+)\}\}/g)) matches.add(m[1])
  }
  return [...matches]
}

function countRequests(partial: Partial<Collection>): { requests: number; folders: number } {
  const requests = (partial.requests ?? []).length + (partial.folders ?? []).reduce((n, f) => n + (f.requests ?? []).length, 0)
  const folders = (partial.folders ?? []).length
  return { requests, folders }
}

interface Props {
  onClose: (importedCollectionId?: string) => void
  onEnvVarsDetected?: (vars: string[]) => void
  initialMode?: ImportMode
}

export default function ImportModal({ onClose, onEnvVarsDetected, initialMode = 'curl' }: Props) {
  const { loadCollections, loadEnvironments, openRequest } = useAppStore()
  const [mode, setMode]             = useState<ImportMode>(initialMode)
  const [text, setText]             = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [envName, setEnvName]       = useState('')
  const [error, setError]           = useState('')
  const [importing, setImporting]   = useState(false)

  // Post-import success state
  const [importedName, setImportedName]   = useState('')
  const [importedId, setImportedId]       = useState('')
  const [importedCount, setImportedCount] = useState({ requests: 0, folders: 0 })
  const [envVarsFound, setEnvVarsFound]   = useState<string[]>([])

  const isDone = !!importedId || (mode === 'dotenv' && !!importedName)

  const handleImport = async () => {
    setError('')
    setImporting(true)
    try {
      if (mode === 'curl') {
        const partial = await window.api.importCurl(text.trim())
        const req: PikoRequest = {
          id: crypto.randomUUID(),
          name: partial.name ?? 'Imported Request',
          protocol: partial.protocol ?? 'rest',
          config: partial.config!,
          assertions: partial.assertions ?? [],
          preScript: partial.preScript ?? '',
          postScript: partial.postScript ?? '',
          chainRules: partial.chainRules ?? [],
          createdAt: Date.now(), updatedAt: Date.now(),
        }
        openRequest(req)
        onClose()

      } else if (mode === 'openapi') {
        let spec: any
        try { spec = JSON.parse(text) }
        catch { setError('Invalid JSON — paste a valid OpenAPI 3.0 JSON spec.'); return }
        const partial = await window.api.importOpenApi(spec)
        const colId = await saveCollection(partial, collectionName)
        await loadCollections()
        finishCollectionImport(partial, colId)

      } else if (mode === 'har') {
        let har: any
        try { har = JSON.parse(text) }
        catch { setError('Invalid JSON — paste a valid HAR file.'); return }
        const partial = await window.api.importHar(har)
        const colId = await saveCollection(partial, collectionName)
        await loadCollections()
        finishCollectionImport(partial, colId)

      } else if (mode === 'dotenv') {
        const partial = await window.api.importDotenv(text, envName.trim() || undefined)
        const env: Environment = {
          id: partial.id ?? crypto.randomUUID(),
          name: envName.trim() || partial.name || 'Imported Environment',
          variables: partial.variables ?? [],
          isActive: false,
        }
        await window.api.saveEnvironment(env)
        await loadEnvironments()
        setImportedName(env.name)

      } else if (mode === 'collection') {
        let json: any
        try { json = JSON.parse(text) }
        catch { setError('Invalid JSON — paste a Hitro or Postman v2/v2.1 collection.'); return }
        const partial = await window.api.importCollection(json)
        const colId = await saveCollection(partial, collectionName)
        await loadCollections()
        finishCollectionImport(partial, colId)

      } else if (mode === 'insomnia') {
        let json: any
        try { json = JSON.parse(text) }
        catch { setError('Invalid JSON — paste an Insomnia v4 export JSON.'); return }
        const partial = await window.api.importInsomniaEnv(json)
        const env: Environment = {
          id: partial.id ?? crypto.randomUUID(),
          name: envName.trim() || partial.name || 'Insomnia Environment',
          variables: partial.variables ?? [],
          isActive: false,
        }
        await window.api.saveEnvironment(env)
        await loadEnvironments()
        setImportedName(env.name)
      }
    } catch (err: any) {
      setError(err.message ?? 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const finishCollectionImport = (partial: Partial<Collection>, colId: string) => {
    const counts = countRequests(partial)
    const envVars = detectEnvVars(partial)
    setImportedId(colId)
    setImportedName((partial.name ?? collectionName) || 'Collection')
    setImportedCount(counts)
    setEnvVarsFound(envVars)
    if (envVars.length > 0) onEnvVarsDetected?.(envVars)
  }

  const saveCollection = async (partial: Partial<Collection>, nameOverride: string): Promise<string> => {
    const id = partial.id ?? crypto.randomUUID()
    const col: Collection = {
      id,
      name: nameOverride || partial.name || 'Imported',
      requests: (partial.requests ?? []) as PikoRequest[],
      folders: partial.folders ?? [],
      variables: partial.variables ?? [],
      preScript: partial.preScript ?? '',
      createdAt: Date.now(),
    }
    await window.api.saveCollection(col)
    for (const req of col.requests) {
      await window.api.saveRequest({ ...req, collectionId: col.id })
    }
    for (const folder of col.folders) {
      for (const req of folder.requests ?? []) {
        await window.api.saveRequest({ ...req, collectionId: col.id, folderId: folder.id })
      }
    }
    return id
  }

  const handleFileLoad = async () => {
    const filters =
      mode === 'curl'   ? [{ name: 'Text / Shell files', extensions: ['txt', 'sh', '*'] }] :
      mode === 'dotenv' ? [{ name: 'Env files', extensions: ['env', 'txt', '*'] }] :
                          [{ name: 'JSON / HAR files', extensions: ['json', 'har'] }]
    const filePath = await window.api.openFile({ filters })
    if (!filePath) return
    try { setText(await window.api.readFile(filePath)) }
    catch (err: any) { setError(err.message ?? 'Failed to read file') }
  }

  const MODES: [ImportMode, string][] = [
    ['curl',       'cURL Command'],
    ['openapi',    'OpenAPI 3.0'],
    ['har',        'HAR File'],
    ['dotenv',     '.env File'],
    ['collection', 'Collection'],
    ['insomnia',   'Insomnia Env'],
  ]

  // ── Success view ─────────────────────────────────────────────
  if (isDone) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(importedId || undefined) }}
      >
        <div
          className="rounded-2xl w-[520px] flex flex-col shadow-modal animate-scale-in"
          style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--pk-border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--pk-text)' }}>Import complete</h2>
            <button onClick={() => onClose(importedId || undefined)} className="btn-ghost text-xs w-7 h-7 p-0 flex items-center justify-center">✕</button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Success notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(63,185,80,0.07)', border: '1px solid rgba(63,185,80,0.2)' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5">
                <circle cx="10" cy="10" r="9" fill="rgba(63,185,80,0.2)"/>
                <path d="M6 10l3 3 5-6" stroke="#3FB950" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#3FB950' }}>
                  "{importedName}" imported
                </p>
                {importedCount.requests > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--pk-muted)' }}>
                    {importedCount.requests} request{importedCount.requests !== 1 ? 's' : ''}
                    {importedCount.folders > 0 ? ` across ${importedCount.folders} folder${importedCount.folders !== 1 ? 's' : ''}` : ''}
                    {' '}— now visible in the sidebar
                  </p>
                )}
                {mode === 'dotenv' && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--pk-muted)' }}>
                    Environment saved — activate it from the sidebar to use it
                  </p>
                )}
              </div>
            </div>

            {/* Env variables warning */}
            {envVarsFound.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(210,153,34,0.07)', border: '1px solid rgba(210,153,34,0.22)' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5">
                  <path d="M10 2L18 17H2L10 2z" fill="rgba(210,153,34,0.18)" stroke="#D29922" strokeWidth="1.2"/>
                  <line x1="10" y1="8" x2="10" y2="13" stroke="#D29922" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="10" cy="15.5" r="0.8" fill="#D29922"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#D29922' }}>
                    Environment variables detected
                  </p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
                    {envVarsFound.length} variable{envVarsFound.length !== 1 ? 's' : ''} found:{' '}
                    <span className="font-mono" style={{ color: '#D29922' }}>
                      {envVarsFound.slice(0, 4).map(v => `{{${v}}}`).join(', ')}
                      {envVarsFound.length > 4 ? ` +${envVarsFound.length - 4} more` : ''}
                    </span>.{' '}
                    Without an active environment, these placeholders will be sent literally and requests will likely fail.
                    Import your environment file now to resolve them.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--pk-border)' }}>
            {envVarsFound.length > 0 && (
              <button
                onClick={() => {
                  onClose(importedId || undefined)
                  // Parent Sidebar will open the env import modal via onEnvVarsDetected
                }}
                className="btn-ghost text-xs"
                style={{ color: '#D29922', borderColor: 'rgba(210,153,34,0.3)' }}
              >
                Import environment file →
              </button>
            )}
            <button
              onClick={() => onClose(importedId || undefined)}
              className="btn-primary ml-auto"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Import form view ─────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl w-[600px] flex flex-col shadow-modal animate-scale-in"
        style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--pk-border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--pk-text)' }}>Import</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--pk-muted)' }}>
              Import from cURL, OpenAPI, HAR, .env, Postman / Hitro collection, or Insomnia environment
            </p>
          </div>
          <button onClick={() => onClose()} className="btn-ghost text-xs w-7 h-7 p-0 flex items-center justify-center">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Mode tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {MODES.map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setText(''); setError('') }}
                className="px-3.5 py-1.5 text-[11px] font-medium rounded-xl transition-all"
                style={mode === m
                  ? { background: 'rgba(99,102,241,0.12)', color: 'var(--pk-accent)', border: '1px solid rgba(99,102,241,0.35)' }
                  : { background: 'transparent', color: 'var(--pk-muted)', border: '1px solid var(--pk-border-s)' }
                }
              >{label}</button>
            ))}
          </div>

          {/* Collection / OpenAPI / HAR name override */}
          {(mode === 'openapi' || mode === 'har' || mode === 'collection') && (
            <input
              value={collectionName}
              onChange={e => setCollectionName(e.target.value)}
              placeholder="Collection name (optional — uses name from file)"
              className="px-3 py-2 rounded-xl text-xs"
            />
          )}

          {(mode === 'dotenv' || mode === 'insomnia') && (
            <input
              value={envName}
              onChange={e => setEnvName(e.target.value)}
              placeholder="Environment name (optional)"
              className="px-3 py-2 rounded-xl text-xs"
            />
          )}

          {/* Text area */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              mode === 'curl'       ? 'curl https://api.example.com/users -H "Authorization: Bearer token"' :
              mode === 'openapi'    ? '{ "openapi": "3.0.0", "info": { "title": "My API" }, "paths": { ... } }' :
              mode === 'har'        ? '{ "log": { "entries": [ ... ] } }' :
              mode === 'collection' ? 'Paste a Hitro or Postman v2 / v2.1 collection JSON here…' :
              mode === 'insomnia'   ? '{ "_type": "export", "__export_format": 4, "resources": [...] }' :
                                     'API_URL=https://api.example.com\nAPI_KEY=abc123\n# Comments are ignored'
            }
            rows={10}
            className="w-full px-3 py-2.5 rounded-xl text-[11px] font-mono resize-none"
          />

          {/* File load + error */}
          <div className="flex items-center gap-3">
            <button onClick={handleFileLoad} className="btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 10v2h10v-2M7 2v7M4 6l3-3 3 3"/>
              </svg>
              Load from file…
            </button>
            {error && (
              <span className="text-[11px] flex-1" style={{ color: 'var(--pk-error)' }}>{error}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--pk-border)' }}>
          <button
            onClick={handleImport}
            disabled={!text.trim() || importing}
            className="btn-primary"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin-fast"/>
                Importing…
              </span>
            ) : 'Import'}
          </button>
          <button onClick={() => onClose()} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
