import axios, { AxiosRequestConfig } from 'axios'
import crypto from 'crypto'
import https from 'https'
import fs from 'fs'
import { RestConfig, Assertion, PikoResponse, AuthConfig } from '../../shared/types'
import { runAssertions } from '../../shared/assertions'

async function fetchOAuthToken(auth: Extract<AuthConfig, { type: 'oauth2' }>): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    ...(auth.scope ? { scope: auth.scope } : {}),
  })
  const res = await axios.post(auth.tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    validateStatus: () => true,
    timeout: 15000,
  })
  if (!res.data?.access_token) throw new Error(`OAuth token fetch failed: ${JSON.stringify(res.data)}`)
  return res.data.access_token
}

// ── AWS SigV4 signing (pure crypto, no SDK dependency) ────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest()
}

function signSigV4(
  method: string,
  urlStr: string,
  headers: Record<string, string>,
  body: string,
  auth: Extract<AuthConfig, { type: 'awssigv4' }>,
): Record<string, string> {
  const url = new URL(urlStr)
  const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const date = datetime.slice(0, 8)

  const sigHeaders: Record<string, string> = {
    ...headers,
    host: url.host,
    'x-amz-date': datetime,
  }
  if (auth.sessionToken) sigHeaders['x-amz-security-token'] = auth.sessionToken

  const sortedKeys = Object.keys(sigHeaders).map(k => k.toLowerCase()).sort()
  const canonicalHeaders = sortedKeys.map(k => {
    const val = sigHeaders[k] ?? sigHeaders[sortedKeys.find(sk => sk === k) ?? ''] ?? ''
    return `${k}:${String(val).trim()}\n`
  }).join('')
  const signedHeaders = sortedKeys.join(';')

  const sortedQuery = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
  const canonicalQS = sortedQuery.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')

  const payloadHash = crypto.createHash('sha256').update(body || '').digest('hex')
  const canonicalRequest = [method.toUpperCase(), url.pathname || '/', canonicalQS, canonicalHeaders, signedHeaders, payloadHash].join('\n')

  const credentialScope = `${date}/${auth.region}/${auth.service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256', datetime, credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${auth.secretAccessKey}`, date), auth.region), auth.service), 'aws4_request')
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex')

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${auth.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-date': datetime,
    ...(auth.sessionToken ? { 'x-amz-security-token': auth.sessionToken } : {}),
  }
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeRest(config: RestConfig, assertions: Assertion[]): Promise<PikoResponse> {
  const start = Date.now()

  const params: Record<string, string> = {}
  config.params.filter(p => p.enabled && p.key).forEach(p => { params[p.key] = p.value })

  const headers: Record<string, string> = {}
  config.headers.filter(h => h.enabled && h.key).forEach(h => { headers[h.key] = h.value })

  const auth = config.auth
  let httpsAgent: https.Agent | undefined

  try {
    if (auth.type === 'bearer' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`
    } else if (auth.type === 'basic') {
      headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password ?? ''}`).toString('base64')}`
    } else if (auth.type === 'apikey') {
      if (auth.placement === 'header') headers[auth.key] = auth.value
      else params[auth.key] = auth.value
    } else if (auth.type === 'oauth2') {
      // PKCE flow: accessToken already stored by browser flow; fallback to client-credentials
      const token = auth.accessToken || await fetchOAuthToken(auth)
      headers['Authorization'] = `Bearer ${token}`
    } else if (auth.type === 'awssigv4') {
      // build a temporary URL with params so SigV4 signs the full request
      let sigUrl = config.url
      const pEntries = Object.entries(params)
      if (pEntries.length) sigUrl += (sigUrl.includes('?') ? '&' : '?') + pEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      const bodyStr = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method) && config.body ? config.body : ''
      const sigHeaders = signSigV4(config.method, sigUrl, headers, bodyStr, auth)
      Object.assign(headers, sigHeaders)
    } else if (auth.type === 'mtls') {
      try {
        httpsAgent = new https.Agent({
          cert: fs.readFileSync(auth.certPath),
          key: fs.readFileSync(auth.keyPath),
          ...(auth.caPath ? { ca: fs.readFileSync(auth.caPath) } : {}),
        })
      } catch (e: any) {
        return { error: `mTLS cert load failed: ${e.message}`, duration: Date.now() - start, timestamp: Date.now() }
      }
    }
  } catch (err: any) {
    return { error: `Auth error: ${err.message}`, duration: Date.now() - start, timestamp: Date.now() }
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let data: any = undefined
  const methodHasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)

  if (methodHasBody && config.bodyType !== 'none') {
    switch (config.bodyType) {
      case 'json':
        headers['Content-Type'] = 'application/json'
        data = config.body
        break
      case 'xml':
        headers['Content-Type'] = 'application/xml'
        data = config.body
        break
      case 'text':
        headers['Content-Type'] = 'text/plain'
        data = config.body
        break
      case 'urlencoded': {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        const usp = new URLSearchParams()
        ;(config.formFields ?? []).filter(f => f.enabled && f.key).forEach(f => usp.append(f.key, f.value))
        data = usp.toString()
        break
      }
      case 'form': {
        const fd = new FormData()
        ;(config.formFields ?? []).filter(f => f.enabled && f.key).forEach(f => fd.append(f.key, f.value))
        data = fd
        break
      }
      default:
        data = config.body
    }
  }

  try {
    const axiosCfg: AxiosRequestConfig = {
      method: config.method,
      url: config.url,
      params,
      headers,
      data,
      validateStatus: () => true,
      timeout: config.timeout ?? 30000,
      maxRedirects: config.followRedirects === false ? 0 : 21,
      ...(httpsAgent ? { httpsAgent } : {}),
    }
    const res = await axios(axiosCfg)
    const duration = Date.now() - start

    const responseHeaders: Record<string, string> = {}
    Object.entries(res.headers).forEach(([k, v]) => { responseHeaders[k.toLowerCase()] = String(v) })

    const rawBody = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data ?? '')

    // Digest auth: server issues a 401 challenge; compute proper MD5 response and retry once
    if (res.status === 401 && auth.type === 'digest') {
      const wwwAuth = String(responseHeaders['www-authenticate'] ?? '')
      if (wwwAuth.startsWith('Digest ')) {
        const getParam = (field: string) => wwwAuth.match(new RegExp(`${field}="([^"]*)"`))?.[1]
        const realm  = getParam('realm') ?? ''
        const nonce  = getParam('nonce') ?? ''
        const opaque = getParam('opaque')
        const qop    = getParam('qop')
        const uri    = (() => { try { const u = new URL(config.url); return u.pathname + (u.search || '') } catch { return config.url } })()
        const ha1 = crypto.createHash('md5').update(`${auth.username}:${realm}:${auth.password}`).digest('hex')
        const ha2 = crypto.createHash('md5').update(`${config.method.toUpperCase()}:${uri}`).digest('hex')
        let digestResponse: string
        let nc: string | undefined
        let cnonce: string | undefined
        if (qop === 'auth') {
          nc = '00000001'
          cnonce = crypto.randomBytes(8).toString('hex')
          digestResponse = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`).digest('hex')
        } else {
          digestResponse = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex')
        }
        let digestHeader = `Digest username="${auth.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${digestResponse}"`
        if (qop)    digestHeader += `, qop=auth, nc=${nc}, cnonce="${cnonce}"`
        if (opaque) digestHeader += `, opaque="${opaque}"`
        const retryRes = await axios({ ...axiosCfg, headers: { ...headers, Authorization: digestHeader } })
        const retryDuration = Date.now() - start
        const retryRespHeaders: Record<string, string> = {}
        Object.entries(retryRes.headers).forEach(([k, v]) => { retryRespHeaders[k.toLowerCase()] = String(v) })
        const retryRawBody = typeof retryRes.data === 'object' ? JSON.stringify(retryRes.data, null, 2) : String(retryRes.data ?? '')
        return {
          status: retryRes.status, statusText: retryRes.statusText,
          headers: retryRespHeaders, body: retryRes.data, rawBody: retryRawBody,
          duration: retryDuration, size: Buffer.byteLength(retryRawBody, 'utf8'), timestamp: Date.now(),
          assertionResults: runAssertions(assertions, { status: retryRes.status, headers: retryRespHeaders, body: retryRes.data, duration: retryDuration }),
        }
      }
    }

    const contentLength = responseHeaders['content-length']
    const size = contentLength ? parseInt(contentLength, 10) : Buffer.byteLength(rawBody, 'utf8')
    return {
      status: res.status, statusText: res.statusText,
      headers: responseHeaders, body: res.data, rawBody,
      duration, size, timestamp: Date.now(),
      assertionResults: runAssertions(assertions, { status: res.status, headers: responseHeaders, body: res.data, duration }),
    }
  } catch (err: any) {
    return { error: err.message, duration: Date.now() - start, timestamp: Date.now() }
  }
}
