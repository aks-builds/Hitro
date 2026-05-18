import React, { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import TitleBar from './TitleBar'
import RequestBuilder from './RequestBuilder'
import ResponsePanel from './ResponsePanel'
import SettingsModal from './SettingsModal'
import ImportModal from './ImportModal'
import { useAppStore } from '../store/appStore'

function EmptyState() {
  const { newTab } = useAppStore()
  const protocols = ['REST', 'gRPC', 'GraphQL', 'WebSocket', 'Kafka', 'SQS', 'MQTT', 'SSE', 'Socket.IO']
  const colors = ['#818CF8','#C084FC','#F472B6','#34D399','#FBBF24','#FB923C','#22D3EE','#4ADE80','#F9A8D4']

  return (
    <div className="flex-1 flex flex-col items-center justify-center select-none animate-fade-in">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #38BDF8 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.95"/>
            <circle cx="6" cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
            <circle cx="26" cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
            <circle cx="6" cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
            <circle cx="26" cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
            <line x1="16" y1="16" x2="6" y2="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="26" y2="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="6" y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="26" y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
          </svg>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight gradient-text text-center">Hitro</h1>
          <p className="text-pk-muted text-sm text-center mt-1">Multi-Protocol API Client</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-md">
        {protocols.map((p, i) => (
          <span key={p} className="px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ color: colors[i], borderColor: colors[i] + '40', background: colors[i] + '12' }}>
            {p}
          </span>
        ))}
      </div>

      <button onClick={() => newTab()} className="btn-primary text-sm px-6 py-2.5 rounded-xl">
        + New Request
      </button>
      <p className="text-pk-muted text-xs mt-3">
        Or press <kbd>⌘</kbd><kbd>N</kbd> to start
      </p>

      <div className="mt-12 grid grid-cols-3 gap-3 max-w-lg opacity-60">
        {[
          { icon: '⚡', label: 'Pre/Post Scripts' },
          { icon: '▶', label: 'Collection Runner' },
          { icon: '🔐', label: 'AWS SigV4 + mTLS' },
          { icon: '📸', label: 'Snapshot Testing' },
          { icon: '🔗', label: 'Request Chaining' },
          { icon: '🖧',  label: 'Mock Server' },
          { icon: '⚡', label: 'Load Testing' },
          { icon: '📥', label: 'HAR + .env Import' },
          { icon: '✓', label: 'Response Assertions' },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2 text-xs text-pk-muted">
            <span className="text-pk-accent text-sm">{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEFAULT_SPLIT = 56

export default function Layout() {
  const { activeTab: getActiveTab, loadCollections } = useAppStore()
  const activeTab = getActiveTab()
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT)
  const [modal, setModal] = useState<'settings' | 'import' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientY - rect.top) / rect.height) * 100
    setSplitPct(Math.min(Math.max(pct, 20), 80))
  }, [])

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-pk-bg text-pk-text">
      {/* Full-width title bar */}
      <TitleBar
        onOpenSettings={() => setModal('settings')}
        onOpenImport={() => setModal('import')}
      />

      {/* Main content: sidebar + workspace */}
      <div className="flex flex-1 min-h-0">
        <div className="w-56 flex-shrink-0 flex flex-col bg-pk-sidebar" style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.06)' }}>
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-shrink-0 border-b border-pk-border">
            <TabBar />
          </div>

          {activeTab ? (
            <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
              <div
                style={{ height: `${splitPct}%` }}
                className="min-h-0 overflow-y-auto border-b border-pk-border/50"
              >
                <RequestBuilder tab={activeTab} />
              </div>

              <div
                className="resize-handle"
                onMouseDown={() => {
                  dragging.current = true
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
                onDoubleClick={() => setSplitPct(DEFAULT_SPLIT)}
                title="Drag to resize · Double-click to reset"
              />

              <div className="flex-1 min-h-0 overflow-y-auto bg-pk-surface">
                <ResponsePanel tab={activeTab} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-pk-bg">
              <EmptyState />
            </div>
          )}
        </div>
      </div>

      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'import'   && <ImportModal   onClose={() => { setModal(null); loadCollections() }} />}
    </div>
  )
}
