import React, { useState, useRef } from 'react'
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
        <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl transition-colors" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}>
          <input type="checkbox" checked={item.enabled} onChange={e => patch(item.id, { enabled: e.target.checked })} className="flex-shrink-0 accent-pk-accent" />
          <input value={item.key} onChange={e => patch(item.id, { key: e.target.value })} placeholder={keyPlaceholder} className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none min-w-0" style={{ color: 'var(--pk-text)' }} />
          <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--pk-border)' }} />
          <input value={item.value} onChange={e => patch(item.id, { value: e.target.value })} placeholder={valPlaceholder} className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none min-w-0" style={{ color: 'var(--pk-text)' }} />
          <button onClick={() => remove(item.id)} className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900/20 transition-colors text-sm" style={{ color: 'var(--pk-faint)' }}>✕</button>
        </div>
      ))}
      <button onClick={add} className="text-xs transition-colors text-left mt-0.5 px-1" style={{ color: 'var(--pk-accent)' }}>+ Add Row</button>
    </div>
  )
}

const BODY_TYPES = ['json', 'xml', 'text', 'urlencoded', 'form', 'none'] as const
const AUTH_TYPES = ['none', 'bearer', 'basic', 'apikey', 'oauth2', 'digest', 'awssigv4', 'mtls'] as const

const OAUTH_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    color: '#4285F4',
    authUrl:  'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope:    'openid email profile',
  },
  {
    id: 'github',
    label: 'GitHub',
    color: '#E6EDF3',
    authUrl:  'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope:    'read:user repo',
  },
  {
    id: 'custom',
    label: 'Custom',
    color: 'var(--pk-muted)',
    authUrl:  '',
    tokenUrl: '',
    scope:    '',
  },
] as const

function ChainEditor({ rules, onChange }: { rules: ChainRule[]; onChange: (r: ChainRule[]) => void }) {
  const add = () => onChange([...rules, { id: crypto.randomUUID(), responseField: '', variableName: '', enabled: true }])
  const remove = (id: string) => onChange(rules.filter(r => r.id !== id))
  const patch = (id: string, p: Partial<ChainRule>) => onChange(rules.map(r => r.id === id ? { ...r, ...p } : r))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs px-3 py-2.5 rounded-xl leading-relaxed" style={{ color: 'var(--pk-muted)', background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
        Chain rules extract values from this response and store them as environment variables for use in subsequent requests.
        <br/><span className="font-mono" style={{ color: 'var(--pk-accent)' }}>body.user.id</span> · <span className="font-mono" style={{ color: 'var(--pk-accent)' }}>header.x-request-id</span> · <span className="font-mono" style={{ color: 'var(--pk-accent)' }}>status</span>
      </p>

      {rules.map(rule => (
        <div key={rule.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border-s)' }}>
          <input type="checkbox" checked={rule.enabled} onChange={e => patch(rule.id, { enabled: e.target.checked })} className="flex-shrink-0 accent-pk-accent" />
          <input value={rule.responseField} onChange={e => patch(rule.id, { responseField: e.target.value })}
            placeholder="body.token" className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none font-mono min-w-0" style={{ color: 'var(--pk-text)' }} />
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--pk-faint)' }}>→</span>
          <input value={rule.variableName} onChange={e => patch(rule.id, { variableName: e.target.value })}
            placeholder="authToken" className="flex-1 px-2 py-1 rounded-lg text-xs bg-transparent border-0 outline-none font-mono min-w-0" style={{ color: 'var(--pk-text)' }} />
          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--pk-faint)' }}>{'{{}}'}</span>
          <button onClick={() => remove(rule.id)} className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900/20 transition-colors text-sm" style={{ color: 'var(--pk-faint)' }}>✕</button>
        </div>
      ))}
      <button onClick={add} className="text-xs transition-colors text-left px-1" style={{ color: 'var(--pk-accent)' }}>+ Add Chain Rule</button>
    </div>
  )
}

