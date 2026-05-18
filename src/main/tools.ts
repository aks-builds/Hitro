import crypto from 'crypto'
import { PikoRequest, Collection, Environment, RestConfig, GraphqlConfig, KeyValue, HttpMethod, defaultConfig, CollectionFolder } from '../shared/types'

// ── cURL generation ───────────────────────────────────────────────────────────

export function toCurl(req: PikoRequest): string {
  if (req.protocol !== 'rest') return `# cURL export only supported for REST requests`
  const cfg = req.config as RestConfig
  const parts: string[] = [`curl -X ${cfg.method}`]

  cfg.headers.filter(h => h.enabled && h.key).forEach(h => {
    parts.push(`  -H '${h.key}: ${h.value}'`)
  })

  const auth = cfg.auth
  if (auth.type === 'bearer') parts.push(`  -H 'Authorization: Bearer ${auth.token}'`)
  else if (auth.type === 'basic') parts.push(`  -H 'Authorization: Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}'`)
  else if (auth.type === 'apikey' && auth.placement === 'header') parts.push(`  -H '${auth.key}: ${auth.value}'`)

  let url = cfg.url
  const enabledParams = cfg.params.filter(p => p.enabled && p.key)
  if (auth.type === 'apikey' && auth.placement === 'query') enabledParams.push({ id: '', key: auth.key, value: auth.value, enabled: true })
  if (enabledParams.length) {
    const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
    url += (url.includes('?') ? '&' : '?') + qs
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method) && cfg.bodyType !== 'none') {
    if (cfg.bodyType === 'urlencoded') {
      const fields = (cfg.formFields ?? []).filter(f => f.enabled && f.key).map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`).join('&')
      if (fields) parts.push(`  -d '${fields}'`)
    } else if (cfg.bodyType === 'form') {
      ;(cfg.formFields ?? []).filter(f => f.enabled && f.key).forEach(f => parts.push(`  -F '${f.key}=${f.value}'`))
    } else if (cfg.body) {
      parts.push(`  -d '${cfg.body.replace(/'/g, "'\\''")}'`)
    }
  }

  parts.push(`  '${url}'`)
  return parts.join(' \\\n')
}

// ── Code generation ───────────────────────────────────────────────────────────

export type CodeLang = 'curl' | 'js-fetch' | 'python' | 'node-axios' | 'php'

export function generateCode(req: PikoRequest, lang: CodeLang): string {
  if (req.protocol !== 'rest') return `# Code generation only supported for REST requests`
  const cfg = req.config as RestConfig

  const allHeaders: Record<string, string> = {}
  cfg.headers.filter(h => h.enabled && h.key).forEach(h => { allHeaders[h.key] = h.value })
  const auth = cfg.auth
  if (auth.type === 'bearer') allHeaders['Authorization'] = `Bearer ${auth.token}`
  else if (auth.type === 'basic') allHeaders['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
  else if (auth.type === 'apikey' && auth.placement === 'header') allHeaders[auth.key] = auth.value

  let url = cfg.url
  const enabledParams = cfg.params.filter(p => p.enabled && p.key)
  if (auth.type === 'apikey' && auth.placement === 'query') enabledParams.push({ id: '', key: auth.key, value: auth.value, enabled: true })
  if (enabledParams.length) {
    const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
    url += (url.includes('?') ? '&' : '?') + qs
  }

  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method) && cfg.bodyType !== 'none'
  const body = hasBody ? cfg.body : undefined

  switch (lang) {
    case 'curl': return toCurl(req)

    case 'js-fetch': {
      const hdrs = JSON.stringify(allHeaders, null, 2)
      return [
        `const response = await fetch('${url}', {`,
        `  method: '${cfg.method}',`,
        `  headers: ${hdrs},`,
        hasBody && body ? `  body: ${cfg.bodyType === 'json' ? body : `'${body}'`},` : null,
        `})`,
        `const data = await response.json()`,
        `console.log(data)`,
      ].filter(Boolean).join('\n')
    }

    case 'python': {
      const pyDictEntries = Object.entries(allHeaders).map(([k, v]) => `    "${k}": "${v}"`).join(',\n')
      const pyDict = pyDictEntries ? `{\n${pyDictEntries}\n}` : '{}'
      return [
        `import requests`,
        ``,
        `headers = ${pyDict}`,
        hasBody ? `body = ${cfg.bodyType === 'json' ? body : `"${body}"`}` : null,
        ``,
        `response = requests.${cfg.method.toLowerCase()}(`,
        `    '${url}',`,
        `    headers=headers,`,
        hasBody ? `    ${cfg.bodyType === 'json' ? 'json=body' : 'data=body'},` : null,
        `)`,
        `print(response.json())`,
      ].filter(Boolean).join('\n')
    }

    case 'node-axios': {
      const hdrs = JSON.stringify(allHeaders, null, 2)
      return [
        `const axios = require('axios')`,
        ``,
        `const response = await axios({`,
        `  method: '${cfg.method.toLowerCase()}',`,
        `  url: '${url}',`,
        `  headers: ${hdrs},`,
        hasBody && body ? `  data: ${cfg.bodyType === 'json' ? body : `'${body}'`},` : null,
        `})`,
        `console.log(response.data)`,
      ].filter(Boolean).join('\n')
    }

    case 'php': {
      const curlHeaders = Object.entries(allHeaders).map(([k, v]) => `    '${k}: ${v}',`).join('\n')
      return [
        `<?php`,
        `$ch = curl_init();`,
        `curl_setopt($ch, CURLOPT_URL, '${url}');`,
        `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);`,
        `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${cfg.method}');`,
        curlHeaders ? `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${curlHeaders}\n]);` : null,
        hasBody && body ? `curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');` : null,
        `$response = curl_exec($ch);`,
        `curl_close($ch);`,
        `echo $response;`,
      ].filter(Boolean).join('\n')
    }

    default: return `// Language '${lang}' not supported`
  }
}

