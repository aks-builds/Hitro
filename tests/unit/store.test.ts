// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Provide window.api before the store module loads
const mockApi = {
  execute:         vi.fn(),
  wsSend:          vi.fn(),
  wsClose:         vi.fn(),
  onStreamEvent:   vi.fn(),
  offStreamEvents: vi.fn(),
  saveCollection:  vi.fn().mockResolvedValue({ ok: true }),
  getCollections:  vi.fn().mockResolvedValue([]),
  saveRequest:     vi.fn().mockResolvedValue({ ok: true }),
  deleteRequest:   vi.fn().mockResolvedValue({ ok: true }),
  getHistory:      vi.fn().mockResolvedValue([]),
  saveEnvironment: vi.fn().mockResolvedValue({ ok: true }),
  getEnvironments: vi.fn().mockResolvedValue([]),
  openFile:        vi.fn().mockResolvedValue(null),
}
Object.defineProperty(window, 'api', { value: mockApi, writable: true })

import { useAppStore } from '../../src/renderer/store/appStore'
import type { Environment } from '../../src/shared/types'

describe('useAppStore — resolve()', () => {
  beforeEach(() => {
    useAppStore.setState({ environments: [] })
    vi.clearAllMocks()
  })

  it('returns the string unchanged when no active environment', () => {
    const { resolve } = useAppStore.getState()
    expect(resolve('https://{{host}}/api')).toBe('https://{{host}}/api')
  })

  it('replaces a known variable in an active environment', () => {
    const env: Environment = {
      id: 'e1', name: 'Dev', isActive: true,
      variables: [{ id: 'v1', key: 'host', value: 'api.dev.example.com', enabled: true }],
    }
    useAppStore.setState({ environments: [env] })
    const { resolve } = useAppStore.getState()
    expect(resolve('https://{{host}}/api')).toBe('https://api.dev.example.com/api')
  })

  it('replaces multiple distinct variables', () => {
    const env: Environment = {
      id: 'e1', name: 'Dev', isActive: true,
      variables: [
        { id: 'v1', key: 'host', value: 'api.example.com', enabled: true },
        { id: 'v2', key: 'version', value: 'v2', enabled: true },
      ],
    }
    useAppStore.setState({ environments: [env] })
    const { resolve } = useAppStore.getState()
    expect(resolve('https://{{host}}/{{version}}/users')).toBe('https://api.example.com/v2/users')
  })

  it('leaves unmatched tokens intact', () => {
    const env: Environment = {
      id: 'e1', name: 'Dev', isActive: true,
      variables: [{ id: 'v1', key: 'host', value: 'api.example.com', enabled: true }],
    }
    useAppStore.setState({ environments: [env] })
    const { resolve } = useAppStore.getState()
    expect(resolve('{{host}}/{{missing}}')).toBe('api.example.com/{{missing}}')
  })

  it('skips disabled variables', () => {
    const env: Environment = {
      id: 'e1', name: 'Dev', isActive: true,
      variables: [{ id: 'v1', key: 'host', value: 'api.example.com', enabled: false }],
    }
    useAppStore.setState({ environments: [env] })
    const { resolve } = useAppStore.getState()
    expect(resolve('https://{{host}}/api')).toBe('https://{{host}}/api')
  })

  it('uses the active environment only (not inactive ones)', () => {
    const envs: Environment[] = [
      { id: 'e1', name: 'Prod', isActive: false, variables: [{ id: 'v1', key: 'host', value: 'prod.example.com', enabled: true }] },
      { id: 'e2', name: 'Dev',  isActive: true,  variables: [{ id: 'v2', key: 'host', value: 'dev.example.com',  enabled: true }] },
    ]
    useAppStore.setState({ environments: envs })
    const { resolve } = useAppStore.getState()
    expect(resolve('https://{{host}}')).toBe('https://dev.example.com')
  })
})

describe('useAppStore — tab management', () => {
  beforeEach(() => {
    useAppStore.setState({ tabs: [], activeTabId: null, environments: [], collections: [] })
  })

  it('newTab creates a tab and makes it active', () => {
    useAppStore.getState().newTab()
    const state = useAppStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('closeTab removes the tab', () => {
    useAppStore.getState().newTab()
    const { tabs } = useAppStore.getState()
    useAppStore.getState().closeTab(tabs[0].id)
    expect(useAppStore.getState().tabs).toHaveLength(0)
  })

  it('closeTab activates the previous tab', () => {
    useAppStore.getState().newTab()
    useAppStore.getState().newTab()
    const { tabs } = useAppStore.getState()
    useAppStore.getState().closeTab(tabs[1].id)
    expect(useAppStore.getState().activeTabId).toBe(tabs[0].id)
  })

  it('clearStreamEvents empties events for the given tab', () => {
    useAppStore.getState().newTab()
    const { tabs } = useAppStore.getState()
    const tabId = tabs[0].id
    const event = { id: 'e1', type: 'received' as const, data: 'ping', timestamp: Date.now() }
    useAppStore.getState().addStreamEvent(tabId, event)
    expect(useAppStore.getState().tabs[0].streamEvents).toHaveLength(1)

    useAppStore.getState().clearStreamEvents(tabId)
    expect(useAppStore.getState().tabs[0].streamEvents).toHaveLength(0)
  })

  it('updateConfig merges config patch without replacing the whole config', () => {
    useAppStore.getState().newTab()
    const { tabs } = useAppStore.getState()
    const tabId = tabs[0].id
    useAppStore.getState().updateConfig(tabId, { url: 'https://example.com' })
    const updated = useAppStore.getState().tabs.find(t => t.id === tabId)!
    expect((updated.request.config as any).url).toBe('https://example.com')
    // method should still be present from the default REST config
    expect((updated.request.config as any).method).toBe('GET')
  })
})
