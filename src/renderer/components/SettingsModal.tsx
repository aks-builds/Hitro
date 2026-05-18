import React from 'react'
import { useThemeSetting, ThemeSetting } from '../hooks/useTheme'

const THEMES: { value: ThemeSetting; icon: React.ReactNode; label: string; desc: string }[] = [
  {
    value: 'light', label: 'Light', desc: 'Clean white interface',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    value: 'dark', label: 'Dark', desc: 'Easy on the eyes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
      </svg>
    ),
  },
  {
    value: 'system', label: 'System', desc: 'Follows OS preference',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="3" width="16" height="11" rx="2"/>
        <path d="M7 17h6M10 14v3" strokeLinecap="round"/>
      </svg>
    ),
  },
]

const SHORTCUTS = [
  ['New tab',          '⌘ N'],
  ['Close tab',        '⌘ W'],
  ['Send request',     '⌘ ↵'],
  ['Save request',     '⌘ S'],
  ['Command palette',  '⌘ K'],
  ['Next tab',         '⌘ ]'],
  ['Previous tab',     '⌘ ['],
  ['Copy as cURL',     '⌘ ⇧ C'],
]

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useThemeSetting()

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[520px] max-h-[85vh] rounded-2xl border border-pk-border flex flex-col overflow-hidden animate-slide-in"
        style={{ background: 'var(--pk-surface)', boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pk-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-pk-text">Settings</h2>
            <p className="text-xs text-pk-muted mt-0.5">Customize your Hitro experience</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-pk-muted hover:text-pk-text hover:bg-pk-hover transition-all text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

          {/* Appearance */}
          <section>
            <h3 className="text-[11px] font-semibold text-pk-muted uppercase tracking-widest mb-3">Appearance</h3>
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                    theme === t.value
                      ? 'border-pk-accent bg-pk-accent/8 shadow-glow-accent'
                      : 'border-pk-border hover:border-pk-accent/40 hover:bg-pk-hover'
                  }`}
                >
                  <span className={theme === t.value ? 'text-pk-accent' : 'text-pk-muted'}>{t.icon}</span>
                  <span className="text-xs font-semibold text-pk-text">{t.label}</span>
                  <span className="text-[10px] text-pk-muted text-center leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section>
            <h3 className="text-[11px] font-semibold text-pk-muted uppercase tracking-widest mb-3">Keyboard Shortcuts</h3>
            <div className="rounded-xl border border-pk-border overflow-hidden" style={{ background: 'var(--pk-panel)' }}>
              {SHORTCUTS.map(([label, shortcut], i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-4 py-2.5 ${i < SHORTCUTS.length - 1 ? 'border-b border-pk-border/60' : ''}`}
                >
                  <span className="text-xs text-pk-text">{label}</span>
                  <span className="text-[11px] font-mono text-pk-muted bg-pk-border/40 px-2 py-0.5 rounded-md">{shortcut}</span>
                </div>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
            <h3 className="text-[11px] font-semibold text-pk-muted uppercase tracking-widest mb-3">About</h3>
            <div
              className="flex items-center gap-4 p-4 rounded-xl border border-pk-border"
              style={{ background: 'var(--pk-panel)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #38BDF8 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
              >
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.95"/>
                  <circle cx="6"  cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
                  <circle cx="26" cy="10" r="3.5" fill="white" fillOpacity="0.7"/>
                  <circle cx="6"  cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
                  <circle cx="26" cy="22" r="3.5" fill="white" fillOpacity="0.7"/>
                  <line x1="16" y1="16" x2="6"  y2="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
                  <line x1="16" y1="16" x2="26" y2="10" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
                  <line x1="16" y1="16" x2="6"  y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
                  <line x1="16" y1="16" x2="26" y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-pk-text">Hitro</p>
                <p className="text-xs text-pk-muted mt-0.5">Multi-Protocol API Client · v1.0.0</p>
                <p className="text-[11px] text-pk-faint mt-1.5">Electron · React · TypeScript · SQLite</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
