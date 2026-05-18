import { create } from 'zustand'
import { PikoRequest, PikoResponse, Collection, Environment, StreamEvent, Protocol, KeyValue, defaultConfig } from '@shared/types'

export interface Tab {
  id: string
  request: PikoRequest
  response?: PikoResponse
  isLoading: boolean
  streamEvents: StreamEvent[]
  isDirty: boolean
  wsConnected: boolean
}

interface AppState {
  tabs: Tab[]
  activeTabId: string | null
  collections: Collection[]
  environments: Environment[]
  globalVariables: KeyValue[]

  newTab: (protocol?: Protocol) => void
  openRequest: (req: PikoRequest) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateRequest: (tabId: string, patch: Partial<PikoRequest>) => void
  updateConfig: (tabId: string, patch: object) => void
  setResponse: (tabId: string, res: PikoResponse) => void
  setLoading: (tabId: string, v: boolean) => void
  addStreamEvent: (tabId: string, e: StreamEvent) => void
  setWsConnected: (tabId: string, v: boolean) => void
  clearStreamEvents: (tabId: string) => void

  loadCollections: () => Promise<void>
  saveRequest: (req: PikoRequest) => Promise<void>

  loadEnvironments: () => Promise<void>
  activeEnv: () => Environment | undefined

  loadGlobalVars: () => Promise<void>
  saveGlobalVars: (vars: KeyValue[]) => Promise<void>

  resolve: (str: string) => string
  activeTab: () => Tab | undefined
}

let _counter = 0
const makeId = () => `tab-${++_counter}-${Date.now()}`

function defaultRequest(protocol: Protocol = 'rest'): PikoRequest {
  return {
    id: makeId(), name: 'New Request', protocol,
    assertions: [], preScript: '', postScript: '', chainRules: [],
    createdAt: Date.now(), updatedAt: Date.now(),
    config: defaultConfig(protocol),
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [], activeTabId: null, collections: [], environments: [], globalVariables: [],

  activeTab: () => get().tabs.find(t => t.id === get().activeTabId),

  newTab: (protocol: Protocol = 'rest') => {
    const req = defaultRequest(protocol)
    const tab: Tab = { id: req.id, request: req, isLoading: false, streamEvents: [], isDirty: false, wsConnected: false }
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }))
  },

  openRequest: (req) => {
    const existing = get().tabs.find(t => t.request.id === req.id)
    if (existing) { set({ activeTabId: existing.id }); return }
    const tab: Tab = { id: req.id, request: req, isLoading: false, streamEvents: [], isDirty: false, wsConnected: false }
    set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }))
  },

  closeTab: (id) => set(s => {
    const tabs = s.tabs.filter(t => t.id !== id)
    const activeTabId = s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
    return { tabs, activeTabId }
  }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateRequest: (tabId, patch) => set(s => ({
    tabs: s.tabs.map(t => {
      if (t.id !== tabId) return t
      const newProtocol = (patch as any).protocol
      if (newProtocol && newProtocol !== t.request.protocol) {
        // Reset response and stream state when switching protocols to avoid stale data
        return { ...t, isDirty: true, response: undefined, streamEvents: [], wsConnected: false,
          request: { ...t.request, ...patch, config: defaultConfig(newProtocol) } }
      }
      return { ...t, isDirty: true, request: { ...t.request, ...patch } }
    }),
  })),

  updateConfig: (tabId, patch) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? {
      ...t, isDirty: true,
      request: { ...t.request, config: { ...t.request.config, ...patch } },
    } : t),
  })),

  setResponse: (tabId, res) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, response: res, isLoading: false } : t),
  })),

  setLoading: (tabId, v) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, isLoading: v } : t),
  })),

  addStreamEvent: (tabId, e) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, streamEvents: [...t.streamEvents, e] } : t),
  })),

  setWsConnected: (tabId, v) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, wsConnected: v } : t),
  })),

  clearStreamEvents: (tabId) => set(s => ({
    tabs: s.tabs.map(t => t.id === tabId ? { ...t, streamEvents: [] } : t),
  })),

  loadCollections: async () => set({ collections: await window.api.getCollections() }),

  saveRequest: async (req) => {
    await window.api.saveRequest(req)
    await get().loadCollections()
    set(s => ({ tabs: s.tabs.map(t => t.request.id === req.id ? { ...t, isDirty: false } : t) }))
  },

  loadEnvironments: async () => set({ environments: await window.api.getEnvironments() }),

  loadGlobalVars: async () => set({ globalVariables: await window.api.getGlobalVars() }),

  saveGlobalVars: async (vars) => {
    await window.api.saveGlobalVars(vars)
    set({ globalVariables: vars })
  },

  activeEnv: () => get().environments.find(e => e.isActive),

  resolve: (str) => {
    const env = get().activeEnv()
    const globals = get().globalVariables
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const envVar = env?.variables.find(v => v.key === key && v.enabled)
      if (envVar) return envVar.value
      const globalVar = globals.find(v => v.key === key && v.enabled)
      if (globalVar) return globalVar.value
      return `{{${key}}}`
    })
  },
}))
