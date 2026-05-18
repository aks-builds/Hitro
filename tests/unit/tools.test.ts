import { describe, it, expect } from 'vitest'
import { importCurl, importCollection, importHar, importDotenv, toCurl, generateCode } from '../../src/main/tools'
import { defaultConfig } from '../../src/shared/types'
import type { PikoRequest, RestConfig } from '../../src/shared/types'

// ─── importCurl ───────────────────────────────────────────────────────────────

describe('importCurl', () => {
  it('throws when input does not start with "curl"', () => {
    expect(() => importCurl('{"info":"not a curl"}')).toThrow(/does not look like a cURL command/)
  })

  it('throws for empty input', () => {
    expect(() => importCurl('')).toThrow()
  })

  it('throws for plain JSON (Postman collection pasted in wrong mode)', () => {
    const postmanJson = JSON.stringify({ info: { name: 'API' }, item: [] })
    expect(() => importCurl(postmanJson)).toThrow(/does not look like a cURL command/)
  })

  it('parses a minimal GET command', () => {
    const result = importCurl('curl https://api.example.com/users')
    expect((result.config as any).url).toBe('https://api.example.com/users')
    expect((result.config as any).method).toBe('GET')
  })

  it('parses -X POST', () => {
    const result = importCurl('curl -X POST https://api.example.com/users')
    expect((result.config as any).method).toBe('POST')
  })

  it('parses -H header', () => {
    const result = importCurl("curl -H 'Content-Type: application/json' https://api.example.com")
    const headers = (result.config as any).headers as any[]
    expect(headers.some((h: any) => h.key === 'Content-Type' && h.value === 'application/json')).toBe(true)
  })

  it('parses -d body and infers bodyType json from content-type', () => {
    const result = importCurl(`curl -X POST -H 'Content-Type: application/json' -d '{"name":"test"}' https://api.example.com`)
    expect((result.config as any).body).toBe('{"name":"test"}')
    expect((result.config as any).bodyType).toBe('json')
  })

  it('parses query params from URL', () => {
    const result = importCurl('curl "https://api.example.com/search?q=hello&limit=10"')
    const params = (result.config as any).params as any[]
    expect(params.some((p: any) => p.key === 'q' && p.value === 'hello')).toBe(true)
    expect(params.some((p: any) => p.key === 'limit' && p.value === '10')).toBe(true)
  })

  it('parses -u user:pass as Basic auth', () => {
    const result = importCurl('curl -u admin:secret https://api.example.com')
    const auth = (result.config as any).auth
    expect(auth.type).toBe('basic')
    expect(auth.username).toBe('admin')
    expect(auth.password).toBe('secret')
  })
})

// ─── importCollection ─────────────────────────────────────────────────────────

