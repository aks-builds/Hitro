import React, { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import TitleBar from './TitleBar'
import RequestBuilder from './RequestBuilder'
import ResponsePanel from './ResponsePanel'
import SettingsModal from './SettingsModal'
import ImportModal from './ImportModal'
import ErrorBoundary from './ErrorBoundary'
import { useAppStore } from '../store/appStore'

// ── Protocol dot grid for empty state ─────────────────────────
const PROTO_GRID = [
  { label: 'REST',      color: '#6366F1', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12"/></svg> },
  { label: 'gRPC',      color: '#7C3AED', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><path d="M6 8h3M10 4.8l-1 2.2M10 11.2l-1-2.2"/></svg> },
  { label: 'GraphQL',   color: '#DB2777', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,2 14,5.5 14,10.5 8,14 2,10.5 2,5.5"/></svg> },
  { label: 'WS',        color: '#059669', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5"/><path d="M7 8l1.5-1.5"/></svg> },
  { label: 'Kafka',     color: '#B45309', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="4" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><path d="M8 5.5v3M8 8.5L4 10.5M8 8.5l4 2"/></svg> },
  { label: 'SQS',       color: '#EA580C', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="12" height="8" rx="1.5"/><path d="M5 5V4a3 3 0 016 0v1"/></svg> },
  { label: 'MQTT',      color: '#0891B2', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8c0-3.3 2.7-6 6-6s6 2.7 6 6M4.5 8c0-1.9 1.6-3.5 3.5-3.5S11.5 6.1 11.5 8M8 8h.01"/></svg> },
  { label: 'SSE',       color: '#16A34A', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8h3l2-5 3 10 2-5h2"/></svg> },
  { label: 'Socket.IO', color: '#C026D3', icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5.5"/><path d="M5 8.5l2 2 4-5"/></svg> },
]

function EmptyState() {
  const { newTab } = useAppStore()
  return (
    <div className="flex-1 flex flex-col items-center justify-center select-none animate-fade-in" style={{ background: 'var(--pk-bg)' }}>
      <div className="mb-6 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #38BDF8 100%)', boxShadow: '0 12px 40px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.95"/>
            <circle cx="6"  cy="10" r="3.5" fill="white" fillOpacity="0.65"/>
            <circle cx="26" cy="10" r="3.5" fill="white" fillOpacity="0.65"/>
            <circle cx="6"  cy="22" r="3.5" fill="white" fillOpacity="0.65"/>
            <circle cx="26" cy="22" r="3.5" fill="white" fillOpacity="0.65"/>
            <line x1="16" y1="16" x2="6"  y2="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="26" y2="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="6"  y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="26" y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Hitro</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--pk-muted)' }}>Multi-Protocol API Client</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8 max-w-[280px]">
        {PROTO_GRID.map(p => (
          <div key={p.label} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-semibold"
            style={{ background: p.color + '12', border: `1px solid ${p.color}30`, color: p.color }}>
            <span style={{ opacity: 0.8 }}>{p.icon}</span>{p.label}
          </div>
        ))}
      </div>

      <button onClick={() => newTab()} className="btn-primary text-sm px-8 py-2.5 rounded-xl">
        + New Request
      </button>
      <p className="text-[11px] mt-2.5" style={{ color: 'var(--pk-faint)' }}>
        Or press <kbd>⌘N</kbd> / <kbd>Ctrl+N</kbd>
      </p>
    </div>
  )
}

// ── Constants ──────────────────────────────────────────────────
const SPLIT_DEFAULT = 55
const SIDEBAR_DEFAULT = 208
const SIDEBAR_COLLAPSED = 40
const SIDEBAR_MIN = 140       // minimum when not fully collapsed
const SIDEBAR_MAX = 480
const SIDEBAR_SNAP_THRESHOLD = 90  // below this snaps to collapsed

export default function Layout() {
  const { activeTab: getActiveTab, loadCollections } = useAppStore()
  const activeTab = getActiveTab()
  const [modal, setModal] = useState<'settings' | 'import' | null>(null)

  // ── Vertical (request/response) split ───────────────────────
  const [splitPct, setSplitPct]       = useState(SPLIT_DEFAULT)
  const [showSplitInfo, setShowSplitInfo] = useState(false)
  const splitDragging = useRef(false)
  const containerRef  = useRef<HTMLDivElement>(null)

  // ── Horizontal (sidebar) split ──────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('hitro-sidebar-width')
    return saved ? Math.max(SIDEBAR_COLLAPSED, Math.min(SIDEBAR_MAX, parseInt(saved))) : SIDEBAR_DEFAULT
  })
  const [prevSidebarWidth, setPrevSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const sidebarDragging = useRef(false)

  const isCollapsed = sidebarWidth <= SIDEBAR_COLLAPSED + 10  // small tolerance

  const toggleSidebar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCollapsed) {
      const target = prevSidebarWidth >= SIDEBAR_MIN ? prevSidebarWidth : SIDEBAR_DEFAULT
      setSidebarWidth(target)
      localStorage.setItem('hitro-sidebar-width', String(target))
    } else {
      setPrevSidebarWidth(sidebarWidth)
      setSidebarWidth(SIDEBAR_COLLAPSED)
      localStorage.setItem('hitro-sidebar-width', String(SIDEBAR_COLLAPSED))
    }
  }, [isCollapsed, sidebarWidth, prevSidebarWidth])

  // ── Mouse handlers ───────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    // Vertical split
    if (splitDragging.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientY - rect.top) / rect.height) * 100
      setSplitPct(Math.min(Math.max(pct, 15), 85))
    }
    // Horizontal sidebar
    if (sidebarDragging.current) {
      const newW = Math.max(SIDEBAR_COLLAPSED, Math.min(SIDEBAR_MAX, e.clientX))
      setSidebarWidth(newW)
    }
  }, [])

  const onMouseUp = useCallback(() => {
    if (splitDragging.current) {
      splitDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    if (sidebarDragging.current) {
      sidebarDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      // Snap: if dragged below threshold, fully collapse
      setSidebarWidth(w => {
        const final = w < SIDEBAR_SNAP_THRESHOLD && w > SIDEBAR_COLLAPSED + 5
          ? SIDEBAR_COLLAPSED
          : w
        if (final >= SIDEBAR_MIN) setPrevSidebarWidth(final)
        localStorage.setItem('hitro-sidebar-width', String(final))
        return final
      })
    }
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
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--pk-bg)', color: 'var(--pk-text)' }}>
      <TitleBar
        onOpenSettings={() => setModal('settings')}
        onOpenImport={() => setModal('import')}
      />

      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            width: sidebarWidth,
            minWidth: sidebarWidth,
            background: 'var(--pk-sidebar)',
            transition: sidebarDragging.current ? 'none' : undefined,
          }}
        >
          <Sidebar
            collapsed={isCollapsed}
            onImportDone={() => loadCollections()}
          />
        </div>

        {/* ── Sidebar resize handle ─────────────────────── */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={e => {
            e.preventDefault()
            sidebarDragging.current = true
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
          onDoubleClick={() => {
            setSidebarWidth(SIDEBAR_DEFAULT)
            localStorage.setItem('hitro-sidebar-width', String(SIDEBAR_DEFAULT))
          }}
          title="Drag to resize sidebar · Double-click to reset"
        >
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar (double-click handle to reset)' : 'Collapse sidebar'}
          >
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>

        {/* ── Main workspace ───────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--pk-border)' }}>
            <TabBar />
          </div>

          {activeTab ? (
            <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
              {/* Request builder */}
              <div
                className="min-h-0 overflow-y-auto"
                style={{ height: `${splitPct}%`, borderBottom: '1px solid var(--pk-border)' } as any}
              >
                <ErrorBoundary label="Request Builder">
                  <RequestBuilder tab={activeTab} />
                </ErrorBoundary>
              </div>

              {/* Vertical resize handle */}
              <div
                className="resize-handle"
                onMouseDown={() => {
                  splitDragging.current = true
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
                onDoubleClick={() => setSplitPct(SPLIT_DEFAULT)}
                onMouseEnter={() => setShowSplitInfo(true)}
                onMouseLeave={() => setShowSplitInfo(false)}
                title="Drag to resize · Double-click to reset"
              >
                {showSplitInfo && !splitDragging.current && (
                  <div className="split-info-badge">
                    {Math.round(splitPct)}% request · {Math.round(100 - splitPct)}% response
                  </div>
                )}
              </div>

              {/* Response panel */}
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--pk-surface)' }}>
                <ErrorBoundary label="Response Panel">
                  <ResponsePanel tab={activeTab} />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <EmptyState />
            </div>
          )}
        </div>
      </div>

      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'import'   && (
        <ImportModal onClose={() => { setModal(null); loadCollections() }} />
      )}
    </div>
  )
}
