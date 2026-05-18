import React, { useState, useEffect, useRef } from 'react'
import { RestConfig, LoadTestResult } from '@shared/types'

function percentileBar(value: number, max: number, color: string) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pk-border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs w-14 text-right font-mono" style={{ color: 'var(--pk-text)' }}>{value}ms</span>
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

  const successRate = result && result.totalRequests > 0
    ? Math.round((result.successCount / result.totalRequests) * 100)
    : 0

  // Parse raw error strings into actionable messages
  const parseError = (raw: string): { short: string; hint: string } => {
    const r = raw.toLowerCase()
    if (r.includes('econnrefused'))  return { short: raw, hint: 'Connection refused — is the server running? Check host and port.' }
    if (r.includes('enotfound'))     return { short: raw, hint: 'DNS lookup failed — check the hostname in the URL.' }
    if (r.includes('etimedout') || r.includes('timeout')) return { short: raw, hint: 'Request timed out — the server is too slow or unreachable under this load. Try fewer concurrent users.' }
    if (r.includes('econnreset') || r.includes('socket hang')) return { short: raw, hint: 'Connection was closed by the server — it may be overloaded. Reduce concurrency.' }
    if (r.includes('429'))           return { short: raw, hint: 'Rate limited (429) — the server is throttling requests. Lower concurrency or add a delay.' }
    if (r.includes('certificate') || r.includes('ssl') || r.includes('tls')) return { short: raw, hint: 'TLS/SSL error — check the certificate or try HTTP instead of HTTPS.' }
    if (r.includes('invalid url') || r.includes('eproto')) return { short: raw, hint: 'Invalid URL — check the URL format and protocol (http vs https).' }
    return { short: raw, hint: '' }
  }
  const maxDuration = result ? result.maxDuration : 1

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs px-3 py-2.5 rounded-xl" style={{ color: 'var(--pk-muted)', background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
        Runs the current REST request with multiple concurrent workers for a fixed duration and reports latency percentiles and throughput.
      </p>

      {/* Config */}
      <div className="flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--pk-muted)' }}>Concurrent users</label>
          <input type="number" value={concurrency} onChange={e => setConcurrency(Number(e.target.value))}
            min={1} max={200} className="w-28 px-3 py-1.5 rounded-xl text-xs text-center" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--pk-muted)' }}>Duration (seconds)</label>
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
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pk-border)' }}>
            <div className="h-full rounded-full animate-pulse-soft" style={{ width: '100%', background: 'var(--pk-accent)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--pk-muted)' }}>{progress} requests completed…</p>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total Requests', value: result.totalRequests, colorStyle: { color: 'var(--pk-text)' } },
              { label: 'Success Rate',   value: `${successRate}%`,    colorStyle: { color: successRate >= 99 ? '#4ADE80' : successRate >= 90 ? '#FBBF24' : '#F85149' } },
              { label: 'Throughput',     value: `${result.throughput} req/s`, colorStyle: { color: 'var(--pk-accent)' } },
              { label: 'Errors',         value: result.errorCount,    colorStyle: { color: result.errorCount > 0 ? '#F85149' : 'var(--pk-muted)' } },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--pk-muted)' }}>{m.label}</div>
                <div className="text-lg font-bold font-mono" style={m.colorStyle}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Latency percentiles */}
          <div className="p-3 rounded-xl flex flex-col gap-2" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--pk-muted)' }}>Latency Breakdown</div>
            {[
              { label: 'Min',  value: result.minDuration, color: '#4ADE80' },
              { label: 'p50',  value: result.p50,         color: '#818CF8' },
              { label: 'p95',  value: result.p95,         color: '#FBBF24' },
              { label: 'p99',  value: result.p99,         color: '#F87171' },
              { label: 'Max',  value: result.maxDuration, color: '#F87171' },
              { label: 'Avg',  value: result.avgDuration, color: '#94A3B8' },
            ].map(m => (
              <div key={m.label} className="grid grid-cols-[40px_1fr] gap-2 items-center">
                <span className="text-[10px] font-mono" style={{ color: 'var(--pk-muted)' }}>{m.label}</span>
                {percentileBar(m.value, maxDuration, m.color)}
              </div>
            ))}
          </div>

          {/* Top errors with actionable hints */}
          {result.errors.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#F85149' }}>
                Errors ({result.errorCount} total)
              </div>
              {[...new Set(result.errors)].slice(0, 5).map((e, i) => {
                const { short, hint } = parseError(e)
                return (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className="text-[11px] font-mono truncate" style={{ color: 'rgba(248,81,73,0.8)' }}>{short}</div>
                    {hint && (
                      <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
                        → {hint}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
