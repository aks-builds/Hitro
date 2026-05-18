import React from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { SseConfig as SC, KeyValue } from '@shared/types'

const KVEditor = ({ items, onChange }: { items: KeyValue[]; onChange: (v: KeyValue[]) => void }) => {
  const add = () => onChange([...items, { id: crypto.randomUUID(), key: '', value: '', enabled: true }])
  const remove = (id: string) => onChange(items.filter(i => i.id !== id))
  const patch = (id: string, p: Partial<KeyValue>) => onChange(items.map(i => i.id === id ? { ...i, ...p } : i))
  return (
    <div className="flex flex-col gap-1.5">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 p-2 bg-pk-panel rounded-xl border border-pk-border/60">
          <input type="checkbox" checked={item.enabled} onChange={e => patch(item.id, { enabled: e.target.checked })} className="accent-pk-accent" />
          <input value={item.key} onChange={e => patch(item.id, { key: e.target.value })} placeholder="Header"
            className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
          <div className="w-px h-4 bg-pk-border flex-shrink-0" />
          <input value={item.value} onChange={e => patch(item.id, { value: e.target.value })} placeholder="Value"
            className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
          <button onClick={() => remove(item.id)} className="text-pk-faint hover:text-red-400 transition-colors">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors text-left mt-0.5 px-1">+ Add Header</button>
    </div>
  )
}

export default function SseConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as SC
  const up = (p: Partial<SC>) => updateConfig(tab.id, p)

  return (
    <div data-testid="sse-config" className="flex flex-col gap-3">
      <div className="flex items-center gap-3 p-3 bg-pk-panel rounded-xl border border-pk-border">
        <label className="text-xs text-pk-muted w-24">Max events</label>
        <input type="number" value={cfg.maxEvents} onChange={e => up({ maxEvents: Math.min(10000, Math.max(1, Number(e.target.value) || 100)) })}
          min={1} max={10000} className="w-24 px-3 py-1.5 rounded-lg text-xs" />
      </div>
      <div>
        <p className="text-xs text-pk-muted mb-2">Headers</p>
        <KVEditor items={cfg.headers} onChange={v => up({ headers: v })} />
      </div>
      <p className="text-xs text-pk-muted bg-pk-panel px-3 py-2 rounded-xl border border-pk-border">
        SSE events appear in the Events tab as they stream in.
      </p>
    </div>
  )
}
