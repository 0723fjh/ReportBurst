/* global window, setInterval, clearInterval, Buffer, performance, console */
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const count of [1_000, 10_000, 50_000, 100_000]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
    page.setDefaultTimeout(120_000)
    await page.goto('http://127.0.0.1:5173/')
    await page.getByRole('heading', { name: 'Stop splitting spreadsheets manually.' }).waitFor()
    await page.evaluate(() => { window.__ticks = 0; window.__timer = setInterval(() => { window.__ticks += 1 }, 100) })
    const lines = ['Employee,Department,Manager Email']
    for (let index = 0; index < count; index += 1) {
      const group = index % 5
      lines.push(`Employee ${index},Group ${group},manager${group}@example.com`)
    }
    const input = Buffer.from(`${lines.join('\n')}\n`)
    const parseStart = performance.now()
    await page.getByLabel('Choose XLSX or CSV file').setInputFiles({ name: 'performance.csv', mimeType: 'text/csv', buffer: input })
    await page.getByText('File ready. Check the data').waitFor()
    const parsedMs = Math.round(performance.now() - parseStart)
    const responsiveTicks = await page.evaluate(() => { clearInterval(window.__timer); return window.__ticks })
    await page.getByLabel('Split reports by').selectOption('1')
    await page.getByLabel('Recipient email column').selectOption('2')
    const exportStart = performance.now()
    const downloadPromise = page.waitForEvent('download', { timeout: 120_000 })
    await page.getByRole('button', { name: /Generate & download ZIP/ }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    const exportMs = Math.round(performance.now() - exportStart)
    console.log(JSON.stringify({ rows: count, inputBytes: input.length, parsedMs, responsiveTicks, exportMs, downloaded: Boolean(downloadPath) }))
    await page.close()
  }
} finally {
  await browser.close()
}
