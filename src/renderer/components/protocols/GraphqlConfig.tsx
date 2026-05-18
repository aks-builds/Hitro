import React, { useState } from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { GraphqlConfig as GQ, KeyValue } from '@shared/types'
import Editor from '@monaco-editor/react'
import { useDarkMode } from '../../hooks/useTheme'

export default function GraphqlConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as GQ
  const up = (p: object) => updateConfig(tab.id, p)
  const [sub, setSub] = useState<'query' | 'variables' | 'headers'>('query')
  const isDark = useDarkMode()

  const addHeader = () => up({ headers: [...cfg.headers, { id: crypto.randomUUID(), key: '', value: '', enabled: true }] })
  const removeHeader = (id: string) => up({ headers: cfg.headers.filter((h: KeyValue) => h.id !== id) })
  const patchHeader = (id: string, patch: Partial<KeyValue>) => up({ headers: cfg.headers.map((h: KeyValue) => h.id === id ? { ...h, ...patch } : h) })

  return (
    <div data-testid="graphql-config" className="flex flex-col gap-3">
      <div className="flex gap-0.5 border-b border-pk-border mb-1">
        {(['query', 'variables', 'headers'] as const).map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`px-3 py-1.5 capitalize text-xs ${sub === t ? 'tab-active' : 'tab-inactive'}`}>
            {t}
          </button>
        ))}
      </div>

      {sub === 'query' && (
        <div className="rounded-xl overflow-hidden border border-pk-border">
          <Editor height="200px" defaultLanguage="graphql" value={cfg.query} onChange={v => up({ query: v ?? '' })}
            theme={isDark ? 'vs-dark' : 'vs'}
            options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', scrollBeyondLastLine: false, padding: { top: 8 } }} />
        </div>
      )}

      {sub === 'variables' && (
        <div className="rounded-xl overflow-hidden border border-pk-border">
          <Editor height="160px" defaultLanguage="json" value={cfg.variables} onChange={v => up({ variables: v ?? '{}' })}
            theme={isDark ? 'vs-dark' : 'vs'}
            options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', scrollBeyondLastLine: false, padding: { top: 8 } }} />
        </div>
      )}

      {sub === 'headers' && (
        <div className="flex flex-col gap-1.5">
          {cfg.headers.map((h: KeyValue) => (
            <div key={h.id} className="flex items-center gap-2 p-2 bg-pk-panel rounded-xl border border-pk-border/60">
              <input type="checkbox" checked={h.enabled} onChange={e => patchHeader(h.id, { enabled: e.target.checked })} className="accent-pk-accent" />
              <input value={h.key} onChange={e => patchHeader(h.id, { key: e.target.value })} placeholder="Key"
                className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
              <div className="w-px h-4 bg-pk-border flex-shrink-0" />
              <input value={h.value} onChange={e => patchHeader(h.id, { value: e.target.value })} placeholder="Value"
                className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
              <button onClick={() => removeHeader(h.id)} className="text-pk-faint hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          <button onClick={addHeader} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors text-left mt-0.5 px-1">+ Add Header</button>
        </div>
      )}
    </div>
  )
}
