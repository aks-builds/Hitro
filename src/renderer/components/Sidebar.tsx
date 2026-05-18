import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { PROTOCOL_META, METHOD_STYLES, RestConfig, Collection, KeyValue } from '@shared/types'
import ImportModal from './ImportModal'
import CollectionRunner from './CollectionRunner'
import MockServerPanel from './MockServerPanel'

function GlobalVarsModal({ onClose }: { onClose: () => void }) {
  const { globalVariables, saveGlobalVars } = useAppStore()
  const [rows, setRows] = useState<KeyValue[]>([
    ...(globalVariables.length ? globalVariables : []),
    { id: crypto.randomUUID(), key: '', value: '', enabled: true },
  ])

  const update = (i: number, patch: Partial<KeyValue>) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row))

  const handleKeyChange = (i: number, key: string) => {
    update(i, { key })
    if (i === rows.length - 1 && key)
      setRows(r => [...r, { id: crypto.randomUUID(), key: '', value: '', enabled: true }])
  }

  const save = async () => {
    await saveGlobalVars(rows.filter(r => r.key.trim()))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-pk-panel border border-pk-border rounded-2xl w-[520px] flex flex-col shadow-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-pk-border">
          <div>
            <h2 className="font-semibold text-sm text-pk-text">Global Variables</h2>
            <p className="text-pk-muted text-xs mt-0.5">Available across all environments as &#123;&#123;key&#125;&#125;</p>
          </div>
          <button onClick={onClose} className="text-pk-muted hover:text-pk-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-pk-border">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-[20px_1fr_1fr_24px] gap-2 text-[10px] font-semibold text-pk-muted uppercase tracking-wider px-1 mb-1">
            <span/><span>Key</span><span>Value</span><span/>
          </div>
          {rows.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[20px_1fr_1fr_24px] gap-2 items-center">
              <input type="checkbox" checked={row.enabled} onChange={e => update(i, { enabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-pk-accent" />
              <input value={row.key} onChange={e => handleKeyChange(i, e.target.value)}
                placeholder="variable_name" className="px-2 py-1.5 rounded-md text-xs" />
              <input value={row.value} onChange={e => update(i, { value: e.target.value })}
                placeholder="value" className="px-2 py-1.5 rounded-md text-xs" />
              {i < rows.length - 1 ? (
                <button onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                  className="text-pk-muted hover:text-red-400 text-xs transition-colors">✕</button>
              ) : <span/>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-pk-border">
          <button onClick={save} className="btn-primary">Save variables</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { collections, environments, globalVariables, newTab, openRequest, loadCollections, loadEnvironments } = useAppStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showImport, setShowImport] = useState(false)
  const [runnerCol, setRunnerCol] = useState<Collection | null>(null)
  const [showGlobals, setShowGlobals] = useState(false)
  const [showEnvs, setShowEnvs] = useState(false)
  const [showMockServers, setShowMockServers] = useState(false)
  const [showNewCol, setShowNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')

  const toggle = (id: string) => setExpanded(e => {
    const next = { ...e, [id]: !e[id] }
    // When expanding a collection, also expand all its folders
    if (next[id]) {
      const col = collections.find(c => c.id === id)
      if (col) {
        for (const f of col.folders ?? []) next[`f-${f.id}`] = true
      }
    }
    return next
  })

  const handleExport = async (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    const json = await window.api.exportCollection(col)
    await window.api.saveFile({ defaultPath: `${col.name}.json`, content: json })
  }

  const handleDeleteCollection = async (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${col.name}" and all its requests? This cannot be undone.`)) return
    await window.api.deleteCollection(col.id)
    await loadCollections()
  }

  const handleCreateCollection = async () => {
    const name = newColName.trim()
    if (!name) return
    const col = {
      id: crypto.randomUUID(), name,
      requests: [], folders: [],
      variables: [], preScript: '', createdAt: Date.now(),
    }
    await window.api.saveCollection(col)
    await loadCollections()
    setShowNewCol(false)
    setNewColName('')
  }

  const handleActivateEnv = async (envId: string) => {
    const all = await window.api.getEnvironments()
    for (const env of all) await window.api.saveEnvironment({ ...env, isActive: env.id === envId })
    await loadEnvironments()
    setShowEnvs(false)
  }

  const activeEnv = environments.find(e => e.isActive)
  const globalCount = globalVariables.filter(v => v.enabled && v.key).length

  return (
    <div data-testid="sidebar" className="flex flex-col h-full text-xs">
      {/* Actions */}
      <div className="px-3 py-2.5 border-b border-pk-border flex gap-1.5">
        <button onClick={() => newTab()} className="btn-primary flex-1 py-1.5 text-xs">+ New</button>
        <button onClick={() => setShowImport(true)} className="btn-ghost py-1.5 text-xs px-3">Import</button>
        <button
          onClick={() => setShowGlobals(true)}
          title={`Global Variables${globalCount > 0 ? ` (${globalCount} set)` : ''}`}
          className={`btn-ghost py-1.5 px-2.5 text-xs font-mono flex-shrink-0 ${globalCount > 0 ? 'text-pk-accent border-pk-accent/40' : ''}`}
        >
          {`{}`}{globalCount > 0 ? ` ${globalCount}` : ''}
        </button>
      </div>

      {/* Collections */}
      <div className="flex-1 overflow-y-auto py-1">
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-pk-muted uppercase tracking-widest">Collections</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowNewCol(v => !v); setNewColName('') }} title="New collection"
              className="text-pk-faint hover:text-pk-accent transition-colors w-5 h-5 flex items-center justify-center rounded text-sm leading-none">+</button>
            <span className="text-[10px] text-pk-faint bg-pk-border/60 px-1.5 py-0.5 rounded-full">{collections.length}</span>
          </div>
        </div>
        {showNewCol && (
          <div className="px-3 pb-1.5 flex gap-1.5">
            <input
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection(); if (e.key === 'Escape') { setShowNewCol(false); setNewColName('') } }}
              placeholder="Collection name…"
              autoFocus
              className="flex-1 px-2 py-1 text-xs rounded-md"
            />
            <button onClick={handleCreateCollection} disabled={!newColName.trim()}
              className="btn-primary py-1 px-2 text-xs">✓</button>
          </div>
        )}

        {collections.length === 0 ? (
          <div className="px-4 py-6 text-pk-muted text-center leading-relaxed">
            <div className="text-2xl mb-2 opacity-40">📁</div>
            <div>No collections yet</div>
            <div className="text-pk-faint mt-1">Save a request to create one</div>
          </div>
        ) : collections.map(col => (
          <div key={col.id}>
            <div className="flex items-center group/col hover:bg-pk-hover transition-colors mx-1 rounded-lg">
              <button onClick={() => toggle(col.id)}
                className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 text-left">
                <span className="text-pk-muted text-[9px] flex-shrink-0 w-3">
                  {expanded[col.id] ? '▼' : '▶'}
                </span>
                <span className="font-semibold text-pk-text truncate">{col.name}</span>
                <span className="text-pk-faint text-[10px] ml-auto flex-shrink-0 pr-1">
                  {(col.requests ?? []).length + (col.folders ?? []).reduce((n, f) => n + (f.requests ?? []).length, 0)}
                </span>
              </button>
              <div className="hidden group-hover/col:flex items-center gap-0.5 pr-1 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); setRunnerCol(col) }} title="Run all"
                  className="w-5 h-5 flex items-center justify-center text-pk-muted hover:text-green-400 rounded transition-colors text-[10px]">▶</button>
                <button onClick={e => handleExport(col, e)} title="Export"
                  className="w-5 h-5 flex items-center justify-center text-pk-muted hover:text-pk-text rounded transition-colors">↓</button>
                <button onClick={e => handleDeleteCollection(col, e)} title="Delete"
                  className="w-5 h-5 flex items-center justify-center text-pk-muted hover:text-red-400 rounded transition-colors text-[10px]">✕</button>
              </div>
            </div>

            {expanded[col.id] && (
              <div className="mb-1">
                {(col.requests ?? []).map(req => {
                  const meta = PROTOCOL_META[req.protocol] ?? PROTOCOL_META['rest']
                  const isRest = req.protocol === 'rest'
                  const method = isRest ? (req.config as RestConfig)?.method : null
                  const ms = method ? METHOD_STYLES[method] : null
                  return (
                    <button key={req.id} onClick={() => openRequest(req)}
                      className="w-full flex items-center gap-2 pl-7 pr-3 py-1 hover:bg-pk-hover transition-colors group/req text-left">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 min-w-[34px] text-center"
                        style={{ color: ms?.color ?? meta.color, background: ms?.bg ?? meta.bg }}>
                        {method ?? meta.label}
                      </span>
                      <span className="truncate text-pk-muted group-hover/req:text-pk-text transition-colors">{req.name}</span>
                    </button>
                  )
                })}

                {(col.folders ?? []).map(folder => (
                  <div key={folder.id}>
                    <button onClick={() => toggle(`f-${folder.id}`)}
                      className="w-full flex items-center gap-1.5 pl-5 pr-3 py-1 hover:bg-pk-hover text-left text-pk-muted transition-colors">
                      <span className="text-[9px] flex-shrink-0">{expanded[`f-${folder.id}`] ? '▼' : '▶'}</span>
                      <span className="text-[10px]">📁</span>
                      <span className="text-[11px] truncate">{folder.name}</span>
                    </button>
                    {expanded[`f-${folder.id}`] && (folder.requests ?? []).map(req => {
                      const meta = PROTOCOL_META[req.protocol] ?? PROTOCOL_META['rest']
                      const method = req.protocol === 'rest' ? (req.config as RestConfig)?.method : null
                      const ms = method ? METHOD_STYLES[method] : null
                      return (
                        <button key={req.id} onClick={() => openRequest(req)}
                          className="w-full flex items-center gap-2 pl-10 pr-3 py-1 hover:bg-pk-hover transition-colors group/req text-left">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 min-w-[34px] text-center"
                            style={{ color: ms?.color ?? meta.color, background: ms?.bg ?? meta.bg }}>
                            {method ?? meta.label}
                          </span>
                          <span className="truncate text-pk-muted group-hover/req:text-pk-text transition-colors">{req.name}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mock server quick-access */}
      <div className="border-t border-pk-border">
        <button onClick={() => setShowMockServers(true)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-pk-hover transition-colors">
          <span className="text-[10px] font-semibold text-pk-muted uppercase tracking-wider">Mock Servers</span>
          <span className="text-[10px] text-pk-accent">Manage →</span>
        </button>
      </div>

      {/* Environment selector */}
      <div className="border-t border-pk-border">
        <button onClick={() => setShowEnvs(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-pk-hover transition-colors">
          <span className="text-[10px] font-semibold text-pk-muted uppercase tracking-wider">Env</span>
          <span className={`text-[11px] font-medium truncate max-w-[110px] ${activeEnv ? 'text-green-400' : 'text-pk-muted'}`}>
            {activeEnv ? `● ${activeEnv.name}` : '○ None'}
          </span>
        </button>
        {showEnvs && (
          <div className="bg-pk-panel border-t border-pk-border/60 pb-1 animate-fade-in">
            <button onClick={() => handleActivateEnv('')}
              className={`w-full text-left px-4 py-1.5 hover:bg-pk-hover transition-colors text-[11px] ${!activeEnv ? 'text-pk-accent' : 'text-pk-muted'}`}>
              ○ None
            </button>
            {environments.map(env => (
              <button key={env.id} onClick={() => handleActivateEnv(env.id)}
                className={`w-full text-left px-4 py-1.5 hover:bg-pk-hover transition-colors text-[11px] truncate ${env.isActive ? 'text-green-400' : 'text-pk-text'}`}>
                {env.isActive ? '●' : '○'} {env.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {showImport      && <ImportModal onClose={() => { setShowImport(false); loadCollections() }} />}
      {runnerCol       && <CollectionRunner collection={runnerCol} onClose={() => setRunnerCol(null)} />}
      {showGlobals     && <GlobalVarsModal onClose={() => setShowGlobals(false)} />}
      {showMockServers && <MockServerPanel onClose={() => setShowMockServers(false)} />}
    </div>
  )
}
