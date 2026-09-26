import { useEffect, useMemo, useRef, useState } from 'react'
import { exportInWorker, parseInWorker, planInWorker } from './core/session'
import { columnsFor, detectHeaderRow } from './core/sheet'
import type { GroupDecision, PlanSummary, WorkbookSummary } from './core/types'
import { initialLanguage, issueText, runtimeText, saveLanguage, t, type Language } from './i18n'

function localDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function App() {
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const fileInput = useRef<HTMLInputElement>(null)
  const [workbook, setWorkbook] = useState<WorkbookSummary | null>(null)
  const [planState, setPlanState] = useState<{ key: string; value: PlanSummary } | null>(null)
  const fileRequest = useRef(0)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [headerRow, setHeaderRow] = useState(0)
  const [splitColumn, setSplitColumn] = useState(0)
  const [recipientColumn, setRecipientColumn] = useState<number | null>(null)
  const [decisions, setDecisions] = useState<Record<string, GroupDecision>>({})
  const [unassignedDecision, setUnassignedDecision] = useState<'pending' | 'include' | 'exclude'>('pending')
  const [filenameTemplate, setFilenameTemplate] = useState(() => t(language, '{Group} - Report - {YYYY-MM-DD}.xlsx'))
  const [subjectTemplate, setSubjectTemplate] = useState(() => t(language, '{Group} Report - {Date}'))
  const [bodyTemplate, setBodyTemplate] = useState(() => t(language, 'Hello,\n\nPlease find attached the latest report for {Group}.\n\nBest regards'))
  const [date, setDate] = useState(localDate)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  function changeLanguage(next: Language) {
    if (next === language) return
    setFilenameTemplate((current) => current === t(language, '{Group} - Report - {YYYY-MM-DD}.xlsx') ? t(next, '{Group} - Report - {YYYY-MM-DD}.xlsx') : current)
    setSubjectTemplate((current) => current === t(language, '{Group} Report - {Date}') ? t(next, '{Group} Report - {Date}') : current)
    setBodyTemplate((current) => current === t(language, 'Hello,\n\nPlease find attached the latest report for {Group}.\n\nBest regards') ? t(next, 'Hello,\n\nPlease find attached the latest report for {Group}.\n\nBest regards') : current)
    setLanguage(next)
    saveLanguage(next)
  }

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'zh-CN' ? 'ReportBurst — 轻松拆分表格报表' : 'ReportBurst — Spreadsheet reports, simplified'
    document.querySelector('meta[name="description"]')?.setAttribute('content', language === 'zh-CN'
      ? '在浏览器中将一份 Excel 或 CSV 表格拆分成独立报表和邮件草稿。'
      : 'Turn one spreadsheet into ready-to-send reports in your browser.')
  }, [language])

  const sheet = workbook?.sheets[sheetIndex] ?? null
  const columns = useMemo(() => sheet ? columnsFor(sheet, headerRow) : [], [sheet, headerRow])
  const planKey = JSON.stringify({ sourceName: workbook?.sourceName, sourceSize: workbook?.sourceSize, sheetIndex, headerRow, splitColumn, recipientColumn, filenameTemplate, subjectTemplate, bodyTemplate, date, decisions, unassignedDecision })
  const plan = planState?.key === planKey ? planState.value : null
  useEffect(() => {
    if (!sheet || !workbook) return
    let cancelled = false
    void planInWorker({
      sheetIndex, headerRow, splitColumn, recipientColumn, filenameTemplate,
      subjectTemplate, bodyTemplate, sourceName: workbook.sourceName, date,
      decisions, unassignedDecision,
    }).then((result) => { if (!cancelled) setPlanState({ key: planKey, value: result }) }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not prepare the preview.')
    })
    return () => { cancelled = true }
  }, [sheet, workbook, sheetIndex, headerRow, splitColumn, recipientColumn, filenameTemplate, subjectTemplate, bodyTemplate, date, decisions, unassignedDecision, planKey])

  async function acceptFile(file?: File) {
    if (!file) return
    if (busy) { setError('Wait for the current ZIP to finish before choosing another file.'); return }
    const request = ++fileRequest.current
    setWorkbook(null)
    setPlanState(null)
    setError('')
    setStatus('Reading workbook…')
    setDecisions({})
    setUnassignedDecision('pending')
    setDate(localDate())
    try {
      const parsed = await parseInWorker(file)
      if (request !== fileRequest.current) return
      const first = parsed.sheets.findIndex((candidate) => !candidate.hidden)
      const index = first < 0 ? 0 : first
      setWorkbook(parsed)
      setSheetIndex(index)
      setHeaderRow(detectHeaderRow(parsed.sheets[index]))
      setSplitColumn(0)
      setRecipientColumn(null)
      setStatus('File ready. Check the data and configure reports below.')
    } catch (cause) {
      if (request !== fileRequest.current) return
      setError(cause instanceof Error ? cause.message : 'The file could not be read.')
      setStatus('')
    }
  }

  function changeSheet(index: number) {
    if (!workbook) return
    setSheetIndex(index)
    setHeaderRow(detectHeaderRow(workbook.sheets[index]))
    setSplitColumn(0)
    setRecipientColumn(null)
    setDecisions({})
    setUnassignedDecision('pending')
  }

  function setDecision(id: string, decision: GroupDecision) {
    setDecisions((current) => ({ ...current, [id]: decision }))
  }

  async function generate() {
    if (!plan || plan.blocked || busy) return
    setBusy(true)
    setError('')
    try {
      const archive = await exportInWorker(plan.revision, setStatus)
      const url = URL.createObjectURL(archive)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ReportBurst-${plan.date}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setStatus('ZIP ready. Review each report and email draft before sending.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The ZIP could not be created.')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  const reportCount = plan?.items.filter((item) => item.included).length ?? 0
  const emailCount = plan?.items.filter((item) => item.included && item.emailMode === 'ready').length ?? 0
  const excludedRows = plan?.items.filter((item) => !item.included).reduce((count, item) => count + item.rowCount, 0) ?? 0
  const tx = (english: string) => t(language, english)

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={tx('ReportBurst home')}><span className="brand-mark">RB</span><span>ReportBurst</span></a>
        <div className="header-actions"><nav aria-label={tx('Main navigation')}><a href="#how-it-works">{tx('How it works')}</a><a href="#privacy">{tx('Privacy')}</a></nav><label className="language-picker"><span className="visually-hidden">{tx('Language')}</span><select aria-label={tx('Language')} value={language} onChange={(event) => changeLanguage(event.target.value as Language)}><option value="en">English</option><option value="zh-CN">简体中文</option></select></label></div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{tx('SPREADSHEET REPORTS, SIMPLIFIED')}</p>
            <h1 id="hero-title">{tx('Stop splitting spreadsheets manually.')}</h1>
            <p className="hero-description">{tx('Turn one master spreadsheet into ready-to-send reports for every manager, location, client, or team.')}</p>
            <button className="button button-primary" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>{tx('Choose Spreadsheet')} <span aria-hidden="true">↗</span></button>
            <p className="hero-note">{tx('No signup')} <span>·</span> {tx('Files stay on your device')}</p>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-top"><span className="mini-icon">▦</span> {tx('Master spreadsheet')} <span className="visual-count">{tx('1 file')}</span></div>
            <div className="visual-grid"><span>{tx('Employee')}</span><span>{tx('Department')}</span><span>{tx('Manager Email')}</span><span>Alice</span><span>Tokyo</span><span>tanaka@…</span><span>Bob</span><span>Tokyo</span><span>tanaka@…</span><span>Carol</span><span>Osaka</span><span>sato@…</span></div>
            <div className="visual-line" />
            <div className="visual-output"><div><span className="mini-icon">↳</span><strong>Tokyo - Report.xlsx</strong><small>{tx('Ready to send')}</small></div><div><span className="mini-icon">↳</span><strong>Osaka - Report.xlsx</strong><small>{tx('Ready to send')}</small></div></div>
          </div>
        </section>

        <section id="workspace" className="workspace" aria-labelledby="workspace-title">
          <div className="section-heading"><p className="eyebrow">{tx('YOUR WORKSPACE')}</p><h2 id="workspace-title">{tx('Create your reports')}</h2><p>{tx('Upload, review, and generate. Your spreadsheet never leaves this browser.')}</p></div>
          <div className="steps" aria-label={tx('Workflow steps')}><span className="step active"><b>1</b> {tx('Upload')}</span><span className={workbook ? 'step active' : 'step'}><b>2</b> {tx('Configure')}</span><span className={plan ? 'step active' : 'step'}><b>3</b> {tx('Preview')}</span><span className={plan && !plan.blocked ? 'step active' : 'step'}><b>4</b> {tx('Generate')}</span></div>

          <input ref={fileInput} className="visually-hidden" type="file" accept=".xlsx,.csv" disabled={busy} aria-label={tx('Choose XLSX or CSV file')} onChange={(event) => { void acceptFile(event.target.files?.[0]); event.target.value = '' }} />
          <div className={dragging ? 'dropzone dragging' : 'dropzone'} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) void acceptFile(event.dataTransfer.files[0]) }}>
            <div className="upload-glyph" aria-hidden="true">⇧</div>
            <strong>{tx('Drop your spreadsheet here')}</strong>
            <span>{tx('or choose an .xlsx or .csv file from your computer')}</span>
            <button className="button button-secondary" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>{tx(workbook ? 'Replace file' : 'Browse files')}</button>
            {workbook && <div className="file-pill"><span aria-hidden="true">▦</span><strong>{workbook.sourceName}</strong><span>{sizeLabel(workbook.sourceSize)}</span><span>{language === 'zh-CN' ? `${workbook.sheets.length} 个工作表` : `${workbook.sheets.length} sheet${workbook.sheets.length === 1 ? '' : 's'}`}</span></div>}
          </div>
          {status && <p className="status" role="status">{runtimeText(language, status)}</p>}
          {error && <p className="error-banner" role="alert">{runtimeText(language, error)}</p>}

          {workbook && sheet && <>
            <div className="panel-grid">
              <section className="panel" aria-labelledby="data-title">
                <div className="panel-title"><span className="panel-number">01</span><div><h3 id="data-title">{tx('Review your data')}</h3><p>{tx('Choose the sheet and header row that contain your records.')}</p></div></div>
                <div className="field-row"><label className="field"><span>{tx('Data sheet')}</span><select value={sheetIndex} onChange={(event) => changeSheet(Number(event.target.value))}>{workbook.sheets.map((candidate, index) => <option key={index} value={index}>{candidate.name}{candidate.hidden ? language === 'zh-CN' ? '（隐藏）' : ' (hidden)' : ''}</option>)}</select></label><label className="field"><span>{tx('Header row')}</span><select value={headerRow} onChange={(event) => { setHeaderRow(Number(event.target.value)); setDecisions({}) }}>{sheet.rows.slice(0, Math.min(10, sheet.rows.length)).map((_, index) => <option key={index} value={index}>{language === 'zh-CN' ? `第 ${index + 1} 行` : `Row ${index + 1}`}</option>)}</select></label></div>
                <div className="preview-label"><strong>{tx('Data preview')}</strong><span>{language === 'zh-CN' ? `${Math.max(sheet.rowCount - headerRow - 1, 0)} 行 · ${columns.length} 列` : `${Math.max(sheet.rowCount - headerRow - 1, 0)} rows · ${columns.length} columns`}</span></div>
                <div className="sample-wrap"><table className="sample-table"><thead><tr>{columns.map((column) => <th key={column.index}>{column.label}</th>)}</tr></thead><tbody>{sheet.rows.slice(headerRow + 1, headerRow + 11).map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.index} title={row[column.index]?.display ?? ''}>{row[column.index]?.display ?? ''}</td>)}</tr>)}</tbody></table></div>
              </section>

              <section className="panel" aria-labelledby="configure-title">
                <div className="panel-title"><span className="panel-number">02</span><div><h3 id="configure-title">{tx('Configure reports')}</h3><p>{tx('Choose how to split and who each report is for.')}</p></div></div>
                <label className="field"><span>{tx('Split reports by')}</span><select value={splitColumn} onChange={(event) => { setSplitColumn(Number(event.target.value)); setDecisions({}); setUnassignedDecision('pending') }}>{columns.map((column) => <option key={column.index} value={column.index}>{column.label}{columns.filter((item) => item.label === column.label).length > 1 ? language === 'zh-CN' ? `（第 ${column.index + 1} 列）` : ` (column ${column.index + 1})` : ''}</option>)}</select></label>
                <label className="field"><span>{tx('Recipient email column')} <em>{tx('optional')}</em></span><select value={recipientColumn ?? ''} onChange={(event) => { setRecipientColumn(event.target.value === '' ? null : Number(event.target.value)); setDecisions({}) }}><option value="">{tx('Skip email drafts')}</option>{columns.map((column) => <option key={column.index} value={column.index}>{column.label}{columns.filter((item) => item.label === column.label).length > 1 ? language === 'zh-CN' ? `（第 ${column.index + 1} 列）` : ` (column ${column.index + 1})` : ''}</option>)}</select></label>
                <label className="field"><span>{tx('File name template')}</span><input value={filenameTemplate} onChange={(event) => setFilenameTemplate(event.target.value)} /><small>{tx('Use {Group}, {Date}, {YYYY-MM-DD}, or {OriginalFileName}.')}</small></label>
                <div className="divider" />
                <p className="subheading">{tx('Email draft')} <span>{tx('optional')}</span></p>
                <label className="field"><span>{tx('Subject')}</span><input value={subjectTemplate} onChange={(event) => setSubjectTemplate(event.target.value)} /></label>
                <label className="field"><span>{tx('Message')}</span><textarea rows={5} value={bodyTemplate} onChange={(event) => setBodyTemplate(event.target.value)} /><small>{tx('Use {Group}, {Date}, {Rows}, or {FileName}.')}</small></label>
              </section>
            </div>

            {plan && <section className="panel preview-panel" aria-labelledby="preview-title"><div className="panel-title"><span className="panel-number">03</span><div><h3 id="preview-title">{tx('Preview before you generate')}</h3><p>{tx('Check each group and resolve any recipient or data issues.')}</p></div></div>
              <div className="summary"><div><strong>{reportCount}</strong><span>{tx('reports')}</span></div><div><strong>{emailCount}</strong><span>{tx('email drafts')}</span></div><div><strong>{plan.issues.length}</strong><span>{tx('issues')}</span></div><div><strong>{excludedRows}</strong><span>{tx('excluded rows')}</span></div></div>
              {plan.issues.filter((issue) => !issue.groupId).map((issue, index) => <p key={`${issue.code}-${index}`} className={`issue ${issue.level}`} role={issue.level === 'error' ? 'alert' : undefined}>{issueText(language, issue)}</p>)}
              <div className="report-list">{plan.items.map((item) => {
                const decision = decisions[item.id] ?? { mode: 'auto' }
                return <div className="report-row" key={item.id}><div className="report-main"><span className="report-icon" aria-hidden="true">▦</span><div><strong>{item.id === 'blank:' && language === 'zh-CN' ? '未分配' : item.group}</strong><small>{language === 'zh-CN' ? `${item.rowCount} 行` : `${item.rowCount} rows`} · {item.filename}</small></div><span className={item.issues.length ? 'badge attention' : item.included ? 'badge ready' : 'badge muted'}>{tx(item.issues.length ? 'Needs attention' : item.included ? 'Ready' : 'Skipped')}</span></div>
                  {item.id === 'blank:' && <label className="field compact"><span>{tx('Rows without a split value')}</span><select value={unassignedDecision} onChange={(event) => setUnassignedDecision(event.target.value as 'pending' | 'include' | 'exclude')}><option value="pending">{tx('Choose what to do')}</option><option value="include">{tx('Include as Unassigned')}</option><option value="exclude">{tx('Exclude these rows')}</option></select></label>}
                  {recipientColumn !== null && item.id !== 'blank:' && <div className="recipient-controls"><label className="field compact"><span>{tx('Recipient action')}</span><select value={decision.mode} onChange={(event) => {
                    const mode = event.target.value as GroupDecision['mode']
                    setDecision(item.id, mode === 'manual' ? { mode, email: item.candidates[0] ?? '' } : { mode })
                  }}><option value="auto">{tx('Use spreadsheet email')}</option><option value="manual">{tx('Choose / enter email')}</option><option value="report-only">{tx('Report only, no email')}</option><option value="skip">{tx('Skip this group')}</option></select></label>{decision.mode === 'manual' && <label className="field compact"><span>{tx('Email address')}</span><input type="email" list={`emails-${encodeURIComponent(item.id)}`} value={decision.email} onChange={(event) => setDecision(item.id, { mode: 'manual', email: event.target.value })} /><datalist id={`emails-${encodeURIComponent(item.id)}`}>{item.candidates.map((candidate) => <option key={candidate} value={candidate} />)}</datalist></label>}</div>}
                  {recipientColumn !== null && item.id === 'blank:' && unassignedDecision === 'include' && <div className="recipient-controls"><label className="field compact"><span>{tx('Recipient action')}</span><select value={decision.mode} onChange={(event) => { const mode = event.target.value as GroupDecision['mode']; setDecision(item.id, mode === 'manual' ? { mode, email: item.candidates[0] ?? '' } : { mode }) }}><option value="auto">{tx('Use spreadsheet email')}</option><option value="manual">{tx('Choose / enter email')}</option><option value="report-only">{tx('Report only, no email')}</option><option value="skip">{tx('Skip this group')}</option></select></label>{decision.mode === 'manual' && <label className="field compact"><span>{tx('Email address')}</span><input type="email" value={decision.email} onChange={(event) => setDecision(item.id, { mode: 'manual', email: event.target.value })} /></label>}</div>}
                  {item.issues.map((issue, index) => <p className={`issue ${issue.level}`} key={`${issue.code}-${index}`}>{issueText(language, issue)}</p>)}
                  {item.recipient && item.included && <p className="recipient-note">{tx('To:')} {item.recipient}</p>}
                </div>
              })}</div>
              <div className="generate-footer"><div><strong>{tx(plan.blocked ? 'Resolve the issues above to continue' : 'Everything is ready')}</strong><p>{tx(plan.blocked ? 'Review the highlighted reports and choose how to handle them.' : 'Your ZIP will include the reports and any ready email drafts.')}</p></div><button type="button" className="button button-primary" disabled={plan.blocked || busy || reportCount === 0} onClick={() => void generate()}>{tx(busy ? 'Preparing files…' : 'Generate & download ZIP')} <span aria-hidden="true">↓</span></button></div>
            </section>}
          </>}
        </section>

        <section id="how-it-works" className="info-section"><p className="eyebrow">{tx('HOW IT WORKS')}</p><h2>{tx('One spreadsheet. Every report ready.')}</h2><div className="info-grid"><article><span>01</span><h3>{tx('Choose your file')}</h3><p>{tx('Import an Excel or CSV file and confirm the sheet and header row.')}</p></article><article><span>02</span><h3>{tx('Review the split')}</h3><p>{tx('Pick a grouping column, match recipients, and resolve missing or conflicting emails.')}</p></article><article><span>03</span><h3>{tx('Download and send')}</h3><p>{tx('Get a ZIP of individual reports and email drafts. Open and review drafts before sending.')}</p></article></div></section>
        <section id="privacy" className="privacy-section"><div className="privacy-icon" aria-hidden="true">◇</div><div><p className="eyebrow">{tx('PRIVACY BY DESIGN')}</p><h2>{tx('Your spreadsheet stays on your device.')}</h2><p>{tx('Files are processed in your browser. ReportBurst does not upload spreadsheet contents, keep a copy of your workbook, or send emails for you. Opening or sending a downloaded email draft is your choice.')}</p></div></section>
      </main>
      <footer><span>ReportBurst</span><span>{tx('Turn one spreadsheet into ready-to-send reports.')}</span></footer>
    </div>
  )
}
