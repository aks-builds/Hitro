import { useState, useEffect } from 'react'

export type ThemeSetting = 'light' | 'dark' | 'system'

const THEME_EVENT = 'hitro:theme-changed'

export function applyTheme(t: ThemeSetting) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = t === 'dark' || (t === 'system' && prefersDark)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

// Watches the data-theme attribute on <html> for any component that needs to react to dark/light
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

// Reads and writes the full theme setting ('light'|'dark'|'system')
// Multiple components can call this hook and they stay in sync via a custom event
export function useThemeSetting(): [ThemeSetting, (t: ThemeSetting) => void] {
  const [theme, setThemeState] = useState<ThemeSetting>(
    () => (localStorage.getItem('hitro-theme') ?? 'light') as ThemeSetting
  )

  const setTheme = (t: ThemeSetting) => {
    setThemeState(t)
    localStorage.setItem('hitro-theme', t)
    applyTheme(t)
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }))
  }

  useEffect(() => {
    const handler = ((e: CustomEvent) => setThemeState(e.detail as ThemeSetting)) as EventListener
    window.addEventListener(THEME_EVENT, handler)
    return () => window.removeEventListener(THEME_EVENT, handler)
  }, [])

  return [theme, setTheme]
}