describe('importCollection', () => {
  it('throws for unrecognized format', () => {
    expect(() => importCollection({ foo: 'bar' })).toThrow(/Unrecognized format/)
  })

  it('imports Hitro native format', () => {
    const native = {
      name: 'My API',
      requests: [
        { id: 'r1', name: 'Get Users', protocol: 'rest', config: {}, assertions: [], preScript: '', postScript: '', chainRules: [] }
      ],
      folders: [],
    }
    const result = importCollection(native)
    expect(result.name).toBe('My API')
    expect(result.requests).toHaveLength(1)
    expect(result.requests![0].name).toBe('Get Users')
    // IDs should be re-stamped
    expect(result.requests![0].id).not.toBe('r1')
  })

  it('imports Postman v2 collection with top-level requests', () => {
    const postman = {
      info: { name: 'Test API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/users' },
            header: [],
          },
        },
        {
          name: 'Create User',
          request: {
            method: 'POST',
            url: { raw: 'https://api.example.com/users' },
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: { mode: 'raw', raw: '{"name":"test"}', options: { raw: { language: 'json' } } },
          },
        },
      ],
    }
    const result = importCollection(postman)
    expect(result.name).toBe('Test API')
    expect(result.requests).toHaveLength(2)
    expect(result.requests![0].name).toBe('Get Users')
    expect((result.requests![0].config as any).method).toBe('GET')
    expect((result.requests![1].config as any).bodyType).toBe('json')
  })

  it('imports Postman v2 collection with folders', () => {
    const postman = {
      info: { name: 'Grouped API' },
      item: [
        {
          name: 'Auth',
          item: [
            { name: 'Login', request: { method: 'POST', url: { raw: 'https://api.example.com/login' }, header: [] } },
          ],
        },
      ],
    }
    const result = importCollection(postman)
    expect(result.folders).toHaveLength(1)
    expect(result.folders![0].name).toBe('Auth')
    expect(result.folders![0].requests).toHaveLength(1)
    expect(result.folders![0].requests[0].name).toBe('Login')
  })

  it('maps Postman bearer auth', () => {
    const postman = {
      info: { name: 'Auth Test' },
      item: [
        {
          name: 'Protected',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/me' },
            header: [],
            auth: { type: 'bearer', bearer: [{ key: 'token', value: 'my-token' }] },
          },
        },
      ],
    }
    const result = importCollection(postman)
    const auth = (result.requests![0].config as any).auth
    expect(auth.type).toBe('bearer')
    expect(auth.token).toBe('my-token')
  })

  it('maps Postman oauth2 auth', () => {
    const postman = {
      info: { name: 'OAuth2 Test' },
      item: [
        {
          name: 'OAuth Request',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/resource' },
            header: [],
            auth: {
              type: 'oauth2',
              oauth2: [
                { key: 'accessTokenUrl', value: 'https://auth.example.com/token' },
                { key: 'clientId', value: 'my-client' },
                { key: 'clientSecret', value: 'my-secret' },
                { key: 'scope', value: 'read write' },
                { key: 'accessToken', value: 'tok_abc' },
              ],
            },
          },
        },
      ],
    }
    const result = importCollection(postman)
    const auth = (result.requests![0].config as any).auth
    expect(auth.type).toBe('oauth2')
    expect(auth.tokenUrl).toBe('https://auth.example.com/token')
    expect(auth.clientId).toBe('my-client')
    expect(auth.clientSecret).toBe('my-secret')
    expect(auth.scope).toBe('read write')
    expect(auth.accessToken).toBe('tok_abc')
  })

  it('maps Postman digest auth', () => {
    const postman = {
      info: { name: 'Digest Test' },
      item: [
        {
          name: 'Digest Request',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/secure' },
            header: [],
            auth: {
              type: 'digest',
              digest: [
                { key: 'username', value: 'admin' },
                { key: 'password', value: 'pass123' },
              ],
            },
          },
        },
      ],
    }
    const result = importCollection(postman)
    const auth = (result.requests![0].config as any).auth
    expect(auth.type).toBe('digest')
    expect(auth.username).toBe('admin')
    expect(auth.password).toBe('pass123')
  })

  it('maps Postman awsv4 auth', () => {
    const postman = {
      info: { name: 'AWS Test' },
      item: [
        {
          name: 'AWS Request',
          request: {
            method: 'GET',
            url: { raw: 'https://s3.amazonaws.com/bucket/key' },
            header: [],
            auth: {
              type: 'awsv4',
              awsv4: [
                { key: 'accessKey', value: 'AKIAIOSFODNN7EXAMPLE' },
                { key: 'secretKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
                { key: 'region', value: 'us-east-1' },
                { key: 'service', value: 's3' },
              ],
            },
          },
        },
      ],
    }
    const result = importCollection(postman)
    const auth = (result.requests![0].config as any).auth
    expect(auth.type).toBe('awssigv4')
    expect(auth.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE')
    expect(auth.secretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    expect(auth.region).toBe('us-east-1')
    expect(auth.service).toBe('s3')
  })

  it('imports Postman GraphQL body as graphql protocol', () => {
    const postman = {
      info: { name: 'GQL API' },
      item: [
        {
          name: 'Get User',
          request: {
            method: 'POST',
            url: { raw: 'https://api.example.com/graphql' },
            header: [],
            body: {
              mode: 'graphql',
              graphql: { query: '{ user(id: 1) { name } }', variables: { id: 1 } },
            },
          },
        },
      ],
    }
    const result = importCollection(postman)
    expect(result.requests![0].protocol).toBe('graphql')
    const cfg = result.requests![0].config as any
    expect(cfg.query).toBe('{ user(id: 1) { name } }')
    expect(cfg.variables).toBe('{"id":1}')
    expect(cfg.url).toBe('https://api.example.com/graphql')
  })

  it('skips disabled items', () => {
    const postman = {
      info: { name: 'Disabled Test' },
      item: [
        { name: 'Active', request: { method: 'GET', url: { raw: 'https://api.example.com/active' }, header: [] } },
        { name: 'Disabled', disabled: true, request: { method: 'GET', url: { raw: 'https://api.example.com/disabled' }, header: [] } },
      ],
    }
    const result = importCollection(postman)
    expect(result.requests).toHaveLength(1)
    expect(result.requests![0].name).toBe('Active')
  })

  it('imports collection-level variables', () => {
    const postman = {
      info: { name: 'Vars Test' },
      variable: [
        { key: 'baseUrl', value: 'https://api.example.com' },
        { key: 'apiKey', value: 'secret' },
      ],
      item: [],
    }
    const result = importCollection(postman)
    expect(result.variables).toHaveLength(2)
    expect(result.variables!.find(v => v.key === 'baseUrl')?.value).toBe('https://api.example.com')
    expect(result.variables!.find(v => v.key === 'apiKey')?.value).toBe('secret')
  })

  it('handles deeply nested folders by flattening with name prefix', () => {
    const postman = {
      info: { name: 'Nested API' },
      item: [
        {
          name: 'Level1',
          item: [
            {
              name: 'Level2',
              item: [
                { name: 'Deep Request', request: { method: 'GET', url: { raw: 'https://api.example.com/deep' }, header: [] } },
              ],
            },
          ],
        },
      ],
    }
    const result = importCollection(postman)
    const folderNames = result.folders!.map(f => f.name)
    expect(folderNames).toContain('Level1 / Level2')
    const deepFolder = result.folders!.find(f => f.name === 'Level1 / Level2')
    expect(deepFolder?.requests).toHaveLength(1)
    expect(deepFolder?.requests[0].name).toBe('Deep Request')
  })

  it('imports pre-request script from item event', () => {
    const postman = {
      info: { name: 'Scripts Test' },
      item: [
        {
          name: 'Scripted Request',
          event: [
            { listen: 'prerequest', script: { exec: ['pm.environment.set("ts", Date.now())'] } },
            { listen: 'test', script: { exec: ['pm.test("ok", () => pm.response.to.have.status(200))'] } },
          ],
          request: { method: 'GET', url: { raw: 'https://api.example.com' }, header: [] },
        },
      ],
    }
    const result = importCollection(postman)
    expect(result.requests![0].preScript).toBe('pm.environment.set("ts", Date.now())')
    expect(result.requests![0].postScript).toBe('pm.test("ok", () => pm.response.to.have.status(200))')
  })
})

// ─── toCurl ───────────────────────────────────────────────────────────────────

function makeRestRequest(overrides: Partial<RestConfig> = {}): PikoRequest {
  const cfg: RestConfig = { ...(defaultConfig('rest') as RestConfig), ...overrides }
  return {
    id: 'test', name: 'Test', protocol: 'rest', config: cfg,
    assertions: [], preScript: '', postScript: '', chainRules: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  }
}

describe('toCurl', () => {
  it('generates a basic GET command', () => {
    const result = toCurl(makeRestRequest({ url: 'https://api.example.com/users', method: 'GET' }))
    expect(result).toContain('curl -X GET')
    expect(result).toContain('https://api.example.com/users')
  })

  it('exports urlencoded fields with -d flag', () => {
    const result = toCurl(makeRestRequest({
      url: 'https://api.example.com',
      method: 'POST',
      bodyType: 'urlencoded',
      formFields: [
        { id: '1', key: 'user', value: 'alice', enabled: true },
        { id: '2', key: 'pass', value: 'secret', enabled: true },
      ],
    }))
    expect(result).toContain('-d ')
    expect(result).not.toContain('--data-urlencode \'user=')
  })

  it('exports formdata fields with -F flags', () => {
    const result = toCurl(makeRestRequest({
      url: 'https://api.example.com',
      method: 'POST',
      bodyType: 'form',
      formFields: [
        { id: '1', key: 'name', value: 'alice', enabled: true },
        { id: '2', key: 'file', value: 'data', enabled: true },
      ],
    }))
    expect(result).toContain("-F 'name=alice'")
    expect(result).toContain("-F 'file=data'")
  })
})

// ─── generateCode ─────────────────────────────────────────────────────────────

describe('generateCode', () => {
  it('generates valid Python headers dict with colon spacing', () => {
    const result = generateCode(makeRestRequest({
      url: 'https://api.example.com',
      method: 'GET',
      headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    }), 'python')
    expect(result).toContain('"Content-Type": "application/json"')
    expect(result).not.toMatch(/"Content-Type":"application\/json"/)
  })
})

// ─── importCurl -F formdata ───────────────────────────────────────────────────

describe('importCurl -F formdata', () => {
  it('parses -F fields as formdata', () => {
    const result = importCurl("curl -X POST -F 'name=alice' -F 'role=admin' https://api.example.com/upload")
    expect((result.config as any).bodyType).toBe('form')
    const fields = (result.config as any).formFields as any[]
    expect(fields.some((f: any) => f.key === 'name' && f.value === 'alice')).toBe(true)
    expect(fields.some((f: any) => f.key === 'role' && f.value === 'admin')).toBe(true)
  })
})

// ─── importHar ────────────────────────────────────────────────────────────────

describe('importHar', () => {
  it('returns empty requests for empty entries', () => {
    const result = importHar({ log: { entries: [] } })
    expect(result.requests).toHaveLength(0)
  })

  it('parses a basic GET entry', () => {
    const har = {
      log: {
        pages: [{ title: 'My HAR' }],
        entries: [
          {
            request: {
              method: 'GET',
              url: 'https://api.example.com/users?page=1',
              headers: [{ name: 'Accept', value: 'application/json' }],
            },
          },
        ],
      },
    }
    const result = importHar(har)
    expect(result.name).toBe('My HAR')
    expect(result.requests).toHaveLength(1)
    expect((result.requests![0].config as any).method).toBe('GET')
    expect((result.requests![0].config as any).url).toBe('https://api.example.com/users')
    const params = (result.requests![0].config as any).params
    expect(params.some((p: any) => p.key === 'page' && p.value === '1')).toBe(true)
  })

  it('filters out pseudo-headers starting with ":"', () => {
    const har = {
      log: {
        entries: [
          {
            request: {
              method: 'GET',
              url: 'https://api.example.com/',
              headers: [
                { name: ':method', value: 'GET' },
                { name: 'Accept', value: 'application/json' },
              ],
            },
          },
        ],
      },
    }
    const result = importHar(har)
    const headers = (result.requests![0].config as any).headers as any[]
    expect(headers.every((h: any) => !h.key.startsWith(':'))).toBe(true)
  })
})

// ─── importDotenv ─────────────────────────────────────────────────────────────

describe('importDotenv', () => {
  it('parses key=value pairs', () => {
    const result = importDotenv('API_URL=https://api.example.com\nAPI_KEY=abc123')
    expect(result.variables).toHaveLength(2)
    expect(result.variables!.find(v => v.key === 'API_URL')?.value).toBe('https://api.example.com')
    expect(result.variables!.find(v => v.key === 'API_KEY')?.value).toBe('abc123')
  })

  it('skips comment lines and blank lines', () => {
    const result = importDotenv('# comment\n\nKEY=val\n# another')
    expect(result.variables).toHaveLength(1)
  })

  it('strips surrounding quotes', () => {
    const result = importDotenv('TOKEN="my-secret"\nURL=\'https://example.com\'')
    expect(result.variables!.find(v => v.key === 'TOKEN')?.value).toBe('my-secret')
    expect(result.variables!.find(v => v.key === 'URL')?.value).toBe('https://example.com')
  })

  it('uses the provided name', () => {
    const result = importDotenv('K=v', 'Production')
    expect(result.name).toBe('Production')
  })
})
