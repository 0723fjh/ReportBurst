import type { ValidationIssue } from './core/types'

export type Language = 'en' | 'zh-CN'

const preferenceKey = 'reportburst-language'

export function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (saved === 'en' || saved === 'zh-CN') return saved
  } catch { /* Browsers may disable storage. */ }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function saveLanguage(language: Language): void {
  try { localStorage.setItem(preferenceKey, language) } catch { /* Language still changes for this page. */ }
}

const zh: Record<string, string> = {
  'ReportBurst home': 'ReportBurst 首页',
  'Main navigation': '主导航',
  'Language': '语言',
  'How it works': '使用方法',
  'Privacy': '隐私保护',
  'SPREADSHEET REPORTS, SIMPLIFIED': '轻松制作表格报表',
  'Stop splitting spreadsheets manually.': '不再手动拆分表格。',
  'Turn one master spreadsheet into ready-to-send reports for every manager, location, client, or team.': '将一份总表拆分成适合各负责人、门店、客户或团队的报表。',
  'Choose Spreadsheet': '选择表格文件',
  'No signup': '无需注册',
  'Files stay on your device': '文件留在你的设备上',
  'Master spreadsheet': '总表',
  '1 file': '1 个文件',
  'Employee': '员工',
  'Department': '部门',
  'Manager Email': '负责人邮箱',
  'Ready to send': '可供发送',
  'YOUR WORKSPACE': '工作区',
  'Create your reports': '创建报表',
  'Upload, review, and generate. Your spreadsheet never leaves this browser.': '上传、核对并生成报表。表格数据始终留在浏览器中。',
  'Workflow steps': '操作步骤',
  'Upload': '上传',
  'Configure': '配置',
  'Preview': '预览',
  'Generate': '生成',
  'Choose XLSX or CSV file': '选择 XLSX 或 CSV 文件',
  'Drop your spreadsheet here': '将表格拖到这里',
  'or choose an .xlsx or .csv file from your computer': '或从电脑选择 .xlsx 或 .csv 文件',
  'Replace file': '更换文件',
  'Browse files': '浏览文件',
  'Review your data': '核对数据',
  'Choose the sheet and header row that contain your records.': '选择数据所在的工作表和表头行。',
  'Data sheet': '数据工作表',
  'Header row': '表头行',
  'Data preview': '数据预览',
  'Configure reports': '配置报表',
  'Choose how to split and who each report is for.': '选择拆分方式和每份报表的收件人。',
  'Split reports by': '按此列拆分报表',
  'Recipient email column': '收件人邮箱列',
  'optional': '可选',
  'Skip email drafts': '不生成邮件草稿',
  'File name template': '文件名模板',
  '{Group} - Report - {YYYY-MM-DD}.xlsx': '{Group} - 报表 - {YYYY-MM-DD}.xlsx',
  'Use {Group}, {Date}, {YYYY-MM-DD}, or {OriginalFileName}.': '可使用 {Group}、{Date}、{YYYY-MM-DD} 或 {OriginalFileName}。',
  'Email draft': '邮件草稿',
  'Subject': '主题',
  'Message': '正文',
  'Use {Group}, {Date}, {Rows}, or {FileName}.': '可使用 {Group}、{Date}、{Rows} 或 {FileName}。',
  'Preview before you generate': '生成前先预览',
  'Check each group and resolve any recipient or data issues.': '检查每个分组，并处理收件人或数据问题。',
  'reports': '份报表',
  'email drafts': '封邮件草稿',
  'issues': '个问题',
  'excluded rows': '行已排除',
  'Needs attention': '需要处理',
  'Ready': '已就绪',
  'Skipped': '已跳过',
  'Rows without a split value': '拆分列为空的行',
  'Choose what to do': '选择处理方式',
  'Include as Unassigned': '作为“未分配”纳入',
  'Exclude these rows': '排除这些行',
  'Recipient action': '收件人处理方式',
  'Use spreadsheet email': '使用表格中的邮箱',
  'Choose / enter email': '选择或输入邮箱',
  'Report only, no email': '只生成报表，不生成邮件',
  'Skip this group': '跳过此分组',
  'Email address': '邮箱地址',
  'To:': '收件人：',
  'Resolve the issues above to continue': '请先处理上述问题',
  'Everything is ready': '一切准备就绪',
  'Review the highlighted reports and choose how to handle them.': '检查标出的报表并选择处理方式。',
  'Your ZIP will include the reports and any ready email drafts.': 'ZIP 中将包含报表和已准备好的邮件草稿。',
  'Preparing files…': '正在准备文件…',
  'Generate & download ZIP': '生成并下载 ZIP',
  'HOW IT WORKS': '使用方法',
  'One spreadsheet. Every report ready.': '一份表格，生成所有报表。',
  'Choose your file': '选择文件',
  'Import an Excel or CSV file and confirm the sheet and header row.': '导入 Excel 或 CSV 文件，确认工作表和表头行。',
  'Review the split': '核对拆分结果',
  'Pick a grouping column, match recipients, and resolve missing or conflicting emails.': '选择分组列、匹配收件人，并处理缺失或冲突的邮箱。',
  'Download and send': '下载并发送',
  'Get a ZIP of individual reports and email drafts. Open and review drafts before sending.': '下载包含独立报表和邮件草稿的 ZIP。发送前请打开并核对草稿。',
  'PRIVACY BY DESIGN': '隐私优先',
  'Your spreadsheet stays on your device.': '表格始终留在你的设备上。',
  'Files are processed in your browser. ReportBurst does not upload spreadsheet contents, keep a copy of your workbook, or send emails for you. Opening or sending a downloaded email draft is your choice.': '文件只在浏览器中处理。ReportBurst 不上传表格内容、不保存工作簿副本，也不会代你发送邮件。是否打开或发送下载的邮件草稿由你决定。',
  'Turn one spreadsheet into ready-to-send reports.': '将一份表格变成可供发送的报表。',
  'Reading workbook…': '正在读取表格…',
  'File ready. Check the data and configure reports below.': '文件已就绪。请在下方核对数据并配置报表。',
  'ZIP ready. Review each report and email draft before sending.': 'ZIP 已就绪。发送前请核对每份报表和邮件草稿。',
  'Wait for the current ZIP to finish before choosing another file.': '请等待当前 ZIP 生成完成后再选择其他文件。',
  'Could not prepare the preview.': '无法准备预览。',
  'The file could not be read.': '无法读取文件。',
  'The ZIP could not be created.': '无法创建 ZIP。',
  'This file is empty. Choose a spreadsheet with data.': '此文件为空。请选择包含数据的表格。',
  'This file is too large to process safely in your browser (40 MB limit).': '此文件过大，无法在浏览器中安全处理（上限为 40 MB）。',
  'Legacy .xls files are not supported yet. Save the file as .xlsx first.': '暂不支持旧版 .xls 文件。请先将其另存为 .xlsx。',
  'Choose an .xlsx or .csv file.': '请选择 .xlsx 或 .csv 文件。',
  'This workbook could not be read. It may be damaged or password protected.': '无法读取此工作簿。文件可能已损坏或受密码保护。',
  'This workbook does not contain a worksheet.': '此工作簿没有工作表。',
  'This sheet contains a cell that cannot be safely split.': '此工作表包含无法安全拆分的单元格。',
  'A recipient must be confirmed before creating an email draft.': '创建邮件草稿前必须确认收件人。',
  'Invalid email header.': '邮件头无效。',
  'Resolve the issues in Preview before generating files.': '请先处理预览中的问题，再生成文件。',
  'Select at least one report to generate.': '请至少选择一份要生成的报表。',
  'Creating ZIP…': '正在创建 ZIP…',
  'A newer file was selected.': '已选择更新的文件。',
  'Choose a spreadsheet first.': '请先选择表格文件。',
  'Choose a valid data sheet.': '请选择有效的数据工作表。',
  'The preview changed. Check it again before generating.': '预览已变化。生成前请重新核对。',
  'The request could not be completed.': '无法完成请求。',
  'Spreadsheet processing stopped unexpectedly.': '表格处理意外中断。',
  'Enter a valid recipient email.': '请输入有效的收件人邮箱。',
  'Invalid recipient email found. Choose how to handle this report.': '发现无效的收件人邮箱。请选择此报表的处理方式。',
  'Multiple recipient emails found. Choose one or generate the report only.': '发现多个收件人邮箱。请选择一个，或仅生成报表。',
  'No recipient email found. Enter one or generate the report only.': '未找到收件人邮箱。请输入一个，或仅生成报表。',
  'Choose a valid split column.': '请选择有效的拆分列。',
  'Choose a valid recipient column.': '请选择有效的收件人列。',
  'This sheet has merged cells. Splitting them safely is not supported yet.': '此工作表包含合并单元格，暂时无法安全拆分。',
  'This sheet has no data rows below the header.': '此工作表的表头下方没有数据行。',
  'This sheet contains formulas or complex cells that could change when split. Export is stopped to protect the data.': '此工作表包含公式或复杂单元格，拆分可能改变内容。为保护数据，已停止导出。',
  'Email subject cannot contain a line break.': '邮件主题不能包含换行。',
  'The split column contains no usable values.': '拆分列没有可用的值。',
  'Choose whether to include or exclude rows without a split value.': '请选择纳入还是排除拆分列为空的行。',
  '{Group} Report - {Date}': '{Group} 报表 - {Date}',
  'Hello,\n\nPlease find attached the latest report for {Group}.\n\nBest regards': '您好：\n\n附件是 {Group} 的最新报表，请查收。\n\n祝好',
}

export function t(language: Language, english: string): string {
  return language === 'zh-CN' ? zh[english] ?? english : english
}

export function issueText(language: Language, issue: ValidationIssue): string {
  if (issue.code === 'unknown-variable') return language === 'zh-CN'
    ? issue.message.replace(/^Unknown template variable:/, '未知的模板变量：')
    : issue.message
  return t(language, issue.message)
}

export function runtimeText(language: Language, message: string): string {
  if (language === 'en') return message
  const progress = /^Generating report (\d+) of (\d+)…$/.exec(message)
  if (progress) return `正在生成第 ${progress[1]} / ${progress[2]} 份报表…`
  const csv = /^CSV could not be read(?: near row (\d+))?: (.*)$/.exec(message)
  if (csv) return `无法读取 CSV${csv[1] ? `（第 ${csv[1]} 行附近）` : ''}。请检查文件格式。`
  return t(language, message)
}
