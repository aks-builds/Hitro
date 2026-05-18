import React, { useState, useEffect } from 'react'
import { Tab } from '../store/appStore'
import { Snapshot, PikoResponse, SnapshotFieldDiff } from '@shared/types'
import ConfirmModal from './ConfirmModal'

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
  // Iterative BFS flattening — avoids stack overflow on large/deep bodies
  const flattenObj = (obj: any, prefix = ''): Record<string, string> => {
    const result: Record<string, string> = {}
    const queue: Array<[any, string]> = [[obj, prefix]]
    let safety = 0
    while (queue.length && safety++ < 5000) {
      const [node, pre] = queue.shift()!
      if (node == null || typeof node !== 'object') {
        result[pre] = String(node ?? '')
        continue
      }
      for (const [k, v] of Object.entries(node)) {
        const key = pre ? `${pre}.${k}` : k
        if (v !== null && typeof v === 'object') queue.push([v, key])
        else result[key] = String(v ?? '')
      }
    }
    return result
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
  const [confirmDeleteSnap, setConfirmDeleteSnap] = useState<Snapshot | null>(null)
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

  const handleDelete = (snap: Snapshot) => {
    setConfirmDeleteSnap(snap)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteSnap) return
    await window.api.snapshotDelete(confirmDeleteSnap.id)
    setSnapshots(s => s.filter(x => x.id !== confirmDeleteSnap.id))
    if (selectedId === confirmDeleteSnap.id) { setSelectedId(null); setDiffs(null) }
    setConfirmDeleteSnap(null)
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
        <p className="text-xs text-center py-2" style={{ color: 'var(--pk-muted)' }}>Send a request to save its response as a snapshot.</p>
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
              <button
                onClick={() => handleDelete(snap)}
                title="Delete snapshot"
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--pk-faint)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F85149', e.currentTarget.style.background = 'rgba(248,81,73,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}
              >Delete</button>
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

      {confirmDeleteSnap && (
        <ConfirmModal
          title="Delete snapshot"
          message={`"${confirmDeleteSnap.name}" will be permanently deleted and cannot be recovered.`}
          confirmLabel="Delete snapshot"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteSnap(null)}
        />
      )}
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
    <div className="flex flex-col h-full" style={{ background: 'var(--pk-surface)' }}>

      {/* ── Header: tabs + status ─────────────────────────── */}
      <div className="flex items-center flex-shrink-0" style={{ minHeight: 36, borderBottom: '1px solid var(--pk-border)' }}>
        <div className="flex min-w-0 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabDefs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3.5 py-2 text-[11px] whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === t.key ? 'tab-active' : 'tab-inactive'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status / loading badges */}
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0" style={{ borderLeft: '1px solid var(--pk-border)' }}>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--pk-muted)' }}>
              <span className="w-3 h-3 rounded-full border-2 animate-spin-fast"
                style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--pk-accent)' }} />
              <span>Sending…</span>
            </div>
          )}
          {response && !response.error && (
            <>
              <span
                data-testid="response-status"
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums"
                style={{
                  color: response.status && response.status < 300 ? '#3FB950' : response.status && response.status < 400 ? '#D29922' : '#F85149',
                  background: statusBg(response.status),
                  boxShadow: response.status && response.status < 300 ? '0 0 8px rgba(63,185,80,0.12)' : undefined,
                }}
              >
                {response.status} {response.statusText}
              </span>
              <span className="text-[11px] tabular-nums px-2 py-0.5 rounded-full font-mono"
                style={{ background: 'var(--pk-panel)', color: 'var(--pk-muted)' }}>
                {response.duration}ms
              </span>
              {response.size !== undefined && response.size > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--pk-panel)', color: 'var(--pk-muted)' }}>
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
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none animate-fade-in">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M11 5l4 4-4 4" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--pk-faint)' }}>Hit Send to see the response</span>
          </div>
        )}

        {/* Error state */}
        {response?.error && activeTab !== 'snapshot' && (
          <div
            data-testid="response-error"
            className="p-4 rounded-xl animate-fade-in"
            style={{ background: 'rgba(248,81,73,0.07)', border: '1px solid rgba(248,81,73,0.2)' }}
          >
            <div className="font-bold mb-1.5 text-xs font-sans" style={{ color: '#F85149' }}>Request Failed</div>
            <div className="font-mono text-[11px]" style={{ color: 'rgba(248,81,73,0.75)' }}>{response.error}</div>
          </div>
        )}

        {activeTab === 'snapshot' && <SnapshotPanel tab={tab} />}

        {response && !response.error && activeTab !== 'snapshot' && (
          <div className="animate-fade-in">

            {activeTab === 'body' && (
              <pre
                className="whitespace-pre-wrap break-words leading-relaxed rounded-xl p-3 text-[11px]"
                style={{
                  background: 'var(--pk-panel)',
                  border: '1px solid var(--pk-border)',
                  color: 'var(--pk-text)',
                }}
              >
                {response.rawBody ?? JSON.stringify(response.body, null, 2)}
              </pre>
            )}

            {activeTab === 'headers' && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <th className="text-left py-1.5 pr-6 font-semibold uppercase text-[10px] tracking-wider" style={{ color: 'var(--pk-faint)' }}>Header</th>
                    <th className="text-left py-1.5 font-semibold uppercase text-[10px] tracking-wider" style={{ color: 'var(--pk-faint)' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response.headers ?? {}).map(([k, v]) => (
                    <tr key={k} className="transition-colors" style={{ borderBottom: '1px solid var(--pk-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td className="py-1.5 pr-6 whitespace-nowrap" style={{ color: 'var(--pk-accent)' }}>{k}</td>
                      <td className="py-1.5 break-all" style={{ color: 'var(--pk-text)' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'assertions' && (
              <div className="flex flex-col gap-2">
                {(response.assertionResults ?? []).length === 0 && (
                  <div className="text-center py-6" style={{ color: 'var(--pk-muted)' }}>No assertions configured.</div>
                )}
                {(response.assertionResults ?? []).map((r, i) => (
                  <div
                    key={r.assertion.id ?? i}
                    data-testid={r.passed ? 'assertion-result-pass' : 'assertion-result-fail'}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: r.passed ? 'rgba(63,185,80,0.07)' : 'rgba(248,81,73,0.07)',
                      border: `1px solid ${r.passed ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.2)'}`,
                    }}
                  >
                    <span className="text-sm flex-shrink-0" style={{ color: r.passed ? '#3FB950' : '#F85149' }}>
                      {r.passed ? '✓' : '✗'}
                    </span>
                    <div>
                      <span style={{ color: 'var(--pk-muted)' }}>{r.assertion.field}</span>
                      <span className="mx-1.5" style={{ color: 'var(--pk-faint)' }}>{r.assertion.operator}</span>
                      <span style={{ color: 'var(--pk-text)' }}>"{r.assertion.expected}"</span>
                      {!r.passed && r.actual !== undefined && (
                        <div className="text-xs mt-0.5 font-mono" style={{ color: '#F85149' }}>got: {JSON.stringify(r.actual)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stream' && (
              <div className="flex flex-col gap-1.5">
                {streamEvents.length === 0 && (
                  <div className="text-center py-6" style={{ color: 'var(--pk-muted)' }}>No events yet.</div>
                )}
                {streamEvents.map(e => (
                  <div key={e.id} className="flex gap-3 p-2 rounded-lg text-[11px]"
                    style={{
                      background: e.type === 'sent'     ? 'rgba(99,102,241,0.06)'  :
                                  e.type === 'received' ? 'rgba(63,185,80,0.06)'   :
                                  e.type === 'error'    ? 'rgba(248,81,73,0.06)'   : 'var(--pk-panel)',
                      border: `1px solid ${
                                  e.type === 'sent'     ? 'rgba(99,102,241,0.18)'  :
                                  e.type === 'received' ? 'rgba(63,185,80,0.18)'   :
                                  e.type === 'error'    ? 'rgba(248,81,73,0.18)'   : 'var(--pk-border)'}`,
                    }}>
                    <span className="flex-shrink-0" style={{ color: 'var(--pk-faint)' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                    <span className="font-bold flex-shrink-0 w-14"
                      style={{ color: e.type === 'sent'     ? 'var(--pk-accent)' :
                                      e.type === 'received' ? '#3FB950' :
                                      e.type === 'error'    ? '#F85149' : 'var(--pk-muted)' }}>
                      {e.type.toUpperCase()}
                    </span>
                    <pre className="whitespace-pre-wrap break-words" style={{ color: 'var(--pk-text)' }}>
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
              <div className="text-center py-6" style={{ color: 'var(--pk-muted)' }}>
                No console output. Use <code style={{ color: 'var(--pk-accent)' }}>console.log()</code> in your scripts.
              </div>
            ) : (response?.scriptLogs ?? []).map((log, i) => (
              <div key={`${log.timestamp}-${i}`} className="flex gap-3 p-2 rounded-lg"
                style={{
                  background: log.level === 'error' ? 'rgba(248,81,73,0.07)' :
                               log.level === 'warn'  ? 'rgba(210,153,34,0.07)' : 'transparent',
                  color:      log.level === 'error' ? '#F85149' :
                               log.level === 'warn'  ? '#D29922'  : 'var(--pk-text)',
                }}>
                <span className="flex-shrink-0" style={{ color: 'var(--pk-faint)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="w-8 flex-shrink-0 font-bold text-[10px] uppercase"
                  style={{ color: log.level === 'error' ? '#F85149' : log.level === 'warn' ? '#D29922' : 'var(--pk-accent)' }}>
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
