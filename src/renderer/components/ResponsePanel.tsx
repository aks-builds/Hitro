import React, { useState, useEffect } from 'react'
import { Tab } from '../store/appStore'
import { Snapshot, PikoResponse, SnapshotFieldDiff } from '@shared/types'

function statusColor(code?: number) {
  if (!code) return 'text-pk-muted'
  if (code < 300) return 'text-green-400'
  if (code < 400) return 'text-yellow-400'
  return 'text-red-400'
}

function statusBg(code?: number) {
  if (!code) return 'rgba(107,114,128,0.1)'
  if (code < 300) return 'rgba(16,185,129,0.1)'
  if (code < 400) return 'rgba(245,158,11,0.1)'
  return 'rgba(220,38,38,0.1)'
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

function diffResponses(saved: PikoResponse, current: PikoResponse): SnapshotFieldDiff[] {
  const diffs: SnapshotFieldDiff[] = []
  if (saved.status !== current.status) {
    diffs.push({ field: 'status', saved: String(saved.status ?? ''), current: String(current.status ?? ''), changed: true })
  }
  const flattenObj = (obj: any, prefix = ''): Record<string, string> => {
    if (obj == null || typeof obj !== 'object') return { [prefix]: String(obj ?? '') }
    return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k
      return typeof v === 'object' && v !== null ? { ...acc, ...flattenObj(v, key) } : { ...acc, [key]: String(v ?? '') }
    }, {})
  }
  const savedFlat = flattenObj(saved.body ?? {}, 'body')
  const currentFlat = flattenObj(current.body ?? {}, 'body')
  const allKeys = new Set([...Object.keys(savedFlat), ...Object.keys(currentFlat)])
  for (const key of allKeys) {
    const sv = savedFlat[key] ?? '(missing)'
    const cv = currentFlat[key] ?? '(missing)'
    if (sv !== cv) diffs.push({ field: key, saved: sv, current: cv, changed: true })
  }
  return diffs
}

