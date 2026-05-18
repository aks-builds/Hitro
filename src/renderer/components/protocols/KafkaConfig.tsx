import React from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { KafkaConfig as KC, KeyValue } from '@shared/types'
import Editor from '@monaco-editor/react'
import { useDarkMode } from '../../hooks/useTheme'

export default function KafkaConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as KC
  const up = (p: object) => updateConfig(tab.id, p)
  const isDark = useDarkMode()

  const addHeader = () => up({ headers: [...(cfg.headers ?? []), { id: crypto.randomUUID(), key: '', value: '', enabled: true }] })
  const removeHeader = (id: string) => up({ headers: cfg.headers.filter((h: KeyValue) => h.id !== id) })
  const patchHeader = (id: string, patch: Partial<KeyValue>) => up({ headers: cfg.headers.map((h: KeyValue) => h.id === id ? { ...h, ...patch } : h) })

  return (
    <div data-testid="kafka-config" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Brokers (comma-separated)</label>
          <input value={cfg.brokers} onChange={e => up({ brokers: e.target.value })}
            placeholder="localhost:9092"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Topic</label>
          <input value={cfg.topic} onChange={e => up({ topic: e.target.value })}
            placeholder="my-topic"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-pk-muted">Mode:</span>
        {(['produce', 'consume'] as const).map(m => (
          <button key={m} onClick={() => up({ mode: m })}
            className={`px-3 py-1 text-xs rounded-lg border capitalize transition-all
              ${cfg.mode === m
                ? 'border-yellow-400/60 text-yellow-400 bg-yellow-400/8'
                : 'border-pk-border text-pk-muted hover:border-pk-accent/40'}`}>
            {m}
          </button>
        ))}
      </div>

      {cfg.mode === 'produce' && (
        <>
          <div>
            <label className="text-xs text-pk-muted mb-2 block">Message</label>
            <div className="rounded-xl overflow-hidden border border-pk-border">
              <Editor height="120px" defaultLanguage="json" value={cfg.message} onChange={v => up({ message: v ?? '' })}
                theme={isDark ? 'vs-dark' : 'vs'}
                options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', scrollBeyondLastLine: false, padding: { top: 8 } }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-pk-muted">Message Headers</label>
              <button onClick={addHeader} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors">+ Add</button>
            </div>
            <div className="flex flex-col gap-1.5">
              {(cfg.headers ?? []).map((h: KeyValue) => (
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
            </div>
          </div>
        </>
      )}

      {cfg.mode === 'consume' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-pk-muted mb-1 block">Consumer Group ID</label>
            <input value={cfg.groupId} onChange={e => up({ groupId: e.target.value })}
              placeholder="piko-consumer"
              className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
          </div>
          <div>
            <label className="text-xs text-pk-muted mb-1 block">Max Messages</label>
            <input type="number" value={cfg.maxMessages} onChange={e => up({ maxMessages: Math.max(1, parseInt(e.target.value) || 10) })}
              min={1} className="w-full px-3 py-1.5 rounded-xl text-xs" />
          </div>
          <div className="col-span-2 flex items-center gap-2 p-3 bg-pk-panel rounded-xl border border-pk-border">
            <input type="checkbox" id="fromBeginning" checked={cfg.fromBeginning} onChange={e => up({ fromBeginning: e.target.checked })} className="accent-pk-accent" />
            <label htmlFor="fromBeginning" className="text-xs text-pk-muted cursor-pointer">Read from beginning</label>
          </div>
        </div>
      )}
    </div>
  )
}
