import type { Recipient } from '../model/templates.types'

export type CompanyState = 'received' | 'done' | 'invited' | 'waiting' | 'skip'
export type CompanyFilter = 'all' | 'waiting' | 'ready' | 'unbound'

export interface ParsedCompany {
  company: string
  duplicate: boolean
  email: string | null
  line: number
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_COMPANY_LENGTH = 100
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

export function getCompanyState(recipient: Recipient): CompanyState {
  if (recipient.logo) {
    return 'received'
  }
  if (recipient.mark) {
    return recipient.mark
  }
  return recipient.invited_at ? 'invited' : 'waiting'
}

export function describeState(recipient: Recipient): string {
  if (recipient.logo) {
    return `Получен ${shortDate.format(new Date(recipient.logo.created_at))}`
  }
  if (recipient.mark === 'done') {
    return 'Логотип есть'
  }
  if (recipient.mark === 'skip') {
    return 'Не нужен'
  }
  return recipient.invited_at
    ? `Письмо ${shortDate.format(new Date(recipient.invited_at))}`
    : 'Ждём'
}

export function isWaiting(recipient: Recipient): boolean {
  const state = getCompanyState(recipient)
  return state === 'waiting' || state === 'invited'
}

export function isReady(recipient: Recipient): boolean {
  const state = getCompanyState(recipient)
  return state === 'received' || state === 'done'
}

const LEGAL_FORMS = /(^|\s)(ооо|оао|зао|пао|ао|ип|нко|llc|inc|ltd)(?=\s|$)/g

export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[«»"'.,]/g, ' ')
    .replaceAll(LEGAL_FORMS, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

export function isSimilarCompany(a: string, b: string): boolean {
  const left = normalizeCompany(a)
  const right = normalizeCompany(b)
  return Boolean(left && right) && (left.includes(right) || right.includes(left))
}

export function getCompanyName(recipient: Recipient): string {
  return recipient.company || recipient.email || 'Без названия'
}

export function getRecipientLink(templateId: string, recipientId: string): string {
  return `${globalThis.location.origin}/t/${templateId}?r=${recipientId}`
}

function companyKey(company: string, email: string | null): string {
  return (company || email || '').toLowerCase().replaceAll(/\s+/g, ' ').trim()
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t')
  }
  if (line.includes(';')) {
    return line.split(';')
  }
  const cells = line.split(',')
  // Запятая бывает в названии («Ромашка, филиал»), поэтому делим по ней, только если есть почта.
  return cells.some(cell => EMAIL_PATTERN.test(cell.trim())) ? cells : [line]
}

export function parseCompanyList(text: string, existing: Recipient[]): ParsedCompany[] {
  const seen = new Set(existing.map(item => companyKey(item.company, item.email)))
  const parsed: ParsedCompany[] = []

  text.split(/\r?\n/).forEach((line, index) => {
    const cells = splitLine(line).map(cell => cell.trim()).filter(Boolean)
    const email = cells.find(cell => EMAIL_PATTERN.test(cell)) ?? null
    const company = (cells.find(cell => cell !== email) ?? '').slice(0, MAX_COMPANY_LENGTH)
    if (!company && !email) {
      return
    }
    const key = companyKey(company, email)
    parsed.push({ company, duplicate: seen.has(key), email, line: index })
    seen.add(key)
  })

  return parsed
}

const pluralRules = new Intl.PluralRules('ru-RU')
const companyWords: Record<string, string> = {
  few: 'компании',
  many: 'компаний',
  one: 'компания',
  other: 'компании',
}

export function formatCompanyCount(count: number): string {
  return `${count} ${companyWords[pluralRules.select(count)]}`
}
