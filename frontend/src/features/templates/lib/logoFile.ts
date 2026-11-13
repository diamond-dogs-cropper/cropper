import type { OutputFormat, Template, UploadFormat } from '../model/templates.types'
import { describeUploadFormats } from './templateText'

export const MAX_LOGO_BYTES = 10 * 1024 * 1024

const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
const FORMAT_LABELS: Record<UploadFormat, string> = {
  jpg: 'JPG',
  png: 'PNG',
  svg: 'SVG',
}

export interface CropArea {
  height: number
  width: number
  x: number
  y: number
}

export interface Placement {
  scale: number
  x: number
  y: number
}

export interface LoadedLogo {
  fileName: string
  image: HTMLImageElement
  sourceFormat: UploadFormat
  url: string
}

export const FULL_CROP: CropArea = { height: 1, width: 1, x: 0, y: 0 }
export const CENTERED_PLACEMENT: Placement = { scale: 100, x: 0.5, y: 0.5 }

function hasBytes(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value)
}

async function detectFormat(file: File): Promise<UploadFormat | null> {
  const prefix = new Uint8Array(await file.slice(0, 4096).arrayBuffer())

  if (hasBytes(prefix, PNG_SIGNATURE)) {
    return 'png'
  }
  if (hasBytes(prefix, [0xFF, 0xD8, 0xFF])) {
    return 'jpg'
  }

  const text = new TextDecoder().decode(prefix).replace(/^\uFEFF/, '').trimStart()
  return /<svg(?:\s|>)/i.test(text) ? 'svg' : null
}

async function assertSafeSvg(file: File): Promise<void> {
  const source = await file.text()

  if (/<(?:script|foreignObject)(?:\s|>)/i.test(source)) {
    throw new Error('SVG содержит неподдерживаемые активные элементы')
  }

  if (/(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/)/i.test(source)) {
    throw new Error('SVG не должен ссылаться на внешние ресурсы')
  }
}

function loadImage(file: File): Promise<LoadedLogo['image']> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.addEventListener('load', () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        URL.revokeObjectURL(url)
        reject(new Error('Изображение не содержит видимых данных'))
        return
      }
      resolve(image)
    })
    image.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Файл повреждён или имеет неверный формат'))
    })
    image.src = url
  })
}

export function getAcceptValue(formats: UploadFormat[]): string {
  const mimeTypes: Record<UploadFormat, string> = {
    jpg: 'image/jpeg,.jpg,.jpeg',
    png: 'image/png,.png',
    svg: 'image/svg+xml,.svg',
  }

  return formats.map((format) => mimeTypes[format]).join(',')
}

export async function loadLogo(file: File, allowedFormats: UploadFormat[]): Promise<LoadedLogo> {
  if (file.size === 0) {
    throw new Error('Выбран пустой файл')
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Файл больше 10 МБ')
  }

  const sourceFormat = await detectFormat(file)
  const allowed = describeUploadFormats(allowedFormats)
  if (!sourceFormat) {
    throw new Error(`Файл не подходит. Загрузите логотип в формате ${allowed}`)
  }
  if (!allowedFormats.includes(sourceFormat)) {
    throw new Error(
      `Формат ${FORMAT_LABELS[sourceFormat]} не принимается. Загрузите логотип в формате ${allowed}`,
    )
  }
  if (sourceFormat === 'svg') {
    await assertSafeSvg(file)
  }

  const image = await loadImage(file)
  return { fileName: file.name, image, sourceFormat, url: image.src }
}

interface Bounds {
  bottom: number
  left: number
  right: number
  top: number
}

const VISIBLE_ALPHA = 10
const BACKGROUND_TOLERANCE = 16

function readPixels(image: HTMLImageElement): ImageData | null {
  const ratio = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return null
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  try {
    return context.getImageData(0, 0, canvas.width, canvas.height)
  } catch {
    return null
  }
}

function hasTransparency(pixels: Uint8ClampedArray): boolean {
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 250) {
      return true
    }
  }
  return false
}

function colorDistance(data: Uint8ClampedArray, index: number, color: Uint8ClampedArray): number {
  return Math.max(
    Math.abs(data[index] - color[0]),
    Math.abs(data[index + 1] - color[1]),
    Math.abs(data[index + 2] - color[2]),
  )
}

function findBackground({ data, height, width }: ImageData): Uint8ClampedArray | null {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1].map((pixel) => pixel * 4)
  const color = data.slice(corners[0], corners[0] + 3)
  return corners.every((index) => colorDistance(data, index, color) <= BACKGROUND_TOLERANCE)
    ? color
    : null
}

