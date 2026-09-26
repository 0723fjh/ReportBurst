import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { buildPlan, safeFilename } from '../src/core/plan'
import { makeArchive, makeEmail } from '../src/core/export'
import { detectHeaderRow, parseSpreadsheet } from '../src/core/workbook'
import type { PlanConfig } from '../src/core/types'

async function sampleFile(): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Data')
  sheet.getColumn(1).width = 22
  sheet.addRow(['Employee', 'Department', 'Manager Email', 'Amount'])
  sheet.getRow(1).font = { bold: true }
  sheet.addRow(['Alice', 'Tokyo', 'tanaka@example.com', 12.5])
  sheet.addRow(['Bob', 'Tokyo', 'tanaka@example.com', 20])
  sheet.addRow(['Carol', 'Osaka', 'sato@example.com', 15])
  sheet.getCell('D2').numFmt = '$0.00'
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
  return new File([bytes], 'master.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

async function config(): Promise<PlanConfig> {
  const book = await parseSpreadsheet(await sampleFile())
  return {
    sheet: book.sheets[0], headerRow: 0, splitColumn: 1, recipientColumn: 2,
    filenameTemplate: '{Group} - Report - {YYYY-MM-DD}.xlsx',
    subjectTemplate: '{Group} Report - {Date}',
    bodyTemplate: 'Hello {Group}, {Rows} rows in {FileName}',
    sourceName: book.sourceName, date: '2026-09-24', decisions: {}, unassignedDecision: 'include',
  }
}

describe('workbook and generation plan', () => {
  it('reads XLSX, detects the header, and groups without mixing rows', async () => {
    const input = await config()
    expect(detectHeaderRow(input.sheet)).toBe(0)
    const plan = buildPlan(input)
    expect(plan.blocked).toBe(false)
    expect(plan.items.map((item) => [item.group, item.rowIndices.length, item.recipient])).toEqual([
      ['Tokyo', 2, 'tanaka@example.com'], ['Osaka', 1, 'sato@example.com'],
    ])
  })

  it('detects a header below a report title and blocks merged cells', async () => {
    const csv = new File(['Weekly training report,,\nEmployee,Department,Email\nAlice,Tokyo,t@example.com\n'], 'titled.csv')
    const book = await parseSpreadsheet(csv)
    expect(detectHeaderRow(book.sheets[0])).toBe(1)
    const input = await config()
    input.sheet.merged = true
    expect(buildPlan(input).issues.some((issue) => issue.code === 'merged-cells')).toBe(true)
  })

  it('exports readable per-group workbooks and matching email attachments', async () => {
    const plan = buildPlan(await config())
    const blob = await makeArchive(plan)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir)
    expect(files).toEqual([
      'reports/Tokyo - Report - 2026-09-24.xlsx',
      'emails/Tokyo - Report - 2026-09-24.eml',
      'reports/Osaka - Report - 2026-09-24.xlsx',
      'emails/Osaka - Report - 2026-09-24.eml',
    ])
    const reportBytes = await zip.file(files[0])!.async('uint8array')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(reportBytes) as never)
    const output = workbook.worksheets[0]
    expect(output.rowCount).toBe(3)
    expect(output.getCell('A2').value).toBe('Alice')
    expect(output.getCell('A3').value).toBe('Bob')
    expect(output.getCell('D2').numFmt).toBe('$0.00')
    const eml = await zip.file(files[1])!.async('string')
    expect(eml).toContain('To: tanaka@example.com')
    expect(eml).toContain('filename*=UTF-8\'\'Tokyo%20-%20Report%20-%202026-09-24.xlsx')
    expect(eml).toContain(Buffer.from(reportBytes).toString('base64').slice(0, 76))
  })

  it('requires a decision for conflicting recipients', async () => {
    const input = await config()
    input.sheet.rows[2][2].value = 'other@example.com'
    input.sheet.rows[2][2].display = 'other@example.com'
    const unresolved = buildPlan(input)
    expect(unresolved.blocked).toBe(true)
    expect(unresolved.items[0].candidates).toEqual(['tanaka@example.com', 'other@example.com'])
    input.decisions = { 'text:Tokyo': { mode: 'manual', email: 'other@example.com' } }
    expect(buildPlan(input).blocked).toBe(false)
  })

  it('keeps blank split rows visible until the user chooses to include or exclude them', async () => {
    const input = await config()
    input.sheet.rows[2][1].value = null
    input.sheet.rows[2][1].display = ''
    input.unassignedDecision = 'pending'
    const unresolved = buildPlan(input)
    expect(unresolved.items.find((item) => item.id === 'blank:')?.rowIndices).toEqual([2])
    expect(unresolved.blocked).toBe(true)
    input.unassignedDecision = 'exclude'
    const resolved = buildPlan(input)
    expect(resolved.blocked).toBe(false)
    expect(resolved.items.find((item) => item.id === 'blank:')?.included).toBe(false)
  })

  it('keeps sanitized filenames unique and safely wraps Unicode email headers', async () => {
    const input = await config()
    input.sheet.rows[1][1].value = 'A/B'
    input.sheet.rows[1][1].display = 'A/B'
    input.sheet.rows[2][1].value = 'A?B'
    input.sheet.rows[2][1].display = 'A?B'
    input.recipientColumn = null
    const plan = buildPlan(input)
    expect(plan.items[0].filename).toMatch(/^A-B - Report/)
    expect(plan.items[1].filename).toMatch(/\(2\)\.xlsx$/)

    const item = { ...plan.items[0], filename: `${'東京'.repeat(45)}.xlsx`, recipient: 'tanaka@example.com', emailMode: 'ready' as const, subject: '月次報告'.repeat(30), body: 'こんにちは、資料をご確認ください。' }
    const eml = makeEmail(item, new Uint8Array([1, 2, 3]))
    expect(eml).toContain('filename*0*=UTF-8')
    expect(eml).toContain('filename*1*=')
    expect(eml).toContain('Content-Transfer-Encoding: base64')
    expect(eml.split('\r\n').every((line) => line.length < 998)).toBe(true)
  })

  it('preserves CSV strings and blocks formulas instead of exporting broken references', async () => {
    const csv = new File(['Employee,Department,Email\n"=2+2",Tokyo,t@example.com\n'], 'input.csv')
    const book = await parseSpreadsheet(csv)
    expect(book.sheets[0].rows[1][0].value).toBe('=2+2')
    const csvPlan = buildPlan({
      sheet: book.sheets[0], headerRow: 0, splitColumn: 1, recipientColumn: null,
      filenameTemplate: '{Group}.xlsx', subjectTemplate: '{Group}', bodyTemplate: '{Rows}',
      sourceName: 'input.csv', date: '2026-09-24', decisions: {}, unassignedDecision: 'include',
    })
    const csvZip = await JSZip.loadAsync(await (await makeArchive(csvPlan)).arrayBuffer())
    const csvReport = await csvZip.file('reports/Tokyo.xlsx')!.async('uint8array')
    const output = new ExcelJS.Workbook()
    await output.xlsx.load(Buffer.from(csvReport) as never)
    expect(output.worksheets[0].getCell('A2').value).toBe('=2+2')
    const input = await config()
    input.sheet.rows[1][3].formula = 'D3+1'
    expect(buildPlan(input).issues.some((issue) => issue.code === 'complex-cell')).toBe(true)
  })

  it('parses 100,000 CSV rows without exceeding the argument limit', async () => {
    const csv = new File([`Name,Group\n${'Alice,Tokyo\n'.repeat(100_000)}`], 'large.csv')
    const book = await parseSpreadsheet(csv)
    expect(book.sheets[0].rows).toHaveLength(100_001)
    expect(book.sheets[0].rows[100_000][1].value).toBe('Tokyo')
  })

  it('sanitizes names and distinguishes collisions', () => {
    expect(safeFilename('CON', 'xlsx')).toBe('_CON.xlsx')
    expect(safeFilename('../A:B? ', 'xlsx')).not.toContain('/')
  })
})
