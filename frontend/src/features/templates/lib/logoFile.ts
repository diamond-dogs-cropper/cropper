import type { OutputFormat, Template, UploadFormat } from '../model/templates.types'

export const MAX_LOGO_BYTES = 10 * 1024 * 1024

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const FORMAT_LABELS: Record<UploadFormat, string> = {
  jpg: 'JPG',
  png: 'PNG',
  svg: 'SVG',
}

export type CropArea = {
  height: number
  width: number
  x: number
  y: number
}

export type Placement = {
  scale: number
  x: number
  y: number
}

export type LoadedLogo = {
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

  if (hasBytes(prefix, PNG_SIGNATURE)) return 'png'
  if (hasBytes(prefix, [0xff, 0xd8, 0xff])) return 'jpg'

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

    image.onload = () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        URL.revokeObjectURL(url)
        reject(new Error('Изображение не содержит видимых данных'))
        return
      }
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Файл повреждён или имеет неверный формат'))
    }
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
  if (file.size === 0) throw new Error('Выбран пустой файл')
  if (file.size > MAX_LOGO_BYTES) throw new Error('Файл больше 10 МБ')

  const sourceFormat = await detectFormat(file)
  if (!sourceFormat) throw new Error('Файл должен быть в формате PNG, JPG или SVG')
  if (!allowedFormats.includes(sourceFormat)) {
    throw new Error(`Формат ${FORMAT_LABELS[sourceFormat]} не разрешён для этого шаблона`)
  }
  if (sourceFormat === 'svg') await assertSafeSvg(file)

  const image = await loadImage(file)
  return { fileName: file.name, image, sourceFormat, url: image.src }
}

export function suggestCrop(image: HTMLImageElement): CropArea {
  const maxSide = 800
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * ratio))
  const height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) return FULL_CROP

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  let pixels: Uint8ClampedArray
  try {
    pixels = context.getImageData(0, 0, width, height).data
  } catch {
    return FULL_CROP
  }

  let hasTransparency = false
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 250) {
      hasTransparency = true
      break
    }
  }

  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const visible = hasTransparency
        ? pixels[index + 3] > 10
        : pixels[index] < 248 || pixels[index + 1] < 248 || pixels[index + 2] < 248

      if (!visible) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) return FULL_CROP

  const padding = 2
  left = Math.max(0, left - padding)
  top = Math.max(0, top - padding)
  right = Math.min(width - 1, right + padding)
  bottom = Math.min(height - 1, bottom + padding)

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

export function drawLogo(
  canvas: HTMLCanvasElement,
  logo: LoadedLogo,
  crop: CropArea,
  template: Template,
  placement: Placement,
  maxPreviewSide?: number,
): void {
  const previewRatio = maxPreviewSide
    ? Math.min(1, maxPreviewSide / Math.max(template.width, template.height))
    : 1
  canvas.width = Math.max(1, Math.round(template.width * previewRatio))
  canvas.height = Math.max(1, Math.round(template.height * previewRatio))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не поддерживает обработку изображений')

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
        if (blob) resolve(blob)
        else reject(new Error('Не удалось подготовить изображение'))
      },
      mimeType,
      0.92,
    )
  })
}

export async function exportLogo(
  logo: LoadedLogo,
  crop: CropArea,
  template: Template,
  placement: Placement,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  drawLogo(canvas, logo, crop, template, placement)
  const blob = await canvasToBlob(canvas, template.output_format)

  if (blob.size > MAX_LOGO_BYTES) {
    throw new Error('Готовое изображение больше 10 МБ. Уменьшите масштаб логотипа')
  }

  return blob
}

export function getDownloadName(fileName: string, template: Template): string {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'logo'
  return `${baseName}_${template.width}x${template.height}.${template.output_format}`
}
