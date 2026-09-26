/* global Buffer */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

await mkdir('test-results', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.goto('http://127.0.0.1:5173/')
await page.screenshot({ path: 'test-results/home.png', fullPage: true })
await page.getByLabel('Choose XLSX or CSV file').setInputFiles({
  name: 'sample.csv', mimeType: 'text/csv',
  buffer: Buffer.from('Employee,Department,Manager Email\nAlice,Tokyo,t@example.com\nBob,Osaka,o@example.com\n'),
})
await page.getByLabel('Split reports by').selectOption('1')
await page.getByLabel('Recipient email column').selectOption('2')
await page.screenshot({ path: 'test-results/workflow.png', fullPage: true })
await browser.close()
if (errors.length) throw new Error(errors.join('\n'))
