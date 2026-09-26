import type ExcelJS from 'exceljs'

export type BasicValue = string | number | boolean | Date | null

export interface CellData {
  value: BasicValue
  display: string
  style?: Partial<ExcelJS.Style>
  formula?: string
  unsupported?: string
}

export interface SheetData {
  name: string
  rows: CellData[][]
  widths: (number | undefined)[]
  heights: (number | undefined)[]
  hidden: boolean
  merged: boolean
}

export interface WorkbookData {
  sourceName: string
  sourceSize: number
  kind: 'xlsx' | 'csv'
  sheets: SheetData[]
}

export interface ColumnDefinition {
  index: number
  label: string
}

export type IssueLevel = 'info' | 'warning' | 'error'

export interface ValidationIssue {
  level: IssueLevel
  code: string
  message: string
  groupId?: string
}

export type GroupDecision =
  | { mode: 'auto' }
  | { mode: 'manual'; email: string }
  | { mode: 'report-only' }
  | { mode: 'skip' }

export interface PlanConfig {
  sheet: SheetData
  headerRow: number
  splitColumn: number
  recipientColumn: number | null
  filenameTemplate: string
  subjectTemplate: string
  bodyTemplate: string
  sourceName: string
  date: string
  decisions: Record<string, GroupDecision>
  unassignedDecision: 'pending' | 'include' | 'exclude'
}

export interface ReportPlanItem {
  id: string
  group: string
  rowIndices: number[]
  filename: string
  recipient: string | null
  candidates: string[]
  emailMode: 'ready' | 'needs-action' | 'report-only' | 'skip'
  included: boolean
  subject: string
  body: string
  issues: ValidationIssue[]
}

export interface GenerationPlan {
  sheet: SheetData
  headerRow: number
  columns: ColumnDefinition[]
  items: ReportPlanItem[]
  issues: ValidationIssue[]
  blocked: boolean
  date: string
}

export interface SheetSummary {
  name: string
  rowCount: number
  columnCount: number
  rows: Pick<CellData, 'value' | 'display'>[][]
  hidden: boolean
  merged: boolean
}

export interface WorkbookSummary {
  sourceName: string
  sourceSize: number
  kind: 'xlsx' | 'csv'
  sheets: SheetSummary[]
}

export type PlanRequest = Omit<PlanConfig, 'sheet'> & { sheetIndex: number }
export type PlanItemSummary = Omit<ReportPlanItem, 'rowIndices'> & { rowCount: number }
export type PlanSummary = Omit<GenerationPlan, 'sheet' | 'items'> & { items: PlanItemSummary[]; revision: number }
