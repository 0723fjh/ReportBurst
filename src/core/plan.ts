import { columnsFor, dataRowIndices } from './sheet'
import type { BasicValue, GenerationPlan, GroupDecision, PlanConfig, ReportPlanItem, ValidationIssue } from './types'

const TOKENS = new Set(['Group', 'Date', 'YYYY-MM-DD', 'OriginalFileName', 'Rows', 'FileName'])
const EMAIL_PATTERN = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/

function groupIdentity(value: BasicValue): { id: string; label: string; blank: boolean } {
  if (value === null || value === '') return { id: 'blank:', label: 'Unassigned', blank: true }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? { id: `text:${trimmed}`, label: trimmed, blank: false } : { id: 'blank:', label: 'Unassigned', blank: true }
  }
  if (value instanceof Date) {
    const iso = value.toISOString()
    return { id: `date:${iso}`, label: iso.slice(0, 10), blank: false }
  }
  return { id: `${typeof value}:${String(value)}`, label: String(value), blank: false }
}

export function safeFilename(name: string, extension: string): string {
  let base = Array.from(name).map((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? '-' : character).join('')
    .replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim()
  if (!base) base = 'Report'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(base)) base = `_${base}`
  base = Array.from(base).slice(0, 110).join('').replace(/[. ]+$/g, '') || 'Report'
  return `${base}.${extension}`
}

export function templateVariables(template: string): string[] {
  return [...template.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1])
}

export function renderTemplate(template: string, values: Record<string, string>): string {
  for (const variable of templateVariables(template)) {
    if (!TOKENS.has(variable) || !(variable in values)) throw new Error(`Unknown template variable: {${variable}}`)
  }
  return template.replace(/\{([^{}]+)\}/g, (_, key: string) => values[key])
}

function uniqueName(desired: string, seen: Set<string>): string {
  const dot = desired.lastIndexOf('.')
  const stem = desired.slice(0, dot)
  const extension = desired.slice(dot)
  let candidate = desired
  let suffix = 2
  while (seen.has(candidate.toLowerCase())) {
    candidate = `${stem} (${suffix})${extension}`
    suffix += 1
  }
  seen.add(candidate.toLowerCase())
  return candidate
}

function recipientFor(indices: number[], config: PlanConfig, decision: GroupDecision, id: string): {
  recipient: string | null
  candidates: string[]
  emailMode: ReportPlanItem['emailMode']
  issues: ValidationIssue[]
} {
  if (config.recipientColumn === null || decision.mode === 'report-only') {
    return { recipient: null, candidates: [], emailMode: 'report-only', issues: [] }
  }
  if (decision.mode === 'skip') return { recipient: null, candidates: [], emailMode: 'skip', issues: [] }
  if (decision.mode === 'manual') {
    const email = decision.email.trim()
    if (EMAIL_PATTERN.test(email)) return { recipient: email, candidates: [], emailMode: 'ready', issues: [] }
    return { recipient: null, candidates: [], emailMode: 'needs-action', issues: [{ level: 'warning', code: 'invalid-manual-email', message: 'Enter a valid recipient email.', groupId: id }] }
  }
  const addresses = new Map<string, string>()
  let invalid = false
  for (const rowIndex of indices) {
    const raw = config.sheet.rows[rowIndex][config.recipientColumn]?.display.trim() ?? ''
    if (!raw) continue
    if (!EMAIL_PATTERN.test(raw)) { invalid = true; continue }
    addresses.set(raw.toLowerCase(), raw)
  }
  if (invalid) return { recipient: null, candidates: [...addresses.values()], emailMode: 'needs-action', issues: [{ level: 'warning', code: 'invalid-email', message: 'Invalid recipient email found. Choose how to handle this report.', groupId: id }] }
  if (addresses.size === 1) return { recipient: [...addresses.values()][0], candidates: [...addresses.values()], emailMode: 'ready', issues: [] }
  return {
    recipient: null,
    candidates: [...addresses.values()],
    emailMode: 'needs-action',
    issues: [{ level: 'warning', code: addresses.size ? 'conflicting-email' : 'missing-email', message: addresses.size ? 'Multiple recipient emails found. Choose one or generate the report only.' : 'No recipient email found. Enter one or generate the report only.', groupId: id }],
  }
}

