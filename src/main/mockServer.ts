import http from 'http'
import { MockServer } from '../shared/types'

const servers = new Map<string, http.Server>()

function matchPath(pattern: string, url: string): boolean {
  // supports exact match and * wildcard segments
  const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
  return new RegExp(regexStr).test(url)
}

export function startMockServer(mockServer: MockServer): Promise<{ port: number }> {
  stopMockServer(mockServer.id)

  const server = http.createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    const method = (req.method ?? 'GET').toUpperCase()

    const endpoint = mockServer.endpoints.find(e =>
      e.enabled &&
      (e.method === 'ANY' || e.method === method) &&
      matchPath(e.path, url)
    )

    if (!endpoint) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'No matching mock endpoint', url, method }))
      return
    }

    const respond = () => {
      const resHeaders: Record<string, string> = {
        'Content-Type': endpoint.contentType || 'application/json',
        'X-Hitro-Mock': 'true',
      }
      endpoint.headers.filter(h => h.enabled && h.key).forEach(h => { resHeaders[h.key] = h.value })
      res.writeHead(endpoint.status, resHeaders)
      res.end(endpoint.body)
    }

    if (endpoint.delay > 0) setTimeout(respond, endpoint.delay)
    else respond()
  })

  return new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      reject(new Error(`Could not bind port ${mockServer.port}: ${err.message}`))
    })
    server.listen(mockServer.port, () => {
      servers.set(mockServer.id, server)
      resolve({ port: mockServer.port })
    })
  })
}

export function stopMockServer(id: string): void {
  const server = servers.get(id)
  if (server) {
    server.close()
    servers.delete(id)
  }
}

export function isRunning(id: string): boolean {
  return servers.has(id)
}

export function runningServers(): string[] {
  return [...servers.keys()]
}