// ── Import cURL ───────────────────────────────────────────────────────────────

function shellTokenize(s: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break
    const q = s[i] === '"' || s[i] === "'" ? s[i] : null
    if (q) {
      let tok = ''
      i++
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\' && q === '"' && i + 1 < s.length) { i++; tok += s[i] }
        else tok += s[i]
        i++
      }
      i++ // closing quote
      tokens.push(tok)
    } else {
      let tok = ''
      while (i < s.length && !/\s/.test(s[i])) tok += s[i++]
      tokens.push(tok)
    }
  }
  return tokens
}

export function importCurl(curlStr: string): Partial<PikoRequest> {
  const trimmed = curlStr.trim()
  if (trimmed.split(/\s+/)[0].toLowerCase() !== 'curl') {
    throw new Error('Input does not look like a cURL command. Did you mean to select a different import mode (Collection, OpenAPI, or HAR)?')
  }
  const cfg = defaultConfig('rest') as RestConfig
  const tokens = shellTokenize(trimmed.replace(/\\\n/g, ' '))
  let i = 0
  let url = ''

  const nextArg = () => tokens[++i]

  while (i < tokens.length) {
    const t = tokens[i]
    if (t === 'curl') { i++; continue }
    if (t === '-X' || t === '--request') { cfg.method = nextArg() as any; i++; continue }
    if (t === '-H' || t === '--header') {
      const h = nextArg()
      const sep = h.indexOf(':')
      if (sep > 0) cfg.headers.push({ id: crypto.randomUUID(), key: h.slice(0, sep).trim(), value: h.slice(sep + 1).trim(), enabled: true })
      i++; continue
    }
    if (t === '-d' || t === '--data' || t === '--data-raw') {
      cfg.body = nextArg(); i++; continue
    }
    if (t === '--data-urlencode') {
      const pair = nextArg()
      const eq = pair.indexOf('=')
      if (eq > 0) cfg.formFields.push({ id: crypto.randomUUID(), key: pair.slice(0, eq), value: pair.slice(eq + 1), enabled: true })
      cfg.bodyType = 'urlencoded'; i++; continue
    }
    if (t === '-F' || t === '--form') {
      const pair = nextArg()
      const eq = pair.indexOf('=')
      if (eq > 0) cfg.formFields.push({ id: crypto.randomUUID(), key: pair.slice(0, eq), value: pair.slice(eq + 1), enabled: true })
      cfg.bodyType = 'form'; i++; continue
    }
    if (t === '-u' || t === '--user') {
      const [user, pass] = nextArg().split(':')
      cfg.auth = { type: 'basic', username: user, password: pass ?? '' }; i++; continue
    }
    if (!t.startsWith('-')) { url = t }
    i++
  }

  try {
    const u = new URL(url)
    cfg.url = u.origin + u.pathname
    u.searchParams.forEach((v, k) => cfg.params.push({ id: crypto.randomUUID(), key: k, value: v, enabled: true }))
  } catch {
    cfg.url = url
  }

  const ct = cfg.headers.find(h => h.key.toLowerCase() === 'content-type')?.value ?? ''
  if (ct.includes('json')) cfg.bodyType = 'json'
  else if (ct.includes('urlencoded')) cfg.bodyType = 'urlencoded'
  else if (ct.includes('xml')) cfg.bodyType = 'xml'
  else if (cfg.body) cfg.bodyType = 'text'

  if (cfg.method === 'GET' && cfg.body) cfg.method = 'POST'

  return { protocol: 'rest', config: cfg, name: `Imported from cURL`, preScript: '', postScript: '', assertions: [], chainRules: [] }
}

