import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore, Tab } from '../store/appStore'
import { Protocol, PROTOCOL_META, HTTP_METHODS, METHOD_STYLES, HttpMethod, Collection } from '@shared/types'
import { useDarkMode } from '../hooks/useTheme'
import RestConfig from './protocols/RestConfig'
import GrpcConfig from './protocols/GrpcConfig'
import GraphqlConfig from './protocols/GraphqlConfig'
import WebSocketConfig from './protocols/WebSocketConfig'
import KafkaConfig from './protocols/KafkaConfig'
import SqsConfig from './protocols/SqsConfig'
import MqttConfig from './protocols/MqttConfig'
import SseConfig from './protocols/SseConfig'
import SocketIoConfig from './protocols/SocketIoConfig'
import AssertionEditor from './AssertionEditor'
import LoadTestPanel from './LoadTestPanel'
import Editor from '@monaco-editor/react'

const PROTOCOLS: Protocol[] = ['rest', 'grpc', 'graphql', 'websocket', 'kafka', 'sqs', 'mqtt', 'sse', 'socketio']

// ── Script Snippet Library ─────────────────────────────────────────────────
interface Snippet { label: string; description: string; code: string; context: 'pre' | 'post' | 'both' }

const SNIPPETS: Snippet[] = [
  {
    label: 'Generate UUID',
    description: 'Create a unique request ID',
    context: 'both',
    code: `const uuid = crypto.randomUUID()
pm.variables.set('uuid', uuid)`,
  },
  {
    label: 'Current timestamp',
    description: 'Unix ms timestamp for signing',
    context: 'both',
    code: `pm.variables.set('timestamp', Date.now().toString())`,
  },
  {
    label: 'ISO date string',
    description: 'RFC 3339 date for date fields',
    context: 'both',
    code: `pm.variables.set('isoDate', new Date().toISOString())`,
  },
  {
    label: 'Random test email',
    description: 'Unique email per run',
    context: 'pre',
    code: `pm.variables.set('email', \`test_\${Date.now()}@example.com\`)`,
  },
  {
    label: 'Extract auth token',
    description: 'Pull token from login response',
    context: 'post',
    code: `const token = pm.response.json().token
pm.variables.set('authToken', token)`,
  },
  {
    label: 'Extract nested field',
    description: 'Drill into a response object',
    context: 'post',
    code: `const body = pm.response.json()
const value = body.data?.id ?? body.id
pm.variables.set('recordId', String(value))`,
  },
  {
    label: 'Assert status 200',
    description: 'Verify successful response',
    context: 'post',
    code: `pm.test('Status is 200', () => {
  pm.expect(pm.response.code).to.equal(200)
})`,
  },
  {
    label: 'Assert response time',
    description: 'Ensure API responds within 1 second',
    context: 'post',
    code: `pm.test('Response time < 1000ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(1000)
})`,
  },
  {
    label: 'Base64 encode',
    description: 'Encode a value before sending',
    context: 'pre',
    code: `const raw = pm.variables.get('rawValue') ?? ''
pm.variables.set('encoded', btoa(raw))`,
  },
  {
    label: 'HMAC-SHA256 signature',
    description: 'Sign request with secret key',
    context: 'pre',
    code: `// Requires SubtleCrypto — available in renderer context
const secret = pm.variables.get('secretKey') ?? ''
const body = pm.variables.get('requestBody') ?? ''
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
)
const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
pm.variables.set('signature', hex)`,
  },
]