function getVisibilityTest(pixels: ImageData): ((index: number) => boolean) | null {
  const { data } = pixels
  if (hasTransparency(data)) {
    return (index) => data[index + 3] > VISIBLE_ALPHA
  }
  const background = findBackground(pixels)
  return background
    ? (index) => colorDistance(data, index, background) > BACKGROUND_TOLERANCE
    : null
}

function findBounds(pixels: ImageData): Bounds | null {
  const isVisible = getVisibilityTest(pixels)
  if (!isVisible) {
    return null
  }

  const { height, width } = pixels
  const bounds = { bottom: -1, left: width, right: -1, top: height }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isVisible((y * width + x) * 4)) {
        bounds.left = Math.min(bounds.left, x)
        bounds.top = Math.min(bounds.top, y)
        bounds.right = Math.max(bounds.right, x)
        bounds.bottom = Math.max(bounds.bottom, y)
      }
    }
  }
  return bounds.right < bounds.left ? null : bounds
}

export function suggestCrop(image: HTMLImageElement): CropArea {
  const pixels = readPixels(image)
  const bounds = pixels ? findBounds(pixels) : null
  if (!pixels || !bounds) {
    return FULL_CROP
  }

  const { height, width } = pixels
  const padding = 2
  const left = Math.max(0, bounds.left - padding)
  const top = Math.max(0, bounds.top - padding)
  const right = Math.min(width - 1, bounds.right + padding)
  const bottom = Math.min(height - 1, bounds.bottom + padding)

  return {
    height: (bottom - top + 1) / height,
    width: (right - left + 1) / width,
    x: left / width,
    y: top / height,
  }
}

export function getLogoGeometry(
  logo: LoadedLogo,
  crop: CropArea,
  template: Template,
  placement: Placement,
) {
  const sourceWidth = logo.image.naturalWidth * crop.width
  const sourceHeight = logo.image.naturalHeight * crop.height
  const safeWidth = template.width - template.padding_left - template.padding_right
  const safeHeight = template.height - template.padding_top - template.padding_bottom
  const containScale = Math.min(safeWidth / sourceWidth, safeHeight / sourceHeight)
  const scale = containScale * (placement.scale / 100)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    height,
    sourceHeight,
    sourceWidth,
    sourceX: logo.image.naturalWidth * crop.x,
    sourceY: logo.image.naturalHeight * crop.y,
    width,
    x: template.padding_left + (safeWidth - width) * placement.x,
    y: template.padding_top + (safeHeight - height) * placement.y,
  }
}

export interface LogoLayout {
  crop: CropArea
  logo: LoadedLogo
  placement: Placement
  template: Template
}

export function drawLogo(
  canvas: HTMLCanvasElement,
  { crop, logo, placement, template }: LogoLayout,
  maxPreviewSide?: number,
): void {
  const previewRatio = maxPreviewSide
    ? Math.min(1, maxPreviewSide / Math.max(template.width, template.height))
    : 1
  canvas.width = Math.max(1, Math.round(template.width * previewRatio))
  canvas.height = Math.max(1, Math.round(template.height * previewRatio))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Браузер не поддерживает обработку изображений')
  }

  context.scale(previewRatio, previewRatio)
  context.clearRect(0, 0, template.width, template.height)
  if (template.background_color) {
    context.fillStyle = template.background_color
    context.fillRect(0, 0, template.width, template.height)
  }

  const geometry = getLogoGeometry(logo, crop, template, placement)
  context.drawImage(
    logo.image,
    geometry.sourceX,
    geometry.sourceY,
    geometry.sourceWidth,
    geometry.sourceHeight,
    geometry.x,
    geometry.y,
    geometry.width,
    geometry.height,
  )
}

function canvasToBlob(canvas: HTMLCanvasElement, outputFormat: OutputFormat): Promise<Blob> {
  const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : `image/${outputFormat}`

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Не удалось подготовить изображение'))
        }
      },
      mimeType,
      0.92,
    )
  })
}

export async function exportLogo(
  layout: LogoLayout,
  format: OutputFormat = layout.template.output_format,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  drawLogo(canvas, layout)
  const blob = await canvasToBlob(canvas, format)

  if (blob.size > MAX_LOGO_BYTES) {
    throw new Error('Готовое изображение больше 10 МБ. Уменьшите масштаб логотипа')
  }

  return blob
}

export function getDownloadName(fileName: string, template: Template): string {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'logo'
  return `${baseName}_${template.width}x${template.height}.${template.output_format}`
}
