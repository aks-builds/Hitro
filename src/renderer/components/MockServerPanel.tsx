import React, { useState, useEffect } from 'react'
import { MockServer, MockEndpoint, KeyValue, HttpMethod } from '@shared/types'
import ConfirmModal from './ConfirmModal'

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
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pk-border)' }}>
      <div className="flex items-center gap-2 p-2" style={{ background: 'var(--pk-panel)' }}>
        <input type="checkbox" checked={endpoint.enabled} onChange={e => up({ enabled: e.target.checked })} className="accent-pk-accent flex-shrink-0" />
        <select value={endpoint.method} onChange={e => up({ method: e.target.value as any })}
          className="text-xs px-2 py-1 rounded-lg font-bold flex-shrink-0" style={{ background: 'var(--pk-bg)', border: '1px solid var(--pk-border)', color: 'var(--pk-accent)' }}>
          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={endpoint.path} onChange={e => up({ path: e.target.value })}
          placeholder="/api/resource"
          className="flex-1 px-2 py-1 text-xs font-mono bg-transparent border-0 outline-none min-w-0" style={{ color: 'var(--pk-text)' }} />
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--pk-muted)' }}>→</span>
        <input type="number" value={endpoint.status} onChange={e => up({ status: Number(e.target.value) })}
          className="w-16 px-2 py-1 text-xs text-center rounded-lg" min={100} max={599} />
        <button onClick={() => setExpanded(v => !v)}
          className="text-xs px-1 flex-shrink-0" style={{ color: 'var(--pk-muted)' }}>{expanded ? '▲' : '▼'}</button>
        <button onClick={onRemove} className="text-xs flex-shrink-0" style={{ color: 'var(--pk-faint)' }}>✕</button>
      </div>

      {expanded && (
        <div className="p-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--pk-border)' }}>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] w-24 flex-shrink-0" style={{ color: 'var(--pk-muted)' }}>Content-Type</label>
            <select value={endpoint.contentType} onChange={e => up({ contentType: e.target.value })}
              className="flex-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--pk-bg)', border: '1px solid var(--pk-border)' }}>
              {CONTENT_TYPES.map(ct => <option key={ct}>{ct}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] w-24 flex-shrink-0" style={{ color: 'var(--pk-muted)' }}>Delay (ms)</label>
            <input type="number" value={endpoint.delay} onChange={e => up({ delay: Number(e.target.value) })}
              className="w-24 px-2 py-1 text-xs rounded-lg" min={0} step={100} />
          </div>
          <label className="text-[10px]" style={{ color: 'var(--pk-muted)' }}>Response Body</label>
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    await window.api.mockDelete(confirmDeleteId)
    await refresh()
    if (editingId === confirmDeleteId) { setDraft(null); setEditingId(null) }
    setConfirmDeleteId(null)
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
      <div className="rounded-2xl w-[720px] max-h-[85vh] flex flex-col shadow-modal animate-scale-in" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--pk-border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--pk-text)' }}>Mock Servers</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--pk-muted)' }}>Run local HTTP servers with configurable mock responses</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: 'var(--pk-muted)' }}>✕</button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Server list */}
          <div className="w-56 flex flex-col flex-shrink-0" style={{ borderRight: '1px solid var(--pk-border)' }}>
            <div className="p-3" style={{ borderBottom: '1px solid var(--pk-border)' }}>
              <button onClick={newServer} className="btn-primary w-full text-xs py-1.5">+ New Server</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {servers.length === 0 && !draft && (
                <div className="p-4 text-xs text-center" style={{ color: 'var(--pk-muted)' }}>No mock servers yet</div>
              )}
              {servers.map(s => (
                <div key={s.id}
                  onClick={() => editServer(s)}
                  className="px-3 py-2.5 cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid var(--pk-border-s)',
                    ...(editingId === s.id ? { background: 'color-mix(in srgb, var(--pk-accent) 8%, transparent)', borderLeft: '2px solid var(--pk-accent)' } : {})
                  }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.isRunning ? 'bg-green-400' : ''}`} style={s.isRunning ? undefined : { background: 'var(--pk-faint)' }} />
                    <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--pk-text)' }}>{s.name}</span>
                  </div>
                  <div className="text-[10px] mt-0.5 pl-4" style={{ color: 'var(--pk-muted)' }}>:{s.port} · {s.endpoints.length} endpoint{s.endpoints.length !== 1 ? 's' : ''}</div>
                </div>
              ))}
              {draft && !servers.find(s => s.id === draft.id) && (
                <div className="px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--pk-accent) 8%, transparent)', borderLeft: '2px solid var(--pk-accent)', borderBottom: '1px solid var(--pk-border-s)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--pk-faint)' }} />
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--pk-text)' }}>{draft.name}</span>
                    <span className="text-[9px] ml-auto" style={{ color: 'var(--pk-accent)' }}>unsaved</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {!draft ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50" style={{ color: 'var(--pk-muted)' }}>
                <div className="text-3xl">🖧</div>
                <div className="text-xs">Select or create a mock server</div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Server name" className="flex-1 px-3 py-2 rounded-xl text-xs" />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'var(--pk-muted)' }}>Port</span>
                    <input type="number" value={draft.port} onChange={e => setDraft({ ...draft, port: Number(e.target.value) })}
                      className="w-20 px-2 py-2 rounded-xl text-xs text-center" min={1024} max={65535} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest flex-1" style={{ color: 'var(--pk-muted)' }}>Endpoints</span>
                  <button onClick={addEndpoint} className="text-xs transition-colors" style={{ color: 'var(--pk-accent)' }}>+ Add</button>
                </div>

                {draft.endpoints.length === 0 && (
                  <div className="text-xs text-center py-4 rounded-xl" style={{ color: 'var(--pk-muted)', background: 'var(--pk-bg)', border: '1px solid var(--pk-border-s)' }}>No endpoints — add one above</div>
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
        <div className="flex gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--pk-border)' }}>
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
            <button onClick={() => handleDelete(editingId)} className="btn-danger ml-auto">Delete server</button>
          )}
          <button onClick={onClose} className="btn-ghost ml-auto">Close</button>
        </div>
      </div>

      {confirmDeleteId && (() => {
        const s = servers.find(x => x.id === confirmDeleteId)
        return s ? (
          <ConfirmModal
            title="Delete mock server"
            message={`"${s.name}" (port ${s.port}) will be permanently deleted. ${s.isRunning ? 'The server will be stopped first.' : ''} This cannot be undone.`}
            confirmLabel="Delete server"
            onConfirm={confirmDelete}
            onCancel={() => setConfirmDeleteId(null)}
          />
        ) : null
      })()}
    </div>
  )
}
