import ExcelJS from 'exceljs'
import { createHash } from 'node:crypto'
import type { ImportRow, NormalizedOpportunity } from './opportunity-import-change-service.js'

const BUSINESS_SHEET = '商机项目'
const requiredHeaders = ['项目集/客户', '项目名称']

export async function parseGovernmentOpportunityWorkbook(body: Buffer): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(body as never)
  const sheet = workbook.getWorksheet(BUSINESS_SHEET)
  if (!sheet) throw new Error(`import_sheet_missing:${BUSINESS_SHEET}`)
  const headerRow = findHeaderRow(sheet)
  const headers = new Map<string, number>()
  sheet.getRow(headerRow).eachCell((cell, column) => {
    const name = text(cell.value)
    if (name) headers.set(name, column)
  })
  for (const required of requiredHeaders) if (!headers.has(required)) throw new Error(`import_header_missing:${BUSINESS_SHEET}:${required}`)

  const rows: ImportRow[] = []
  const seenNames = new Set<string>()
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const value = (header: string) => row.getCell(headers.get(header) ?? 0).value
    const projectSet = normalizeText(value('项目集/客户'))
    const name = normalizeText(value('项目名称'))
    if (!projectSet && !name) continue
    const errors: string[] = []
    if (!projectSet) errors.push('project_set_required')
    if (!name) errors.push('name_required')
    const nameKey = normalizeOpportunityName(name)
    const compositeKey = `${nameKey}|${normalizeOpportunityName(projectSet)}`
    if (compositeKey !== '|' && seenNames.has(compositeKey)) errors.push('project_name_customer_duplicate')
    else if (compositeKey !== '|') seenNames.add(compositeKey)

    let amountWan: number | null = null
    let margin: number | null = null
    let expectedSignDate: string | null = null
    try { amountWan = amount(value('预计签单（万元）')) } catch { errors.push('number_invalid') }
    try { margin = percent(value('预计签单毛利率')) } catch { errors.push('percent_invalid') }
    try { expectedSignDate = date(value('预计签单时间')) } catch { errors.push('date_invalid') }

    const background = normalizeText(value('商机来源、项目背景、需求介绍'), true)
    const sourceStatus = normalizeText(value('商机状态'))
    const normalized: NormalizedOpportunity = {
      code: stableCode(name, projectSet),
      name: name ?? '',
      projectSet,
      category: normalizeText(value('项目类型')),
      customer: projectSet,
      team: normalizeText(value('市场拓展责任人')),
      presalesOwner: normalizeText(value('解决方案责任人')),
      amountWan,
      margin,
      probabilityBand: null,
      expectedSignDate,
      background,
      needs: background,
      stage: normalizeText(value('商机阶段')) ?? '线索甄别',
      status: sourceStatus === '关闭' || sourceStatus === '商机关闭' || sourceStatus === '已关闭' ? 'closed' : 'active',
      latestStatus: normalizeText(value('本周进展及下周计划'), true),
      businessType: normalizeText(value('项目类型')),
    }
    const raw: Record<string, unknown> = {}
    for (const [header, column] of headers) raw[header] = text(row.getCell(column).value)
    const candidateFields: Array<[keyof NormalizedOpportunity, string]> = [
      ['projectSet', '项目集/客户'], ['category', '项目类型'], ['customer', '项目集/客户'], ['team', '市场拓展责任人'],
      ['presalesOwner', '解决方案责任人'], ['amountWan', '预计签单（万元）'], ['margin', '预计签单毛利率'],
      ['expectedSignDate', '预计签单时间'], ['background', '商机来源、项目背景、需求介绍'], ['needs', '商机来源、项目背景、需求介绍'],
      ['stage', '商机阶段'], ['status', '商机状态'], ['latestStatus', '本周进展及下周计划'], ['businessType', '项目类型'],
    ]
    const providedFields = new Set<keyof NormalizedOpportunity>(['name'])
    for (const [field, header] of candidateFields) if (text(value(header)).trim()) providedFields.add(field)
    rows.push({ sourceSheet: BUSINESS_SHEET, sourceRow: rowNumber, raw, normalized, providedFields, errors })
  }
  if (!rows.length) throw new Error('import_rows_empty')
  return rows
}

export function normalizeOpportunityName(value: string | null) {
  return (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('zh-CN')
}

function findHeaderRow(sheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 10); rowNumber++) {
    const values = new Set<string>()
    sheet.getRow(rowNumber).eachCell(cell => values.add(text(cell.value)))
    if (requiredHeaders.every(header => values.has(header))) return rowNumber
  }
  throw new Error(`import_header_not_found:${sheet.name}`)
}

function stableCode(name: string | null, projectSet: string | null) {
  return `OPP-${createHash('sha256').update(`${normalizeOpportunityName(name)}|${normalizeOpportunityName(projectSet)}`).digest('hex').slice(0, 20).toUpperCase()}`
}

function normalizeText(value: unknown, multiline = false): string | null {
  const raw = text(value).normalize('NFKC').replace(/\r\n?/g, '\n')
  const normalized = multiline ? raw.split('\n').map(line => line.trimEnd()).join('\n').trim() : raw.trim().replace(/\s+/g, ' ')
  return normalized || null
}

function text(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && 'richText' in value) return ((value as { richText?: Array<{ text?: string }> }).richText ?? []).map(part => part.text ?? '').join('')
  if (typeof value === 'object' && 'text' in value) return String((value as { text?: unknown }).text ?? '')
  if (typeof value === 'object' && 'result' in value) return String((value as { result?: unknown }).result ?? '')
  return String(value)
}

function amount(value: unknown): number | null {
  const valueText = text(value).replace(/,/g, '').replace(/万元$/u, '').trim()
  if (!valueText || ['待定', '-', '/', '—', '无'].includes(valueText)) return null
  if (/^[^\d]*根据|具体金额|划分份额|待定/u.test(valueText)) return null
  if (!/^-?\d+(?:\.\d+)?$/.test(valueText)) throw new Error('number_invalid')
  const number = Number(valueText)
  if (!Number.isFinite(number)) throw new Error('number_invalid')
  return Number(number.toFixed(2))
}

function percent(value: unknown): number | null {
  const raw = text(value).trim()
  if (!raw || ['待定', '-', '/', '—', '无'].includes(raw)) return null
  const explicitPercent = raw.endsWith('%')
  const number = Number(raw.replace('%', ''))
  if (!Number.isFinite(number)) throw new Error('percent_invalid')
  const normalized = !explicitPercent && number > 0 && number <= 1 ? number * 100 : number
  if (normalized < 0 || normalized > 100) throw new Error('percent_invalid')
  return Number(normalized.toFixed(2))
}

function date(value: unknown): string | null {
  if (value == null || text(value).trim() === '') return null
  let result: Date
  if (value instanceof Date) result = value
  else if (typeof value === 'number') result = new Date(Date.UTC(1899, 11, 30) + value * 86400000)
  else {
    const raw = text(value).trim()
    const simple = /^(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})/.exec(raw)
    result = simple ? new Date(Date.UTC(Number(simple[1]), Number(simple[2]) - 1, Number(simple[3]))) : new Date(raw)
  }
  if (!Number.isFinite(result.getTime())) throw new Error('date_invalid')
  return result.toISOString().slice(0, 10)
}
