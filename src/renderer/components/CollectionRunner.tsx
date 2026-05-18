import React, { useState, useRef } from 'react'
import { Collection, CollectionRunResult } from '@shared/types'

export default function CollectionRunner({ collection, onClose }: { collection: Collection; onClose: () => void }) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<CollectionRunResult[]>([])
  const [done, setDone] = useState(false)

  const allRequests = [
    ...(collection.requests ?? []),
    ...(collection.folders ?? []).flatMap(f => f.requests ?? []),
  ]

  const run = async () => {
    setRunning(true); setDone(false); setResults([])
    window.api.onRunnerProgress((r: CollectionRunResult) => setResults(p => [...p, r]))
    try {
      await window.api.collectionRun(collection.id)
    } finally {
      window.api.offRunnerProgress()
      setRunning(false); setDone(true)
    }
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-pk-panel border border-pk-border rounded-2xl w-[640px] max-h-[80vh] flex flex-col shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pk-border">
          <div>
            <h2 className="font-semibold text-sm text-pk-text">Collection Runner</h2>
            <p className="text-xs text-pk-muted mt-0.5">{collection.name} · {allRequests.length} requests</p>
          </div>
          <button onClick={onClose} className="text-pk-muted hover:text-pk-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-pk-border">✕</button>
        </div>

        {/* Summary */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-pk-border bg-pk-surface/50 text-xs">
            <span className="text-pk-muted">Ran: <strong className="text-pk-text">{results.length}</strong></span>
            <span className="text-green-400">Passed: <strong>{passed}</strong></span>
            {failed > 0 && <span className="text-red-400">Failed: <strong>{failed}</strong></span>}
            {done && (
              <span className={`ml-auto font-bold flex items-center gap-1.5 ${failed === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {failed === 0 ? '✓ All passed' : `✗ ${failed} failed`}
              </span>
            )}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {allRequests.length === 0 && (
            <div className="text-pk-muted text-xs text-center py-8">No saved requests in this collection.</div>
          )}

          {!running && !done && allRequests.length > 0 && (
            <div className="flex flex-col gap-1">
              {allRequests.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-pk-surface/50 border border-pk-border/60">
                  <span className="w-2 h-2 rounded-full bg-pk-border flex-shrink-0" />
                  <span className="text-xs text-pk-text flex-1">{r.name}</span>
                  <span className="text-pk-muted text-[10px] uppercase font-semibold">{r.protocol}</span>
                </div>
              ))}
            </div>
          )}

          {results.map((r, i) => (
            <div key={`${r.requestId ?? r.requestName}-${i}`} className={`flex items-start gap-3 p-3 rounded-xl border text-xs animate-fade-in
              ${r.passed ? 'bg-green-900/8 border-green-900/25' : 'bg-red-900/8 border-red-900/25'}`}>
              <span className={`flex-shrink-0 font-bold text-base ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                {r.passed ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-pk-text">{r.requestName}</div>
                {r.response && !r.error && (
                  <div className="text-pk-muted mt-0.5 flex items-center gap-3">
                    <span>Status: <span className={r.response.status && r.response.status < 300 ? 'text-green-400' : 'text-red-400'}>
                      {r.response.status}
                    </span></span>
                    <span>{r.response.duration}ms</span>
                    {r.response.assertionResults && (
                      <span>{r.response.assertionResults.filter(a => a.passed).length}/{r.response.assertionResults.length} assertions</span>
                    )}
                  </div>
                )}
                {r.error && <div className="text-red-400 mt-0.5">{r.error}</div>}
              </div>
            </div>
          ))}

          {running && results.length < allRequests.length && (
            <div className="flex items-center gap-2 text-pk-muted text-xs py-2">
              <span className="w-2 h-2 rounded-full bg-pk-accent animate-pulse-soft" />
              Running {results.length + 1} of {allRequests.length}…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-pk-border">
          {!running ? (
            <button onClick={run} className="btn-primary flex items-center gap-2">
              {done ? '↺ Run again' : '▶ Run all'}
            </button>
          ) : (
            <button disabled className="btn-primary opacity-50 cursor-not-allowed flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse-soft"/>Running…
            </button>
          )}
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      </div>
    </div>
  )
}
