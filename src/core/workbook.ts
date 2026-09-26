import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import type { BasicValue, CellData, SheetData, WorkbookData } from './types'

export { detectHeaderRow, columnsFor, dataRowIndices } from './sheet'

const MAX_FILE_BYTES = 40 * 1024 * 1024

function emptyCell(): CellData {
  return { value: null, display: '' }
}

function snapshotCell(cell: ExcelJS.Cell): CellData {
  const raw = cell.value
  if (raw === null || raw === undefined) return { ...emptyCell(), style: cell.style }
  if (raw instanceof Date) return { value: raw, display: cell.text, style: cell.style }
  if (['string', 'number', 'boolean'].includes(typeof raw)) {
    return { value: raw as BasicValue, display: cell.text, style: cell.style }
  }
  if (typeof raw === 'object' && 'formula' in raw) {
    return { value: null, display: cell.text, style: cell.style, formula: String(raw.formula) }
  }
  if (typeof raw === 'object' && 'sharedFormula' in raw) {
    return { value: null, display: cell.text, style: cell.style, formula: String(raw.sharedFormula) }
  }
  return { value: null, display: cell.text, style: cell.style, unsupported: 'Complex Excel cell value' }
}

function fromExcelSheet(sheet: ExcelJS.Worksheet): SheetData {
  const rowCount = sheet.rowCount
  const colCount = sheet.columnCount
  const rows: CellData[][] = []
  const heights: (number | undefined)[] = []
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const cells: CellData[] = []
    for (let col = 1; col <= colCount; col += 1) cells.push(snapshotCell(row.getCell(col)))
    rows.push(cells)
    heights.push(row.height)
  }
  const widths = Array.from({ length: colCount }, (_, index) => sheet.getColumn(index + 1).width)
  return {
    name: sheet.name,
    rows,
    widths,
    heights,
    hidden: sheet.state !== 'visible',
    merged: Boolean(sheet.model.merges?.length),
  }
}

function fromCsv(name: string, sourceSize: number, content: string): WorkbookData {
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: false, dynamicTyping: false })
  if (parsed.errors.length) {
    const first = parsed.errors[0]
    throw new Error(`CSV could not be read${first.row === undefined ? '' : ` near row ${first.row + 1}`}: ${first.message}`)
  }
  const rawRows = parsed.data.filter((row, index, all) =>
    index !== all.length - 1 || row.some((value) => value !== ''),
  )
  let width = 0
  for (const row of rawRows) width = Math.max(width, row.length)
  const rows = rawRows.map((row) => Array.from({ length: width }, (_, col) => ({
    value: row[col] ?? '', display: row[col] ?? '',
  })))
  return {
    sourceName: name, sourceSize, kind: 'csv',
    sheets: [{ name: 'CSV data', rows, widths: [], heights: [], hidden: false, merged: false }],
  }
}

export async function parseSpreadsheet(file: File): Promise<WorkbookData> {
  if (file.size === 0) throw new Error('This file is empty. Choose a spreadsheet with data.')
  if (file.size > MAX_FILE_BYTES) throw new Error('This file is too large to process safely in your browser (40 MB limit).')
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'csv') return fromCsv(file.name, file.size, await file.text())
  if (extension !== 'xlsx') {
    throw new Error(extension === 'xls'
      ? 'Legacy .xls files are not supported yet. Save the file as .xlsx first.'
      : 'Choose an .xlsx or .csv file.')
  }
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new Error('This workbook could not be read. It may be damaged or password protected.')
  }
  if (!workbook.worksheets.length) throw new Error('This workbook does not contain a worksheet.')
  return {
    sourceName: file.name,
    sourceSize: file.size,
    kind: 'xlsx',
    sheets: workbook.worksheets.map(fromExcelSheet),
  }
}