// ── Import OpenAPI 3.0 ────────────────────────────────────────────────────────

export function importOpenApi(spec: any): Partial<Collection> {
  const requests: PikoRequest[] = []
  const servers = spec.servers ?? [{ url: '' }]
  const baseUrl = servers[0]?.url ?? ''

  const paths: Record<string, any> = spec.paths ?? {}
  const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    for (const method of METHODS) {
      const op = pathItem?.[method]
      if (!op) continue

      const cfg = defaultConfig('rest') as RestConfig
      cfg.method = method.toUpperCase() as any
      cfg.url = `${baseUrl}${path}`

      cfg.params = (op.parameters ?? [])
        .filter((p: any) => p.in === 'query')
        .map((p: any) => ({ id: crypto.randomUUID(), key: p.name, value: p.example ?? '', enabled: !p.required ? false : true }))

      cfg.headers = (op.parameters ?? [])
        .filter((p: any) => p.in === 'header')
        .map((p: any) => ({ id: crypto.randomUUID(), key: p.name, value: p.example ?? '', enabled: true }))

      const reqBody = op.requestBody?.content
      if (reqBody) {
        if (reqBody['application/json']) {
          cfg.bodyType = 'json'
          const example = reqBody['application/json'].example ?? reqBody['application/json'].schema?.example
          if (example) cfg.body = JSON.stringify(example, null, 2)
        } else if (reqBody['application/x-www-form-urlencoded']) {
          cfg.bodyType = 'urlencoded'
        }
      }

      requests.push({
        id: crypto.randomUUID(),
        name: op.summary ?? op.operationId ?? `${method.toUpperCase()} ${path}`,
        protocol: 'rest',
        config: cfg,
        assertions: [],
        preScript: '',
        postScript: '',
        chainRules: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  }

  return {
    id: crypto.randomUUID(),
    name: spec.info?.title ?? 'Imported API',
    requests,
    folders: [],
    variables: [],
    preScript: '',
    createdAt: Date.now(),
  }
}

// ── Import HAR (HTTP Archive) ─────────────────────────────────────────────────

export function importHar(harJson: any): Partial<Collection> {
  const requests: PikoRequest[] = []
  const entries: any[] = harJson?.log?.entries ?? []

  for (const entry of entries) {
    const req = entry?.request
    if (!req?.url) continue

    const cfg = defaultConfig('rest') as RestConfig
    cfg.method = (req.method?.toUpperCase() ?? 'GET') as HttpMethod

    try {
      const u = new URL(req.url)
      cfg.url = u.origin + u.pathname
      u.searchParams.forEach((v, k) => cfg.params.push({ id: crypto.randomUUID(), key: k, value: v, enabled: true }))
    } catch {
      cfg.url = req.url
    }

    // filter out pseudo-headers (:method, :path, etc.)
    cfg.headers = (req.headers ?? [])
      .filter((h: any) => h.name && !h.name.startsWith(':'))
      .map((h: any) => ({ id: crypto.randomUUID(), key: h.name, value: h.value, enabled: true }))

    if (req.postData?.text) {
      cfg.body = req.postData.text
      const ct = cfg.headers.find((h: KeyValue) => h.key.toLowerCase() === 'content-type')?.value ?? ''
      cfg.bodyType = ct.includes('json') ? 'json' : ct.includes('xml') ? 'xml' : ct.includes('urlencoded') ? 'urlencoded' : 'text'
    }

    let name = `${cfg.method} ${cfg.url}`
    try { name = `${cfg.method} ${new URL(cfg.url).pathname}` } catch { /* keep full url */ }

    requests.push({
      id: crypto.randomUUID(),
      name,
      protocol: 'rest',
      config: cfg,
      assertions: [],
      preScript: '',
      postScript: '',
      chainRules: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  return {
    id: crypto.randomUUID(),
    name: harJson?.log?.pages?.[0]?.title ?? 'Imported HAR',
    requests,
    folders: [],
    variables: [],
    preScript: '',
    createdAt: Date.now(),
  }
}

// ── Import .env file ──────────────────────────────────────────────────────────

export function importDotenv(content: string, name = 'Imported Environment'): Partial<Environment> {
  const variables: KeyValue[] = []

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // strip surrounding quotes
    if (value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
         (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1)
    }
    if (key) variables.push({ id: crypto.randomUUID(), key, value, enabled: true })
  }

  return {
    id: crypto.randomUUID(),
    name,
    variables,
    isActive: false,
  }
}

// ── Export collection ─────────────────────────────────────────────────────────

export function exportCollection(col: Collection): string {
  return JSON.stringify(col, null, 2)
}

// ── Import collection (Hitro native or Postman v2/v2.1) ───────────────────────

export function importCollection(json: any): Partial<Collection> {
  if (Array.isArray(json.requests)) {
    // Hitro native format — re-stamp IDs to avoid clashes if re-imported
    return {
      id: crypto.randomUUID(),
      name: json.name ?? 'Imported Collection',
      requests: (json.requests ?? []).map((r: any) => ({
        ...r, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now(),
      })),
      folders: (json.folders ?? []).map((f: any) => ({
        id: crypto.randomUUID(), name: f.name ?? 'Folder',
        requests: (f.requests ?? []).map((r: any) => ({
          ...r, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now(),
        })),
      })),
      variables: json.variables ?? [],
      preScript: json.preScript ?? '',
      createdAt: Date.now(),
    }
  }

  if (json.info && Array.isArray(json.item)) {
    return _importPostman(json)
  }

  throw new Error('Unrecognized format. Expected a Hitro collection JSON or Postman v2/v2.1 collection.')
}

function _importPostman(json: any): Partial<Collection> {
  const getParam = (arr: any[], key: string): string =>
    (arr ?? []).find((v: any) => v.key === key)?.value ?? ''

  const extractScripts = (events: any[]): { preScript: string; postScript: string } => {
    let preScript = ''
    let postScript = ''
    for (const ev of events ?? []) {
      const script = (ev.script?.exec ?? []).join('\n')
      if (ev.listen === 'prerequest') preScript = script
      else if (ev.listen === 'test') postScript = script
    }
    return { preScript, postScript }
  }

  const buildRequest = (item: any): PikoRequest | null => {
    if (!item.request) return null
    const req = item.request
    const { preScript, postScript } = extractScripts(item.event)

    const rawUrl = typeof req.url === 'string' ? req.url : (req.url?.raw ?? '')
    const headers: KeyValue[] = (req.header ?? [])
      .filter((h: any) => h.key && !h.key.startsWith(':'))
      .map((h: any) => ({ id: crypto.randomUUID(), key: h.key, value: h.value ?? '', enabled: !h.disabled }))

    // GraphQL body mode → map to graphql protocol
    if (req.body?.mode === 'graphql') {
      const gcfg = defaultConfig('graphql') as GraphqlConfig
      gcfg.url = rawUrl
      gcfg.headers = headers
      gcfg.query = req.body.graphql?.query ?? ''
      const vars = req.body.graphql?.variables
      gcfg.variables = typeof vars === 'object' && vars !== null ? JSON.stringify(vars) : (vars ?? '')
      return {
        id: crypto.randomUUID(), name: item.name ?? 'Request', protocol: 'graphql', config: gcfg,
        assertions: [], preScript, postScript, chainRules: [],
        createdAt: Date.now(), updatedAt: Date.now(),
      }
    }

    const cfg = defaultConfig('rest') as RestConfig
    cfg.method = (req.method?.toUpperCase() ?? 'GET') as HttpMethod
    cfg.headers = headers

    try {
      const u = new URL(rawUrl)
      cfg.url = u.origin + u.pathname
      u.searchParams.forEach((v, k) =>
        cfg.params.push({ id: crypto.randomUUID(), key: k, value: v, enabled: true })
      )
    } catch {
      cfg.url = rawUrl
    }

    if (Array.isArray(req.url?.query)) {
      for (const q of req.url.query) {
        if (q.key && !cfg.params.find((p: KeyValue) => p.key === q.key)) {
          cfg.params.push({ id: crypto.randomUUID(), key: q.key, value: q.value ?? '', enabled: !q.disabled })
        }
      }
    }

    if (req.body) {
      const mode = req.body.mode
      if (mode === 'raw') {
        cfg.body = req.body.raw ?? ''
        const lang = (req.body.options?.raw?.language ?? '').toLowerCase()
        const ct = (cfg.headers.find((h: KeyValue) => h.key.toLowerCase() === 'content-type') as any)?.value?.toLowerCase() ?? ''
        if (lang === 'json' || ct.includes('json'))      cfg.bodyType = 'json'
        else if (lang === 'xml' || ct.includes('xml'))   cfg.bodyType = 'xml'
        else                                              cfg.bodyType = 'text'
      } else if (mode === 'urlencoded') {
        cfg.bodyType = 'urlencoded'
        cfg.formFields = (req.body.urlencoded ?? []).map((f: any) => ({
          id: crypto.randomUUID(), key: f.key ?? '', value: f.value ?? '', enabled: !f.disabled,
        }))
      } else if (mode === 'formdata') {
        cfg.bodyType = 'form'
        cfg.formFields = (req.body.formdata ?? [])
          .filter((f: any) => f.type !== 'file')
          .map((f: any) => ({ id: crypto.randomUUID(), key: f.key ?? '', value: f.value ?? '', enabled: !f.disabled }))
      }
    }

    if (req.auth) {
      const at = req.auth.type
      if (at === 'bearer') {
        cfg.auth = { type: 'bearer', token: getParam(req.auth.bearer, 'token') }
      } else if (at === 'basic') {
        cfg.auth = { type: 'basic', username: getParam(req.auth.basic, 'username'), password: getParam(req.auth.basic, 'password') }
      } else if (at === 'apikey') {
        const placement = (getParam(req.auth.apikey, 'in') || 'header') as 'header' | 'query'
        cfg.auth = { type: 'apikey', key: getParam(req.auth.apikey, 'key'), value: getParam(req.auth.apikey, 'value'), placement }
      } else if (at === 'oauth2') {
        cfg.auth = {
          type: 'oauth2',
          tokenUrl: getParam(req.auth.oauth2, 'accessTokenUrl') || getParam(req.auth.oauth2, 'tokenUrl'),
          clientId: getParam(req.auth.oauth2, 'clientId'),
          clientSecret: getParam(req.auth.oauth2, 'clientSecret'),
          scope: getParam(req.auth.oauth2, 'scope') || undefined,
          accessToken: getParam(req.auth.oauth2, 'accessToken') || undefined,
        }
      } else if (at === 'digest') {
        cfg.auth = { type: 'digest', username: getParam(req.auth.digest, 'username'), password: getParam(req.auth.digest, 'password') }
      } else if (at === 'awsv4') {
        cfg.auth = {
          type: 'awssigv4',
          accessKeyId: getParam(req.auth.awsv4, 'accessKey'),
          secretAccessKey: getParam(req.auth.awsv4, 'secretKey'),
          region: getParam(req.auth.awsv4, 'region'),
          service: getParam(req.auth.awsv4, 'service'),
          sessionToken: getParam(req.auth.awsv4, 'sessionToken') || undefined,
        }
      }
    }

    return {
      id: crypto.randomUUID(), name: item.name ?? 'Request', protocol: 'rest', config: cfg,
      assertions: [], preScript, postScript, chainRules: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    }
  }

  // Recursively process a folder item, flattening nested folders with name prefixing
  const processFolder = (item: any, namePrefix: string): CollectionFolder[] => {
    const allFolders: CollectionFolder[] = []
    const folderName = namePrefix ? `${namePrefix} / ${item.name ?? 'Folder'}` : (item.name ?? 'Folder')
    const directReqs: PikoRequest[] = []
    for (const sub of item.item ?? []) {
      if (sub.disabled) continue
      if (Array.isArray(sub.item)) {
        allFolders.push(...processFolder(sub, folderName))
      } else {
        const r = buildRequest(sub)
        if (r) directReqs.push(r)
      }
    }
    allFolders.unshift({ id: crypto.randomUUID(), name: folderName, requests: directReqs })
    return allFolders
  }

  const processItems = (items: any[]): { reqs: PikoRequest[]; folds: CollectionFolder[] } => {
    const reqs: PikoRequest[] = []
    const folds: CollectionFolder[] = []
    for (const item of items ?? []) {
      if (item.disabled) continue
      if (Array.isArray(item.item)) {
        folds.push(...processFolder(item, ''))
      } else {
        const r = buildRequest(item)
        if (r) reqs.push(r)
      }
    }
    return { reqs, folds }
  }

  const { reqs, folds } = processItems(json.item ?? [])

  const variables: KeyValue[] = (json.variable ?? []).map((v: any) => ({
    id: crypto.randomUUID(), key: v.key ?? '', value: v.value ?? '', enabled: !v.disabled,
  }))

  const { preScript } = extractScripts(json.event)

  return {
    id: crypto.randomUUID(),
    name: json.info?.name ?? 'Imported Collection',
    requests: reqs, folders: folds,
    variables, preScript, createdAt: Date.now(),
  }
}

