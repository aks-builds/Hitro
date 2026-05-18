import React, { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(t: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = t === 'dark' || (t === 'system' && prefersDark)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export default function App() {
  const { loadCollections, loadEnvironments, loadGlobalVars, newTab, tabs } = useAppStore()
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
    loadCollections()
    loadEnvironments()
    loadGlobalVars()
    window.api.onStreamEvent((payload: any) => {
      useAppStore.getState().addStreamEvent(payload.requestId, payload.event)
      if (payload.event.type === 'connected')    useAppStore.getState().setWsConnected(payload.requestId, true)
      if (payload.event.type === 'disconnected') useAppStore.getState().setWsConnected(payload.requestId, false)
    })
    return () => window.api.offStreamEvents()
  }, [])

  useEffect(() => { if (tabs.length === 0) newTab() }, [])

  return (
    <>
      <Layout />
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    </>
  )
}
