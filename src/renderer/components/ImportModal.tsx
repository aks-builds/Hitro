import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { PikoRequest, Collection, Environment } from '@shared/types'

type ImportMode = 'curl' | 'openapi' | 'har' | 'dotenv' | 'collection'

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const { loadCollections, loadEnvironments, newTab, openRequest } = useAppStore()
  const [mode, setMode]                   = useState<ImportMode>('curl')
  const [text, setText]                   = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [envName, setEnvName]             = useState('')
  const [error, setError]                 = useState('')
  const [importing, setImporting]         = useState(false)

  const handleImport = async () => {
    setError(''); setImporting(true)
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
        openRequest(req); onClose()

      } else if (mode === 'openapi') {
        let spec: any
        try { spec = JSON.parse(text) }
        catch { setError('Invalid JSON. Paste a valid OpenAPI 3.0 JSON spec.'); return }
        await saveCollection(await window.api.importOpenApi(spec), collectionName)
        await loadCollections(); onClose()

      } else if (mode === 'har') {
        let har: any
        try { har = JSON.parse(text) }
        catch { setError('Invalid JSON. Paste a valid HAR file content.'); return }
        await saveCollection(await window.api.importHar(har), collectionName)
        await loadCollections(); onClose()

      } else if (mode === 'dotenv') {
        const partial = await window.api.importDotenv(text, envName.trim() || undefined)
        const env: Environment = {
          id: partial.id ?? crypto.randomUUID(),
          name: envName.trim() || partial.name || 'Imported Environment',
          variables: partial.variables ?? [],
          isActive: false,
        }
        await window.api.saveEnvironment(env)
        await loadEnvironments(); onClose()

      } else if (mode === 'collection') {
        let json: any
        try { json = JSON.parse(text) }
        catch { setError('Invalid JSON. Paste a valid Hitro or Postman collection.'); return }
        await saveCollection(await window.api.importCollection(json), collectionName)
        await loadCollections(); onClose()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const saveCollection = async (partial: Partial<Collection>, nameOverride: string) => {
    const col: Collection = {
      id: partial.id ?? crypto.randomUUID(),
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
  }

  const handleFileLoad = async () => {
    const filters = mode === 'curl'
      ? [{ name: 'Text files', extensions: ['txt', 'sh', '*'] }]
      : mode === 'dotenv'
      ? [{ name: 'Env files', extensions: ['env', 'txt', '*'] }]
      : [{ name: 'JSON files', extensions: ['json', 'har'] }]
    const filePath = await window.api.openFile({ filters })
    if (!filePath) return
    try {
      setText(await window.api.readFile(filePath))
    } catch (err: any) {
      setError(err.message ?? 'Failed to read file')
    }
  }

  const MODES: [ImportMode, string][] = [
    ['curl',       'cURL Command'],
    ['openapi',    'OpenAPI 3.0'],
    ['har',        'HAR File'],
    ['dotenv',     '.env File'],
    ['collection', 'Collection'],
  ]

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-pk-panel border border-pk-border rounded-2xl w-[600px] flex flex-col shadow-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-pk-border">
          <div>
            <h2 className="font-semibold text-sm text-pk-text">Import</h2>
            <p className="text-pk-muted text-xs mt-0.5">Import from cURL, OpenAPI spec, HAR file, .env file, or Collection JSON</p>
          </div>
          <button onClick={onClose} className="text-pk-muted hover:text-pk-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-pk-border">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Mode selector */}
          <div className="flex gap-2 flex-wrap">
            {MODES.map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setText(''); setError('') }}
                className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all
                  ${mode === m
                    ? 'border-pk-accent text-pk-accent bg-pk-accent/8'
                    : 'border-pk-border text-pk-muted hover:border-pk-accent/40 hover:text-pk-text'}`}>
                {label}
              </button>
            ))}
          </div>

          {(mode === 'openapi' || mode === 'har' || mode === 'collection') && (
            <input value={collectionName} onChange={e => setCollectionName(e.target.value)}
              placeholder="Collection name (optional — uses name from file)"
              className="px-3 py-2 rounded-xl text-xs" />
          )}

          {mode === 'dotenv' && (
            <input value={envName} onChange={e => setEnvName(e.target.value)}
              placeholder="Environment name (optional)"
              className="px-3 py-2 rounded-xl text-xs" />
          )}

          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder={
              mode === 'curl'       ? 'curl https://api.example.com/users -H "Authorization: Bearer token"' :
              mode === 'openapi'    ? '{ "openapi": "3.0.0", "info": { "title": "My API" }, ... }' :
              mode === 'har'        ? '{ "log": { "entries": [...] } }' :
              mode === 'collection' ? '{ "info": { "name": "My Collection" }, "item": [...] }  — Hitro or Postman JSON' :
                                     'API_URL=https://api.example.com\nAPI_KEY=abc123\n# Comments are ignored'
            }
            rows={10}
            className="w-full px-3 py-2.5 rounded-xl text-xs font-mono resize-none"
          />

          <div className="flex items-center gap-3">
            <button onClick={handleFileLoad} className="btn-ghost text-xs py-1.5">Load from file…</button>
            {error && <span className="text-red-400 text-xs flex-1">{error}</span>}
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-pk-border">
          <button onClick={handleImport} disabled={!text.trim() || importing} className="btn-primary">
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
