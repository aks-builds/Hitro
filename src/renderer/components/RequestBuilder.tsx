import React, { useState } from 'react'
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

      if (req.protocol === 'websocket' && !res.error) {
        setWsConnected(tab.id, true)
      }

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

  const proto   = PROTOCOL_META[req.protocol]
  const method  = req.protocol === 'rest' ? (req.config as any).method as HttpMethod : null
  const ms      = method ? METHOD_STYLES[method] : null
  const isSending = tab.isLoading

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
          className="flex-1 min-w-0 px-4 py-2 rounded-lg text-sm bg-pk-panel border border-pk-border font-mono"
        />
      )
    }
    if (req.protocol === 'grpc') {
      return (
        <input
          value={(req.config as any).host ?? ''}
          onChange={e => updateConfig(tab.id, { host: e.target.value })}
          placeholder="localhost:50051"
          className="flex-1 min-w-0 px-4 py-2 rounded-lg text-sm bg-pk-panel border border-pk-border font-mono"
        />
      )
    }
    if (['websocket', 'socketio'].includes(req.protocol)) {
      return (
        <input
          value={(req.config as any).url ?? ''}
          onChange={e => updateConfig(tab.id, { url: e.target.value })}
          placeholder={req.protocol === 'websocket' ? 'ws://localhost:8080' : 'http://localhost:3000'}
          className="flex-1 min-w-0 px-4 py-2 rounded-lg text-sm bg-pk-panel border border-pk-border font-mono"
        />
      )
    }
    return (
      <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-pk-surface/60 border border-pk-border/50 text-xs">
        <span className="text-pk-muted">Configure in the</span>
        <span className="text-pk-accent font-medium">Config</span>
        <span className="text-pk-muted">tab below ↓</span>
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
      return 'bg-red-600 hover:bg-red-500 border-none text-white font-semibold rounded-lg px-6 py-2 text-xs flex items-center gap-2 transition-colors flex-shrink-0'
    return 'btn-primary px-6 py-2 flex items-center gap-2 flex-shrink-0 text-xs'
  })()

  return (
    <>
    <div className="flex flex-col h-full bg-pk-bg">

      {/* ── Row 1: Name + actions ──────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-pk-border/40 flex-shrink-0 bg-pk-surface/40">
        <input
          value={req.name}
          onChange={e => updateRequest(tab.id, { name: e.target.value })}
          className="min-w-0 max-w-[200px] px-2.5 py-1 text-xs bg-transparent border border-transparent hover:border-pk-border/70 rounded-md focus:border-pk-accent focus:bg-pk-panel/60 transition-all"
          placeholder="Request name"
        />
        <div className="flex-1" />
        <button onClick={handleSave} className="btn-ghost py-1 px-3 text-xs flex-shrink-0">Save</button>
        {req.protocol === 'rest' && (
          <button onClick={handleCopyCurl} title="Copy as cURL" className="btn-ghost py-1 px-3 text-xs flex-shrink-0 font-mono">cURL</button>
        )}
      </div>

      {/* ── Row 2: Protocol + URL + Send ───────────────────── */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-pk-border flex-shrink-0">

        {/* Protocol selector */}
        <div className="relative flex-shrink-0">
          <select
            data-testid="protocol-select"
            value={req.protocol}
            onChange={e => updateRequest(tab.id, { protocol: e.target.value as Protocol })}
            className="appearance-none pl-2.5 pr-7 py-2 text-[11px] font-bold rounded-lg cursor-pointer border transition-all"
            style={{ color: proto.color, background: proto.bg, borderColor: proto.color + '50' }}
          >
            {PROTOCOLS.map(p => (
              <option key={p} value={p} style={{ background: 'var(--pk-surface)', color: PROTOCOL_META[p].color }}>
                {PROTOCOL_META[p].label}
              </option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] pointer-events-none" style={{ color: proto.color }}>▼</span>
        </div>

        {/* Method selector (REST only) */}
        {req.protocol === 'rest' && (
          <div className="relative flex-shrink-0">
            <select
              value={method ?? ''}
              onChange={e => updateConfig(tab.id, { method: e.target.value })}
              className="appearance-none pl-2.5 pr-7 py-2 text-[11px] font-bold rounded-lg cursor-pointer"
              style={{ color: ms?.color, background: ms?.bg, border: 'none' }}
            >
              {HTTP_METHODS.map(m => {
                const s = METHOD_STYLES[m]
                return <option key={m} value={m} style={{ background: 'var(--pk-surface)', color: s.color }}>{m}</option>
              })}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] pointer-events-none" style={{ color: ms?.color }}>▼</span>
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
        >
          {sendLabel}
        </button>
      </div>

      {/* ── Sub-tabs ───────────────────────────────────────── */}
      <div className="flex border-b border-pk-border px-4 flex-shrink-0 bg-pk-surface/50">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setConfigTab(t.key)}
            className={`px-4 py-2 text-xs font-medium ${configTab === t.key ? 'tab-active' : 'tab-inactive'}`}>
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
                  <span className="text-xs font-semibold text-pk-text">{label}</span>
                  <span className="text-xs text-pk-muted">{hint}</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-pk-border">
                  <Editor
                    height="160px" language="javascript"
                    value={req[key] ?? ''}
                    onChange={v => updateRequest(tab.id, { [key]: v ?? '' })}
                    theme={isDark ? 'vs-dark' : 'vs'}
                    options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, padding: { top: 8 } }}
                  />
                </div>
              </div>
            ))}
            <div className="text-xs text-pk-muted bg-pk-panel p-4 rounded-xl border border-pk-border">
              <p className="font-semibold text-pk-text mb-2">pm API reference</p>
              <div className="grid grid-cols-1 gap-0.5 font-mono text-[11px]">
                {[
                  "pm.variables.set('key', 'value')",
                  "pm.variables.get('key')",
                  "pm.response.json()  — post-script only",
                  "pm.response.code    — status code",
                  "pm.test('name', () => { pm.expect(pm.response.code).to.equal(200) })",
                  "console.log('msg')  — appears in Console tab",
                ].map(s => <code key={s} className="text-pk-muted/80">{s}</code>)}
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
