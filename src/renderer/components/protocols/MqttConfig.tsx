import React from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { MqttConfig as MC } from '@shared/types'

export default function MqttConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as MC
  const up = (p: Partial<MC>) => updateConfig(tab.id, p)

  return (
    <div data-testid="mqtt-config" className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-pk-muted">Broker URL</label>
          <input value={cfg.brokerUrl} onChange={e => up({ brokerUrl: e.target.value })}
            placeholder="mqtt://localhost:1883"
            className="px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div className="flex flex-col gap-1 w-28">
          <label className="text-xs text-pk-muted">Mode</label>
          <select value={cfg.mode} onChange={e => up({ mode: e.target.value as 'publish' | 'subscribe' })}
            className="px-2 py-1.5 rounded-xl text-xs">
            <option value="publish">Publish</option>
            <option value="subscribe">Subscribe</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-pk-muted">Topic</label>
          <input value={cfg.topic} onChange={e => up({ topic: e.target.value })}
            placeholder="my/topic"
            className="px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div className="flex flex-col gap-1 w-20">
          <label className="text-xs text-pk-muted">QoS</label>
          <select value={cfg.qos} onChange={e => up({ qos: Number(e.target.value) as 0 | 1 | 2 })}
            className="px-2 py-1.5 rounded-xl text-xs">
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
        {cfg.mode === 'subscribe' && (
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-pk-muted">Max msgs</label>
            <input type="number" value={cfg.maxMessages} onChange={e => up({ maxMessages: Math.max(1, Number(e.target.value) || 1) })}
              min={1} className="px-3 py-1.5 rounded-xl text-xs" />
          </div>
        )}
      </div>

      {cfg.mode === 'publish' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-pk-muted">Message</label>
            <label className="flex items-center gap-1.5 text-xs text-pk-muted cursor-pointer">
              <input type="checkbox" checked={cfg.retain} onChange={e => up({ retain: e.target.checked })} className="accent-pk-accent" />
              Retain
            </label>
          </div>
          <textarea value={cfg.message} onChange={e => up({ message: e.target.value })}
            rows={4} placeholder="Message payload"
            className="px-3 py-2 rounded-xl text-xs font-mono resize-none" />
        </div>
      )}

      <details className="text-xs">
        <summary className="text-pk-muted cursor-pointer select-none py-1 hover:text-pk-text transition-colors">Auth &amp; Advanced</summary>
        <div className="flex flex-col gap-2 mt-3">
          <input value={cfg.clientId} onChange={e => up({ clientId: e.target.value })}
            placeholder="Client ID (auto-generated if empty)"
            className="px-3 py-1.5 rounded-xl text-xs font-mono" />
          <div className="flex gap-2">
            <input value={cfg.username} onChange={e => up({ username: e.target.value })}
              placeholder="Username" className="flex-1 px-3 py-1.5 rounded-xl text-xs" />
            <input type="password" value={cfg.password} onChange={e => up({ password: e.target.value })}
              placeholder="Password" className="flex-1 px-3 py-1.5 rounded-xl text-xs" />
          </div>
        </div>
      </details>
    </div>
  )
}