export function buildPlan(config: PlanConfig): GenerationPlan {
  const columns = columnsFor(config.sheet, config.headerRow)
  const issues: ValidationIssue[] = []
  if (!columns[config.splitColumn]) issues.push({ level: 'error', code: 'missing-split-column', message: 'Choose a valid split column.' })
  if (config.recipientColumn !== null && !columns[config.recipientColumn]) issues.push({ level: 'error', code: 'missing-recipient-column', message: 'Choose a valid recipient column.' })
  if (config.sheet.merged) issues.push({ level: 'error', code: 'merged-cells', message: 'This sheet has merged cells. Splitting them safely is not supported yet.' })
  const indices = dataRowIndices(config.sheet, config.headerRow)
  if (!indices.length) issues.push({ level: 'error', code: 'no-data', message: 'This sheet has no data rows below the header.' })
  for (const index of [config.headerRow, ...indices]) {
    for (const cell of config.sheet.rows[index] ?? []) {
      if (cell.formula || cell.unsupported) {
        issues.push({ level: 'error', code: 'complex-cell', message: 'This sheet contains formulas or complex cells that could change when split. Export is stopped to protect the data.' })
        break
      }
    }
    if (issues.some((issue) => issue.code === 'complex-cell')) break
  }
  for (const template of [config.filenameTemplate, config.subjectTemplate, config.bodyTemplate]) {
    const unknown = templateVariables(template).find((variable) => !TOKENS.has(variable))
    if (unknown) issues.push({ level: 'error', code: 'unknown-variable', message: `Unknown template variable: {${unknown}}` })
  }
  if (/[\r\n]/.test(config.subjectTemplate)) issues.push({ level: 'error', code: 'unsafe-subject', message: 'Email subject cannot contain a line break.' })
  const groups = new Map<string, { label: string; blank: boolean; indices: number[] }>()
  for (const index of indices) {
    const identity = groupIdentity(config.sheet.rows[index][config.splitColumn]?.value ?? null)
    if (!groups.has(identity.id)) groups.set(identity.id, { label: identity.label, blank: identity.blank, indices: [] })
    groups.get(identity.id)!.indices.push(index)
  }
  if (groups.size === 1 && groups.has('blank:')) issues.push({ level: 'error', code: 'all-blank', message: 'The split column contains no usable values.' })
  const seenNames = new Set<string>()
  const items: ReportPlanItem[] = []
  for (const [id, group] of groups) {
    const decision = config.decisions[id] ?? { mode: 'auto' }
    const itemIssues: ValidationIssue[] = []
    let included = decision.mode !== 'skip'
    if (group.blank && config.unassignedDecision === 'pending') {
      itemIssues.push({ level: 'warning', code: 'unassigned', message: 'Choose whether to include or exclude rows without a split value.', groupId: id })
    }
    if (group.blank && config.unassignedDecision === 'exclude') included = false
    const nameValues = {
      Group: group.label,
      Date: config.date,
      'YYYY-MM-DD': config.date,
      OriginalFileName: config.sourceName.replace(/\.[^.]+$/, ''),
      Rows: String(group.indices.length),
      FileName: '',
    }
    let filename = 'Report.xlsx'
    try {
      filename = uniqueName(safeFilename(renderTemplate(config.filenameTemplate, nameValues).replace(/\.xlsx$/i, ''), 'xlsx'), seenNames)
    } catch { /* An error issue is already present for unknown tokens. */ }
    nameValues.FileName = filename
    let subject = ''
    let body = ''
    try {
      subject = renderTemplate(config.subjectTemplate, nameValues)
      body = renderTemplate(config.bodyTemplate, nameValues)
    } catch { /* An error issue is already present for unknown tokens. */ }
    const email = recipientFor(group.indices, config, decision, id)
    if (included) itemIssues.push(...email.issues)
    items.push({
      id, group: group.label, rowIndices: group.indices, filename,
      recipient: email.recipient, candidates: email.candidates, emailMode: included ? email.emailMode : 'skip',
      included, subject, body, issues: itemIssues,
    })
  }
  const allIssues = [...issues, ...items.flatMap((item) => item.issues)]
  return {
    sheet: config.sheet, headerRow: config.headerRow, columns, items,
    issues: allIssues,
    blocked: allIssues.some((issue) => issue.level === 'error' || issue.level === 'warning'),
    date: config.date,
  }
}
