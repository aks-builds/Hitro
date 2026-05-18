import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { GrpcConfig, Assertion, PikoResponse } from '../../shared/types'
import { runAssertions } from '../../shared/assertions'

export async function executeGrpc(config: GrpcConfig, assertions: Assertion[]): Promise<PikoResponse> {
  const start = Date.now()
  try {
    const pkgDef = protoLoader.loadSync(config.protoPath, {
      keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
    })
    const proto = grpc.loadPackageDefinition(pkgDef) as any

    // Navigate nested package path (e.g. "mypackage.MyService")
    const parts = config.service.split('.')
    let ServiceClass: any = proto
    for (const p of parts) {
      ServiceClass = ServiceClass?.[p]
    }

    if (typeof ServiceClass !== 'function') {
      return { error: `Service '${config.service}' not found in proto`, duration: Date.now() - start, timestamp: Date.now() }
    }

    const creds = config.tls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure()
    const client = new ServiceClass(config.host, creds)

    if (typeof client[config.method] !== 'function') {
      return { error: `Method '${config.method}' not found on service '${config.service}'`, duration: Date.now() - start, timestamp: Date.now() }
    }

    const metadata = new grpc.Metadata()
    config.metadata.filter(m => m.enabled && m.key).forEach(m => metadata.add(m.key, m.value))

    const reqBody = JSON.parse(config.body || '{}')

    return new Promise(resolve => {
      client[config.method](reqBody, metadata, (err: grpc.ServiceError | null, response: any) => {
        const duration = Date.now() - start
        if (err) {
          resolve({ error: `${err.code}: ${err.details}`, duration, timestamp: Date.now() })
          return
        }
        const rawBody = JSON.stringify(response, null, 2)
        resolve({
          status: 0, statusText: 'OK', headers: {},
          body: response, rawBody, duration,
          size: rawBody.length, timestamp: Date.now(),
          assertionResults: runAssertions(assertions, { body: response }),
        })
      })
    })
  } catch (err: any) {
    return { error: err.message, duration: Date.now() - start, timestamp: Date.now() }
  }
}
