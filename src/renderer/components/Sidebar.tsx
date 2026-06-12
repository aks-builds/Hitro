import React, { useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { PROTOCOL_META, METHOD_STYLES, RestConfig, Collection, KeyValue, PikoRequest, Environment } from '@shared/types'

// ── Global Headers modal ───────────────────────────────────────
function GlobalHeadersModal({ onClose }: { onClose: () => void }) {
  const { globalHeaders, saveGlobalHeaders } = useAppStore()
  const [rows, setRows] = useState<KeyValue[]>([
    ...(globalHeaders.length ? globalHeaders : []),
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
    const valid = rows.filter(r => r.key.trim())
    await saveGlobalHeaders(valid)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rounded-2xl w-[540px] flex flex-col shadow-modal animate-scale-in"
        style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--pk-border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--pk-text)' }}>Global Headers</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--pk-muted)' }}>Auto-injected into every request — request-level headers take precedence</p>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs w-7 h-7 p-0 flex items-center justify-center">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-[20px_1fr_1fr_24px] gap-2 text-[10px] font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: 'var(--pk-faint)' }}>
            <span/><span>Header name</span><span>Value</span><span/>
          </div>
          {rows.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[20px_1fr_1fr_24px] gap-2 items-center">
              <input type="checkbox" checked={row.enabled} onChange={e => update(i, { enabled: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-500" />
              <input value={row.key} onChange={e => handleKeyChange(i, e.target.value)} placeholder="X-API-Key" className="px-2 py-1.5 rounded-lg text-[11px] font-mono" />
              <input value={row.value} onChange={e => update(i, { value: e.target.value })} placeholder="value or {{variable}}" className="px-2 py-1.5 rounded-lg text-[11px]" />
              {i < rows.length - 1 ? (
                <button onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                  className="text-[10px] transition-colors" style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F85149')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)')}>✕</button>
              ) : <span/>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--pk-border)' }}>
          <button onClick={save} className="btn-primary">Save headers</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
import ImportModal from './ImportModal'
import CollectionRunner from './CollectionRunner'
import MockServerPanel from './MockServerPanel'
import ConfirmModal from './ConfirmModal'
import HistoryPanel from './HistoryPanel'

// ── SVG icons ──────────────────────────────────────────────────
const FolderIcon = ({ open }: { open?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {open
      ? <><path d="M1 11V4a1 1 0 011-1h3.5l1.5 2H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1z"/></>
      : <><path d="M1 11V4a1 1 0 011-1h3.5l1.5 2H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1z"/></>
    }
  </svg>
)

const ChevronRight = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="3,1.5 7,5 3,8.5"/>
  </svg>
)

const ChevronDown = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="1.5,3 5,7 8.5,3"/>
  </svg>
)

const PlayIcon = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
    <path d="M2 1.5l7 3.5-7 3.5z"/>
  </svg>
)

const DownloadIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 1v7M3 5l3 3 3-3M2 10h8"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 3h10M4 3V2h4v1M9 3v7H3V3h6z"/>
  </svg>
)

const GlobeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <circle cx="7" cy="7" r="5.5"/>
    <path d="M7 1.5c-1.5 1.5-2.5 3.2-2.5 5.5s1 4 2.5 5.5M7 1.5c1.5 1.5 2.5 3.2 2.5 5.5s-1 4-2.5 5.5M1.5 7h11"/>
  </svg>
)

const ServerIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="1" y="2" width="12" height="4" rx="1"/>
    <rect x="1" y="8" width="12" height="4" rx="1"/>
    <circle cx="3.5" cy="4" r="0.6" fill="currentColor" stroke="none"/>
    <circle cx="3.5" cy="10" r="0.6" fill="currentColor" stroke="none"/>
  </svg>
)

const VarsIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 3.5L1 7l2 3.5M11 3.5L13 7l-2 3.5M8.5 2l-3 10"/>
  </svg>
)

const WarningIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L15 14H1L8 1.5z" fill="rgba(210,153,34,0.2)" stroke="#D29922" strokeWidth="1.2"/>
    <line x1="8" y1="6" x2="8" y2="10" stroke="#D29922" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="12" r="0.7" fill="#D29922"/>
  </svg>
)

