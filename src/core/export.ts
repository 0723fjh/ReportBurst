import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import type { CellData, GenerationPlan, ReportPlanItem } from './types'

function copyCell(source: CellData, target: ExcelJS.Cell): void {
  if (source.formula || source.unsupported) throw new Error('This sheet contains a cell that cannot be safely split.')
  target.value = source.value
  if (source.style) target.style = structuredClone(source.style) as ExcelJS.Style
}

export async function makeReport(plan: GenerationPlan, item: ReportPlanItem): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Report')
  plan.sheet.widths.forEach((width, index) => { if (width) sheet.getColumn(index + 1).width = width })
  const sourceIndices = [plan.headerRow, ...item.rowIndices]
  sourceIndices.forEach((sourceIndex, outputIndex) => {
    const sourceRow = plan.sheet.rows[sourceIndex]
    const outputRow = sheet.getRow(outputIndex + 1)
    if (plan.sheet.heights[sourceIndex]) outputRow.height = plan.sheet.heights[sourceIndex]
    sourceRow.forEach((cell, columnIndex) => copyCell(cell, outputRow.getCell(columnIndex + 1)))
    outputRow.commit()
  })
  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function wrappedBase64(bytes: Uint8Array): string {
  return base64(bytes).match(/.{1,76}/g)?.join('\r\n') ?? ''
}

function encodedWord(value: string): string {
  const parts: string[] = []
  let segment = ''
  let bytes = 0
  for (const character of value) {
    const size = new TextEncoder().encode(character).length
    if (bytes + size > 45 && segment) {
      parts.push(`=?UTF-8?B?${base64(new TextEncoder().encode(segment))}?=`)
      segment = ''
      bytes = 0
    }
    segment += character
    bytes += size
  }
  if (segment || !parts.length) parts.push(`=?UTF-8?B?${base64(new TextEncoder().encode(segment))}?=`)
  return parts.join('\r\n ')
}

function filenameParameters(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').slice(0, 60)
  const segments: string[] = []
  let current = ''
  for (const character of filename) {
    const encoded = encodeURIComponent(character).replace(/[!'()*]/g, (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`)
    if (current.length + encoded.length > 50 && current) {
      segments.push(current)
      current = ''
    }
    current += encoded
  }
  if (current) segments.push(current)
  if (segments.length <= 1) return `filename*=UTF-8''${segments[0] ?? ''}; filename="${fallback}"`
  return [...segments.map((segment, index) => `filename*${index}*=${index === 0 ? "UTF-8''" : ''}${segment}`), `filename="${fallback}"`].join(';\r\n ')
}

export function makeEmail(item: ReportPlanItem, attachment: Uint8Array): string {
  if (!item.recipient || item.emailMode !== 'ready') throw new Error('A recipient must be confirmed before creating an email draft.')
  if (/[\r\n]/.test(item.recipient) || /[\r\n]/.test(item.subject)) throw new Error('Invalid email header.')
  const boundary = `reportburst-${crypto.randomUUID()}`
  const fallbackName = item.filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').slice(0, 60)
  return [
    `To: ${item.recipient}`,
    `Subject: ${encodedWord(item.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrappedBase64(new TextEncoder().encode(item.body)),
    `--${boundary}`,
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${fallbackName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; ${filenameParameters(item.filename)}`,
    '',
    wrappedBase64(attachment),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

export async function makeArchive(plan: GenerationPlan, onStage?: (stage: string) => void): Promise<Blob> {
  if (plan.blocked) throw new Error('Resolve the issues in Preview before generating files.')
  const included = plan.items.filter((item) => item.included)
  if (!included.length) throw new Error('Select at least one report to generate.')
  const zip = new JSZip()
  for (let index = 0; index < included.length; index += 1) {
    const item = included[index]
    onStage?.(`Generating report ${index + 1} of ${included.length}…`)
    const report = await makeReport(plan, item)
    zip.file(`reports/${item.filename}`, report)
    if (item.emailMode === 'ready') {
      const emailName = item.filename.replace(/\.xlsx$/i, '.eml')
      zip.file(`emails/${emailName}`, makeEmail(item, report))
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  onStage?.('Creating ZIP…')
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } })
}
