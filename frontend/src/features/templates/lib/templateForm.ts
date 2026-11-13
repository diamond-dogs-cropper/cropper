import type { OutputFormat, Padding, TemplateInput, UploadFormat } from '../model/templates.types'

export const MIN_SIDE = 32
export const MAX_SIDE = 4000
export const DEFAULT_COLOR = '#FFFFFF'

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value)
}

export const outputFormats: { label: string; value: OutputFormat }[] = [
  { label: 'PNG', value: 'png' },
  { label: 'JPG', value: 'jpg' },
  { label: 'WebP', value: 'webp' },
]

export const uploadFormats: { label: string; value: UploadFormat }[] = [
  { label: 'SVG', value: 'svg' },
  { label: 'PNG', value: 'png' },
  { label: 'JPG', value: 'jpg' },
]

export type PaddingMode = 'all' | 'sides'

export interface FormValues {
  backgroundColor: string
  description: string
  height: string
  name: string
  outputFormat: OutputFormat
  padding: Record<keyof Padding, string>
  paddingAll: string
  paddingMode: PaddingMode
  transparent: boolean
  uploadFormats: UploadFormat[]
  width: string
}

export type FormErrors = Partial<
  Record<'background' | 'height' | 'name' | 'outputFormat' | 'padding' | 'uploadFormats' | 'width', string>
>

export interface Plate {
  background: string | null
  height: number
  padding: Padding
  width: number
}

export const defaultValues: FormValues = {
  backgroundColor: DEFAULT_COLOR,
  description: '',
  height: '220',
  name: '',
  outputFormat: 'png',
  padding: { bottom: '32', left: '32', right: '32', top: '32' },
  paddingAll: '32',
  paddingMode: 'all',
  transparent: false,
  uploadFormats: ['svg', 'png', 'jpg'],
  width: '400',
}

function parseInteger(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value) : null
}

function readSide(value: string): number | null {
  const side = parseInteger(value)
  return side !== null && side >= MIN_SIDE && side <= MAX_SIDE ? side : null
}

function readPadding(values: FormValues): Padding | null {
  if (values.paddingMode === 'all') {
    const all = parseInteger(values.paddingAll)
    return all === null ? null : { bottom: all, left: all, right: all, top: all }
  }

  const { bottom, left, right, top } = values.padding
  const padding = {
    bottom: parseInteger(bottom),
    left: parseInteger(left),
    right: parseInteger(right),
    top: parseInteger(top),
  }

  return Object.values(padding).includes(null) ? null : (padding as Padding)
}

function fits(width: number, height: number, padding: Padding): boolean {
  return padding.left + padding.right < width && padding.top + padding.bottom < height
}

export function readPlate(values: FormValues): Plate | null {
  const width = readSide(values.width)
  const height = readSide(values.height)
  const padding = readPadding(values)

  if (width === null || height === null || padding === null || !fits(width, height, padding)) {
    return null
  }

  const color = HEX_COLOR.test(values.backgroundColor) ? values.backgroundColor : DEFAULT_COLOR
  return { background: values.transparent ? null : color, height, padding, width }
}

function paddingError(width: number | null, height: number | null, padding: Padding | null) {
  if (padding === null) {
    return 'Отступы — целые числа не меньше 0'
  }
  const isTooLarge = width !== null && height !== null && !fits(width, height, padding)
  return isTooLarge ? 'Отступы не должны занимать всю плашку' : undefined
}

export function validate(values: FormValues): { errors: FormErrors; input: TemplateInput | null } {
  const name = values.name.trim()
  const width = readSide(values.width)
  const height = readSide(values.height)
  const padding = readPadding(values)
  const sideError = `От ${MIN_SIDE} до ${MAX_SIDE} px`
  const checks: [keyof FormErrors, boolean, string | undefined][] = [
    ['name', !name, 'Введите название шаблона'],
    ['width', width === null, sideError],
    ['height', height === null, sideError],
    ['padding', true, paddingError(width, height, padding)],
    ['background', !values.transparent && !HEX_COLOR.test(values.backgroundColor), 'Цвет в формате #RRGGBB'],
    ['outputFormat', values.transparent && values.outputFormat === 'jpg', 'Прозрачный фон недоступен для JPG'],
    ['uploadFormats', values.uploadFormats.length === 0, 'Выберите хотя бы один формат'],
  ]
  const errors: FormErrors = Object.fromEntries(
    checks.filter(([, failed, message]) => failed && message).map(([field, , message]) => [field, message]),
  )

  if (Object.keys(errors).length > 0 || width === null || height === null || padding === null) {
    return { errors, input: null }
  }

  return {
    errors,
    input: {
      background_color: values.transparent ? null : values.backgroundColor.toUpperCase(),
      description: values.description.trim(),
      height,
      name,
      output_format: values.outputFormat,
      padding_bottom: padding.bottom,
      padding_left: padding.left,
      padding_right: padding.right,
      padding_top: padding.top,
      upload_formats: values.uploadFormats,
      width,
    },
  }
}