function SnippetDropdown({ scriptKey, onInsert }: { scriptKey: 'preScript' | 'postScript'; onInsert: (code: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const context = scriptKey === 'preScript' ? 'pre' : 'post'
  const visible = SNIPPETS.filter(s => s.context === 'both' || s.context === context)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-all"
        style={{
          background: open ? 'var(--pk-elevated)' : 'transparent',
          border: '1px solid var(--pk-border)',
          color: 'var(--pk-muted)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-text)')}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--pk-muted)' }}
        title="Insert snippet"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 3h10M1 6h7M1 9h4"/>
          <path d="M10 8v3M10 11l-1.5-1.5M10 11l1.5-1.5" strokeWidth="1.3"/>
        </svg>
        Snippets
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" style={{ opacity: 0.5 }}><path d="M0 0.5L4 5L8 0.5H0Z"/></svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-72 rounded-xl overflow-hidden z-50 animate-scale-in"
          style={{
            background: 'var(--pk-panel)',
            border: '1px solid var(--pk-border-s)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          }}
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pk-faint)', borderBottom: '1px solid var(--pk-border)' }}>
            Click to insert at cursor
          </div>
          {visible.map(s => (
            <button
              key={s.label}
              onClick={() => { onInsert(s.code); setOpen(false) }}
              className="w-full text-left px-3 py-2.5 transition-colors"
              style={{ borderBottom: '1px solid var(--pk-border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div className="text-[11px] font-semibold" style={{ color: 'var(--pk-text)' }}>{s.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--pk-faint)' }}>{s.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SaveToCollectionModal({
  collections,
  onSave,
  onClose,
}: {
  collections: Collection[]
  onSave: (collectionId: string, newName: string) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>(collections.length > 0 ? 'existing' : 'new')
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? '')
  const [newName, setNewName] = useState('')

  const canSave = mode === 'existing' ? !!selectedId : !!newName.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave(mode === 'existing' ? selectedId : '', newName.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-pk-panel border border-pk-border rounded-2xl w-[380px] flex flex-col shadow-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-pk-border">
          <h2 className="font-semibold text-sm text-pk-text">Save to Collection</h2>
          <button onClick={onClose} className="text-pk-muted hover:text-pk-text w-6 h-6 flex items-center justify-center rounded hover:bg-pk-border">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex gap-2">
            {collections.length > 0 && (
              <button onClick={() => setMode('existing')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${mode === 'existing' ? 'border-pk-accent text-pk-accent bg-pk-accent/8' : 'border-pk-border text-pk-muted hover:border-pk-accent/40'}`}>
                Add to existing
              </button>
            )}
            <button onClick={() => setMode('new')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${mode === 'new' ? 'border-pk-accent text-pk-accent bg-pk-accent/8' : 'border-pk-border text-pk-muted hover:border-pk-accent/40'}`}>
              New collection
            </button>
          </div>
          {mode === 'existing' && (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs w-full bg-pk-panel border border-pk-border text-pk-text">
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {mode === 'new' && (
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Collection name" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              className="px-3 py-2 rounded-xl text-xs w-full" />
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-pk-border">
          <button onClick={handleSave} disabled={!canSave} className="btn-primary">Save</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function RequestBuilder({ tab }: { tab: Tab }) {
  const { updateRequest, updateConfig, setResponse, setLoading, setWsConnected, clearStreamEvents, saveRequest, loadCollections, loadEnvironments, activeEnv, collections, globalVariables, resolve } = useAppStore()
  const [configTab, setConfigTab] = useState<'config' | 'scripts' | 'assertions' | 'loadtest'>('config')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const isDark = useDarkMode()
  const req = tab.request
  const monacoRefs = useRef<Record<string, any>>({})

  const insertSnippet = useCallback((scriptKey: 'preScript' | 'postScript', code: string) => {
    const editor = monacoRefs.current[scriptKey]
    if (!editor) {
      // Fallback: append to end of script
      updateRequest(tab.id, { [scriptKey]: (req[scriptKey] ? req[scriptKey] + '\n\n' : '') + code })
      return
    }
    const sel = editor.getSelection()
    editor.executeEdits('snippet', [{ range: sel, text: '\n' + code, forceMoveMarkers: true }])
    editor.focus()
  }, [tab.id, req, updateRequest])

  const handleSend = async () => {
    if (req.protocol === 'websocket' && tab.wsConnected) {
      await window.api.wsClose(tab.id)
      setWsConnected(tab.id, false)
      return
    }

    setLoading(tab.id, true)
    clearStreamEvents(tab.id)
    const env = activeEnv()
    try {
      const res = await window.api.execute({
        ...req,
        _envVars: env?.variables ?? [],
        _globalVars: globalVariables,
      } as any)

      // NOTE: wsConnected state is managed by the 'connected'/'disconnected' stream
      // events handled in App.tsx — do not set it here after IPC resolves.

      if (res.chainExtractions && Object.keys(res.chainExtractions).length > 0) {
        const activeEnvironment = activeEnv()
        if (activeEnvironment) {
          const updated = { ...activeEnvironment }
          for (const [varName, value] of Object.entries(res.chainExtractions as Record<string, string>)) {
            const existing = updated.variables.findIndex(v => v.key === varName)
            if (existing >= 0) {
              updated.variables = updated.variables.map((v, i) => i === existing ? { ...v, value } : v)
            } else {
              updated.variables = [...updated.variables, { id: crypto.randomUUID(), key: varName, value, enabled: true }]
            }
          }
          await window.api.saveEnvironment(updated)
          await loadEnvironments()
        }
      }

      setResponse(tab.id, res)
    } catch (err: any) {
      setResponse(tab.id, { error: err?.message ?? String(err) ?? 'Unknown error', duration: 0, timestamp: Date.now() })
    } finally {
      // Safety net: ensure loading spinner is always cleared
      setLoading(tab.id, false)
    }
  }

  const handleSave = () => {
    if (!req.collectionId) { setShowSaveModal(true); return }
    saveRequest(req)
  }

  const handleSaveToCollection = async (collectionId: string, newName: string) => {
    setShowSaveModal(false)
    let targetId = collectionId
    if (!targetId && newName) {
      const newCol = {
        id: crypto.randomUUID(), name: newName,
        requests: [], folders: [], variables: [], preScript: '', createdAt: Date.now(),
      }
      await window.api.saveCollection(newCol)
      await loadCollections()
      targetId = newCol.id
    }
    const updated = { ...req, collectionId: targetId }
    updateRequest(tab.id, { collectionId: targetId })
    saveRequest(updated)
  }

  const handleCopyCurl = async () => { const c = await window.api.toCurl(req); navigator.clipboard.writeText(c) }

  const renderConfig = () => {
    switch (req.protocol) {
      case 'rest':      return <RestConfig tab={tab} />
      case 'grpc':      return <GrpcConfig tab={tab} />
      case 'graphql':   return <GraphqlConfig tab={tab} />
      case 'websocket': return <WebSocketConfig tab={tab} />
      case 'kafka':     return <KafkaConfig tab={tab} />
      case 'sqs':       return <SqsConfig tab={tab} />
      case 'mqtt':      return <MqttConfig tab={tab} />
      case 'sse':       return <SseConfig tab={tab} />
      case 'socketio':  return <SocketIoConfig tab={tab} />
    }
  }

  // Keep a stable ref to handleSend so the keyboard-event listener registered
  // once per tab.id always has access to the latest closure.
  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend

  useEffect(() => {
    const handler = () => {
      const t = useAppStore.getState().tabs.find(t => t.id === tab.id)
      if (t && !t.isLoading) handleSendRef.current()
    }
    window.addEventListener('hitro:send-request', handler)
    return () => window.removeEventListener('hitro:send-request', handler)
  }, [tab.id])

  const proto     = PROTOCOL_META[req.protocol]
  const method    = req.protocol === 'rest' ? (req.config as any).method as HttpMethod : null
  const ms        = method ? METHOD_STYLES[method] : null
  const isSending = tab.isLoading
  const isScratch = tab.isScratch ?? false

  const subTabs = [
    { key: 'config'     as const, label: 'Config' },
    { key: 'scripts'    as const, label: `Scripts${(req.preScript || req.postScript) ? ' ●' : ''}` },
    { key: 'assertions' as const, label: `Assertions${req.assertions.length ? ` (${req.assertions.length})` : ''}` },
    ...(req.protocol === 'rest' ? [{ key: 'loadtest' as const, label: 'Load Test' }] : []),
  ]

  const urlInput = (() => {
    if (['rest', 'graphql', 'sse'].includes(req.protocol)) {
      return (
        <input
          data-testid={req.protocol === 'rest' ? 'rest-url' : req.protocol === 'graphql' ? 'graphql-url' : 'sse-url'}
          value={(req.config as any).url ?? ''}
          onChange={e => updateConfig(tab.id, { url: e.target.value })}
          placeholder={
            req.protocol === 'rest'    ? 'https://api.example.com/endpoint' :
            req.protocol === 'graphql' ? 'https://api.example.com/graphql'  :
                                         'https://api.example.com/events'
          }
          className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-[11px] font-mono"
          style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)', color: 'var(--pk-text)' }}
        />
      )
    }
    if (req.protocol === 'grpc') {
      return (
        <input
          value={(req.config as any).host ?? ''}
          onChange={e => updateConfig(tab.id, { host: e.target.value })}
          placeholder="localhost:50051"
          className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-[11px] font-mono"
          style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)', color: 'var(--pk-text)' }}
        />
      )
    }
    if (['websocket', 'socketio'].includes(req.protocol)) {
      return (
        <input
          value={(req.config as any).url ?? ''}
          onChange={e => updateConfig(tab.id, { url: e.target.value })}
          placeholder={req.protocol === 'websocket' ? 'ws://localhost:8080' : 'http://localhost:3000'}
          className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-[11px] font-mono"
          style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)', color: 'var(--pk-text)' }}
        />
      )
    }
    return (
      <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px]"
        style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)', color: 'var(--pk-muted)' }}>
        <span>Configure in the</span>
        <span style={{ color: 'var(--pk-accent)', fontWeight: 500 }}>Config</span>
        <span>tab below ↓</span>
      </div>
    )
  })()

  const sendLabel = (() => {
    if (isSending) return (
      <>
        <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin-fast flex-shrink-0" />
        <span>Sending…</span>
      </>
    )
    if (req.protocol === 'websocket') return tab.wsConnected ? 'Disconnect' : 'Connect'
    return 'Send'
  })()

  const sendColor = (() => {
    if (req.protocol === 'websocket' && tab.wsConnected)
      return 'border-none text-white font-semibold rounded-lg px-5 py-1.5 text-xs flex items-center gap-2 transition-all flex-shrink-0'
    return 'btn-primary px-5 py-1.5 flex items-center gap-2 flex-shrink-0 text-xs'
  })()

  const sendStyle = req.protocol === 'websocket' && tab.wsConnected
    ? { background: '#F85149', boxShadow: '0 2px 8px rgba(248,81,73,0.35)' }
    : {}

  return (
    <>
    <div className="flex flex-col h-full" style={{ background: 'var(--pk-bg)' }}>

      {/* ── Scratch Pad banner ─────────────────────────────── */}
      {isScratch && (
        <div className="flex items-center gap-2 px-4 py-1.5 flex-shrink-0"
          style={{ background: 'rgba(210,153,34,0.06)', borderBottom: '1px solid rgba(210,153,34,0.2)' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#D29922" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 10l1.5-1.5L9 3 10 4 4.5 9.5 2 10zM8 2l2 2"/>
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: '#D29922' }}>Scratch Pad</span>
          <span className="text-[10px]" style={{ color: 'rgba(210,153,34,0.6)' }}>— requests are not saved · great for quick tests</span>
        </div>
      )}

      {/* ── Row 1: Name + actions ──────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--pk-border)', background: 'var(--pk-surface)' }}>
        <input
          value={req.name}
          onChange={e => updateRequest(tab.id, { name: e.target.value })}
          className="min-w-0 max-w-[200px] px-2.5 py-1 text-[11px] rounded-lg transition-all"
          style={{ background: 'transparent', border: '1px solid transparent', color: isScratch ? '#D29922' : 'var(--pk-text)' }}
          onFocus={e => (e.currentTarget.style.background = 'var(--pk-panel)', e.currentTarget.style.borderColor = isScratch ? '#D29922' : 'var(--pk-accent)')}
          onBlur={e  => (e.currentTarget.style.background = 'transparent',     e.currentTarget.style.borderColor = 'transparent')}
          placeholder={isScratch ? 'Scratch pad name' : 'Request name'}
        />
        <div className="flex-1" />
        {!isScratch && <button onClick={handleSave} className="btn-ghost py-1 px-3 text-[11px] flex-shrink-0">Save</button>}
        {req.protocol === 'rest' && (
          <button onClick={handleCopyCurl} title="Copy as cURL" className="btn-ghost py-1 px-3 text-[11px] flex-shrink-0 font-mono">cURL</button>
        )}
      </div>

      {/* ── Row 2: Protocol + URL + Send ───────────────────── */}
      <div className="flex items-center gap-2.5 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--pk-border)' }}>

        {/* Protocol selector */}
        <div className="relative flex-shrink-0">
          <select
            data-testid="protocol-select"
            value={req.protocol}
            onChange={e => updateRequest(tab.id, { protocol: e.target.value as Protocol })}
            className="appearance-none pl-2.5 pr-6 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
            style={{ color: proto.color, background: proto.bg + '80', border: `1px solid ${proto.color}40` }}
          >
            {PROTOCOLS.map(p => (
              <option key={p} value={p} style={{ background: 'var(--pk-surface)', color: PROTOCOL_META[p].color }}>
                {PROTOCOL_META[p].label}
              </option>
            ))}
          </select>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[6px] pointer-events-none" style={{ color: proto.color }}>▼</span>
        </div>

        {/* Method selector (REST only) */}
        {req.protocol === 'rest' && (
          <div className="relative flex-shrink-0">
            <select
              value={method ?? ''}
              onChange={e => updateConfig(tab.id, { method: e.target.value })}
              className="appearance-none pl-2.5 pr-6 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer"
              style={{ color: ms?.color, background: ms?.bg + '80', border: 'none' }}
            >
              {HTTP_METHODS.map(m => {
                const s = METHOD_STYLES[m]
                return <option key={m} value={m} style={{ background: 'var(--pk-surface)', color: s.color }}>{m}</option>
              })}
            </select>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[6px] pointer-events-none" style={{ color: ms?.color }}>▼</span>
          </div>
        )}

        {/* URL / host */}
        {urlInput}

        {/* Send / Connect / Disconnect */}
        <button
          data-testid="send-button"
          onClick={handleSend}
          disabled={isSending}
          className={sendColor}
          style={sendStyle}
        >
          {sendLabel}
        </button>
      </div>

      {/* ── Sub-tabs ───────────────────────────────────────── */}
      <div className="flex px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--pk-border)', background: 'var(--pk-surface)' }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setConfigTab(t.key)}
            className={`px-4 py-2 text-[11px] font-medium ${configTab === t.key ? 'tab-active' : 'tab-inactive'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {configTab === 'config'     && renderConfig()}
        {configTab === 'assertions' && <AssertionEditor tab={tab} />}
        {configTab === 'loadtest'   && req.protocol === 'rest' && (
          <LoadTestPanel requestConfig={JSON.parse(resolve(JSON.stringify(req.config))) as any} />
        )}
        {configTab === 'scripts' && (
          <div className="flex flex-col gap-5">
            {[
              { key: 'preScript'  as const, label: 'Pre-request Script',  hint: 'Runs before the request is sent' },
              { key: 'postScript' as const, label: 'Post-response Script', hint: 'Runs after response is received' },
            ].map(({ key, label, hint }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--pk-text)' }}>{label}</span>
                    <span className="text-[11px] ml-2" style={{ color: 'var(--pk-muted)' }}>{hint}</span>
                  </div>
                  <SnippetDropdown scriptKey={key} onInsert={code => insertSnippet(key, code)} />
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pk-border-s)' }}>
                  <Editor
                    height="160px" language="javascript"
                    value={req[key] ?? ''}
                    onChange={v => updateRequest(tab.id, { [key]: v ?? '' })}
                    onMount={editor => { monacoRefs.current[key] = editor }}
                    theme={isDark ? 'vs-dark' : 'vs'}
                    options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, padding: { top: 8 } }}
                  />
                </div>
              </div>
            ))}
            <div className="text-xs p-4 rounded-xl" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)', color: 'var(--pk-muted)' }}>
              <p className="font-semibold mb-2" style={{ color: 'var(--pk-text)' }}>pm API reference</p>
              <div className="grid grid-cols-1 gap-0.5 font-mono text-[11px]">
                {[
                  "pm.variables.set('key', 'value')",
                  "pm.variables.get('key')",
                  "pm.response.json()  — post-script only",
                  "pm.response.code    — status code",
                  "pm.test('name', () => { pm.expect(pm.response.code).to.equal(200) })",
                  "console.log('msg')  — appears in Console tab",
                ].map(s => <code key={s} style={{ color: 'var(--pk-muted)', opacity: 0.8 }}>{s}</code>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {showSaveModal && (
      <SaveToCollectionModal
        collections={collections}
        onSave={handleSaveToCollection}
        onClose={() => setShowSaveModal(false)}
      />
    )}
    </>
  )
}
