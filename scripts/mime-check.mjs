/* global Buffer, console */
import { chromium } from 'playwright'
import JSZip from 'jszip'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

await mkdir('test-results', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ acceptDownloads: true })
  await page.goto('http://127.0.0.1:4173/')
  const group = '東京支店'.repeat(16)
  const subject = '月次報告'.repeat(30)
  await page.getByLabel('Choose XLSX or CSV file').setInputFiles({
    name: 'unicode.csv', mimeType: 'text/csv',
    buffer: Buffer.from(`Employee,Department,Email\nAlice,${group},tanaka@example.com\n`),
  })
  await page.getByLabel('Split reports by').selectOption('1')
  await page.getByLabel('Recipient email column').selectOption('2')
  await page.getByLabel('Subject').fill(subject)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Generate & download ZIP/ }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error('No download path')
  const zip = await JSZip.loadAsync(await readFile(downloadPath))
  const emailName = Object.keys(zip.files).find((name) => name.endsWith('.eml'))
  if (!emailName) throw new Error('No EML file in ZIP')
  const email = zip.file(emailName)
  if (!email) throw new Error('EML file missing from ZIP')
  await writeFile('test-results/unicode.eml', await email.async('uint8array'))
  console.log(`Wrote ${emailName}`)
} finally {
  await browser.close()
}
