import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { PROTOCOL_META, METHOD_STYLES, RestConfig } from '@shared/types'

function ChevronLeftIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,1 2,6 6,11"/>
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,1 6,6 2,11"/>
    </svg>
  )
}

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, newTab, newScratchTab } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft]   = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  // Re-check whenever tabs change or active tab changes
  useEffect(() => {
    checkOverflow()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkOverflow, { passive: true })
    const ro = new ResizeObserver(checkOverflow)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkOverflow)
      ro.disconnect()
    }
  }, [tabs, checkOverflow])

  // Scroll active tab into view whenever it changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !activeTabId) return
    const activeEl = el.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement | null
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    setTimeout(checkOverflow, 200)
  }, [activeTabId, checkOverflow])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  const hasOverflow = canScrollLeft || canScrollRight

  return (
    <div
      data-testid="tab-bar"
      className="flex items-center h-8 select-none"
      style={{ background: 'var(--pk-surface)', borderBottom: '1px solid var(--pk-border)' }}
    >
      {/* Left scroll arrow */}
      {hasOverflow && (
        <button
          className="tab-scroll-arrow border-r"
          style={{ borderColor: 'var(--pk-border)', opacity: canScrollLeft ? 1 : 0.3 }}
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          title="Scroll tabs left"
        >
          <ChevronLeftIcon />
        </button>
      )}

      {/* Tab strip */}
      <div
        ref={scrollRef}
        className="flex flex-1 h-full overflow-x-auto"
        style={{ scrollbarWidth: 'none', minWidth: 0 }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          const meta     = PROTOCOL_META[tab.request.protocol]
          const method   = tab.request.protocol === 'rest'
            ? (tab.request.config as RestConfig).method : null
          const ms       = method ? METHOD_STYLES[method] : null

          // Build a descriptive tooltip
          const tooltip = method
            ? `${method} · ${tab.request.name}`
            : `${meta.label} · ${tab.request.name}`

          const isScratch = tab.isScratch
          const accentColor = isScratch ? '#D29922' : 'var(--pk-accent)'

          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={isScratch ? `Scratch Pad · ${tab.request.name}` : tooltip}
              className="flex items-center gap-1.5 px-3 h-full min-w-0 max-w-52 cursor-pointer border-r flex-shrink-0 group/tab transition-colors relative"
              style={{
                borderColor: 'var(--pk-border)',
                background: isActive ? (isScratch ? 'rgba(210,153,34,0.06)' : 'var(--pk-panel)') : 'transparent',
                borderBottom: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--pk-elevated)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Protocol/method badge — or scratch icon */}
              {isScratch ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#D29922" strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0">
                  <path d="M2 10l1.5-1.5L9 3 10 4 4.5 9.5 2 10zM8 2l2 2"/>
                </svg>
              ) : ms ? (
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                  style={{ color: ms.color, background: ms.bg + '80' }}
                >{method}</span>
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: meta.color + 'cc' }}
                />
              )}

              {/* Tab name */}
              <span
                className="truncate text-[11px] transition-colors flex-1"
                style={{ color: isScratch ? (isActive ? '#D29922' : 'rgba(210,153,34,0.7)') : isActive ? 'var(--pk-text)' : 'var(--pk-muted)' }}
              >
                {tab.request.name}
              </span>

              {/* Dirty indicator — amber dot distinguishes unsaved state from active-tab accent */}
              {tab.isDirty && (
                <span
                  data-testid="dirty-indicator"
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--pk-warning)' }}
                  title="Unsaved changes"
                />
              )}

              {/* Close button */}
              <button
                onClick={e => { e.stopPropagation(); closeTab(tab.id) }}
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-[10px] leading-none transition-all ml-auto"
                style={{
                  color: 'var(--pk-faint)',
                  opacity: isActive ? 0.7 : 0,
                }}
                title="Close tab"
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#F85149'
                  e.currentTarget.style.background = 'rgba(248,81,73,0.12)'
                  e.currentTarget.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--pk-faint)'
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.opacity = isActive ? '0.7' : '0'
                }}
              >×</button>
            </div>
          )
        })}
      </div>

      {/* Right scroll arrow */}
      {hasOverflow && (
        <button
          className="tab-scroll-arrow border-l"
          style={{ borderColor: 'var(--pk-border)', opacity: canScrollRight ? 1 : 0.3 }}
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          title="Scroll tabs right"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* New tab button — left-click = normal, right-click = scratch pad */}
      <button
        onClick={() => newTab()}
        onContextMenu={e => { e.preventDefault(); newScratchTab() }}
        className="w-8 h-full flex items-center justify-center flex-shrink-0 text-base transition-all border-l"
        style={{ color: 'var(--pk-faint)', borderColor: 'var(--pk-border)' }}
        title="New tab (Ctrl+N) · Right-click for Scratch Pad (Ctrl+Shift+N)"
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--pk-accent)'
          e.currentTarget.style.background = 'var(--pk-elevated)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--pk-faint)'
          e.currentTarget.style.background = ''
        }}
      >+</button>
    </div>
  )
}
