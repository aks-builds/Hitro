import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { PikoRequest, PikoResponse, PROTOCOL_META, METHOD_STYLES, RestConfig } from '@shared/types'
import ConfirmModal from './ConfirmModal'

interface HistoryEntry {
  request: PikoRequest
  response: PikoResponse
  timestamp: number
}

const MAX_DISPLAY = 50

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.5"/>
      <path d="M7 4v3.5l2 1.5"/>
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6a4 4 0 107 3"/>
      <polyline points="2,3.5 2,6 4.5,6"/>
    </svg>
  )
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function HistoryPanel() {
  const { openRequest } = useAppStore()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [open, setOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await window.api.getHistory()
      setEntries(raw.slice(0, MAX_DISPLAY))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const handleClear = async () => {
    await window.api.clearHistory()
    setEntries([])
    setConfirmClear(false)
  }

  const handleRestore = (entry: HistoryEntry) => {
    openRequest(entry.request)
  }

  return (
    <>
      <div style={{ borderTop: '1px solid var(--pk-border)' }}>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 transition-colors"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pk-faint)' }}>
            <ClockIcon />
            <span>History</span>
          </span>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
                style={{ background: 'var(--pk-elevated)', color: 'var(--pk-faint)' }}>
                {entries.length}{entries.length === MAX_DISPLAY ? '+' : ''}
              </span>
            )}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              style={{ color: 'var(--pk-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="1,2.5 4,5.5 7,2.5"/>
            </svg>
          </div>
        </button>

        {open && (
          <div className="animate-slide-down" style={{ borderTop: '1px solid var(--pk-border)' }}>
            {/* Header actions */}
            {entries.length > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px]" style={{ color: 'var(--pk-faint)' }}>Recent {entries.length} execution{entries.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-[10px] transition-colors"
                  style={{ color: 'var(--pk-faint)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F85149')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)')}
                >Clear all</button>
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--pk-accent)', borderTopColor: 'transparent' }} />
              </div>
            )}

            {!loading && entries.length === 0 && (
              <div className="px-4 py-6 text-center text-[11px]" style={{ color: 'var(--pk-faint)' }}>
                No history yet — send a request to see it here
              </div>
            )}

            {!loading && entries.map((entry, i) => {
              const meta   = PROTOCOL_META[entry.request.protocol] ?? PROTOCOL_META['rest']
              const method = entry.request.protocol === 'rest'
                ? (entry.request.config as RestConfig)?.method : null
              const ms     = method ? METHOD_STYLES[method] : null
              const status = entry.response.status
              const statusColor = status
                ? status < 300 ? '#3FB950' : status < 400 ? '#D29922' : '#F85149'
                : 'var(--pk-faint)'

              return (
                <div
                  key={i}
                  className="group/hist flex items-center gap-2 px-3 py-1.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <span
                    className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 min-w-[30px] text-center"
                    style={{ color: ms?.color ?? meta.color, background: (ms?.bg ?? meta.bg) + '90' }}
                  >{method ?? meta.label}</span>

                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[11px]" style={{ color: 'var(--pk-muted)' }}>{entry.request.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {status && (
                        <span className="text-[9px] font-mono font-semibold" style={{ color: statusColor }}>{status}</span>
                      )}
                      {entry.response.duration != null && (
                        <span className="text-[9px] font-mono" style={{ color: 'var(--pk-faint)' }}>{entry.response.duration}ms</span>
                      )}
                      <span className="text-[9px] ml-auto" style={{ color: 'var(--pk-faint)' }}>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(entry)}
                    title="Restore into new tab"
                    className="hidden group-hover/hist:flex w-6 h-6 items-center justify-center rounded flex-shrink-0 transition-colors"
                    style={{ color: 'var(--pk-faint)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--pk-accent)', e.currentTarget.style.background = 'var(--pk-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--pk-faint)', e.currentTarget.style.background = '')}
                  >
                    <RestoreIcon />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {confirmClear && (
        <ConfirmModal
          title="Clear history"
          message="All request history will be permanently deleted. This cannot be undone."
          confirmLabel="Clear history"
          onConfirm={handleClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </>
  )
}
