import React, { useState } from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { WebSocketConfig as WC, KeyValue } from '@shared/types'

export default function WebSocketConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as WC
  const up = (p: object) => updateConfig(tab.id, p)
  const [msg, setMsg] = useState('')

  const sendMsg = async () => {
    if (!msg.trim()) return
    await window.api.wsSend(tab.id, msg)
    useAppStore.getState().addStreamEvent(tab.id, { id: crypto.randomUUID(), type: 'sent', data: msg, timestamp: Date.now() })
    setMsg('')
  }

  const addHeader = () => up({ headers: [...cfg.headers, { id: crypto.randomUUID(), key: '', value: '', enabled: true }] })
  const removeHeader = (id: string) => up({ headers: cfg.headers.filter((h: KeyValue) => h.id !== id) })
  const patchHeader = (id: string, patch: Partial<KeyValue>) => up({ headers: cfg.headers.map((h: KeyValue) => h.id === id ? { ...h, ...patch } : h) })

  return (
    <div data-testid="websocket-config" className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-pk-panel rounded-xl border border-pk-border text-xs">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tab.wsConnected ? 'bg-green-400' : 'bg-pk-border'}`} />
        <span className="text-pk-muted">Connection:</span>
        <span className={`font-semibold ${tab.wsConnected ? 'text-green-400' : 'text-pk-muted'}`}>
          {tab.wsConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-pk-muted">Headers</label>
          <button onClick={addHeader} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors">+ Add</button>
        </div>
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
        </div>
      </div>

      {tab.wsConnected && (
        <div>
          <label className="text-xs text-pk-muted mb-2 block">Send Message</label>
          <div className="flex gap-2">
            <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder='{"event": "ping"}'
              className="flex-1 px-3 py-1.5 rounded-xl text-xs font-mono" />
            <button onClick={sendMsg} className="btn-primary px-4 py-1.5 text-xs">Send</button>
          </div>
        </div>
      )}
    </div>
  )
}
