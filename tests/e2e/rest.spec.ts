import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

const appPath = path.resolve(__dirname, '../../')

test.describe('REST adapter', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>

  test.beforeAll(async () => {
    const userDataDir = mkdtempSync(path.join(tmpdir(), 'hitro-test-'))
    app = await electron.launch({
      args: [appPath, `--user-data-dir=${userDataDir}`],
      env: { ...process.env, HITRO_DEV_TOOLS: '0' },
    })
    const page = await app.firstWindow()
    await page.waitForSelector('[data-testid="send-button"]', { timeout: 30_000 })
  })

  test.afterAll(async () => {
    await app?.close()
  })

  test.beforeEach(async () => {
    const page = await app.firstWindow()
    const protocolSelector = page.locator('[data-testid="protocol-select"]')
    await protocolSelector.selectOption('rest')
  })

  test('sends a GET request and displays a status code', async () => {
    const page = await app.firstWindow()

    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/get')
    await page.locator('[data-testid="send-button"]').click()

    // Wait up to 15s for a response from the public echo server
    await expect(page.locator('[data-testid="response-status"]')).toHaveText('200', { timeout: 15_000 })
  })

  test('shows an error for an unreachable host', async () => {
    const page = await app.firstWindow()

    await page.locator('[data-testid="rest-url"]').fill('http://localhost:1')
    await page.locator('[data-testid="send-button"]').click()

    await expect(page.locator('[data-testid="response-error"]')).toBeVisible({ timeout: 10_000 })
  })

  test('assertion passes when status eq 200', async () => {
    const page = await app.firstWindow()

    await page.locator('[data-testid="rest-url"]').fill('https://httpbin.org/status/200')
    // Navigate to the Assertions sub-tab in the request builder
    await page.locator('button', { hasText: /^Assertions/ }).first().click()
    // Add assertion: status eq 200
    await page.locator('[data-testid="add-assertion"]').click()
    await page.locator('[data-testid="assertion-field"]').last().fill('status')
    await page.locator('[data-testid="assertion-operator"]').last().selectOption('eq')
    await page.locator('[data-testid="assertion-expected"]').last().fill('200')

    await page.locator('[data-testid="send-button"]').click()
    // Wait for response, then inspect assertions in the response panel
    await page.locator('[data-testid="response-status"]').waitFor({ timeout: 15_000 })
    await page.locator('[data-testid="response-panel"] button', { hasText: /^Assertions/ }).click()

    await expect(page.locator('[data-testid="assertion-result-pass"]')).toBeVisible({ timeout: 5_000 })
  })
})
