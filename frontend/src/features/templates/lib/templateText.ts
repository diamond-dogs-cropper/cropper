import type { Template } from '../model/templates.types'
import { outputFormats } from './templateForm'

export function getFormatLabel(format: Template['output_format']): string {
  return outputFormats.find((item) => item.value === format)?.label ?? format
}

export function describeBackground(color: string | null): string {
  if (color === null) return 'прозрачный'
  return color === '#FFFFFF' ? 'белый #FFFFFF' : color
}

export function describeUploadFormats(formats: Template['upload_formats']): string {
  const labels = formats.map((format) => format.toUpperCase())
  if (labels.length === 1) return labels[0]

  return `${labels.slice(0, -1).join(', ')} или ${labels.at(-1)}`
}

export function describePadding(template: Template): string {
  const { padding_bottom: bottom, padding_left: left, padding_right: right, padding_top: top } =
    template

  if (top === right && top === bottom && top === left) {
    return `${top}\u00A0px со всех сторон`
  }

  return `сверху ${top}, справа ${right}, снизу ${bottom}, слева ${left}\u00A0px`
}

export function getTemplateLink(id: string): string {
  return `${window.location.origin}/t/${id}`
}

function describeBackgroundShort(color: string | null): string {
  if (color === null) return 'Прозрачный фон'
  return color === '#FFFFFF' ? 'Белый фон' : `Фон ${color}`
}

export function describeRowSummary(template: Template): string {
  const { padding_bottom: bottom, padding_left: left } = template
  const { padding_right: right, padding_top: top } = template
  const background = describeBackgroundShort(template.background_color)
  const isUniform = top === right && top === bottom && top === left
  const padding = isUniform ? `${top} px` : `${top}/${right}/${bottom}/${left} px`

  return `${background} · отступы ${padding}`
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatCreatedAt(value: string): string {
  const parts = dateFormat.formatToParts(new Date(value))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''

  return `${part('day')} ${part('month').replace('.', '')} ${part('year')}`
}

const pluralRules = new Intl.PluralRules('ru-RU')
const templateWords: Record<string, string> = {
  few: 'шаблона',
  many: 'шаблонов',
  one: 'шаблон',
  other: 'шаблона',
}

export function formatTemplateCount(count: number): string {
  return `${count} ${templateWords[pluralRules.select(count)]}`
}
