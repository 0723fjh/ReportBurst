import type { ColumnDefinition, SheetData } from './types'

export function detectHeaderRow(sheet: Pick<SheetData, 'rows'>): number {
  const candidates = sheet.rows.slice(0, Math.min(5, sheet.rows.length))
  let best = 0
  let bestScore = -Infinity
  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index]
    const values = row.map((cell) => cell.display.trim()).filter(Boolean)
    const textCount = row.filter((cell) => typeof cell.value === 'string' && cell.display.trim()).length
    const nextNonempty = sheet.rows[index + 1]?.some((cell) => cell.display.trim()) ?? false
    const unique = new Set(values.map((value) => value.toLowerCase())).size
    const score = values.length * 2 + textCount + unique + (nextNonempty ? 3 : 0) - (values.length < 2 ? 5 : 0) - index
    if (score > bestScore) { bestScore = score; best = index }
  }
  return best
}

export function columnsFor(sheet: Pick<SheetData, 'rows'>, headerRow: number): ColumnDefinition[] {
  return (sheet.rows[headerRow] ?? []).map((cell, index) => ({
    index,
    label: cell.display.trim() || `Column ${index + 1}`,
  }))
}

export function dataRowIndices(sheet: SheetData, headerRow: number): number[] {
  const indices: number[] = []
  for (let index = headerRow + 1; index < sheet.rows.length; index += 1) {
    if (sheet.rows[index].some((cell) => cell.display.trim() || cell.value !== null && cell.value !== '')) indices.push(index)
  }
  return indices
}
