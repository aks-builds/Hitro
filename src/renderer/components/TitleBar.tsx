import React, { useEffect, useRef, useState } from 'react'
import { useThemeSetting } from '../hooks/useTheme'

function ThemeIcon({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  if (theme === 'dark') return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
    </svg>
  )
  if (theme === 'system') return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="3" width="16" height="11" rx="2"/>
      <path d="M7 17h6M10 14v3" strokeLinecap="round"/>
    </svg>
  )
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
    </svg>
  )
}

interface Props {
  onOpenSettings: () => void
  onOpenImport:   () => void
}

export default function TitleBar({ onOpenSettings, onOpenImport }: Props) {
  const api = (window as any).api
  const isMac     = api?.platform === 'darwin'
  const isWindows = api?.platform === 'win32'

  const [theme, setTheme]   = useThemeSetting()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const THEME_CYCLE: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
  const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' }
  const cycleTheme = () => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % 3])

  const noDrag: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as any

  const menuItems = [
    {
      icon: <SettingsIcon />, label: 'Settings',
      action: () => { setProfileOpen(false); onOpenSettings() },
    },
    {
      icon: <ImportIcon />, label: 'Import / Export',
      action: () => { setProfileOpen(false); onOpenImport() },
    },
    {
      icon: <HelpIcon />, label: 'Help & Shortcuts',
      action: () => { setProfileOpen(false); onOpenSettings() }, // opens settings which has shortcuts
    },
  ]

  return (
    <div
      className="flex items-center h-11 flex-shrink-0 border-b border-pk-border select-none"
      style={{
        background: 'var(--pk-surface)',
        WebkitAppRegion: 'drag',
        boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
        zIndex: 100,
      } as any}
    >
      {/* macOS traffic-light spacer */}
      {isMac && <div style={{ width: 80, flexShrink: 0 }} />}

      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 flex-shrink-0" style={noDrag}>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #38BDF8 100%)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
        >
          <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.95"/>
            <circle cx="6"  cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
            <circle cx="26" cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
            <circle cx="6"  cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
            <circle cx="26" cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
            <line x1="16" y1="16" x2="6"  y2="10" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="26" y2="10" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="6"  y2="22" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="26" y2="22" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
          </svg>
        </div>
        <span className="text-sm font-bold text-pk-text tracking-tight">Hitro</span>
        <span className="text-pk-border text-xs">│</span>
        <span className="text-xs text-pk-muted hidden sm:block">API Client</span>
      </div>

      {/* ── Search stub ───────────────────────────────────── */}
      <div className="flex-1 flex justify-center items-center min-w-0 px-4" style={noDrag}>
        <button
          className="flex items-center gap-2.5 h-7 px-3 rounded-lg border border-pk-border w-full max-w-xs transition-all hover:border-pk-accent/50"
          style={{ background: 'var(--pk-panel)', cursor: 'default' }}
          title="Search / Command palette (coming soon)"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-pk-faint">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-xs text-pk-faint flex-1 text-left">Search requests, collections…</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      {/* ── Right controls ────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 flex-shrink-0" style={noDrag}>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${THEME_LABELS[theme]} — click to cycle`}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-pk-muted hover:text-pk-text hover:bg-pk-hover transition-all"
        >
          <ThemeIcon theme={theme} />
        </button>

        {/* Notifications */}
        <button
          title="Notifications"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-pk-muted hover:text-pk-text hover:bg-pk-hover transition-all"
        >
          <svg width="14" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6z"/>
            <path d="M10 18a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z"/>
          </svg>
        </button>

        <div className="w-px h-5 bg-pk-border mx-1 flex-shrink-0" />

        {/* Profile avatar + dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-pk-hover transition-all"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 1px 4px rgba(99,102,241,0.4)' }}
            >
              AS
            </div>
            <span className="text-xs font-medium text-pk-text hidden md:block">Aditya Singh</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" className="text-pk-faint">
              <path d="M0 0.5L5 5.5L10 0.5H0Z"/>
            </svg>
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-pk-border overflow-hidden z-50 animate-slide-in"
              style={{ background: 'var(--pk-surface)', boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)' }}
            >
              {/* Profile header */}
              <div className="px-4 py-3.5 border-b border-pk-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
                  >
                    AS
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-pk-text truncate">Aditya Singh</p>
                    <p className="text-xs text-pk-muted truncate">aditya.k.singh@duckcreek.com</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              {menuItems.map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-pk-text hover:bg-pk-hover transition-colors text-left"
                >
                  <span className="text-pk-muted w-4 flex items-center justify-center flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              <div className="border-t border-pk-border px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-pk-faint">Hitro v1.0.0</span>
                <button className="text-[11px] text-red-500 hover:text-red-400 transition-colors">Sign out</button>
              </div>
            </div>
          )}
        </div>

        {/* Windows window controls */}
        {isWindows && (
          <>
            <div className="w-px h-5 bg-pk-border mx-1.5 flex-shrink-0" />
            <button onClick={() => api?.windowMinimize()} title="Minimize"
              className="w-10 h-8 flex items-center justify-center text-pk-muted hover:text-pk-text hover:bg-pk-hover transition-colors rounded-md">
              <svg width="11" height="2" viewBox="0 0 11 2" fill="currentColor"><rect width="11" height="1.5" rx="0.75"/></svg>
            </button>
            <button onClick={() => api?.windowMaximize()} title="Maximize"
              className="w-10 h-8 flex items-center justify-center text-pk-muted hover:text-pk-text hover:bg-pk-hover transition-colors rounded-md">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="0.7" y="0.7" width="8.6" height="8.6" rx="1.5"/>
              </svg>
            </button>
            <button onClick={() => api?.windowClose()} title="Close"
              className="w-10 h-8 flex items-center justify-center text-pk-muted hover:text-white hover:bg-red-500 transition-colors rounded-md">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/>
                <line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
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

function HelpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
    </svg>
  )
}
