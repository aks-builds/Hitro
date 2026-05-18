import React, { useState } from 'react'
import { useAppStore, Tab } from '../../store/appStore'
import { KeyValue, RestConfig as RC, AuthConfig, ChainRule } from '@shared/types'
import Editor from '@monaco-editor/react'
import { useDarkMode } from '../../hooks/useTheme'

const KVEditor = ({ items, onChange, keyPlaceholder = 'Key', valPlaceholder = 'Value' }: {
  items: KeyValue[]
  onChange: (v: KeyValue[]) => void
  keyPlaceholder?: string
  valPlaceholder?: string
}) => {
  const add = () => onChange([...items, { id: crypto.randomUUID(), key: '', value: '', enabled: true }])
  const remove = (id: string) => onChange(items.filter(i => i.id !== id))
  const patch = (id: string, p: Partial<KeyValue>) => onChange(items.map(i => i.id === id ? { ...i, ...p } : i))
  return (
    <div className="flex flex-col gap-1.5">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 p-2 bg-pk-panel rounded-xl border border-pk-border/60 hover:border-pk-border transition-colors">
          <input type="checkbox" checked={item.enabled} onChange={e => patch(item.id, { enabled: e.target.checked })} className="flex-shrink-0 accent-pk-accent" />
          <input value={item.key} onChange={e => patch(item.id, { key: e.target.value })} placeholder={keyPlaceholder} className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none text-pk-text placeholder:text-pk-faint min-w-0" />
          <div className="w-px h-4 bg-pk-border flex-shrink-0" />
          <input value={item.value} onChange={e => patch(item.id, { value: e.target.value })} placeholder={valPlaceholder} className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none text-pk-text placeholder:text-pk-faint min-w-0" />
          <button onClick={() => remove(item.id)} className="text-pk-faint hover:text-red-400 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900/20 transition-colors text-sm">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors text-left mt-0.5 px-1">+ Add Row</button>
    </div>
  )
}

const BODY_TYPES = ['json', 'xml', 'text', 'urlencoded', 'form', 'none'] as const
const AUTH_TYPES = ['none', 'bearer', 'basic', 'apikey', 'oauth2', 'digest', 'awssigv4', 'mtls'] as const

