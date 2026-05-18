import React from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { GrpcConfig as GC, KeyValue } from '@shared/types'
import Editor from '@monaco-editor/react'
import { useDarkMode } from '../../hooks/useTheme'

export default function GrpcConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as GC
  const up = (p: object) => updateConfig(tab.id, p)
  const isDark = useDarkMode()

  const pickProto = async () => {
    const path = await window.api.openFile()
    if (path) up({ protoPath: path })
  }

  const addMeta = () => up({ metadata: [...cfg.metadata, { id: crypto.randomUUID(), key: '', value: '', enabled: true }] })
  const removeMeta = (id: string) => up({ metadata: cfg.metadata.filter((m: KeyValue) => m.id !== id) })
  const patchMeta = (id: string, patch: Partial<KeyValue>) => up({ metadata: cfg.metadata.map((m: KeyValue) => m.id === id ? { ...m, ...patch } : m) })

  return (
    <div data-testid="grpc-config" className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <input value={cfg.protoPath} readOnly placeholder="Select .proto file…"
          className="flex-1 px-3 py-1.5 rounded-xl text-xs text-pk-muted font-mono" />
        <button onClick={pickProto}
          className="btn-ghost py-1.5 text-xs">Browse</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Service</label>
          <input value={cfg.service} onChange={e => up({ service: e.target.value })}
            placeholder="package.ServiceName"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Method</label>
          <input value={cfg.method} onChange={e => up({ method: e.target.value })}
            placeholder="MethodName"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-pk-panel rounded-xl border border-pk-border">
        <input type="checkbox" id="tls" checked={cfg.tls} onChange={e => up({ tls: e.target.checked })} className="accent-pk-accent" />
        <label htmlFor="tls" className="text-xs text-pk-muted cursor-pointer">Enable TLS</label>
      </div>

      <div>
        <label className="text-xs text-pk-muted mb-2 block">Request Body (JSON)</label>
        <div className="rounded-xl overflow-hidden border border-pk-border">
          <Editor height="160px" defaultLanguage="json" value={cfg.body} onChange={v => up({ body: v ?? '' })}
            theme={isDark ? 'vs-dark' : 'vs'}
            options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', scrollBeyondLastLine: false, padding: { top: 8 } }} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-pk-muted">Metadata</label>
          <button onClick={addMeta} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors">+ Add</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {cfg.metadata.map((m: KeyValue) => (
            <div key={m.id} className="flex items-center gap-2 p-2 bg-pk-panel rounded-xl border border-pk-border/60">
              <input type="checkbox" checked={m.enabled} onChange={e => patchMeta(m.id, { enabled: e.target.checked })} className="accent-pk-accent" />
              <input value={m.key} onChange={e => patchMeta(m.id, { key: e.target.value })} placeholder="Key"
                className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
              <div className="w-px h-4 bg-pk-border flex-shrink-0" />
              <input value={m.value} onChange={e => patchMeta(m.id, { value: e.target.value })} placeholder="Value"
                className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
              <button onClick={() => removeMeta(m.id)} className="text-pk-faint hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
