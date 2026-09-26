import { expect, test } from '@playwright/test'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'

test('CSV workflow downloads two reports and matching email drafts without transmitting data', async ({ page }) => {
  const requests: { method: string; url: string }[] = []
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Stop splitting spreadsheets manually.' })).toBeVisible()
  const sentinel = 'PRIVATE_SENTINEL_8792'
  await page.getByLabel('Choose XLSX or CSV file').setInputFiles({
    name: 'source.csv', mimeType: 'text/csv',
    buffer: Buffer.from(`Employee,Department,Manager Email\n${sentinel},Tokyo,tanaka@example.com\nBob,Tokyo,tanaka@example.com\nCarol,Osaka,sato@example.com\n`),
  })
  await expect(page.getByText('File ready. Check the data')).toBeVisible()
  await page.getByLabel('Split reports by').selectOption('1')
  await page.getByLabel('Recipient email column').selectOption('2')
  await expect(page.getByText('2', { exact: true }).first()).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Generate & download ZIP/ }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).not.toBeNull()
  const zip = await JSZip.loadAsync(await import('node:fs/promises').then((fs) => fs.readFile(path!)))
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir)
  expect(names.filter((name) => name.endsWith('.xlsx'))).toHaveLength(2)
  expect(names.filter((name) => name.endsWith('.eml'))).toHaveLength(2)
  const tokyo = new ExcelJS.Workbook()
  await tokyo.xlsx.load(Buffer.from(await zip.file(names.find((name) => name.includes('Tokyo') && name.endsWith('.xlsx'))!)!.async('uint8array')) as never)
  expect(tokyo.worksheets[0].getCell('A2').value).toBe(sentinel)
  expect(tokyo.worksheets[0].rowCount).toBe(3)
  const base = process.env.REPORTBURST_BASE_URL ?? 'http://127.0.0.1:5173'
  expect(requests.every((request) => request.method === 'GET' && request.url.startsWith(`${base}/`))).toBe(true)
  expect(requests.some((request) => request.url.includes(sentinel))).toBe(false)
})

test('XLSX with conflicting recipients requires an explicit resolution', async ({ page }) => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Data')
  sheet.addRows([
    ['Employee', 'Department', 'Manager Email'],
    ['Alice', 'Tokyo', 'tanaka@example.com'],
    ['Bob', 'Tokyo', 'other@example.com'],
  ])
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer())
  await page.goto('/')
  await page.getByLabel('Choose XLSX or CSV file').setInputFiles({ name: 'conflict.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: bytes })
  await expect(page.getByText('File ready. Check the data')).toBeVisible()
  await page.getByLabel('Split reports by').selectOption('1')
  await page.getByLabel('Recipient email column').selectOption('2')
  await expect(page.getByText('Multiple recipient emails found.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate & download ZIP/ })).toBeDisabled()
  await page.getByLabel('Recipient action').selectOption('report-only')
  await expect(page.getByRole('button', { name: /Generate & download ZIP/ })).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Generate & download ZIP/ }).click()
  const downloaded = await downloadPromise
  const downloadedPath = await downloaded.path()
  const zip = await JSZip.loadAsync(await import('node:fs/promises').then((fs) => fs.readFile(downloadedPath!)))
  const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir)
  expect(files.filter((name) => name.endsWith('.xlsx'))).toHaveLength(1)
  expect(files.filter((name) => name.endsWith('.eml'))).toHaveLength(0)
  const report = new ExcelJS.Workbook()
  await report.xlsx.load(Buffer.from(await zip.file(files[0])!.async('uint8array')) as never)
  expect(report.worksheets[0].getCell('A2').value).toBe('Alice')
  expect(report.worksheets[0].getCell('A3').value).toBe('Bob')
})

test('does not cap report generation at five groups', async ({ page }) => {
  const csv = ['Employee,Department', ...Array.from({ length: 7 }, (_, index) => `Person ${index},Group ${index}`)].join('\n')
  await page.goto('/')
  await page.getByLabel('Choose XLSX or CSV file').setInputFiles({ name: 'seven.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByLabel('Split reports by').selectOption('1')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Generate & download ZIP/ }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  const zip = await JSZip.loadAsync(await import('node:fs/promises').then((fs) => fs.readFile(downloadPath!)))
  expect(Object.keys(zip.files).filter((name) => name.endsWith('.xlsx'))).toHaveLength(7)
  expect(Object.keys(zip.files).filter((name) => name.endsWith('.eml'))).toHaveLength(0)
})

test('missing recipients and blank split values require visible decisions', async ({ page }) => {
  const csv = 'Employee,Department,Manager Email\nAlice,Tokyo,\nBob,,b@example.com\n'
  await page.goto('/')
  await page.getByLabel('Choose XLSX or CSV file').setInputFiles({ name: 'issues.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByLabel('Split reports by').selectOption('1')
  await page.getByLabel('Recipient email column').selectOption('2')
  await expect(page.getByText('No recipient email found.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate & download ZIP/ })).toBeDisabled()
  await page.getByLabel('Rows without a split value').selectOption('exclude')
  await page.getByLabel('Recipient action').selectOption('report-only')
  await expect(page.getByRole('button', { name: /Generate & download ZIP/ })).toBeEnabled()
})

test('Chinese interface persists and keeps edited email text when switching languages', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Language').selectOption('zh-CN')
  await expect(page.getByRole('heading', { name: '不再手动拆分表格。' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await page.getByLabel('选择 XLSX 或 CSV 文件').setInputFiles({
    name: 'sample.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Employee,Department,Manager Email\nAlice,Tokyo,tanaka@example.com\nBob,Tokyo,other@example.com\n'),
  })
  await expect(page.getByText('文件已就绪。请在下方核对数据并配置报表。')).toBeVisible()
  await page.getByLabel('按此列拆分报表').selectOption('1')
  await page.getByLabel('收件人邮箱列').selectOption('2')
  await expect(page.getByText('发现多个收件人邮箱。请选择一个，或仅生成报表。')).toBeVisible()
  await expect(page.getByLabel('主题')).toHaveValue('{Group} 报表 - {Date}')
  await expect(page.getByLabel('文件名模板')).toHaveValue('{Group} - 报表 - {YYYY-MM-DD}.xlsx')
  await page.getByLabel('主题').fill('Custom {Group}')
  await page.getByLabel('语言').selectOption('en')
  await expect(page.getByLabel('Subject')).toHaveValue('Custom {Group}')
  await page.getByLabel('Language').selectOption('zh-CN')
  await expect(page.getByLabel('主题')).toHaveValue('Custom {Group}')
  await page.reload()
  await expect(page.getByRole('heading', { name: '不再手动拆分表格。' })).toBeVisible()
  await expect(page.getByLabel('语言')).toHaveValue('zh-CN')
  await page.setViewportSize({ width: 375, height: 760 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByLabel('语言')).toBeInViewport()
})