function SnapshotPanel({ tab }: { tab: Tab }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [diffs, setDiffs] = useState<SnapshotFieldDiff[] | null>(null)
  const reqId = tab.request.id

  useEffect(() => {
    window.api.snapshotGet(reqId).then(setSnapshots)
  }, [reqId])

  const handleSave = async () => {
    if (!tab.response || !saveName.trim()) return
    setSaving(true)
    await window.api.snapshotSave({ requestId: reqId, name: saveName.trim(), response: tab.response })
    const updated = await window.api.snapshotGet(reqId)
    setSnapshots(updated)
    setSaveName('')
    setSaving(false)
  }

  const handleCompare = (snap: Snapshot) => {
    if (!tab.response) return
    setSelectedId(snap.id)
    setDiffs(diffResponses(snap.response, tab.response))
  }

  const handleDelete = async (id: string) => {
    await window.api.snapshotDelete(id)
    setSnapshots(s => s.filter(x => x.id !== id))
    if (selectedId === id) { setSelectedId(null); setDiffs(null) }
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {tab.response && !tab.response.error && (
        <div className="flex gap-2 items-center p-3 bg-pk-panel rounded-xl border border-pk-border">
          <input value={saveName} onChange={e => setSaveName(e.target.value)}
            placeholder="Snapshot name (e.g. baseline v1)"
            className="flex-1 px-3 py-1.5 rounded-lg text-xs min-w-0" />
          <button onClick={handleSave} disabled={saving || !saveName.trim()}
            className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">
            {saving ? 'Saving…' : 'Save snapshot'}
          </button>
        </div>
      )}
      {!tab.response && (
        <p className="text-pk-muted text-xs text-center py-2">Send a request to save its response as a snapshot.</p>
      )}

      {snapshots.length === 0 ? (
        <div className="text-pk-muted text-center py-4 text-xs">No snapshots saved for this request.</div>
      ) : snapshots.map(snap => (
        <div key={snap.id} className={`p-3 rounded-xl border transition-colors ${selectedId === snap.id ? 'border-pk-accent/60 bg-pk-accent/5' : 'border-pk-border bg-pk-panel'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-semibold text-xs text-pk-text">{snap.name}</span>
              <span className="text-pk-faint text-[10px] ml-2">{new Date(snap.createdAt).toLocaleString()}</span>
              <span className="text-pk-muted text-[10px] ml-2">Status {snap.response.status}</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => handleCompare(snap)} disabled={!tab.response}
                className="btn-ghost text-xs py-1 px-2">Compare</button>
              <button onClick={() => handleDelete(snap.id)}
                className="text-pk-faint hover:text-red-400 text-xs transition-colors px-1">✕</button>
            </div>
          </div>
          {selectedId === snap.id && diffs !== null && (
            <div className="mt-2 border-t border-pk-border/60 pt-2">
              {diffs.length === 0 ? (
                <p className="text-green-400 text-xs flex items-center gap-1.5"><span>✓</span> No differences — response matches snapshot.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider">{diffs.length} field{diffs.length > 1 ? 's' : ''} changed</p>
                  {diffs.map((d, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[10px] font-mono">
                      <span className="text-pk-muted truncate">{d.field}</span>
                      <span className="text-red-400 truncate" title={d.saved}>− {d.saved}</span>
                      <span className="text-green-400 truncate" title={d.current}>+ {d.current}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ResponsePanel({ tab }: { tab: Tab }) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'assertions' | 'stream' | 'console' | 'snapshot'>('body')
  const { response, isLoading, streamEvents } = tab
  const logCount = response?.scriptLogs?.length ?? 0
  const assertPassed = response?.assertionResults?.filter(r => r.passed).length ?? 0
  const assertTotal  = response?.assertionResults?.length ?? 0

  const tabDefs = [
    { key: 'body'       as const, label: 'Body' },
    { key: 'headers'    as const, label: 'Headers' },
    {
      key: 'assertions' as const,
      label: assertTotal > 0
        ? <span className="flex items-center gap-1.5">
            Assertions
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none
              ${assertPassed === assertTotal ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {assertPassed}/{assertTotal}
            </span>
          </span>
        : 'Assertions',
    },
    { key: 'stream'   as const, label: streamEvents.length > 0 ? `Events (${streamEvents.length})` : 'Events' },
    { key: 'console'  as const, label: logCount > 0 ? `Console (${logCount})` : 'Console' },
    { key: 'snapshot' as const, label: 'Snapshots' },
  ]

  return (
    <div className="flex flex-col h-full bg-pk-surface">

      {/* ── Header: tabs + status ─────────────────────────── */}
      <div className="flex items-center border-b border-pk-border flex-shrink-0" style={{ minHeight: 36 }}>
        {/* Tab strip — scrollable, takes all available space */}
        <div className="flex min-w-0 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabDefs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3.5 py-2 text-xs whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === t.key ? 'tab-active' : 'tab-inactive'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status / loading badges — always visible on the right */}
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0 border-l border-pk-border/50">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-pk-muted text-xs">
              <span className="w-3 h-3 rounded-full border-2 border-pk-accent/40 border-t-pk-accent animate-spin-fast" />
              <span>Sending…</span>
            </div>
          )}
          {response && !response.error && (
            <>
              <span
                data-testid="response-status"
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: response.status && response.status < 300 ? '#059669' : response.status && response.status < 400 ? '#D97706' : '#DC2626',
                  background: statusBg(response.status),
                }}
              >
                {response.status} {response.statusText}
              </span>
              <span className="text-xs text-pk-muted bg-pk-panel px-2 py-0.5 rounded-full tabular-nums">
                {response.duration}ms
              </span>
              {response.size !== undefined && response.size > 0 && (
                <span className="text-xs text-pk-muted bg-pk-panel px-2 py-0.5 rounded-full">
                  {formatSize(response.size)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">

        {/* Empty state */}
        {!response && !isLoading && activeTab !== 'snapshot' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-pk-muted text-xs opacity-60">Hit Send to see the response</span>
          </div>
        )}

        {/* Error state */}
        {response?.error && activeTab !== 'snapshot' && (
          <div
            data-testid="response-error"
            className="text-red-400 p-4 bg-red-900/10 rounded-xl border border-red-900/30 animate-fade-in"
          >
            <div className="font-bold mb-1 text-sm font-sans">Request Failed</div>
            <div className="text-red-300/80 font-mono">{response.error}</div>
          </div>
        )}

        {activeTab === 'snapshot' && <SnapshotPanel tab={tab} />}

        {response && !response.error && activeTab !== 'snapshot' && (
          <div className="animate-fade-in">

            {activeTab === 'body' && (
              <pre className="whitespace-pre-wrap break-words text-pk-text leading-relaxed bg-pk-panel rounded-xl p-3 border border-pk-border text-[12px]">
                {response.rawBody ?? JSON.stringify(response.body, null, 2)}
              </pre>
            )}

            {activeTab === 'headers' && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-pk-border">
                    <th className="text-left py-1.5 pr-6 font-semibold text-pk-muted uppercase text-[10px] tracking-wider">Header</th>
                    <th className="text-left py-1.5 font-semibold text-pk-muted uppercase text-[10px] tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response.headers ?? {}).map(([k, v]) => (
                    <tr key={k} className="border-b border-pk-border/40 hover:bg-pk-hover/30 transition-colors">
                      <td className="py-1.5 pr-6 text-pk-accent whitespace-nowrap">{k}</td>
                      <td className="py-1.5 text-pk-text break-all">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'assertions' && (
              <div className="flex flex-col gap-2">
                {(response.assertionResults ?? []).length === 0 && (
                  <div className="text-pk-muted text-center py-6">No assertions configured.</div>
                )}
                {(response.assertionResults ?? []).map((r, i) => (
                  <div
                    key={r.assertion.id ?? i}
                    data-testid={r.passed ? 'assertion-result-pass' : 'assertion-result-fail'}
                    className={`flex items-start gap-3 p-3 rounded-xl border
                      ${r.passed ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}
                  >
                    <span className={`text-base flex-shrink-0 ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {r.passed ? '✓' : '✗'}
                    </span>
                    <div>
                      <span className="text-pk-muted">{r.assertion.field}</span>
                      <span className="mx-1.5 text-pk-faint">{r.assertion.operator}</span>
                      <span className="text-pk-text">"{r.assertion.expected}"</span>
                      {!r.passed && r.actual !== undefined && (
                        <div className="text-red-400 text-xs mt-0.5 font-mono">got: {JSON.stringify(r.actual)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stream' && (
              <div className="flex flex-col gap-1.5">
                {streamEvents.length === 0 && <div className="text-pk-muted text-center py-6">No events yet.</div>}
                {streamEvents.map(e => (
                  <div key={e.id} className={`flex gap-3 p-2 rounded-lg text-xs
                    ${e.type === 'sent'     ? 'bg-pk-accent/8 border border-pk-accent/20' :
                      e.type === 'received' ? 'bg-green-900/10 border border-green-900/20' :
                      e.type === 'error'    ? 'bg-red-900/10 border border-red-900/20' :
                                              'bg-pk-panel border border-pk-border'}`}>
                    <span className="text-pk-muted flex-shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-bold flex-shrink-0 w-14
                      ${e.type === 'sent'     ? 'text-pk-accent' :
                        e.type === 'received' ? 'text-green-400' :
                        e.type === 'error'    ? 'text-red-400' : 'text-pk-muted'}`}>
                      {e.type.toUpperCase()}
                    </span>
                    <pre className="whitespace-pre-wrap break-words text-pk-text">
                      {typeof e.data === 'object' ? JSON.stringify(e.data, null, 2) : String(e.data)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'console' && (
          <div className="flex flex-col gap-1 animate-fade-in">
            {(response?.scriptLogs ?? []).length === 0 ? (
              <div className="text-pk-muted text-center py-6">
                No console output. Use <code className="text-pk-accent">console.log()</code> in your scripts.
              </div>
            ) : (response?.scriptLogs ?? []).map((log, i) => (
              <div key={`${log.timestamp}-${i}`} className={`flex gap-3 p-2 rounded-lg
                ${log.level === 'error' ? 'bg-red-900/10 text-red-400' :
                  log.level === 'warn'  ? 'bg-yellow-900/10 text-yellow-400' : 'text-pk-text'}`}>
                <span className="text-pk-muted flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`w-8 flex-shrink-0 font-bold text-[10px] uppercase
                  ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-pk-accent'}`}>
                  {log.level}
                </span>
                <pre className="whitespace-pre-wrap break-words">{log.message}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
