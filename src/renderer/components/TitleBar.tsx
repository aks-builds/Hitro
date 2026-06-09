import React, { useEffect, useRef, useState } from 'react'
import { useThemeSetting } from '../hooks/useTheme'
import { useAppStore } from '../store/appStore'
import WhatsNewModal from './WhatsNewModal'

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="3" width="16" height="11" rx="2"/>
      <path d="M7 17h6M10 14v3" strokeLinecap="round"/>
    </svg>
  )
}

function ThemeIcon({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  if (theme === 'dark')   return <MoonIcon />
  if (theme === 'system') return <MonitorIcon />
  return <SunIcon />
}

interface Props {
  onOpenSettings: () => void
  onOpenImport:   () => void
}

export default function TitleBar({ onOpenSettings, onOpenImport }: Props) {
  const isMac     = window.api.platform === 'darwin'
  const isWindows = window.api.platform === 'win32'

  const [theme, setTheme]       = useThemeSetting()
  const [profileOpen, setProfileOpen] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const activeEnv = useAppStore(s => s.activeEnv())

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const THEME_CYCLE: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
  const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' }
  const cycleTheme = () => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % 3])

  const noDrag: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as any

  const menuItems = [
    {
      label: 'Settings',
      icon: <SettingsIcon />,
      action: () => { setProfileOpen(false); onOpenSettings() },
    },
    {
      label: 'Import / Export',
      icon: <ImportIcon />,
      action: () => { setProfileOpen(false); onOpenImport() },
    },
    {
      label: "What's New",
      icon: <SparkleIcon />,
      action: () => { setProfileOpen(false); setShowWhatsNew(true) },
      accent: true,
    },
  ]

  return (
    <div
      className="flex items-center h-11 flex-shrink-0 select-none"
      style={{
        background: 'var(--pk-surface)',
        WebkitAppRegion: 'drag',
        boxShadow: '0 1px 0 var(--pk-border)',
        zIndex: 100,
      } as any}
    >
      {isMac && <div style={{ width: 80, flexShrink: 0 }} />}

      {/* Brand */}
      <div className="flex items-center gap-2 px-4 flex-shrink-0" style={noDrag}>
        <div
          className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #38BDF8 100%)',
            boxShadow: '0 2px 10px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
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
        <span data-testid="app-brand" className="text-sm font-bold tracking-tight" style={{ color: 'var(--pk-text)' }}>Hitro</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--pk-accent)' }}>
          API Client
        </span>
      </div>

      {/* Active environment badge */}
      <div className="flex-1 flex justify-center items-center min-w-0 px-4" style={noDrag}>
        {activeEnv ? (
          <div
            className="flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-semibold select-none"
            style={{
              background: 'rgba(63,185,80,0.1)',
              border: '1px solid rgba(63,185,80,0.25)',
              color: 'var(--pk-success)',
            }}
            title={`Active environment: ${activeEnv.name}`}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--pk-success)' }} />
            {activeEnv.name}
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-medium select-none"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--pk-border)',
              color: 'var(--pk-faint)',
            }}
            title="No environment active — variables will not be substituted"
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--pk-faint)' }} />
            No environment
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-0.5 px-2 flex-shrink-0" style={noDrag}>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${THEME_LABELS[theme]} — click to cycle`}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'var(--pk-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)', e.currentTarget.style.color = 'var(--pk-text)')}
          onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = 'var(--pk-muted)')}
        >
          <ThemeIcon theme={theme} />
        </button>

        <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: 'var(--pk-border-s)' }} />

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-1.5 h-8 px-2 rounded-lg transition-all"
            style={{ color: 'var(--pk-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)', boxShadow: '0 1px 4px rgba(99,102,241,0.4)' }}
            >
              AS
            </div>
            <svg width="9" height="5" viewBox="0 0 9 5" fill="currentColor" style={{ color: 'var(--pk-faint)' }}>
              <path d="M0 0.5L4.5 5L9 0.5H0Z"/>
            </svg>
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border overflow-hidden z-50 animate-scale-in"
              style={{
                background: 'var(--pk-panel)',
                border: '1px solid var(--pk-border-s)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--pk-border)' }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}
                  >AS</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--pk-text)' }}>Aditya Singh</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--pk-muted)' }}>aditya.k.singh@duckcreek.com</p>
                  </div>
                </div>
              </div>

              {menuItems.map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-colors"
                  style={{ color: (item as any).accent ? 'var(--pk-accent)' : 'var(--pk-text)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <span style={{ color: (item as any).accent ? 'var(--pk-accent)' : 'var(--pk-muted)' }}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {(item as any).accent && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--pk-accent)' }}>NEW</span>
                  )}
                </button>
              ))}

              <div className="px-4 py-2 flex items-center justify-between border-t" style={{ borderColor: 'var(--pk-border)' }}>
                <span className="text-[10px]" style={{ color: 'var(--pk-faint)' }}>Hitro v1.0.0</span>
              </div>
            </div>
          )}
        </div>

        {/* What's New button — visible shortcut next to window controls */}
        <button
          onClick={() => setShowWhatsNew(true)}
          title="What's New"
          className="hidden sm:flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            color: 'var(--pk-accent)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
        >
          <SparkleIcon />
          <span>What's New</span>
        </button>

        {/* Windows window controls */}
        {isWindows && (
          <>
            <div className="w-px h-4 mx-1.5 flex-shrink-0" style={{ background: 'var(--pk-border-s)' }} />
            <button
              onClick={() => window.api.windowMinimize()}
              title="Minimize"
              className="w-10 h-8 flex items-center justify-center rounded transition-colors"
              style={{ color: 'var(--pk-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)', e.currentTarget.style.color = 'var(--pk-text)')}
              onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = 'var(--pk-muted)')}
            >
              <svg width="11" height="2" viewBox="0 0 11 2" fill="currentColor"><rect width="11" height="1.5" rx="0.75"/></svg>
            </button>
            <button
              onClick={() => window.api.windowMaximize()}
              title="Maximize"
              className="w-10 h-8 flex items-center justify-center rounded transition-colors"
              style={{ color: 'var(--pk-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pk-elevated)', e.currentTarget.style.color = 'var(--pk-text)')}
              onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = 'var(--pk-muted)')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="0.65" y="0.65" width="8.7" height="8.7" rx="1.5"/>
              </svg>
            </button>
            <button
              onClick={() => window.api.windowClose()}
              title="Close"
              className="w-10 h-8 flex items-center justify-center rounded transition-all"
              style={{ color: 'var(--pk-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F85149', e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.background = '', e.currentTarget.style.color = 'var(--pk-muted)')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/>
                <line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/>
              </svg>
            </button>
          </>
        )}
      </div>
      {showWhatsNew && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 4.5H14l-3.75 2.75 1.5 4.5L8 10l-3.75 2.75 1.5-4.5L2 5.5h4.5z"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
    </svg>
  )
}
