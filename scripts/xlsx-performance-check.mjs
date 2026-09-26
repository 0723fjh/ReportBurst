/* global Buffer, performance, console */
import { chromium } from 'playwright'
import ExcelJS from 'exceljs'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const count = 50_000
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Data')
  sheet.addRow(['Employee', 'Department', 'Manager Email'])
  for (let index = 0; index < count; index += 1) {
    const group = index % 5
    sheet.addRow([`Employee ${index}`, `Group ${group}`, `manager${group}@example.com`])
  }
  const file = Buffer.from(await workbook.xlsx.writeBuffer())
  const page = await browser.newPage({ acceptDownloads: true })
  page.setDefaultTimeout(120_000)
  await page.goto('http://127.0.0.1:4173/')
  const start = performance.now()
  await page.getByLabel('Choose XLSX or CSV file').setInputFiles({ name: 'performance.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: file })
  await page.getByText('File ready. Check the data').waitFor()
  const parseMs = Math.round(performance.now() - start)
  await page.getByLabel('Split reports by').selectOption('1')
  await page.getByLabel('Recipient email column').selectOption('2')
  const exportStart = performance.now()
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: /Generate & download ZIP/ }).click()
  const download = await downloadPromise
  console.log(JSON.stringify({ rows: count, bytes: file.length, parseMs, exportMs: Math.round(performance.now() - exportStart), downloaded: Boolean(await download.path()) }))
  await page.close()
} finally {
  await browser.close()
}
