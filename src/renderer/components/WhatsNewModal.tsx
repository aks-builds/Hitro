import React, { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────
// Changelog data — sourced from EchoAPI public releases
// Chrome Interceptor (v1.0.0–v1.1.4) + VS Code extension (v1.6–v1.7)
// ─────────────────────────────────────────────────────────────

type ItemType = 'feature' | 'fix' | 'design' | 'ai' | 'perf' | 'release'

interface ChangelogItem { type: ItemType; text: string }
interface ChangelogVersion {
  version: string
  date: string
  label?: string          // e.g. "Latest", "Major"
  items: ChangelogItem[]
}

const TYPE_META: Record<ItemType, { label: string; color: string; bg: string; icon: string }> = {
  feature: { label: 'Feature',  color: '#3FB950', bg: 'rgba(63,185,80,0.12)',    icon: '✦' },
  fix:     { label: 'Fix',      color: '#F85149', bg: 'rgba(248,81,73,0.12)',    icon: '⬡' },
  design:  { label: 'Design',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)',   icon: '◈' },
  ai:      { label: 'AI',       color: '#C026D3', bg: 'rgba(192,38,211,0.12)',   icon: '⬡' },
  perf:    { label: 'Perf',     color: '#D29922', bg: 'rgba(210,153,34,0.12)',   icon: '◆' },
  release: { label: 'Release',  color: '#8B949E', bg: 'rgba(139,148,158,0.10)', icon: '○' },
}

const CHANGELOG: ChangelogVersion[] = [
  {
    version: '1.7.13',
    date: 'Sep 17, 2025',
    label: 'Latest',
    items: [
      { type: 'release', text: 'Ultra-lightweight VS Code extension reaches v1.7.13 — performance and stability pass.' },
    ],
  },
  {
    version: '1.7.12',
    date: 'Jul 10, 2025',
    items: [{ type: 'perf', text: 'Incremental performance and reliability improvements across the VS Code extension.' }],
  },
  {
    version: '1.7.11',
    date: 'Jul 4, 2025',
    items: [{ type: 'fix', text: 'Bug-fix release targeting edge cases in VS Code integration.' }],
  },
  {
    version: '1.7.9',
    date: 'Jul 2, 2025',
    items: [{ type: 'perf', text: 'Continuous performance tuning of the VS Code API debugging core.' }],
  },
  {
    version: '1.7.7',
    date: 'Jun 20, 2025',
    items: [{ type: 'feature', text: 'New capabilities shipped to the VS Code extension; stability improvements.' }],
  },
  {
    version: '1.7.5',
    date: 'Mar 26, 2025',
    items: [{ type: 'perf', text: 'VS Code extension performance pass — faster startup and reduced memory footprint.' }],
  },
  {
    version: '1.7.4',
    date: 'Feb 26, 2025',
    items: [{ type: 'fix', text: 'Fixed edge-case bugs in the VS Code extension request lifecycle.' }],
  },
  {
    version: '1.7.2',
    date: 'Feb 20, 2025',
    items: [{ type: 'feature', text: 'Incremental feature additions to the VS Code extension API client.' }],
  },
  {
    version: '1.7.1',
    date: 'Feb 14, 2025',
    items: [{ type: 'fix', text: 'Stability and compatibility fixes for VS Code extension.' }],
  },
  {
    version: '1.6.1',
    date: 'Jan 27, 2025',
    items: [{ type: 'perf', text: 'VS Code extension: optimized request handling and UI responsiveness.' }],
  },
  {
    version: '1.6.0',
    date: 'Jan 21, 2025',
    label: 'Major',
    items: [
      { type: 'feature', text: 'VS Code extension reaches v1.6 — significant capability expansion for in-editor API debugging.' },
    ],
  },
  {
    version: '1.1.4',
    date: 'Nov 18, 2024',
    items: [
      { type: 'design', text: 'Redesigned logo — fresh look that enhances visual appeal and aligns more closely with brand identity and core values.' },
    ],
  },
  {
    version: '1.1.3',
    date: 'Oct 2024',
    items: [
      { type: 'fix', text: 'Fixed: the clear button now works properly and clears all data from the interface as expected.' },
    ],
  },
  {
    version: '1.1.2',
    date: 'Sep 2024',
    items: [
      { type: 'design', text: 'Optimized UI details across the interface — tighter spacing, improved visual hierarchy.' },
    ],
  },
  {
    version: '1.1.1',
    date: 'Aug 2024',
    items: [
      { type: 'feature', text: 'Added "Copy as cURL" — instantly convert any captured request to a ready-to-run cURL command.' },
    ],
  },
  {
    version: '1.1.0',
    date: 'Jul 2024',
    label: 'Major',
    items: [
      { type: 'ai',      text: 'Introduced AI Banter — a touch of humor while analyzing API data, making debugging less painful and more human.' },
      { type: 'design',  text: 'New game skin themes — customize your workspace with a fun gaming vibe that makes long sessions enjoyable.' },
      { type: 'design',  text: 'Improved page layout — optimized structure and styling for a more intuitive, user-friendly experience.' },
    ],
  },
  {
    version: '1.0.1',
    date: 'Jun 2024',
    items: [
      { type: 'perf', text: 'Improved click interaction for list expansion and collapse — snappier, more predictable tree navigation.' },
    ],
  },
  {
    version: '1.0.0',
    date: 'May 2024',
    label: 'Initial',
    items: [
      { type: 'release', text: 'Initial public release of EchoAPI Interceptor — capture, inspect, and replay HTTP traffic directly from the browser.' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="2" y1="2" x2="12" y2="12"/>
      <line x1="12" y1="2" x2="2" y2="12"/>
    </svg>
  )
}

function VersionBadge({ label }: { label: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Latest:  { bg: 'rgba(63,185,80,0.15)',   color: '#3FB950' },
    Major:   { bg: 'rgba(99,102,241,0.15)',  color: '#6366F1' },
    Initial: { bg: 'rgba(210,153,34,0.15)',  color: '#D29922' },
  }
  const c = colors[label] ?? colors['Major']
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {label}
    </span>
  )
}

function TypePill({ type }: { type: ItemType }) {
  const m = TYPE_META[type]
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: m.bg, color: m.color }}>
      <span>{m.icon}</span>
      {m.label}
    </span>
  )
}

function FilterButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
      style={{
        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
        color:      active ? 'var(--pk-accent)' : 'var(--pk-muted)',
        border:     active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
      }}
    >
      {label}
      <span className="text-[9px] px-1 py-0.5 rounded font-mono"
        style={{ background: active ? 'rgba(99,102,241,0.2)' : 'var(--pk-elevated)', color: active ? 'var(--pk-accent)' : 'var(--pk-faint)' }}>
        {count}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────

export default function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<ItemType | 'all'>('all')
  const [activeVersion, setActiveVersion] = useState(CHANGELOG[0].version)
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Update active version on scroll
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const ver = (entry.target as HTMLElement).dataset.version
          if (ver) setActiveVersion(ver)
        }
      }
    }, { root: el, rootMargin: '-40% 0px -40% 0px', threshold: 0 })

    Object.values(cardRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [filter])

  const scrollToVersion = (version: string) => {
    cardRefs.current[version]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const typeCounts: Record<string, number> = { all: 0 }
  for (const v of CHANGELOG) {
    typeCounts['all'] += v.items.length
    for (const item of v.items) {
      typeCounts[item.type] = (typeCounts[item.type] ?? 0) + 1
    }
  }

  const filtered = CHANGELOG.filter(v =>
    filter === 'all' || v.items.some(i => i.type === filter)
  ).map(v => ({
    ...v,
    items: filter === 'all' ? v.items : v.items.filter(i => i.type === filter),
  }))

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex overflow-hidden animate-scale-in"
        style={{
          width: 'min(900px, 96vw)',
          height: 'min(680px, 92vh)',
          background: 'var(--pk-surface)',
          border: '1px solid var(--pk-border-s)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)',
          borderRadius: 20,
        }} />

        {/* ── Left: version nav ─────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col w-44 border-r overflow-y-auto"
          style={{ borderColor: 'var(--pk-border)', background: 'var(--pk-sidebar)' }}>

          <div className="sticky top-0 px-4 pt-5 pb-3" style={{ background: 'var(--pk-sidebar)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--pk-accent)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--pk-faint)' }}>Versions</span>
            </div>
          </div>

          <div className="flex flex-col px-2 pb-4">
            {filtered.map(v => (
              <button
                key={v.version}
                onClick={() => scrollToVersion(v.version)}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left transition-all mb-0.5"
                style={{
                  background: activeVersion === v.version ? 'rgba(99,102,241,0.12)' : 'transparent',
                  borderLeft: activeVersion === v.version ? '2px solid var(--pk-accent)' : '2px solid transparent',
                }}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold font-mono"
                    style={{ color: activeVersion === v.version ? 'var(--pk-accent)' : 'var(--pk-text)' }}>
                    v{v.version}
                  </div>
                  <div className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--pk-faint)' }}>{v.date}</div>
                </div>
                {v.label && <VersionBadge label={v.label} />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: main content ────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="flex-shrink-0 flex items-start justify-between px-7 pt-6 pb-4"
            style={{ borderBottom: '1px solid var(--pk-border)' }}>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold" style={{ color: 'var(--pk-text)' }}>What's New</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--pk-accent)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  EchoAPI Release Notes
                </span>
              </div>
              <p className="text-[12px]" style={{ color: 'var(--pk-muted)' }}>
                {CHANGELOG.length} releases · {typeCounts['all']} changes tracked
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 mt-0.5"
              style={{ color: 'var(--pk-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)', e.currentTarget.style.color = 'var(--pk-text)')}
              onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = 'var(--pk-faint)')}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex-shrink-0 flex items-center gap-1 px-7 py-3 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--pk-border)', scrollbarWidth: 'none' }}>
            <FilterButton active={filter === 'all'}     label="All"     count={typeCounts['all'] ?? 0}     onClick={() => setFilter('all')} />
            <FilterButton active={filter === 'feature'} label="Feature" count={typeCounts['feature'] ?? 0} onClick={() => setFilter('feature')} />
            <FilterButton active={filter === 'fix'}     label="Fix"     count={typeCounts['fix'] ?? 0}     onClick={() => setFilter('fix')} />
            <FilterButton active={filter === 'design'}  label="Design"  count={typeCounts['design'] ?? 0}  onClick={() => setFilter('design')} />
            <FilterButton active={filter === 'ai'}      label="AI"      count={typeCounts['ai'] ?? 0}      onClick={() => setFilter('ai')} />
            <FilterButton active={filter === 'perf'}    label="Perf"    count={typeCounts['perf'] ?? 0}    onClick={() => setFilter('perf')} />
          </div>

          {/* Scrollable timeline */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-7 py-6" style={{ scrollbarWidth: 'thin' }}>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px"
                style={{ background: 'linear-gradient(to bottom, var(--pk-accent) 0%, rgba(99,102,241,0.2) 60%, transparent 100%)' }} />

              <div className="flex flex-col gap-8">
                {filtered.map((v, vi) => {
                  const isFirst = vi === 0
                  return (
                    <div
                      key={v.version}
                      ref={el => { cardRefs.current[v.version] = el }}
                      data-version={v.version}
                      className="relative pl-8 animate-fade-in"
                      style={{ animationDelay: `${vi * 40}ms` }}
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{
                          background: isFirst ? 'var(--pk-accent)' : 'var(--pk-elevated)',
                          border: `2px solid ${isFirst ? 'var(--pk-accent)' : 'var(--pk-border-s)'}`,
                          boxShadow: isFirst ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                        }}
                      >
                        {isFirst && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />}
                      </div>

                      {/* Version card */}
                      <div
                        className="rounded-2xl overflow-hidden transition-all"
                        style={{
                          background: 'var(--pk-panel)',
                          border: `1px solid ${activeVersion === v.version ? 'rgba(99,102,241,0.3)' : 'var(--pk-border)'}`,
                          boxShadow: activeVersion === v.version ? '0 0 0 1px rgba(99,102,241,0.15), 0 8px 24px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        {/* Card header */}
                        <div className="flex items-center justify-between px-5 py-3.5"
                          style={{ borderBottom: '1px solid var(--pk-border)', background: 'rgba(255,255,255,0.02)' }}>
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold font-mono"
                              style={{ color: isFirst ? 'var(--pk-accent)' : 'var(--pk-text)' }}>
                              v{v.version}
                            </span>
                            {v.label && <VersionBadge label={v.label} />}
                          </div>
                          <span className="text-[11px]" style={{ color: 'var(--pk-faint)' }}>{v.date}</span>
                        </div>

                        {/* Items */}
                        <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          {v.items.map((item, ii) => {
                            const m = TYPE_META[item.type]
                            return (
                              <div key={ii} className="flex items-start gap-3 px-5 py-3.5">
                                {/* Accent stripe */}
                                <div className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
                                  style={{ background: m.color, opacity: 0.6 }} />
                                <div className="flex-1 min-w-0">
                                  <div className="mb-1.5"><TypePill type={item.type} /></div>
                                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--pk-muted)' }}>
                                    {item.text}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* End cap */}
              <div className="flex items-center gap-3 mt-8 pl-8">
                <div className="h-px flex-1" style={{ background: 'var(--pk-border)' }} />
                <span className="text-[10px] px-2" style={{ color: 'var(--pk-faint)' }}>v1.0.0 — The beginning</span>
                <div className="h-px flex-1" style={{ background: 'var(--pk-border)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
