import React from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { SocketIoConfig as SIC } from '@shared/types'

export default function SocketIoConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as SIC
  const up = (p: Partial<SIC>) => updateConfig(tab.id, p)

  return (
    <div data-testid="socketio-config" className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-pk-muted">URL</label>
          <input value={cfg.url} onChange={e => up({ url: e.target.value })}
            placeholder="http://localhost:3000"
            className="px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div className="flex flex-col gap-1 w-28">
          <label className="text-xs text-pk-muted">Mode</label>
          <select value={cfg.mode} onChange={e => up({ mode: e.target.value as 'emit' | 'listen' })}
            className="px-2 py-1.5 rounded-xl text-xs">
            <option value="emit">Emit</option>
            <option value="listen">Listen</option>
          </select>
        </div>
      </div>

      {cfg.mode === 'emit' ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-pk-muted">Event name</label>
            <input value={cfg.emitEvent} onChange={e => up({ emitEvent: e.target.value })}
              placeholder="message"
              className="px-3 py-1.5 rounded-xl text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-pk-muted">Payload (JSON or string)</label>
            <textarea value={cfg.message} onChange={e => up({ message: e.target.value })}
              rows={4} placeholder='{"key": "value"}'
              className="px-3 py-2 rounded-xl text-xs font-mono resize-none" />
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-pk-muted">Listen for event</label>
            <input value={cfg.listenEvent} onChange={e => up({ listenEvent: e.target.value })}
              placeholder="message"
              className="px-3 py-1.5 rounded-xl text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-xs text-pk-muted">Max events</label>
            <input type="number" value={cfg.maxMessages} onChange={e => up({ maxMessages: Math.max(1, Number(e.target.value) || 1) })}
              min={1} className="px-3 py-1.5 rounded-xl text-xs" />
          </div>
        </div>
      )}
    </div>
  )
}
