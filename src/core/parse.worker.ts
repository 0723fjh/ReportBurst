import { parseSpreadsheet } from './workbook'
import { buildPlan } from './plan'
import { makeArchive } from './export'
import type { GenerationPlan, PlanRequest, PlanSummary, WorkbookData, WorkbookSummary } from './types'

let workbook: WorkbookData | null = null
let currentPlan: GenerationPlan | null = null
let currentRevision = 0
let parseToken = 0

type Request =
  | { id: number; type: 'parse'; file: File }
  | { id: number; type: 'plan'; config: PlanRequest }
  | { id: number; type: 'export'; revision: number }

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data
  try {
    if (request.type === 'parse') {
      const token = ++parseToken
      const parsed = await parseSpreadsheet(request.file)
      if (token !== parseToken) throw new Error('A newer file was selected.')
      workbook = parsed
      currentPlan = null
      const summary: WorkbookSummary = {
        sourceName: workbook.sourceName, sourceSize: workbook.sourceSize, kind: workbook.kind,
        sheets: workbook.sheets.map((sheet) => ({
          name: sheet.name, rowCount: sheet.rows.length,
          columnCount: sheet.rows[0]?.length ?? 0,
          rows: sheet.rows.slice(0, 40).map((row) => row.map((cell) => ({ value: cell.value, display: cell.display }))),
          hidden: sheet.hidden, merged: sheet.merged,
        })),
      }
      self.postMessage({ id: request.id, ok: true, result: summary })
      return
    }
    if (!workbook) throw new Error('Choose a spreadsheet first.')
    if (request.type === 'plan') {
      const sheet = workbook.sheets[request.config.sheetIndex]
      if (!sheet) throw new Error('Choose a valid data sheet.')
      currentPlan = buildPlan({ ...request.config, sheet })
      currentRevision = request.id
      const summary: PlanSummary = {
        headerRow: currentPlan.headerRow, columns: currentPlan.columns,
        items: currentPlan.items.map(({ rowIndices, ...item }) => ({ ...item, rowCount: rowIndices.length })),
        issues: currentPlan.issues, blocked: currentPlan.blocked,
        date: currentPlan.date, revision: currentRevision,
      }
      self.postMessage({ id: request.id, ok: true, result: summary })
      return
    }
    if (!currentPlan || currentRevision !== request.revision) throw new Error('The preview changed. Check it again before generating.')
    const archive = await makeArchive(currentPlan, (stage) => self.postMessage({ id: request.id, progress: stage }))
    self.postMessage({ id: request.id, ok: true, result: archive })
  } catch (cause) {
    self.postMessage({ id: request.id, ok: false, error: cause instanceof Error ? cause.message : 'The request could not be completed.' })
  }
}
