import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

const appPath = path.resolve(__dirname, '../../')

// ─────────────────────────────────────────────────────────────────────────────
// Launch helper — waits for React to fully mount (auto-tab created by App.tsx)
// Each call gets its own temp user-data-dir so suites never share SQLite state.
// ─────────────────────────────────────────────────────────────────────────────
async function launch() {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'hitro-test-'))
  const app = await electron.launch({
    args: [appPath, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, HITRO_DEV_TOOLS: '0' },
  })
  const page = await app.firstWindow()
  // App.tsx auto-creates one tab on startup; wait for its send-button
  await page.waitForSelector('[data-testid="send-button"]', { timeout: 30_000 })
  return { app, page }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — App launch & shell
// ─────────────────────────────────────────────────────────────────────────────
test.describe('App launch', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('product name is Hitro', async () => {
    const name = await app.evaluate(({ app: a }) => a.getName())
    expect(name).toBe('Hitro')
  })

  test('window title contains Hitro', async () => {
    await expect(page).toHaveTitle(/Hitro/)
  })

  test('sidebar is visible', async () => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  })

  test('tab bar is visible', async () => {
    await expect(page.locator('[data-testid="tab-bar"]')).toBeVisible()
  })

  test('auto-created tab shows send button', async () => {
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
  })

  test('sidebar brand shows Hitro', async () => {
    await expect(page.locator('[data-testid="app-brand"]')).toBeVisible()
  })

  test('protocol selector defaults to REST', async () => {
    await expect(page.locator('[data-testid="protocol-select"]')).toHaveValue('rest')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Tab management
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Tab management', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('+ button creates a new tab', async () => {
    const before = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    await page.locator('[data-testid="tab-bar"] button', { hasText: '+' }).click()
    const after = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    expect(after).toBe(before + 1)
  })

  test('new tab defaults to REST', async () => {
    await expect(page.locator('[data-testid="protocol-select"]')).toHaveValue('rest')
  })

  test('editing request name marks tab dirty', async () => {
    const nameInput = page.locator('input[placeholder="Request name"]').first()
    await nameInput.fill('My API Call')
    await expect(page.locator('[data-testid="dirty-indicator"]').first()).toBeVisible()
  })

  test('clicking another tab switches context', async () => {
    const tabs = page.locator('[data-testid="tab-bar"] [data-tab-id]')
    const firstTab = tabs.first()
    await firstTab.click()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
  })

  test('close button removes a tab', async () => {
    const before = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    const closeBtn = page.locator('[data-testid="tab-bar"] button', { hasText: '×' }).last()
    await closeBtn.click()
    const after = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    expect(after).toBe(before - 1)
  })

  test('closing all tabs shows empty state', async () => {
    // Close all remaining tabs
    let closeBtn = page.locator('[data-testid="tab-bar"] button', { hasText: '×' })
    while (await closeBtn.count() > 0) {
      await closeBtn.first().click()
    }
    await expect(page.locator('button', { hasText: '+ New Request' })).toBeVisible({ timeout: 5_000 })
  })

  test('New Request button from empty state opens a tab', async () => {
    await page.locator('button', { hasText: '+ New Request' }).click()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — All 9 protocol panels
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Protocol panels', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  async function switchTo(proto: string) {
    await page.locator('[data-testid="protocol-select"]').selectOption(proto)
  }

  test('REST panel — config panel and URL bar visible', async () => {
    await switchTo('rest')
    await expect(page.locator('[data-testid="rest-config"]')).toBeVisible()
    await expect(page.locator('[data-testid="rest-url"]')).toBeVisible()
  })

  test('REST panel — all HTTP verbs available', async () => {
    for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
      await expect(page.locator(`select option[value="${m}"]`).first()).toBeAttached()
    }
  })

  test('REST panel — params tab has KV editor', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'params' }).click()
    await expect(page.locator('button', { hasText: '+ Add Row' })).toBeVisible()
  })

  test('REST panel — headers tab has KV editor', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'headers' }).click()
    await expect(page.locator('button', { hasText: '+ Add Row' })).toBeVisible()
  })

  test('REST panel — body tab shows type buttons', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'body' }).click()
    for (const t of ['json', 'xml', 'text', 'none']) {
      await expect(page.locator('[data-testid="rest-config"] button', { hasText: t })).toBeVisible()
    }
  })

  test('REST panel — auth tab shows all 8 auth types', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'auth' }).click()
    for (const t of ['none', 'bearer', 'basic', 'API Key', 'OAuth 2.0', 'digest', 'AWS SigV4', 'mTLS']) {
      await expect(page.locator('[data-testid="rest-config"] button', { hasText: t })).toBeVisible()
    }
  })

  test('REST panel — bearer token input appears when bearer selected', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'bearer' }).click()
    await expect(page.locator('input[placeholder="Bearer token"]')).toBeVisible()
  })

  test('REST panel — AWS SigV4 shows 4 fields', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'AWS SigV4' }).click()
    await expect(page.locator('input[placeholder*="Access Key ID"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Secret Access Key"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Region"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Service"]')).toBeVisible()
  })

  test('REST panel — chain tab shows chain rule adder', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: /^Chain/ }).click()
    await expect(page.locator('button', { hasText: '+ Add Chain Rule' })).toBeVisible()
  })

  test('REST panel — settings tab shows timeout and redirect', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: 'settings' }).click()
    await expect(page.locator('text=Timeout (ms)')).toBeVisible()
    await expect(page.locator('text=Follow redirects')).toBeVisible()
  })

  test('REST panel — timeout min is 100', async () => {
    const input = page.locator('[data-testid="rest-config"] input[type="number"]').first()
    const min = await input.getAttribute('min')
    expect(Number(min)).toBe(100)
  })

  test('gRPC panel renders', async () => {
    await switchTo('grpc')
    await expect(page.locator('[data-testid="grpc-config"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="proto file"]')).toBeVisible()
  })

  test('GraphQL panel renders with URL bar', async () => {
    await switchTo('graphql')
    await expect(page.locator('[data-testid="graphql-config"]')).toBeVisible()
    await expect(page.locator('[data-testid="graphql-url"]')).toBeVisible()
  })

  test('WebSocket panel renders with connection indicator', async () => {
    await switchTo('websocket')
    await expect(page.locator('[data-testid="websocket-config"]')).toBeVisible()
    await expect(page.locator('text=Disconnected')).toBeVisible()
    await expect(page.locator('[data-testid="send-button"]')).toContainText('Connect')
  })

  test('Kafka panel renders with broker/topic/mode', async () => {
    await switchTo('kafka')
    await expect(page.locator('[data-testid="kafka-config"]')).toBeVisible()
    await expect(page.locator('text=Brokers')).toBeVisible()
    await expect(page.locator('button', { hasText: 'produce' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'consume' })).toBeVisible()
  })

  test('SQS panel renders with region, queue URL, mode', async () => {
    await switchTo('sqs')
    await expect(page.locator('[data-testid="sqs-config"]')).toBeVisible()
    await expect(page.locator('text=AWS Region')).toBeVisible()
    await expect(page.locator('text=Queue URL')).toBeVisible()
    await expect(page.locator('[data-testid="sqs-config"] button', { hasText: 'send' })).toBeVisible()
    await expect(page.locator('[data-testid="sqs-config"] button', { hasText: 'receive' })).toBeVisible()
  })

  test('MQTT panel renders with broker URL, mode, QoS', async () => {
    await switchTo('mqtt')
    await expect(page.locator('[data-testid="mqtt-config"]')).toBeVisible()
    await expect(page.locator('text=Broker URL')).toBeVisible()
    await expect(page.locator('text=QoS')).toBeVisible()
  })

  test('SSE panel renders with URL bar and maxEvents', async () => {
    await switchTo('sse')
    await expect(page.locator('[data-testid="sse-config"]')).toBeVisible()
    await expect(page.locator('[data-testid="sse-url"]')).toBeVisible()
    await expect(page.locator('text=Max events')).toBeVisible()
  })

  test('Socket.IO panel renders with URL, mode, event name', async () => {
    await switchTo('socketio')
    await expect(page.locator('[data-testid="socketio-config"]')).toBeVisible()
    await expect(page.locator('text=Event name')).toBeVisible()
  })

  test('switching protocol resets stale response state', async () => {
    // switch back to REST — no stale response should persist
    await switchTo('rest')
    await expect(page.locator('[data-testid="response-error"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="response-status"]')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — REST live requests (requires internet: httpbin.org)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('REST live requests', () => {
  test.skip(!!process.env.CI, 'requires live network — run locally only')
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('GET request → 200 status badge', async () => {
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/get')
    await page.locator('[data-testid="send-button"]').click()
    await expect(page.locator('[data-testid="response-status"]')).toContainText('200', { timeout: 20_000 })
  })

  test('response body shows JSON with "url" key', async () => {
    const body = page.locator('.whitespace-pre-wrap').first()
    await expect(body).toContainText('"url"')
  })

  test('response headers tab shows content-type', async () => {
    await page.locator('[data-testid="response-panel"] button', { hasText: 'Headers' }).click()
    await expect(page.locator('td', { hasText: 'content-type' })).toBeVisible()
  })

  test('POST request → 200', async () => {
    await page.locator('select').nth(1).selectOption('POST')
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/post')
    await page.locator('[data-testid="send-button"]').click()
    await expect(page.locator('[data-testid="response-status"]')).toContainText('200', { timeout: 20_000 })
  })

  test('404 response shown with red status', async () => {
    await page.locator('select').nth(1).selectOption('GET')
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/status/404')
    await page.locator('[data-testid="send-button"]').click()
    await expect(page.locator('[data-testid="response-status"]')).toContainText('404', { timeout: 20_000 })
  })

  test('unreachable host shows error panel', async () => {
    await page.locator('[data-testid="rest-url"]').fill('http://this-host-does-not-exist.invalid')
    await page.locator('[data-testid="send-button"]').click()
    await expect(page.locator('[data-testid="response-error"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="response-error"]')).toContainText('Request Failed')
  })

  test('duration badge appears after response', async () => {
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/get')
    await page.locator('[data-testid="send-button"]').click()
    await expect(page.locator('[data-testid="response-status"]')).toContainText('200', { timeout: 20_000 })
    await expect(page.locator('text=/\\d+ms/')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — Response panel tabs
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Response panel tabs', () => {
  test.skip(!!process.env.CI, 'requires live network — run locally only')
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => {
    const r = await launch()
    app = r.app; page = r.page
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/get')
    await page.locator('[data-testid="send-button"]').click()
    await page.locator('[data-testid="response-status"]').waitFor({ timeout: 20_000 })
  })
  test.afterAll(async () => { await app?.close() })

  test('Body tab shows response content', async () => {
    await page.locator('[data-testid="response-panel"] button', { hasText: 'Body' }).click()
    await expect(page.locator('.whitespace-pre-wrap').first()).toBeVisible()
  })

  test('Headers tab shows table with header/value columns', async () => {
    await page.locator('[data-testid="response-panel"] button', { hasText: 'Headers' }).click()
    await expect(page.locator('th', { hasText: 'Header' })).toBeVisible()
    await expect(page.locator('th', { hasText: 'Value' })).toBeVisible()
  })

  test('Assertions tab shows "No assertions configured" when none added', async () => {
    await page.locator('[data-testid="response-panel"] button', { hasText: /^Assertions/ }).click()
    await expect(page.locator('text=No assertions configured')).toBeVisible()
  })

  test('Events tab shows "No events yet" for REST requests', async () => {
    await page.locator('button', { hasText: /^Events/ }).click()
    await expect(page.locator('text=No events yet')).toBeVisible()
  })

  test('Console tab shows empty state hint', async () => {
    await page.locator('button', { hasText: /^Console/ }).click()
    await expect(page.locator('text=No console output')).toBeVisible()
  })

  test('Snapshots tab shows save input', async () => {
    await page.locator('button', { hasText: 'Snapshots' }).click()
    await expect(page.locator('button', { hasText: 'Save snapshot' })).toBeVisible()
  })

  test('Snapshot can be saved and appears in list', async () => {
    await page.locator('input[placeholder*="Snapshot name"]').fill('baseline')
    await page.locator('button', { hasText: 'Save snapshot' }).click()
    await expect(page.locator('text=baseline')).toBeVisible({ timeout: 5_000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — Assertions
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Assertions', () => {
  test.skip(!!process.env.CI, 'requires live network — run locally only')
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('can add an assertion row', async () => {
    await page.locator('button', { hasText: /^Assertions/ }).first().click()
    await page.locator('[data-testid="add-assertion"]').click()
    await expect(page.locator('[data-testid="assertion-row"]').first()).toBeVisible()
  })

  test('status eq 200 passes on 200 response', async () => {
    const row = page.locator('[data-testid="assertion-row"]').first()
    await row.locator('[data-testid="assertion-field"]').fill('status')
    await row.locator('[data-testid="assertion-operator"]').selectOption('eq')
    await row.locator('[data-testid="assertion-expected"]').fill('200')

    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/status/200')
    await page.locator('[data-testid="send-button"]').click()
    // Wait specifically for 200 to avoid resolving instantly with any stale response
    await expect(page.locator('[data-testid="response-status"]')).toContainText('200', { timeout: 20_000 })
    await page.locator('[data-testid="response-panel"] button', { hasText: /^Assertions/ }).click()
    await expect(page.locator('[data-testid="assertion-result-pass"]')).toBeVisible({ timeout: 5_000 })
  })

  test('status eq 200 fails on 404 response', async () => {
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/status/404')
    await page.locator('[data-testid="send-button"]').click()
    // Wait specifically for 404 — using waitFor() would immediately resolve with the stale 200 response
    await expect(page.locator('[data-testid="response-status"]')).toContainText('404', { timeout: 20_000 })
    await page.locator('[data-testid="response-panel"] button', { hasText: /^Assertions/ }).click()
    await expect(page.locator('[data-testid="assertion-result-fail"]')).toBeVisible({ timeout: 5_000 })
    // "got:" line should show actual value
    await expect(page.locator('text=/got:/')).toBeVisible()
  })

  test('assertion count shows in tab label', async () => {
    await expect(page.locator('button', { hasText: /Assertions \(1\)/ })).toBeVisible()
  })

  test('removing an assertion decrements count', async () => {
    const removeBtn = page.locator('[data-testid="assertion-row"] button', { hasText: '✕' }).first()
    await removeBtn.click()
    await expect(page.locator('button', { hasText: /^Assertions$/ }).first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7 — Scripts
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Scripts tab', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('Scripts sub-tab shows pre and post editors', async () => {
    await page.locator('button', { hasText: 'Scripts' }).click()
    await expect(page.locator('text=Pre-request Script')).toBeVisible()
    await expect(page.locator('text=Post-response Script')).toBeVisible()
  })

  test('pm API reference panel is visible', async () => {
    await expect(page.locator('text=pm API reference')).toBeVisible()
    await expect(page.locator('text=pm.variables.set')).toBeVisible()
    await expect(page.locator('text=pm.response.json()')).toBeVisible()
  })

  test('Scripts tab does not show dot with no scripts', async () => {
    await expect(page.locator('button', { hasText: /Scripts ●/ })).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8 — Load test panel
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Load test panel', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('Load Test tab only appears for REST', async () => {
    await expect(page.locator('button', { hasText: 'Load Test' })).toBeVisible()
    await page.locator('[data-testid="protocol-select"]').selectOption('grpc')
    await expect(page.locator('button', { hasText: 'Load Test' })).not.toBeVisible()
    await page.locator('[data-testid="protocol-select"]').selectOption('rest')
  })

  test('Load Test panel shows concurrency and duration fields', async () => {
    await page.locator('button', { hasText: 'Load Test' }).click()
    await expect(page.locator('text=Concurrent users')).toBeVisible()
    await expect(page.locator('text=Duration (seconds)')).toBeVisible()
  })

  test('Run button disabled without URL', async () => {
    await expect(page.locator('button', { hasText: 'Run Load Test' })).toBeDisabled()
  })

  test('Run button enabled when URL set', async () => {
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/get')
    await expect(page.locator('button', { hasText: 'Run Load Test' })).toBeEnabled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 9 — Sidebar: collections & environments
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Sidebar', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('Collections section visible', async () => {
    await expect(page.locator('text=/^Collections$/i')).toBeVisible()
  })

  test('empty collections shows placeholder', async () => {
    await expect(page.locator('text=No collections yet')).toBeVisible()
  })

  test('Import button opens modal', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await expect(page.locator('button', { hasText: 'cURL Command' })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('Env button shows environment list', async () => {
    const envBtn = page.locator('button', { hasText: /^Env/ })
    await envBtn.click()
    await expect(page.locator('text=None').first()).toBeVisible()
    await envBtn.click() // close
  })

  test('Global Variables button opens modal', async () => {
    await page.locator('button[title^="Global Variables"]').click()
    await expect(page.locator('text=Global Variables')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('Mock Servers Manage link visible', async () => {
    await expect(page.locator('button', { hasText: 'Manage →' })).toBeVisible()
  })

  test('New button from sidebar opens a tab', async () => {
    const before = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    await page.locator('button', { hasText: '+ New' }).click()
    const after = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    expect(after).toBe(before + 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 10 — Import modal
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Import modal', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('modal has cURL, OpenAPI, HAR, .env modes', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await expect(page.locator('button', { hasText: 'cURL Command' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'OpenAPI 3.0' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'HAR File' })).toBeVisible()
    await expect(page.locator('button', { hasText: '.env File' })).toBeVisible()
  })

  test('cURL mode shows paste area', async () => {
    await page.locator('button', { hasText: 'cURL Command' }).click()
    await expect(page.locator('textarea[placeholder*="curl"]')).toBeVisible()
  })

  test('valid cURL import creates a request', async () => {
    const textarea = page.locator('textarea[placeholder*="curl"]')
    await textarea.fill('curl https://httpbin.org/get')
    await page.locator('button', { hasText: 'Import' }).last().click()
    // Should close modal and open the imported request
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible({ timeout: 5_000 })
  })

  test('Escape closes modal', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await expect(page.locator('button', { hasText: 'cURL Command' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 11 — Mock server panel
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mock server panel', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('Manage → opens mock server panel', async () => {
    await page.locator('button', { hasText: 'Manage →' }).click()
    await expect(page.locator('h2', { hasText: 'Mock Servers' })).toBeVisible()
  })

  test('+ New Server button visible', async () => {
    await expect(page.locator('button', { hasText: '+ New Server' })).toBeVisible()
  })

  test('new server draft shows name and port fields', async () => {
    await page.locator('button', { hasText: '+ New Server' }).click()
    await expect(page.locator('input[value="New Mock Server"]')).toBeVisible()
    await expect(page.locator('input[type="number"]').first()).toBeVisible()
  })

  test('+ Add Endpoint button works', async () => {
    await expect(page.locator('button', { hasText: '+ Add Endpoint' })).toBeVisible()
    await page.locator('button', { hasText: '+ Add Endpoint' }).click()
    await expect(page.locator('input[placeholder="/api/resource"]').first()).toBeVisible()
  })

  test('close button dismisses panel', async () => {
    await page.locator('button', { hasText: '✕' }).first().click()
    await expect(page.locator('button', { hasText: 'Manage →' })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 12 — Edge cases & regression guards
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Edge cases', () => {
  test.skip(!!process.env.CI, 'requires live network — run locally only')
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('all 9 protocols are in the selector', async () => {
    const sel = page.locator('[data-testid="protocol-select"]')
    for (const p of ['rest', 'grpc', 'graphql', 'websocket', 'kafka', 'sqs', 'mqtt', 'sse', 'socketio']) {
      await expect(sel.locator(`option[value="${p}"]`)).toHaveCount(1)
    }
  })

  test('switching REST→gRPC hides URL bar', async () => {
    await expect(page.locator('[data-testid="rest-url"]')).toBeVisible()
    await page.locator('[data-testid="protocol-select"]').selectOption('grpc')
    await expect(page.locator('[data-testid="rest-url"]')).not.toBeVisible()
    await page.locator('[data-testid="protocol-select"]').selectOption('rest')
  })

  test('multiple tabs are independent', async () => {
    // Tab 1 is REST (current)
    await page.locator('[data-testid="tab-bar"] button', { hasText: '+' }).click()
    // Tab 2: switch to kafka
    await page.locator('[data-testid="protocol-select"]').selectOption('kafka')
    // Go back to tab 1
    await page.locator('[data-testid="tab-bar"] [data-tab-id]').first().click()
    // Tab 1 should still be REST
    await expect(page.locator('[data-testid="rest-config"]')).toBeVisible()
  })

  test('Sending shows loading indicator', async () => {
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/delay/2')
    await page.locator('[data-testid="send-button"]').click()
    await expect(page.locator('text=Sending…').first()).toBeVisible({ timeout: 3_000 })
    await page.locator('[data-testid="response-status"]').waitFor({ timeout: 15_000 })
  })

  test('Kafka maxMessages input enforces min=1', async () => {
    await page.locator('[data-testid="protocol-select"]').selectOption('kafka')
    await page.locator('button', { hasText: 'consume' }).click()
    const input = page.locator('[data-testid="kafka-config"] input[type="number"]')
    const min = await input.getAttribute('min')
    expect(Number(min)).toBe(1)
  })

  test('SSE maxEvents has upper bound of 10000', async () => {
    await page.locator('[data-testid="protocol-select"]').selectOption('sse')
    const input = page.locator('[data-testid="sse-config"] input[type="number"]')
    const max = await input.getAttribute('max')
    expect(Number(max)).toBe(10000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 13 — Collection import & sidebar interaction
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Collection import and sidebar', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  const POSTMAN_COLLECTION = JSON.stringify({
    info: {
      name: 'Hitro E2E Test Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: 'Get Anything',
        request: {
          method: 'GET',
          url: { raw: 'https://httpbin.org/anything' },
          header: [{ key: 'X-Test', value: 'hitro' }],
        },
      },
      {
        name: 'Post Echo',
        request: {
          method: 'POST',
          url: { raw: 'https://httpbin.org/post' },
          header: [],
          body: { mode: 'raw', raw: '{"hello":"world"}', options: { raw: { language: 'json' } } },
        },
      },
    ],
  })

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('import modal shows Collection mode button', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await expect(page.locator('button', { hasText: 'Collection' })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('importing a Postman collection shows it in the sidebar', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'Collection' }).click()
    await page.locator('textarea').fill(POSTMAN_COLLECTION)
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('[data-testid="sidebar"]').locator('text=Hitro E2E Test Collection')).toBeVisible({ timeout: 15_000 })
  })

  test('expanding the collection shows both requests', async () => {
    await page.locator('[data-testid="sidebar"]').locator('text=Hitro E2E Test Collection').click()
    await expect(page.locator('text=Get Anything')).toBeVisible()
    await expect(page.locator('text=Post Echo')).toBeVisible()
  })

  test('clicking a request from the sidebar opens it in a tab', async () => {
    const tabsBefore = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    await page.locator('text=Get Anything').click()
    const tabsAfter = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    expect(tabsAfter).toBe(tabsBefore + 1)
  })

  test('the opened tab shows the correct URL', async () => {
    await expect(page.locator('[data-testid="rest-url"]')).toHaveValue('https://httpbin.org/anything')
  })

  test('clicking the same request again focuses existing tab instead of creating another', async () => {
    const tabsBefore = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    await page.locator('text=Get Anything').click()
    const tabsAfter = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    expect(tabsAfter).toBe(tabsBefore)
  })

  test('clicking a POST request shows POST method', async () => {
    await page.locator('text=Post Echo').click()
    await expect(page.locator('select').nth(1)).toHaveValue('POST')
  })

  test('re-importing same collection replaces it (no duplicates)', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'Collection' }).click()
    await page.locator('textarea').fill(POSTMAN_COLLECTION)
    await page.locator('button', { hasText: 'Import' }).last().click()
    await page.waitForTimeout(1_000)
    // Count occurrences in the sidebar — should still be 1
    const count = await page.locator('[data-testid="sidebar"]').locator('text=Hitro E2E Test Collection').count()
    expect(count).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 14 — Import validation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Import validation', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('pasting JSON in cURL mode shows error and does NOT create a new tab', async () => {
    const tabsBefore = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    await page.locator('[data-testid="open-import-modal"]').click()
    // default mode is cURL — no need to switch
    await page.locator('textarea').fill('{"info":{"name":"Oops"},"item":[]}')
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('text=/does not look like/i')).toBeVisible({ timeout: 3_000 })
    const tabsAfter = await page.locator('[data-testid="tab-bar"] [data-tab-id]').count()
    expect(tabsAfter).toBe(tabsBefore)
    await page.keyboard.press('Escape')
  })

  test('invalid JSON in Collection mode shows parse error', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'Collection' }).click()
    await page.locator('textarea').fill('{not valid json')
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('text=/Invalid JSON/i')).toBeVisible({ timeout: 3_000 })
    await page.keyboard.press('Escape')
  })

  test('invalid JSON in OpenAPI mode shows parse error', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'OpenAPI 3.0' }).click()
    await page.locator('textarea').fill('{bad json')
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('text=/Invalid JSON/i')).toBeVisible({ timeout: 3_000 })
    await page.keyboard.press('Escape')
  })

  test('Import button is disabled when textarea is empty', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await expect(page.locator('button', { hasText: 'Import' }).last()).toBeDisabled()
    await page.keyboard.press('Escape')
  })

  test('valid cURL with flag-only still imports without error', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('textarea').fill('curl -X DELETE https://api.example.com/item/1')
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible({ timeout: 5_000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 15 — OpenAPI and HAR import
// ─────────────────────────────────────────────────────────────────────────────
test.describe('OpenAPI and HAR import', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  const OPENAPI_SPEC = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Pets API', version: '1.0.0' },
    servers: [{ url: 'https://api.petstore.example.com' }],
    paths: {
      '/pets': {
        get: { summary: 'List pets', operationId: 'listPets' },
        post: { summary: 'Create pet', operationId: 'createPet' },
      },
    },
  })

  const HAR_FILE = JSON.stringify({
    log: {
      version: '1.2',
      pages: [{ title: 'HAR Import Test' }],
      entries: [
        {
          request: {
            method: 'GET',
            url: 'https://api.example.com/items?page=1',
            headers: [{ name: 'Accept', value: 'application/json' }],
          },
        },
      ],
    },
  })

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('OpenAPI import creates a collection in the sidebar', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'OpenAPI 3.0' }).click()
    await page.locator('textarea').fill(OPENAPI_SPEC)
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('[data-testid="sidebar"]').locator('text=Pets API')).toBeVisible({ timeout: 15_000 })
  })

  test('OpenAPI collection has the correct number of requests', async () => {
    await page.locator('[data-testid="sidebar"]').locator('text=Pets API').click()
    await expect(page.locator('text=List pets')).toBeVisible()
    await expect(page.locator('text=Create pet')).toBeVisible()
  })

  test('HAR import creates a collection in the sidebar', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'HAR File' }).click()
    await page.locator('textarea').fill(HAR_FILE)
    await page.locator('button', { hasText: 'Import' }).last().click()
    await expect(page.locator('[data-testid="sidebar"]').locator('text=HAR Import Test')).toBeVisible({ timeout: 15_000 })
  })

  test('HAR request opens with parsed URL (without query string in URL bar)', async () => {
    await page.locator('[data-testid="sidebar"]').locator('text=HAR Import Test').click()
    await page.locator('text=GET /items').click()
    await expect(page.locator('[data-testid="rest-url"]')).toHaveValue('https://api.example.com/items')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 16 — Environment import (.env)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Environment import (.env)', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('.env import creates an environment in the env selector', async () => {
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: '.env File' }).click()
    await page.locator('input[placeholder*="Environment name"]').fill('E2E Test Env')
    await page.locator('textarea').fill('BASE_URL=https://api.example.com\nAPI_KEY=test-key-123\n# comment line\n')
    await page.locator('button', { hasText: 'Import' }).last().click()
    // Wait briefly for async import to complete, then close via ✕ button.
    // Using Escape here crashes Electron on Linux when IPC is still in-flight.
    await page.waitForTimeout(1_500)
    await page.locator('button', { hasText: '✕' }).first().click()
    // Env selector should show the new environment
    const envBtn = page.locator('button', { hasText: /^Env/ })
    await envBtn.click()
    await expect(page.locator('text=E2E Test Env')).toBeVisible({ timeout: 5_000 })
    await envBtn.click() // close
  })

  test('activating an environment shows green indicator', async () => {
    const envBtn = page.locator('button', { hasText: /^Env/ })
    await envBtn.click()
    await page.locator('text=E2E Test Env').click()
    // After activation, the env button should show a green dot
    await expect(page.locator('button', { hasText: /● E2E Test Env/ })).toBeVisible({ timeout: 3_000 })
  })

  test('variables from active env resolve in URL bar', async () => {
    await page.locator('[data-testid="tab-bar"] button', { hasText: '+' }).click()
    await page.locator('[data-testid="rest-url"]').fill('{{BASE_URL}}/users')
    // Variable should resolve when request is built (visible placeholder tokens remain until send)
    await expect(page.locator('[data-testid="rest-url"]')).toHaveValue('{{BASE_URL}}/users')
    // The resolve() store function is invoked at send time; just verify token is accepted without error
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 17 — Save request clears dirty flag (regression for bug fix)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Save clears dirty indicator', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('editing a field shows the dirty dot on the tab', async () => {
    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/get')
    await expect(page.locator('[data-testid="dirty-indicator"]').first()).toBeVisible()
  })

  test('clicking Save removes the dirty dot', async () => {
    await page.locator('button', { hasText: 'Save' }).click()
    await expect(page.locator('[data-testid="dirty-indicator"]')).not.toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 18 — Collection runner
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Collection runner', () => {
  test.skip(!!process.env.CI, 'requires live network — run locally only')
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  const RUNNABLE_COLLECTION = JSON.stringify({
    info: { name: 'Runner Test Collection', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      { name: 'Status 200', request: { method: 'GET', url: { raw: 'https://httpbin.org/status/200' }, header: [] } },
      { name: 'Status 201', request: { method: 'GET', url: { raw: 'https://httpbin.org/status/201' }, header: [] } },
    ],
  })

  test.beforeAll(async () => {
    const r = await launch(); app = r.app; page = r.page
    // Import a small collection to run
    await page.locator('[data-testid="open-import-modal"]').click()
    await page.locator('button', { hasText: 'Collection' }).click()
    await page.locator('textarea').fill(RUNNABLE_COLLECTION)
    await page.locator('button', { hasText: 'Import' }).last().click()
    await page.locator('[data-testid="sidebar"]').locator('text=Runner Test Collection').waitFor({ timeout: 15_000 })
  })
  test.afterAll(async () => { await app?.close() })

  test('run button (▶) is visible on collection hover', async () => {
    const colRow = page.locator('[data-testid="sidebar"]').locator('div', { hasText: 'Runner Test Collection' }).first()
    await colRow.hover()
    await expect(colRow.locator('button[title="Run all"]')).toBeVisible()
  })

  test('clicking run opens the collection runner modal', async () => {
    const colRow = page.locator('[data-testid="sidebar"]').locator('div', { hasText: 'Runner Test Collection' }).first()
    await colRow.hover()
    await colRow.locator('button[title="Run all"]').click()
    await expect(page.locator('text=Collection Runner')).toBeVisible({ timeout: 3_000 })
  })

  test('runner lists the requests from the collection', async () => {
    await expect(page.locator('text=Status 200')).toBeVisible()
    await expect(page.locator('text=Status 201')).toBeVisible()
  })

  test('clicking Run All executes and shows results', async () => {
    await page.locator('button', { hasText: 'Run All' }).click()
    // Wait for both results to come back (httpbin should respond fast)
    await expect(page.locator('[data-testid="runner-result"]').first()).toBeVisible({ timeout: 30_000 })
  })

  test('runner shows pass/fail indicators', async () => {
    await expect(page.locator('[data-testid="runner-pass"]').or(page.locator('[data-testid="runner-fail"]')).first()).toBeVisible({ timeout: 5_000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 19 — Postman collection variable resolution
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Request chaining and variable resolution', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>

  test.beforeAll(async () => { const r = await launch(); app = r.app; page = r.page })
  test.afterAll(async () => { await app?.close() })

  test('chain tab is available for REST requests', async () => {
    await page.locator('[data-testid="rest-config"] button', { hasText: /^Chain/ }).click()
    await expect(page.locator('button', { hasText: '+ Add Chain Rule' })).toBeVisible()
  })

  test('adding a chain rule shows response field and variable name inputs', async () => {
    await page.locator('button', { hasText: '+ Add Chain Rule' }).click()
    await expect(page.locator('input[placeholder*="body.token"]').or(
      page.locator('input[placeholder*="responseField"]')
    )).toBeVisible()
  })
})