export default function RestConfig({ tab }: { tab: Tab }) {
  const { updateConfig, updateRequest } = useAppStore()
  const [subTab, setSubTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'chain' | 'settings'>('params')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [oauthStatus, setOauthStatus]   = useState<'idle' | 'ok' | 'err'>('idle')
  const [oauthMsg, setOauthMsg]         = useState('')
  const cfg = tab.request.config as RC
  const up = (p: object) => updateConfig(tab.id, p)
  const auth = cfg.auth as any
  const chainRules = tab.request.chainRules ?? []
  const isDark = useDarkMode()

  const handleGetToken = async () => {
    const a = auth as { type: 'oauth2'; authUrl?: string; tokenUrl: string; clientId: string; clientSecret?: string; scope?: string }
    if (!a.authUrl || !a.tokenUrl || !a.clientId) {
      setOauthStatus('err')
      setOauthMsg('Fill in Auth URL, Token URL, and Client ID first.')
      return
    }
    setOauthLoading(true); setOauthStatus('idle'); setOauthMsg('')
    try {
      const result = await window.api.oauth2Authorize({
        authUrl: a.authUrl, tokenUrl: a.tokenUrl,
        clientId: a.clientId, clientSecret: a.clientSecret, scope: a.scope,
      })
      up({ auth: { ...auth, accessToken: result.accessToken, grantType: 'pkce' } })
      setOauthStatus('ok')
      setOauthMsg(`Token acquired${result.expiresIn ? ` · expires in ${result.expiresIn}s` : ''}`)
    } catch (err: any) {
      setOauthStatus('err')
      setOauthMsg(err.message ?? 'Authorization failed')
    } finally {
      setOauthLoading(false)
    }
  }

  const browseFile = async (field: 'certPath' | 'keyPath' | 'caPath') => {
    const path = await window.api.openFile({ filters: [{ name: 'PEM / Cert files', extensions: ['pem', 'crt', 'key', 'p12', '*'] }] })
    if (path) up({ auth: { ...auth, [field]: path } })
  }

  return (
    <div data-testid="rest-config">
      <div className="flex gap-0.5 mb-3 flex-wrap" style={{ borderBottom: '1px solid var(--pk-border)' }}>
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
                className="px-3 py-1 text-xs rounded-lg border transition-all"
                style={cfg.bodyType === t
                  ? { borderColor: 'var(--pk-accent)', color: 'var(--pk-accent)', background: 'color-mix(in srgb, var(--pk-accent) 8%, transparent)' }
                  : { borderColor: 'var(--pk-border)', color: 'var(--pk-muted)' }}>
                {t}
              </button>
            ))}
          </div>
          {(cfg.bodyType === 'urlencoded' || cfg.bodyType === 'form') && (
            <KVEditor items={cfg.formFields ?? []} onChange={v => up({ formFields: v })} keyPlaceholder="Field name" valPlaceholder="Value" />
          )}
          {cfg.bodyType !== 'none' && cfg.bodyType !== 'urlencoded' && cfg.bodyType !== 'form' && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--pk-border)' }}>
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
                className="px-3 py-1 text-xs rounded-lg border transition-all"
                style={auth.type === t
                  ? { borderColor: 'var(--pk-accent)', color: 'var(--pk-accent)', background: 'color-mix(in srgb, var(--pk-accent) 8%, transparent)' }
                  : { borderColor: 'var(--pk-border)', color: 'var(--pk-muted)' }}>
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
                    className="px-3 py-1 text-xs rounded-lg border capitalize transition-all"
                    style={(auth.placement ?? 'header') === p
                      ? { borderColor: 'var(--pk-accent)', color: 'var(--pk-accent)', background: 'color-mix(in srgb, var(--pk-accent) 8%, transparent)' }
                      : { borderColor: 'var(--pk-border)', color: 'var(--pk-muted)' }}>
                    Add to {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {auth.type === 'oauth2' && (
            <div className="flex flex-col gap-3">
              {/* Provider quick-select */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--pk-faint)' }}>Provider preset</p>
                <div className="flex gap-2">
                  {OAUTH_PROVIDERS.map(p => {
                    const isActive = auth.grantType === 'pkce'
                      ? auth.authUrl === p.authUrl
                      : auth.authUrl === p.authUrl
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (p.id === 'custom') return  // custom = edit manually
                          up({ auth: { ...auth, authUrl: p.authUrl, tokenUrl: p.tokenUrl, scope: auth.scope || p.scope, grantType: 'pkce' } })
                          setOauthStatus('idle'); setOauthMsg('')
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={isActive && p.id !== 'custom'
                          ? { background: p.color + '15', borderColor: p.color + '60', color: p.color }
                          : { background: 'transparent', borderColor: 'var(--pk-border)', color: 'var(--pk-muted)' }
                        }
                      >
                        {p.id === 'google' && (
                          <svg width="11" height="11" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        )}
                        {p.id === 'github' && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.57C20.57 21.8 24 17.31 24 12c0-6.63-5.37-12-12-12z"/>
                          </svg>
                        )}
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Auth URL (for PKCE / browser flow) */}
              <input value={auth.authUrl ?? ''} onChange={e => up({ auth: { ...auth, authUrl: e.target.value } })}
                placeholder="Authorization URL (e.g. https://accounts.google.com/o/oauth2/v2/auth)"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono" />

              <input value={auth.tokenUrl ?? ''} onChange={e => up({ auth: { ...auth, tokenUrl: e.target.value } })}
                placeholder="Token URL (e.g. https://oauth2.googleapis.com/token)"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono" />

              <div className="flex gap-2">
                <input value={auth.clientId ?? ''} onChange={e => up({ auth: { ...auth, clientId: e.target.value } })}
                  placeholder="Client ID" className="flex-1 px-3 py-2 rounded-xl text-xs" />
                <input type="password" value={auth.clientSecret ?? ''} onChange={e => up({ auth: { ...auth, clientSecret: e.target.value } })}
                  placeholder="Client Secret (optional for PKCE)" className="flex-1 px-3 py-2 rounded-xl text-xs" />
              </div>

              <input value={auth.scope ?? ''} onChange={e => up({ auth: { ...auth, scope: e.target.value } })}
                placeholder="Scope (space-separated)" className="w-full px-3 py-2 rounded-xl text-xs" />

              {/* Get Token / status */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGetToken}
                  disabled={oauthLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    color: 'var(--pk-accent)',
                    opacity: oauthLoading ? 0.6 : 1,
                  }}
                >
                  {oauthLoading ? (
                    <><span className="w-3 h-3 rounded-full border-2 animate-spin-fast" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--pk-accent)' }}/> Authorizing…</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 6.5A6.5 6.5 0 102 9.5"/><path d="M14 2v4.5H9.5"/></svg>Get Token via Browser</>
                  )}
                </button>

                {oauthStatus === 'ok' && (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#3FB950' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="rgba(63,185,80,0.15)" stroke="#3FB950" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="#3FB950" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    {oauthMsg}
                  </span>
                )}
                {oauthStatus === 'err' && (
                  <span className="text-[11px]" style={{ color: '#F85149' }}>{oauthMsg}</span>
                )}
              </div>

              {auth.accessToken && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(63,185,80,0.06)', border: '1px solid rgba(63,185,80,0.2)' }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#3FB950" strokeWidth="1.5" strokeLinecap="round"><circle cx="5" cy="7" r="3"/><path d="M8 4l3-3M9.5 1H11v1.5"/></svg>
                  <span className="text-[11px] font-mono truncate flex-1" style={{ color: '#3FB950' }}>
                    {auth.accessToken.slice(0, 32)}…
                  </span>
                  <button onClick={() => { up({ auth: { ...auth, accessToken: '' } }); setOauthStatus('idle') }}
                    className="text-[10px] flex-shrink-0 transition-colors" style={{ color: 'rgba(63,185,80,0.6)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F85149')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(63,185,80,0.6)')}>Clear</button>
                </div>
              )}

              <p className="text-[11px] px-3 py-2 rounded-xl leading-relaxed" style={{ color: 'var(--pk-muted)', background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
                <strong>Browser flow (PKCE):</strong> Click "Get Token" to open a browser window — Hitro starts a local server to catch the redirect and exchanges the code for a token automatically.<br/>
                <strong>Client Credentials:</strong> Leave Auth URL blank — token is fetched server-to-server on Send.
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
              <p className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--pk-muted)', background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
                Signs each request with AWS Signature Version 4. No extra dependencies — computed with Node.js crypto.
              </p>
            </div>
          )}

          {auth.type === 'mtls' && (
            <div className="flex flex-col gap-2">
              {(['certPath', 'keyPath', 'caPath'] as const).map(field => (
                <div key={field} className="flex gap-2 items-center">
                  <label className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--pk-muted)' }}>
                    {field === 'certPath' ? 'Client Cert' : field === 'keyPath' ? 'Private Key' : 'CA Cert (opt.)'}
                  </label>
                  <input value={auth[field] ?? ''} onChange={e => up({ auth: { ...auth, [field]: e.target.value } })}
                    placeholder={field === 'caPath' ? '/path/to/ca.pem (optional)' : `/path/to/${field === 'certPath' ? 'client.crt' : 'client.key'}`}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono min-w-0" />
                  <button onClick={() => browseFile(field)} className="btn-ghost text-xs py-1.5 flex-shrink-0 px-2">Browse</button>
                </div>
              ))}
              <p className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--pk-muted)', background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
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
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
            <label className="text-xs w-32" style={{ color: 'var(--pk-muted)' }}>Timeout (ms)</label>
            <input type="number" value={cfg.timeout ?? 30000}
              onChange={e => up({ timeout: Math.max(100, Number(e.target.value) || 30000) })}
              className="w-28 px-3 py-1.5 rounded-lg text-xs" min={100} step={1000} />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--pk-panel)', border: '1px solid var(--pk-border)' }}>
            <label className="text-xs w-32" style={{ color: 'var(--pk-muted)' }}>Follow redirects</label>
            <input type="checkbox" checked={cfg.followRedirects !== false}
              onChange={e => up({ followRedirects: e.target.checked })} className="accent-pk-accent" />
          </div>
        </div>
      )}
    </div>
  )
}
