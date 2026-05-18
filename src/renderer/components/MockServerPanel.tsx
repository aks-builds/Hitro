import React, { useState, useEffect } from 'react'
import { MockServer, MockEndpoint, KeyValue, HttpMethod } from '@shared/types'

const METHODS: (HttpMethod | 'ANY')[] = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const CONTENT_TYPES = ['application/json', 'text/plain', 'text/html', 'application/xml', 'application/octet-stream']

function EndpointEditor({ endpoint, onChange, onRemove }: {
  endpoint: MockEndpoint
  onChange: (e: MockEndpoint) => void
  onRemove: () => void
}) {
  const up = (p: Partial<MockEndpoint>) => onChange({ ...endpoint, ...p })
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-pk-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-pk-panel">
        <input type="checkbox" checked={endpoint.enabled} onChange={e => up({ enabled: e.target.checked })} className="accent-pk-accent flex-shrink-0" />
        <select value={endpoint.method} onChange={e => up({ method: e.target.value as any })}
          className="text-xs px-2 py-1 rounded-lg bg-pk-bg border border-pk-border text-pk-accent font-bold flex-shrink-0">
          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={endpoint.path} onChange={e => up({ path: e.target.value })}
          placeholder="/api/resource"
          className="flex-1 px-2 py-1 text-xs font-mono bg-transparent border-0 outline-none text-pk-text placeholder:text-pk-faint min-w-0" />
        <span className="text-pk-muted text-xs flex-shrink-0">→</span>
        <input type="number" value={endpoint.status} onChange={e => up({ status: Number(e.target.value) })}
          className="w-16 px-2 py-1 text-xs text-center rounded-lg" min={100} max={599} />
        <button onClick={() => setExpanded(v => !v)}
          className="text-pk-muted hover:text-pk-text text-xs px-1 flex-shrink-0">{expanded ? '▲' : '▼'}</button>
        <button onClick={onRemove} className="text-pk-faint hover:text-red-400 text-xs flex-shrink-0">✕</button>
      </div>

      {expanded && (
        <div className="p-3 border-t border-pk-border flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-pk-muted w-24 flex-shrink-0">Content-Type</label>
            <select value={endpoint.contentType} onChange={e => up({ contentType: e.target.value })}
              className="flex-1 text-xs px-2 py-1 rounded-lg bg-pk-bg border border-pk-border">
              {CONTENT_TYPES.map(ct => <option key={ct}>{ct}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-pk-muted w-24 flex-shrink-0">Delay (ms)</label>
            <input type="number" value={endpoint.delay} onChange={e => up({ delay: Number(e.target.value) })}
              className="w-24 px-2 py-1 text-xs rounded-lg" min={0} step={100} />
          </div>
          <label className="text-[10px] text-pk-muted">Response Body</label>
          <textarea value={endpoint.body} onChange={e => up({ body: e.target.value })}
            rows={4} placeholder='{ "ok": true }'
            className="w-full px-3 py-2 text-xs font-mono rounded-xl resize-none" />
        </div>
      )}
    </div>
  )
}

export default function MockServerPanel({ onClose }: { onClose: () => void }) {
  const [servers, setServers] = useState<(MockServer & { isRunning: boolean })[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<MockServer | null>(null)
  const [error, setError] = useState('')

  const refresh = () => window.api.mockGetAll().then(setServers)

  useEffect(() => { refresh() }, [])

  const newServer = () => {
    const s: MockServer = {
      id: crypto.randomUUID(),
      name: 'New Mock Server',
      port: 3100,
      endpoints: [],
      createdAt: Date.now(),
    }
    setDraft(s)
    setEditingId(s.id)
  }

  const saveDraft = async () => {
    if (!draft) return
    setError('')
    await window.api.mockSave(draft)
    await refresh()
    setDraft(null)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await window.api.mockDelete(id)
    await refresh()
    if (editingId === id) { setDraft(null); setEditingId(null) }
  }

  const handleToggle = async (server: MockServer & { isRunning: boolean }) => {
    setError('')
    if (server.isRunning) {
      await window.api.mockStop(server.id)
    } else {
      const result = await window.api.mockStart(server)
      if (!result.ok) setError(result.error ?? 'Failed to start server')
    }
    await refresh()
  }

  const addEndpoint = () => {
    if (!draft) return
    const ep: MockEndpoint = {
      id: crypto.randomUUID(), method: 'GET', path: '/',
      status: 200, body: '{"ok":true}', contentType: 'application/json',
      headers: [], delay: 0, enabled: true,
    }
    setDraft({ ...draft, endpoints: [...draft.endpoints, ep] })
  }

  const updateEndpoint = (ep: MockEndpoint) => {
    if (!draft) return
    setDraft({ ...draft, endpoints: draft.endpoints.map(e => e.id === ep.id ? ep : e) })
  }

  const removeEndpoint = (id: string) => {
    if (!draft) return
    setDraft({ ...draft, endpoints: draft.endpoints.filter(e => e.id !== id) })
  }

  const editServer = (server: MockServer & { isRunning: boolean }) => {
    setDraft({ ...server })
    setEditingId(server.id)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-pk-panel border border-pk-border rounded-2xl w-[720px] max-h-[85vh] flex flex-col shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pk-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-sm text-pk-text">Mock Servers</h2>
            <p className="text-pk-muted text-xs mt-0.5">Run local HTTP servers with configurable mock responses</p>
          </div>
          <button onClick={onClose} className="text-pk-muted hover:text-pk-text w-6 h-6 flex items-center justify-center rounded hover:bg-pk-border">✕</button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Server list */}
          <div className="w-56 border-r border-pk-border flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-pk-border">
              <button onClick={newServer} className="btn-primary w-full text-xs py-1.5">+ New Server</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {servers.length === 0 && !draft && (
                <div className="p-4 text-pk-muted text-xs text-center">No mock servers yet</div>
              )}
              {servers.map(s => (
                <div key={s.id}
                  onClick={() => editServer(s)}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-pk-hover transition-colors border-b border-pk-border/40 ${editingId === s.id ? 'bg-pk-accent/8 border-l-2 border-l-pk-accent' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.isRunning ? 'bg-green-400' : 'bg-pk-faint'}`} />
                    <span className="text-xs font-medium text-pk-text truncate flex-1">{s.name}</span>
                  </div>
                  <div className="text-[10px] text-pk-muted mt-0.5 pl-4">:{s.port} · {s.endpoints.length} endpoint{s.endpoints.length !== 1 ? 's' : ''}</div>
                </div>
              ))}
              {draft && !servers.find(s => s.id === draft.id) && (
                <div className="px-3 py-2.5 bg-pk-accent/8 border-l-2 border-l-pk-accent border-b border-pk-border/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pk-faint flex-shrink-0" />
                    <span className="text-xs font-medium text-pk-text truncate">{draft.name}</span>
                    <span className="text-[9px] text-pk-accent ml-auto">unsaved</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {!draft ? (
              <div className="flex flex-col items-center justify-center h-full text-pk-muted gap-2 opacity-50">
                <div className="text-3xl">🖧</div>
                <div className="text-xs">Select or create a mock server</div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Server name" className="flex-1 px-3 py-2 rounded-xl text-xs" />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-pk-muted">Port</span>
                    <input type="number" value={draft.port} onChange={e => setDraft({ ...draft, port: Number(e.target.value) })}
                      className="w-20 px-2 py-2 rounded-xl text-xs text-center" min={1024} max={65535} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-pk-muted uppercase tracking-widest flex-1">Endpoints</span>
                  <button onClick={addEndpoint} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors">+ Add</button>
                </div>

                {draft.endpoints.length === 0 && (
                  <div className="text-pk-muted text-xs text-center py-4 bg-pk-bg rounded-xl border border-pk-border/50">No endpoints — add one above</div>
                )}
                {draft.endpoints.map(ep => (
                  <EndpointEditor key={ep.id} endpoint={ep}
                    onChange={updateEndpoint}
                    onRemove={() => removeEndpoint(ep.id)} />
                ))}

                {error && <p className="text-red-400 text-xs">{error}</p>}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-pk-border flex-shrink-0">
          {draft && (
            <button onClick={saveDraft} className="btn-primary">Save</button>
          )}
          {editingId && servers.find(s => s.id === editingId) && (() => {
            const s = servers.find(s => s.id === editingId)!
            return (
              <button onClick={() => handleToggle(s)}
                className={`btn-ghost ${s.isRunning ? 'text-red-400' : 'text-green-400'}`}>
                {s.isRunning ? 'Stop Server' : 'Start Server'}
              </button>
            )
          })()}
          {editingId && servers.find(s => s.id === editingId) && (
            <button onClick={() => handleDelete(editingId)} className="btn-ghost text-red-400 ml-auto">Delete</button>
          )}
          <button onClick={onClose} className="btn-ghost ml-auto">Close</button>
        </div>
      </div>
    </div>
  )
}