const DotIcon = ({ active }: { active: boolean }) => (
  <svg width="7" height="7" viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="3.5" fill={active ? '#3FB950' : 'var(--pk-faint)'}/>
  </svg>
)

// ── Global variables modal ─────────────────────────────────────
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rounded-2xl w-[520px] flex flex-col shadow-modal animate-scale-in"
        style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--pk-border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--pk-text)' }}>Global Variables</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--pk-muted)' }}>Available in all requests as &#123;&#123;key&#125;&#125;</p>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs w-7 h-7 p-0 flex items-center justify-center">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-[20px_1fr_1fr_24px] gap-2 text-[10px] font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: 'var(--pk-faint)' }}>
            <span/><span>Key</span><span>Value</span><span/>
          </div>
          {rows.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[20px_1fr_1fr_24px] gap-2 items-center">
              <input type="checkbox" checked={row.enabled} onChange={e => update(i, { enabled: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-500" />
              <input value={row.key} onChange={e => handleKeyChange(i, e.target.value)} placeholder="variable_name" className="px-2 py-1.5 rounded-lg text-[11px]" />
              <input value={row.value} onChange={e => update(i, { value: e.target.value })} placeholder="value" className="px-2 py-1.5 rounded-lg text-[11px]" />
              {i < rows.length - 1 ? (
                <button onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                  className="text-[10px] transition-colors" style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F85149')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)')}>✕</button>
              ) : <span/>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--pk-border)' }}>
          <button onClick={save} className="btn-primary">Save variables</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Env warning banner ─────────────────────────────────────────
function EnvWarningBanner({
  varNames,
  onImport,
  onDismiss,
}: {
  varNames: string[]
  onImport: () => void
  onDismiss: () => void
}) {
  const preview = varNames.slice(0, 3).map(v => `{{${v}}}`).join(', ')
  const extra = varNames.length > 3 ? ` +${varNames.length - 3} more` : ''
  return (
    <div className="mx-2 mb-2 p-3 rounded-xl animate-slide-up"
      style={{ background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.22)' }}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5"><WarningIcon /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: '#D29922' }}>Environment required</p>
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
            Imported requests reference{' '}
            <code className="font-mono" style={{ color: '#D29922' }}>{preview}{extra}</code>.
            Without an active environment, these will be sent literally.
          </p>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={onImport}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: 'rgba(210,153,34,0.15)', color: '#D29922', border: '1px solid rgba(210,153,34,0.3)' }}
            >
              Import environment →
            </button>
            <button onClick={onDismiss} className="text-[10px] px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--pk-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-muted)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)')}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Collapsed sidebar (icon-only strip) ───────────────────────
function CollapsedSidebar({ onExpand }: { onExpand: () => void }) {
  const { collections, newTab, openRequest, environments } = useAppStore()
  const activeEnv = environments.find(e => e.isActive)

  return (
    <div className="flex flex-col h-full items-center py-2 gap-0.5 overflow-hidden">
      {/* New tab */}
      <button
        onClick={() => newTab()}
        title="New request (Ctrl+N)"
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
        style={{ color: 'var(--pk-faint)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-accent)', e.currentTarget.style.background = 'var(--pk-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
        </svg>
      </button>

      <div className="w-5 my-1 flex-shrink-0" style={{ borderTop: '1px solid var(--pk-border)' }} />

      {/* Collections as colored dots */}
      {collections.slice(0, 8).map(col => {
        const totalReqs = (col.requests?.length ?? 0) + (col.folders ?? []).reduce((n, f) => n + (f.requests?.length ?? 0), 0)
        return (
          <button
            key={col.id}
            title={`${col.name} · ${totalReqs} request${totalReqs !== 1 ? 's' : ''}`}
            onClick={() => {
              // Open first request in collection if exists
              const first = col.requests?.[0] ?? col.folders?.[0]?.requests?.[0]
              if (first) openRequest(first)
              else onExpand()
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 relative group/dot"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: '#6366F1', boxShadow: totalReqs > 0 ? '0 0 6px rgba(99,102,241,0.4)' : 'none' }}
            />
            {totalReqs > 0 && (
              <span
                className="absolute top-0.5 right-0.5 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--pk-panel)', color: 'var(--pk-muted)', border: '1px solid var(--pk-border-s)' }}
              >
                {totalReqs > 9 ? '9+' : totalReqs}
              </span>
            )}
          </button>
        )
      })}

      {collections.length === 0 && (
        <div className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--pk-faint)' }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M1 11V4a1 1 0 011-1h3.5l1.5 2H12a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1z"/>
          </svg>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active env dot */}
      <div
        title={activeEnv ? `Environment: ${activeEnv.name}` : 'No active environment'}
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ color: 'var(--pk-faint)' }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: activeEnv ? '#3FB950' : 'var(--pk-faint)', boxShadow: activeEnv ? '0 0 6px rgba(63,185,80,0.4)' : 'none' }}
        />
      </div>
    </div>
  )
}

// ── Main Sidebar ───────────────────────────────────────────────
export default function Sidebar({
  collapsed = false,
  onImportDone,
}: {
  collapsed?: boolean
  onImportDone?: (collectionId?: string) => void
}) {
  const { collections, environments, globalVariables, globalHeaders, newTab, openRequest, loadCollections, loadEnvironments } = useAppStore()

  if (collapsed) {
    return (
      <CollapsedSidebar
        onExpand={() => {
          // Signal parent to expand — but parent controls width, so we just open a new tab
          newTab()
        }}
      />
    )
  }
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showImport, setShowImport] = useState(false)
  const [showImportEnv, setShowImportEnv] = useState(false)
  const [runnerCol, setRunnerCol] = useState<Collection | null>(null)
  const [showGlobals, setShowGlobals] = useState(false)
  const [showEnvs, setShowEnvs] = useState(false)
  const [showMockServers, setShowMockServers] = useState(false)
  const [showNewCol, setShowNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [envWarning, setEnvWarning] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState<{ col: Collection } | null>(null)
  const [confirmDeleteReq, setConfirmDeleteReq] = useState<{ req: PikoRequest } | null>(null)
  const [confirmDeleteEnvState, setConfirmDeleteEnvState] = useState<{ env: Environment } | null>(null)
  const [showGlobalHeaders, setShowGlobalHeaders] = useState(false)
  const [partialExportCol, setPartialExportCol] = useState<Collection | null>(null)
  const [partialSelected, setPartialSelected] = useState<Set<string>>(new Set())
  // Drag-and-drop state
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: 'above' | 'below' } | null>(null)

  const toggle = (id: string) => setExpanded(e => {
    const next = { ...e, [id]: !e[id] }
    if (next[id]) {
      const col = collections.find(c => c.id === id)
      if (col) for (const f of col.folders ?? []) next[`f-${f.id}`] = true
    }
    return next
  })

  const handleExport = async (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    const json = await window.api.exportCollection(col)
    await window.api.saveFile({ defaultPath: `${col.name}.json`, content: json })
  }

  const handleExportDocs = async (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    const html = await window.api.exportDocsHtml(col)
    await window.api.saveFile({ defaultPath: `${col.name} API Docs.html`, content: html })
  }

  const handlePartialExport = (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    const allReqs = [...(col.requests ?? []), ...(col.folders ?? []).flatMap(f => f.requests ?? [])]
    setPartialSelected(new Set(allReqs.map(r => r.id)))
    setPartialExportCol(col)
  }

  const confirmPartialExport = async () => {
    if (!partialExportCol) return
    const json = await window.api.exportPartial(partialExportCol, [...partialSelected])
    await window.api.saveFile({ defaultPath: `${partialExportCol.name} (partial).json`, content: json })
    setPartialExportCol(null)
  }

  const handleDeleteCollection = (col: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete({ col })
  }

  const confirmDeleteCollection = async () => {
    if (!confirmDelete) return
    await window.api.deleteCollection(confirmDelete.col.id)
    await loadCollections()
    setConfirmDelete(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent, colId: string, targetId: string, pos: 'above' | 'below', allReqs: PikoRequest[]) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDropTarget(null); return }
    const ids = allReqs.map(r => r.id)
    const fromIdx = ids.indexOf(dragId)
    const toIdx   = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); setDropTarget(null); return }
    const reordered = [...ids]
    reordered.splice(fromIdx, 1)
    const insertAt = pos === 'below' ? (toIdx > fromIdx ? toIdx : toIdx + 1) : (toIdx > fromIdx ? toIdx - 1 : toIdx)
    reordered.splice(Math.max(0, insertAt), 0, dragId)
    setDragId(null); setDropTarget(null)
    await window.api.reorderRequests(colId, reordered)
    await loadCollections()
  }, [dragId, loadCollections])

  const handleDeleteRequest = (req: PikoRequest, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteReq({ req })
  }

  const confirmDeleteRequest = async () => {
    if (!confirmDeleteReq) return
    await window.api.deleteRequest(confirmDeleteReq.req.id)
    await loadCollections()
    setConfirmDeleteReq(null)
  }

  const handleDuplicateRequest = async (req: PikoRequest, e: React.MouseEvent) => {
    e.stopPropagation()
    const copy: PikoRequest = { ...req, id: crypto.randomUUID(), name: `${req.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() }
    await window.api.saveRequest(copy)
    await loadCollections()
  }

  const handleDeleteEnv = (env: Environment, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteEnvState({ env })
  }

  const confirmDeleteEnvAction = async () => {
    if (!confirmDeleteEnvState) return
    await window.api.deleteEnvironment(confirmDeleteEnvState.env.id)
    await loadEnvironments()
    setConfirmDeleteEnvState(null)
  }

  const handleCreateCollection = async () => {
    const name = newColName.trim()
    if (!name) return
    const col = {
      id: crypto.randomUUID(), name,
      requests: [], folders: [], variables: [], preScript: '', createdAt: Date.now(),
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

  const handleImportClose = useCallback((importedCollectionId?: string) => {
    setShowImport(false)
    loadCollections().then(() => {
      if (importedCollectionId) {
        setExpanded(prev => ({ ...prev, [importedCollectionId]: true }))
      }
      onImportDone?.(importedCollectionId)
    })
  }, [loadCollections, onImportDone])

  const handleImportEnvClose = useCallback((importedCollectionId?: string) => {
    setShowImportEnv(false)
    loadCollections()
    loadEnvironments()
    if (importedCollectionId) {
      setExpanded(prev => ({ ...prev, [importedCollectionId]: true }))
    }
  }, [loadCollections, loadEnvironments])

  const activeEnv = environments.find(e => e.isActive)
  const globalCount = globalVariables.filter(v => v.enabled && v.key).length

  return (
    <div data-testid="sidebar" className="flex flex-col h-full text-xs">

      {/* Actions row */}
      <div className="px-2.5 py-2" style={{ borderBottom: '1px solid var(--pk-border)' }}>
        <div className="flex gap-1.5">
          <button onClick={() => newTab()} className="btn-primary flex-1 py-1.5 text-[11px]">+ New</button>
          <button data-testid="open-import-modal" onClick={() => setShowImport(true)} className="btn-ghost py-1.5 text-[11px] px-3">Import</button>
          <button
            onClick={() => setShowGlobals(true)}
            title={`Global Variables${globalCount > 0 ? ` (${globalCount})` : ''}`}
            className="btn-ghost py-1.5 px-2.5 text-[11px] font-mono flex-shrink-0"
            style={globalCount > 0 ? { color: 'var(--pk-accent)', borderColor: 'rgba(99,102,241,0.35)' } : {}}
          >
            <VarsIcon />
          </button>
          <button
            onClick={() => setShowGlobalHeaders(true)}
            title={`Global Headers${globalHeaders.filter(h => h.enabled && h.key).length > 0 ? ` (${globalHeaders.filter(h => h.enabled && h.key).length} active)` : ''}`}
            className="btn-ghost py-1.5 px-2.5 text-[11px] flex-shrink-0"
            style={globalHeaders.filter(h => h.enabled && h.key).length > 0 ? { color: '#3FB950', borderColor: 'rgba(63,185,80,0.35)' } : {}}
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <rect x="1" y="2" width="12" height="3" rx="1"/>
              <rect x="1" y="7" width="12" height="3" rx="1"/>
              <line x1="1" y1="12" x2="8" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Env warning banner */}
      {envWarning.length > 0 && !activeEnv && (
        <EnvWarningBanner
          varNames={envWarning}
          onImport={() => { setEnvWarning([]); setShowImportEnv(true) }}
          onDismiss={() => setEnvWarning([])}
        />
      )}

      {/* Collections */}
      <div className="flex-1 overflow-y-auto py-1">
        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--pk-faint)' }}>Collections</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowNewCol(v => !v); setNewColName('') }}
              title="New collection"
              className="w-5 h-5 flex items-center justify-center rounded text-base leading-none transition-colors"
              style={{ color: 'var(--pk-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)')}>+</button>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: 'var(--pk-elevated)', color: 'var(--pk-faint)' }}
            >{collections.length}</span>
          </div>
        </div>

        {showNewCol && (
          <div className="px-2.5 pb-2 flex gap-1.5 animate-slide-down">
            <input
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateCollection()
                if (e.key === 'Escape') { setShowNewCol(false); setNewColName('') }
              }}
              placeholder="Collection name…"
              autoFocus
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px]"
            />
            <button
              onClick={handleCreateCollection}
              disabled={!newColName.trim()}
              className="btn-primary py-1 px-2.5 text-[11px]"
            >✓</button>
          </div>
        )}

        {collections.length === 0 ? (
          <div className="px-4 py-8 text-center" style={{ color: 'var(--pk-faint)' }}>
            <div className="flex justify-center mb-2 opacity-40">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M3 7a2 2 0 012-2h3.5l2 2H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
            </div>
            <div className="text-[11px]">No collections yet</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--pk-faint)' }}>Import a Postman collection or save a request</div>
          </div>
        ) : collections.map(col => (
          <div key={col.id} className="animate-fade-in">
            <div
              className="flex items-center group/col mx-1 rounded-lg transition-colors"
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <button onClick={() => toggle(col.id)} className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 text-left">
                <span style={{ color: 'var(--pk-faint)', flexShrink: 0 }}>
                  {expanded[col.id] ? <ChevronDown /> : <ChevronRight />}
                </span>
                <span className="font-semibold text-[11px] truncate" style={{ color: 'var(--pk-text)' }}>{col.name}</span>
                <span className="text-[9px] ml-auto flex-shrink-0 pr-1 font-mono" style={{ color: 'var(--pk-faint)' }}>
                  {(col.requests ?? []).length + (col.folders ?? []).reduce((n, f) => n + (f.requests ?? []).length, 0)}
                </span>
              </button>
              <div className="hidden group-hover/col:flex items-center gap-0.5 pr-1.5 flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setRunnerCol(col) }}
                  title="Run all"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#3FB950', e.currentTarget.style.background = 'rgba(63,185,80,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                  <PlayIcon />
                </button>
                <button
                  onClick={e => handleExport(col, e)}
                  title="Export all"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-text)', e.currentTarget.style.background = 'var(--pk-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                  <DownloadIcon />
                </button>
                <button
                  onClick={e => handlePartialExport(col, e)}
                  title="Export selected requests"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[8px] font-bold"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-accent)', e.currentTarget.style.background = 'var(--pk-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 9v2h3M6 2v6M3.5 5.5l2.5 2.5 2.5-2.5M10 7v4M8 9h4"/>
                  </svg>
                </button>
                <button
                  onClick={e => handleExportDocs(col, e)}
                  title="Export API documentation (HTML/Word)"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D29922', e.currentTarget.style.background = 'rgba(210,153,34,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="1" y="1" width="10" height="10" rx="1.5"/><path d="M3.5 4h5M3.5 6h5M3.5 8h3"/>
                  </svg>
                </button>
                <button
                  onClick={e => handleDeleteCollection(col, e)}
                  title="Delete"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F85149', e.currentTarget.style.background = 'rgba(248,81,73,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                  <TrashIcon />
                </button>
              </div>
            </div>

            {expanded[col.id] && (
              <div className="mb-1">
                {(col.requests ?? []).map((req, ri) => {
                  const meta = PROTOCOL_META[req.protocol] ?? PROTOCOL_META['rest']
                  const isRest = req.protocol === 'rest'
                  const method = isRest ? (req.config as RestConfig)?.method : null
                  const ms = method ? METHOD_STYLES[method] : null
                  const isDragging = dragId === req.id
                  const isDropTarget = dropTarget?.id === req.id
                  return (
                    <div
                      key={req.id}
                      className="group/req flex items-center relative animate-stagger"
                      style={{
                        animationDelay: `${ri * 20}ms`,
                        opacity: isDragging ? 0.4 : 1,
                        borderTop: isDropTarget && dropTarget?.pos === 'above' ? '2px solid var(--pk-accent)' : '2px solid transparent',
                        borderBottom: isDropTarget && dropTarget?.pos === 'below' ? '2px solid var(--pk-accent)' : '2px solid transparent',
                      }}
                      draggable
                      onDragStart={e => { setDragId(req.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => { setDragId(null); setDropTarget(null) }}
                      onDragOver={e => {
                        e.preventDefault()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setDropTarget({ id: req.id, pos: e.clientY < rect.top + rect.height / 2 ? 'above' : 'below' })
                      }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={e => handleDrop(e, col.id, req.id, dropTarget?.pos ?? 'below', col.requests ?? [])}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Drag handle */}
                      <span
                        className="hidden group-hover/req:flex items-center justify-center w-4 flex-shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ color: 'var(--pk-faint)', paddingLeft: 4 }}
                        title="Drag to reorder"
                      >
                        <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                          <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
                          <circle cx="2" cy="5" r="1.2"/><circle cx="6" cy="5" r="1.2"/>
                          <circle cx="2" cy="8" r="1.2"/><circle cx="6" cy="8" r="1.2"/>
                        </svg>
                      </span>
                      <div className="flex group-hover/req:hidden w-4 flex-shrink-0" />
                      <button
                        onClick={() => openRequest(req)}
                        title={`${method ?? meta.label} ${req.name}`}
                        className="flex-1 flex items-center gap-2 pl-4 py-1 text-left min-w-0"
                      >
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 min-w-[34px] text-center"
                          style={{ color: ms?.color ?? meta.color, background: (ms?.bg ?? meta.bg) + '90' }}
                        >{method ?? meta.label}</span>
                        <span className="truncate text-[11px]" style={{ color: 'var(--pk-muted)' }}>{req.name}</span>
                      </button>
                      <div className="hidden group-hover/req:flex items-center gap-0.5 pr-1.5 flex-shrink-0">
                        <button onClick={e => handleDuplicateRequest(req, e)} title="Duplicate"
                          className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[9px]"
                          style={{ color: 'var(--pk-faint)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-accent)', e.currentTarget.style.background = 'var(--pk-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>⧉</button>
                        <button onClick={e => handleDeleteRequest(req, e)} title="Delete"
                          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                          style={{ color: 'var(--pk-faint)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#F85149', e.currentTarget.style.background = 'rgba(248,81,73,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {(col.folders ?? []).map(folder => (
                  <div key={folder.id}>
                    <button
                      onClick={() => toggle(`f-${folder.id}`)}
                      title={`${folder.name} · ${(folder.requests ?? []).length} request${(folder.requests ?? []).length !== 1 ? 's' : ''}`}
                      className="w-full flex items-center gap-1.5 pl-6 pr-3 py-1 text-left transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <span style={{ color: 'var(--pk-faint)', flexShrink: 0 }}>
                        {expanded[`f-${folder.id}`] ? <ChevronDown /> : <ChevronRight />}
                      </span>
                      <span style={{ color: 'var(--pk-faint)', flexShrink: 0 }}>
                        <FolderIcon open={expanded[`f-${folder.id}`]} />
                      </span>
                      <span className="text-[11px] truncate" style={{ color: 'var(--pk-muted)' }}>{folder.name}</span>
                      <span className="text-[9px] ml-auto font-mono" style={{ color: 'var(--pk-faint)' }}>
                        {(folder.requests ?? []).length}
                      </span>
                    </button>
                    {expanded[`f-${folder.id}`] && (folder.requests ?? []).map((req, ri) => {
                      const meta = PROTOCOL_META[req.protocol] ?? PROTOCOL_META['rest']
                      const method = req.protocol === 'rest' ? (req.config as RestConfig)?.method : null
                      const ms = method ? METHOD_STYLES[method] : null
                      return (
                        <div
                          key={req.id}
                          className="group/req flex items-center animate-stagger"
                          style={{ animationDelay: `${ri * 20}ms` }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <button
                            onClick={() => openRequest(req)}
                            title={`${method ?? meta.label} ${req.name}`}
                            className="flex-1 flex items-center gap-2 pl-11 py-1 text-left min-w-0"
                          >
                            <span
                              className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 min-w-[34px] text-center"
                              style={{ color: ms?.color ?? meta.color, background: (ms?.bg ?? meta.bg) + '90' }}
                            >{method ?? meta.label}</span>
                            <span className="truncate text-[11px]" style={{ color: 'var(--pk-muted)' }}>{req.name}</span>
                          </button>
                          <div className="hidden group-hover/req:flex items-center gap-0.5 pr-1.5 flex-shrink-0">
                            <button onClick={e => handleDuplicateRequest(req, e)} title="Duplicate"
                              className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[9px]"
                              style={{ color: 'var(--pk-faint)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-accent)', e.currentTarget.style.background = 'var(--pk-elevated)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>⧉</button>
                            <button onClick={e => handleDeleteRequest(req, e)} title="Delete"
                              className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                              style={{ color: 'var(--pk-faint)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#F85149', e.currentTarget.style.background = 'rgba(248,81,73,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}>
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* History browser */}
      <HistoryPanel />

      {/* Mock servers quick access */}
      <div style={{ borderTop: '1px solid var(--pk-border)' }}>
        <button
          onClick={() => setShowMockServers(true)}
          className="w-full flex items-center justify-between px-3 py-2 transition-colors"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pk-faint)' }}>
            <ServerIcon />
            <span>Mock Servers</span>
          </span>
          <span className="text-[10px]" style={{ color: 'var(--pk-accent)' }}>Manage →</span>
        </button>
      </div>

      {/* Environment selector */}
      <div style={{ borderTop: '1px solid var(--pk-border)' }}>
        <button
          onClick={() => setShowEnvs(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 transition-colors"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pk-faint)' }}>
            <GlobeIcon />
            <span>Environment</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium truncate max-w-[110px]"
            style={{ color: activeEnv ? '#3FB950' : 'var(--pk-muted)' }}>
            <DotIcon active={!!activeEnv} />
            {activeEnv ? activeEnv.name : 'None'}
          </span>
        </button>
        {showEnvs && (
          <div className="pb-1 animate-slide-down" style={{ borderTop: '1px solid var(--pk-border)' }}>
            <button
              onClick={() => handleActivateEnv('')}
              className="w-full text-left px-4 py-1.5 text-[11px] transition-colors"
              style={{ color: !activeEnv ? 'var(--pk-accent)' : 'var(--pk-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <span className="flex items-center gap-1.5"><DotIcon active={false} /> None</span>
            </button>
            {environments.map(env => (
              <div key={env.id} className="group/env flex items-center"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <button
                  onClick={() => handleActivateEnv(env.id)}
                  className="flex-1 text-left px-4 py-1.5 text-[11px] min-w-0 truncate"
                  style={{ color: env.isActive ? '#3FB950' : 'var(--pk-text)' }}
                >
                  <span className="flex items-center gap-1.5"><DotIcon active={env.isActive} /> {env.name}</span>
                </button>
                <button
                  onClick={e => handleDeleteEnv(env, e)}
                  title="Delete environment"
                  className="hidden group-hover/env:flex w-6 h-6 items-center justify-center rounded mr-1.5 transition-colors flex-shrink-0"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F85149', e.currentTarget.style.background = 'rgba(248,81,73,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showImport && (
        <ImportModal
          onClose={handleImportClose}
          onEnvVarsDetected={setEnvWarning}
        />
      )}
      {showImportEnv && (
        <ImportModal
          initialMode="dotenv"
          onClose={handleImportEnvClose}
        />
      )}
      {runnerCol       && <CollectionRunner collection={runnerCol} onClose={() => setRunnerCol(null)} />}
      {showGlobals        && <GlobalVarsModal    onClose={() => setShowGlobals(false)} />}
      {showGlobalHeaders  && <GlobalHeadersModal onClose={() => setShowGlobalHeaders(false)} />}
      {showMockServers && <MockServerPanel  onClose={() => setShowMockServers(false)} />}

      {partialExportCol && (() => {
        const allReqs = [
          ...(partialExportCol.requests ?? []),
          ...(partialExportCol.folders ?? []).flatMap(f => (f.requests ?? []).map(r => ({ ...r, _folder: f.name }))),
        ] as Array<PikoRequest & { _folder?: string }>
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in" style={{ background: 'rgba(0,0,0,0.72)' }}
            onClick={e => { if (e.target === e.currentTarget) setPartialExportCol(null) }}>
            <div className="rounded-2xl w-[440px] flex flex-col shadow-modal animate-scale-in"
              style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--pk-border)' }}>
                <div>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--pk-text)' }}>Export Selected APIs</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--pk-muted)' }}>{partialSelected.size} of {allReqs.length} selected</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPartialSelected(new Set(allReqs.map(r => r.id)))} className="text-[10px]" style={{ color: 'var(--pk-accent)' }}>All</button>
                  <button onClick={() => setPartialSelected(new Set())} className="text-[10px]" style={{ color: 'var(--pk-faint)' }}>None</button>
                  <button onClick={() => setPartialExportCol(null)} className="btn-ghost text-xs w-7 h-7 p-0 flex items-center justify-center">✕</button>
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 max-h-72 overflow-y-auto">
                {allReqs.map(req => {
                  const meta = PROTOCOL_META[req.protocol] ?? PROTOCOL_META['rest']
                  const method = req.protocol === 'rest' ? (req.config as RestConfig)?.method ?? null : null
                  const ms = method ? METHOD_STYLES[method] : null
                  const checked = partialSelected.has(req.id)
                  return (
                    <label key={req.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                      style={{ background: checked ? 'rgba(99,102,241,0.07)' : 'transparent', border: `1px solid ${checked ? 'rgba(99,102,241,0.2)' : 'transparent'}` }}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--pk-elevated)' }}
                      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                    >
                      <input type="checkbox" checked={checked} className="accent-indigo-500"
                        onChange={() => setPartialSelected(s => { const n = new Set(s); checked ? n.delete(req.id) : n.add(req.id); return n })} />
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 min-w-[30px] text-center"
                        style={{ color: ms?.color ?? meta.color, background: (ms?.bg ?? meta.bg) + '80' }}>
                        {method ?? meta.label}
                      </span>
                      <span className="text-[11px] truncate flex-1" style={{ color: 'var(--pk-text)' }}>{req.name}</span>
                      {(req as any)._folder && <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--pk-faint)' }}>{(req as any)._folder}</span>}
                    </label>
                  )
                })}
              </div>
              <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--pk-border)' }}>
                <button onClick={confirmPartialExport} disabled={partialSelected.size === 0} className="btn-primary text-xs">
                  Export {partialSelected.size} request{partialSelected.size !== 1 ? 's' : ''}
                </button>
                <button onClick={() => setPartialExportCol(null)} className="btn-ghost text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}

      {confirmDelete && (
        <ConfirmModal
          title="Delete collection"
          message={`"${confirmDelete.col.name}" and all ${
            (confirmDelete.col.requests?.length ?? 0) +
            (confirmDelete.col.folders ?? []).reduce((n, f) => n + (f.requests?.length ?? 0), 0)
          } request(s) inside it will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete collection"
          onConfirm={confirmDeleteCollection}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmDeleteReq && (
        <ConfirmModal
          title="Delete request"
          message={`"${confirmDeleteReq.req.name}" will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete request"
          onConfirm={confirmDeleteRequest}
          onCancel={() => setConfirmDeleteReq(null)}
        />
      )}
      {confirmDeleteEnvState && (
        <ConfirmModal
          title="Delete environment"
          message={`"${confirmDeleteEnvState.env.name}" and all its variables will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete environment"
          onConfirm={confirmDeleteEnvAction}
          onCancel={() => setConfirmDeleteEnvState(null)}
        />
      )}
    </div>
  )
}
