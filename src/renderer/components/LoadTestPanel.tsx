import React, { useState, useEffect, useRef } from 'react'
import { RestConfig, LoadTestResult } from '@shared/types'

function percentileBar(value: number, max: number, color: string) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-pk-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-pk-text w-14 text-right font-mono">{value}ms</span>
    </div>
  )
}

export default function LoadTestPanel({ requestConfig }: { requestConfig: RestConfig }) {
  const [concurrency, setConcurrency] = useState(10)
  const [duration, setDuration]       = useState(10)
  const [running, setRunning]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [result, setResult]           = useState<LoadTestResult | null>(null)
  const [error, setError]             = useState('')

  useEffect(() => {
    window.api.onLoadTestProgress(p => setProgress(p.done))
    return () => window.api.offLoadTestProgress()
  }, [])

  const handleRun = async () => {
    setError('')
    setResult(null)
    setProgress(0)
    setRunning(true)
    try {
      const res = await window.api.loadTest({ concurrency, duration, requestConfig })
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const successRate = result && result.totalRequests > 0 ? Math.round((result.successCount / result.totalRequests) * 100) : 0
  const maxDuration = result ? result.maxDuration : 1

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-pk-muted bg-pk-panel px-3 py-2.5 rounded-xl border border-pk-border">
        Runs the current REST request with multiple concurrent workers for a fixed duration and reports latency percentiles and throughput.
      </p>

      {/* Config */}
      <div className="flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-pk-muted uppercase tracking-wider">Concurrent users</label>
          <input type="number" value={concurrency} onChange={e => setConcurrency(Number(e.target.value))}
            min={1} max={200} className="w-28 px-3 py-1.5 rounded-xl text-xs text-center" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-pk-muted uppercase tracking-wider">Duration (seconds)</label>
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
            min={1} max={300} className="w-28 px-3 py-1.5 rounded-xl text-xs text-center" />
        </div>
        <button onClick={handleRun} disabled={running || !requestConfig.url}
          className="btn-primary px-5 py-1.5">
          {running ? `Running… (${progress})` : 'Run Load Test'}
        </button>
      </div>

      {/* Progress bar during run */}
      {running && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 rounded-full bg-pk-border overflow-hidden">
            <div className="h-full bg-pk-accent rounded-full animate-pulse-soft" style={{ width: '100%' }} />
          </div>
          <p className="text-xs text-pk-muted">{progress} requests completed…</p>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total Requests', value: result.totalRequests, color: 'text-pk-text' },
              { label: 'Success Rate',   value: `${successRate}%`,    color: successRate >= 99 ? 'text-green-400' : successRate >= 90 ? 'text-yellow-400' : 'text-red-400' },
              { label: 'Throughput',     value: `${result.throughput} req/s`, color: 'text-pk-accent' },
              { label: 'Errors',         value: result.errorCount,    color: result.errorCount > 0 ? 'text-red-400' : 'text-pk-muted' },
            ].map(m => (
              <div key={m.label} className="p-3 bg-pk-panel rounded-xl border border-pk-border">
                <div className="text-[10px] text-pk-muted uppercase tracking-wider mb-1">{m.label}</div>
                <div className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Latency percentiles */}
          <div className="p-3 bg-pk-panel rounded-xl border border-pk-border flex flex-col gap-2">
            <div className="text-[10px] font-semibold text-pk-muted uppercase tracking-wider mb-1">Latency Breakdown</div>
            {[
              { label: 'Min',  value: result.minDuration, color: '#4ADE80' },
              { label: 'p50',  value: result.p50,         color: '#818CF8' },
              { label: 'p95',  value: result.p95,         color: '#FBBF24' },
              { label: 'p99',  value: result.p99,         color: '#F87171' },
              { label: 'Max',  value: result.maxDuration, color: '#F87171' },
              { label: 'Avg',  value: result.avgDuration, color: '#94A3B8' },
            ].map(m => (
              <div key={m.label} className="grid grid-cols-[40px_1fr] gap-2 items-center">
                <span className="text-[10px] text-pk-muted font-mono">{m.label}</span>
                {percentileBar(m.value, maxDuration, m.color)}
              </div>
            ))}
          </div>

          {/* Top errors */}
          {result.errors.length > 0 && (
            <div className="p-3 bg-red-900/10 rounded-xl border border-red-900/30">
              <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Top Errors</div>
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="text-xs text-red-300/80 font-mono mb-0.5 truncate">{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
