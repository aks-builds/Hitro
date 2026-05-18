import React from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { SqsConfig as SC, KeyValue } from '@shared/types'

export default function SqsConfig({ tab }: { tab: Tab }) {
  const { updateConfig } = useAppStore()
  const cfg = tab.request.config as SC
  const up = (p: object) => updateConfig(tab.id, p)

  const addAttr = () => up({ attributes: [...cfg.attributes, { id: crypto.randomUUID(), key: '', value: '', enabled: true }] })
  const removeAttr = (id: string) => up({ attributes: cfg.attributes.filter((a: KeyValue) => a.id !== id) })
  const patchAttr = (id: string, patch: Partial<KeyValue>) => up({ attributes: cfg.attributes.map((a: KeyValue) => a.id === id ? { ...a, ...patch } : a) })

  return (
    <div data-testid="sqs-config" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-pk-muted mb-1 block">AWS Region</label>
          <input value={cfg.region} onChange={e => up({ region: e.target.value })}
            placeholder="us-east-1"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Queue URL</label>
          <input value={cfg.queueUrl} onChange={e => up({ queueUrl: e.target.value })}
            placeholder="https://sqs.us-east-1.amazonaws.com/…"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Access Key ID</label>
          <input value={cfg.accessKeyId} onChange={e => up({ accessKeyId: e.target.value })}
            placeholder="AKIAIOSFODNN7EXAMPLE"
            className="w-full px-3 py-1.5 rounded-xl text-xs font-mono" />
        </div>
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Secret Access Key</label>
          <input type="password" value={cfg.secretAccessKey} onChange={e => up({ secretAccessKey: e.target.value })}
            placeholder="••••••••"
            className="w-full px-3 py-1.5 rounded-xl text-xs" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-pk-muted">Mode:</span>
        {(['send', 'receive'] as const).map(m => (
          <button key={m} onClick={() => up({ mode: m })}
            className={`px-3 py-1 text-xs rounded-lg border capitalize transition-all
              ${cfg.mode === m
                ? 'border-orange-400/60 text-orange-400 bg-orange-400/8'
                : 'border-pk-border text-pk-muted hover:border-pk-accent/40'}`}>
            {m}
          </button>
        ))}
      </div>

      {cfg.mode === 'send' && (
        <>
          <div>
            <label className="text-xs text-pk-muted mb-1 block">Message Body</label>
            <textarea value={cfg.message} onChange={e => up({ message: e.target.value })}
              placeholder='{"event": "order.created", "orderId": "123"}'
              rows={4}
              className="w-full px-3 py-2 rounded-xl text-xs font-mono resize-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-pk-muted">Message Attributes</label>
              <button onClick={addAttr} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors">+ Add</button>
            </div>
            <div className="flex flex-col gap-1.5">
              {cfg.attributes.map((a: KeyValue) => (
                <div key={a.id} className="flex items-center gap-2 p-2 bg-pk-panel rounded-xl border border-pk-border/60">
                  <input type="checkbox" checked={a.enabled} onChange={e => patchAttr(a.id, { enabled: e.target.checked })} className="accent-pk-accent" />
                  <input value={a.key} onChange={e => patchAttr(a.id, { key: e.target.value })} placeholder="Attribute name"
                    className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
                  <div className="w-px h-4 bg-pk-border flex-shrink-0" />
                  <input value={a.value} onChange={e => patchAttr(a.id, { value: e.target.value })} placeholder="String value"
                    className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none" />
                  <button onClick={() => removeAttr(a.id)} className="text-pk-faint hover:text-red-400 transition-colors">✕</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {cfg.mode === 'receive' && (
        <div>
          <label className="text-xs text-pk-muted mb-1 block">Max Messages (1–10)</label>
          <input type="number" min={1} max={10} value={cfg.maxMessages}
            onChange={e => up({ maxMessages: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
            className="w-32 px-3 py-1.5 rounded-xl text-xs" />
        </div>
      )}
    </div>
  )
}