function ChainEditor({ rules, onChange }: { rules: ChainRule[]; onChange: (r: ChainRule[]) => void }) {
  const add = () => onChange([...rules, { id: crypto.randomUUID(), responseField: '', variableName: '', enabled: true }])
  const remove = (id: string) => onChange(rules.filter(r => r.id !== id))
  const patch = (id: string, p: Partial<ChainRule>) => onChange(rules.map(r => r.id === id ? { ...r, ...p } : r))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-pk-muted bg-pk-panel px-3 py-2.5 rounded-xl border border-pk-border leading-relaxed">
        Chain rules extract values from this response and store them as environment variables for use in subsequent requests.
        <br/><span className="font-mono text-pk-accent/80">body.user.id</span> · <span className="font-mono text-pk-accent/80">header.x-request-id</span> · <span className="font-mono text-pk-accent/80">status</span>
      </p>

      {rules.map(rule => (
        <div key={rule.id} className="flex items-center gap-2 p-2 bg-pk-panel rounded-xl border border-pk-border/60">
          <input type="checkbox" checked={rule.enabled} onChange={e => patch(rule.id, { enabled: e.target.checked })} className="flex-shrink-0 accent-pk-accent" />
          <input value={rule.responseField} onChange={e => patch(rule.id, { responseField: e.target.value })}
            placeholder="body.token" className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none text-pk-text placeholder:text-pk-faint font-mono min-w-0" />
          <span className="text-pk-faint text-xs flex-shrink-0">→</span>
          <input value={rule.variableName} onChange={e => patch(rule.id, { variableName: e.target.value })}
            placeholder="authToken" className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none text-pk-text placeholder:text-pk-faint font-mono min-w-0" />
          <span className="text-pk-faint text-[10px] flex-shrink-0">{'{{}}'}</span>
          <button onClick={() => remove(rule.id)} className="text-pk-faint hover:text-red-400 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900/20 transition-colors text-sm">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-xs text-pk-accent hover:text-pk-accent-h transition-colors text-left px-1">+ Add Chain Rule</button>
    </div>
  )
}

export default function RestConfig({ tab }: { tab: Tab }) {
  const { updateConfig, updateRequest } = useAppStore()
  const [subTab, setSubTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'chain' | 'settings'>('params')
  const cfg = tab.request.config as RC
  const up = (p: object) => updateConfig(tab.id, p)
  const auth = cfg.auth as any
  const chainRules = tab.request.chainRules ?? []
  const isDark = useDarkMode()

  const browseFile = async (field: 'certPath' | 'keyPath' | 'caPath') => {
    const path = await window.api.openFile({ filters: [{ name: 'PEM / Cert files', extensions: ['pem', 'crt', 'key', 'p12', '*'] }] })
    if (path) up({ auth: { ...auth, [field]: path } })
  }

  return (
    <div data-testid="rest-config">
      <div className="flex gap-0.5 border-b border-pk-border mb-3 flex-wrap">
        {(['params', 'headers', 'body', 'auth', 'chain', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-3 py-1.5 capitalize text-xs ${subTab === t ? 'tab-active' : 'tab-inactive'}`}>
            {t === 'chain' ? `Chain${chainRules.filter(r => r.enabled).length ? ` (${chainRules.filter(r => r.enabled).length})` : ''}` : t}
          </button>
        ))}
      </div>

      {subTab === 'params' && <KVEditor items={cfg.params} onChange={v => up({ params: v })} />}
      {subTab === 'headers' && <KVEditor items={cfg.headers} onChange={v => up({ headers: v })} />}

      {subTab === 'body' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {BODY_TYPES.map(t => (
              <button key={t} onClick={() => up({ bodyType: t })}
                className={`px-3 py-1 text-xs rounded-lg border transition-all
                  ${cfg.bodyType === t
                    ? 'border-pk-accent text-pk-accent bg-pk-accent/8'
                    : 'border-pk-border text-pk-muted hover:border-pk-accent/40 hover:text-pk-text'}`}>
                {t}
              </button>
            ))}
          </div>
          {(cfg.bodyType === 'urlencoded' || cfg.bodyType === 'form') && (
            <KVEditor items={cfg.formFields ?? []} onChange={v => up({ formFields: v })} keyPlaceholder="Field name" valPlaceholder="Value" />
          )}
          {cfg.bodyType !== 'none' && cfg.bodyType !== 'urlencoded' && cfg.bodyType !== 'form' && (
            <div className="rounded-xl overflow-hidden border border-pk-border">
              <Editor
                height="200px"
                defaultLanguage={cfg.bodyType === 'json' ? 'json' : cfg.bodyType === 'xml' ? 'xml' : 'plaintext'}
                value={cfg.body}
                onChange={v => up({ body: v ?? '' })}
                theme={isDark ? 'vs-dark' : 'vs'}
                beforeMount={monaco => {
                  // Disable JSON validation so {{varName}} tokens don't show as syntax errors
                  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ validate: false, allowComments: true })
                }}
                options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', scrollBeyondLastLine: false, padding: { top: 8 } }}
              />
            </div>
          )}
        </div>
      )}

      {subTab === 'auth' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {AUTH_TYPES.map(t => (
              <button key={t} onClick={() => up({ auth: { type: t } })}
                className={`px-3 py-1 text-xs rounded-lg border transition-all
                  ${auth.type === t
                    ? 'border-pk-accent text-pk-accent bg-pk-accent/8'
                    : 'border-pk-border text-pk-muted hover:border-pk-accent/40'}`}>
                {t === 'apikey' ? 'API Key' : t === 'oauth2' ? 'OAuth 2.0' : t === 'awssigv4' ? 'AWS SigV4' : t === 'mtls' ? 'mTLS' : t}
              </button>
            ))}
          </div>

          {auth.type === 'bearer' && (
            <input value={auth.token ?? ''} onChange={e => up({ auth: { type: 'bearer', token: e.target.value } })}
              placeholder="Bearer token"
              className="px-3 py-2 rounded-xl text-xs w-full font-mono" />
          )}

          {(auth.type === 'basic' || auth.type === 'digest') && (
            <div className="flex gap-2">
              <input value={auth.username ?? ''} onChange={e => up({ auth: { ...auth, username: e.target.value } })}
                placeholder="Username" className="flex-1 px-3 py-2 rounded-xl text-xs" />
              <input type="password" value={auth.password ?? ''} onChange={e => up({ auth: { ...auth, password: e.target.value } })}
                placeholder="Password" className="flex-1 px-3 py-2 rounded-xl text-xs" />
            </div>
          )}

          {auth.type === 'apikey' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input value={auth.key ?? ''} onChange={e => up({ auth: { ...auth, key: e.target.value } })}
                  placeholder="Key name (e.g. X-API-Key)" className="flex-1 px-3 py-2 rounded-xl text-xs" />
                <input value={auth.value ?? ''} onChange={e => up({ auth: { ...auth, value: e.target.value } })}
                  placeholder="Key value" className="flex-1 px-3 py-2 rounded-xl text-xs" />
              </div>
              <div className="flex gap-1.5">
                {(['header', 'query'] as const).map(p => (
                  <button key={p} onClick={() => up({ auth: { ...auth, placement: p } })}
                    className={`px-3 py-1 text-xs rounded-lg border capitalize transition-all
                      ${(auth.placement ?? 'header') === p
                        ? 'border-pk-accent text-pk-accent bg-pk-accent/8'
                        : 'border-pk-border text-pk-muted hover:border-pk-accent/40'}`}>
                    Add to {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {auth.type === 'oauth2' && (
            <div className="flex flex-col gap-2">
              <input value={auth.tokenUrl ?? ''} onChange={e => up({ auth: { ...auth, tokenUrl: e.target.value } })}
                placeholder="Token URL (e.g. https://auth.example.com/token)"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono" />
              <div className="flex gap-2">
                <input value={auth.clientId ?? ''} onChange={e => up({ auth: { ...auth, clientId: e.target.value } })}
                  placeholder="Client ID" className="flex-1 px-3 py-2 rounded-xl text-xs" />
                <input type="password" value={auth.clientSecret ?? ''} onChange={e => up({ auth: { ...auth, clientSecret: e.target.value } })}
                  placeholder="Client Secret" className="flex-1 px-3 py-2 rounded-xl text-xs" />
              </div>
              <input value={auth.scope ?? ''} onChange={e => up({ auth: { ...auth, scope: e.target.value } })}
                placeholder="Scope (optional, space-separated)" className="w-full px-3 py-2 rounded-xl text-xs" />
              <p className="text-xs text-pk-muted bg-pk-panel px-3 py-2 rounded-xl border border-pk-border">
                Token fetched automatically via Client Credentials grant on Send.
              </p>
            </div>
          )}

          {auth.type === 'awssigv4' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input value={auth.accessKeyId ?? ''} onChange={e => up({ auth: { ...auth, accessKeyId: e.target.value } })}
                  placeholder="Access Key ID" className="flex-1 px-3 py-2 rounded-xl text-xs font-mono" />
                <input type="password" value={auth.secretAccessKey ?? ''} onChange={e => up({ auth: { ...auth, secretAccessKey: e.target.value } })}
                  placeholder="Secret Access Key" className="flex-1 px-3 py-2 rounded-xl text-xs font-mono" />
              </div>
              <div className="flex gap-2">
                <input value={auth.region ?? ''} onChange={e => up({ auth: { ...auth, region: e.target.value } })}
                  placeholder="Region (e.g. us-east-1)" className="flex-1 px-3 py-2 rounded-xl text-xs" />
                <input value={auth.service ?? ''} onChange={e => up({ auth: { ...auth, service: e.target.value } })}
                  placeholder="Service (e.g. execute-api)" className="flex-1 px-3 py-2 rounded-xl text-xs" />
              </div>
              <input value={auth.sessionToken ?? ''} onChange={e => up({ auth: { ...auth, sessionToken: e.target.value } })}
                placeholder="Session token (optional — for temporary credentials)" className="w-full px-3 py-2 rounded-xl text-xs font-mono" />
              <p className="text-xs text-pk-muted bg-pk-panel px-3 py-2 rounded-xl border border-pk-border">
                Signs each request with AWS Signature Version 4. No extra dependencies — computed with Node.js crypto.
              </p>
            </div>
          )}

          {auth.type === 'mtls' && (
            <div className="flex flex-col gap-2">
              {(['certPath', 'keyPath', 'caPath'] as const).map(field => (
                <div key={field} className="flex gap-2 items-center">
                  <label className="text-xs text-pk-muted w-24 flex-shrink-0">
                    {field === 'certPath' ? 'Client Cert' : field === 'keyPath' ? 'Private Key' : 'CA Cert (opt.)'}
                  </label>
                  <input value={auth[field] ?? ''} onChange={e => up({ auth: { ...auth, [field]: e.target.value } })}
                    placeholder={field === 'caPath' ? '/path/to/ca.pem (optional)' : `/path/to/${field === 'certPath' ? 'client.crt' : 'client.key'}`}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono min-w-0" />
                  <button onClick={() => browseFile(field)} className="btn-ghost text-xs py-1.5 flex-shrink-0 px-2">Browse</button>
                </div>
              ))}
              <p className="text-xs text-pk-muted bg-pk-panel px-3 py-2 rounded-xl border border-pk-border">
                Mutual TLS — the client presents its certificate to the server for two-way authentication.
              </p>
            </div>
          )}
        </div>
      )}

      {subTab === 'chain' && (
        <ChainEditor
          rules={chainRules}
          onChange={rules => updateRequest(tab.id, { chainRules: rules })}
        />
      )}

      {subTab === 'settings' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 bg-pk-panel rounded-xl border border-pk-border">
            <label className="text-xs text-pk-muted w-32">Timeout (ms)</label>
            <input type="number" value={cfg.timeout ?? 30000}
              onChange={e => up({ timeout: Math.max(100, Number(e.target.value) || 30000) })}
              className="w-28 px-3 py-1.5 rounded-lg text-xs" min={100} step={1000} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-pk-panel rounded-xl border border-pk-border">
            <label className="text-xs text-pk-muted w-32">Follow redirects</label>
            <input type="checkbox" checked={cfg.followRedirects !== false}
              onChange={e => up({ followRedirects: e.target.checked })} className="accent-pk-accent" />
          </div>
        </div>
      )}
    </div>
  )
}
