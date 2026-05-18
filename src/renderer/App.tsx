import React, { useEffect, useState } from 'react'
import { useAppStore, restoreTabs } from './store/appStore'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(t: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = t === 'dark' || (t === 'system' && prefersDark)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export default function App() {
  const { loadCollections, loadEnvironments, loadGlobalVars, loadGlobalHeaders, newTab, tabs } = useAppStore()
  const [showSplash, setShowSplash] = useState(true)

  // Apply saved theme immediately before any render
  useEffect(() => {
    const saved = (localStorage.getItem('hitro-theme') ?? 'light') as Theme
    applyTheme(saved)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSysChange = () => {
      if ((localStorage.getItem('hitro-theme') ?? 'light') === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onSysChange)
    return () => mq.removeEventListener('change', onSysChange)
  }, [])

  useEffect(() => {
    loadCollections().then(() => {
      // Restore all tabs from previous session
      const saved = restoreTabs()
      if (saved && saved.tabs.length > 0) {
        const store = useAppStore.getState()
        // Skip if tabs were already opened (e.g. hot reload)
        if (store.tabs.length === 0 || (store.tabs.length === 1 && !store.tabs[0].request.collectionId)) {
          const fullTabs = saved.tabs.map(t => ({
            ...t,
            response: undefined,
            streamEvents: [] as any[],
            isLoading: false,
            wsConnected: false,
          }))
          useAppStore.setState({
            tabs: fullTabs,
            activeTabId: saved.activeTabId ?? fullTabs[fullTabs.length - 1]?.id ?? null,
          })
        }
      }
    })
    loadEnvironments()
    loadGlobalVars()
    loadGlobalHeaders()
    window.api.onStreamEvent((payload: any) => {
      const store = useAppStore.getState()
      store.addStreamEvent(payload.requestId, payload.event)
      if (payload.event.type === 'connected') {
        store.setWsConnected(payload.requestId, true)
        // Clear the loading state so the Send button switches to "Disconnect"
        store.setLoading(payload.requestId, false)
      }
      if (payload.event.type === 'disconnected') {
        store.setWsConnected(payload.requestId, false)
      }
    })
    return () => window.api.offStreamEvents()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const store = useAppStore.getState()
      const active = store.activeTab()

      if ((e.key === 'n' || e.key === 'N') && e.shiftKey) {
        e.preventDefault()
        store.newScratchTab()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        store.newTab()
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        if (active) store.closeTab(active.id)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('hitro:send-request'))
      } else if ((e.key === 's' || e.key === 'S') && !e.shiftKey) {
        e.preventDefault()
        if (active) store.saveRequest(active.request)
      } else if (e.key === ']') {
        e.preventDefault()
        const { tabs, activeTabId } = store
        const idx = tabs.findIndex(t => t.id === activeTabId)
        if (idx < tabs.length - 1) store.setActiveTab(tabs[idx + 1].id)
      } else if (e.key === '[') {
        e.preventDefault()
        const { tabs, activeTabId } = store
        const idx = tabs.findIndex(t => t.id === activeTabId)
        if (idx > 0) store.setActiveTab(tabs[idx - 1].id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => { if (tabs.length === 0) newTab() }, [])

  return (
    <>
      <Layout />
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    </>
  )
}
