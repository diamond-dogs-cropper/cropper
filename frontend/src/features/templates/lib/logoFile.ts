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

export function hasOwnBackground(image: HTMLImageElement, plateColor: string | null): boolean {
  const pixels = readPixels(image)
  if (!pixels || hasTransparency(pixels.data)) {
    return false
  }

  const background = findBackground(pixels)
  if (!background || plateColor === null) {
    return true
  }
  const plate = Uint8ClampedArray.from([1, 3, 5].map((start) => Number.parseInt(plateColor.slice(start, start + 2), 16)))
  return colorDistance(background, 0, plate) > BACKGROUND_TOLERANCE
}

const FILL_TOLERANCE = 32
const EDGE_WIDTH = 3
const HOLE_REACH = 0.05

function neighbours(pixel: number, width: number, height: number): number[] {
  const x = pixel % width
  const result = []
  if (x > 0) {
    result.push(pixel - 1)
  }
  if (x < width - 1) {
    result.push(pixel + 1)
  }
  if (pixel >= width) {
    result.push(pixel - width)
  }
  if (pixel < width * (height - 1)) {
    result.push(pixel + width)
  }
  return result
}

function findOuterBackground(isBackground: Uint8Array, width: number, height: number): Uint8Array {
  const removed = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let tail = 0
  const visit = (pixel: number) => {
    if (isBackground[pixel] && !removed[pixel]) {
      removed[pixel] = 1
      queue[tail] = pixel
      tail += 1
    }
  }

  for (let x = 0; x < width; x += 1) {
    visit(x)
    visit((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    visit(y * width)
    visit(y * width + width - 1)
  }
  for (let head = 0; head < tail; head += 1) {
    neighbours(queue[head], width, height).forEach(visit)
  }
  return removed
}

function distanceFrom(mask: Uint8Array, width: number, height: number, limit: number): Uint16Array {
  const distance = new Uint16Array(width * height).fill(limit + 1)
  const queue = new Int32Array(width * height)
  let tail = 0
  mask.forEach((value, pixel) => {
    if (value) {
      distance[pixel] = 0
      queue[tail] = pixel
      tail += 1
    }
  })

  for (let head = 0; head < tail; head += 1) {
    const pixel = queue[head]
    if (distance[pixel] >= limit) {
      continue
    }
    for (const next of neighbours(pixel, width, height)) {
      if (distance[next] > distance[pixel] + 1) {
        distance[next] = distance[pixel] + 1
        queue[tail] = next
        tail += 1
      }
    }
  }
  return distance
}

// Просвет внутри буквы («о», «е») тоже фон: он отделён от внешнего фона только тонким штрихом.
// Светлые детали в глубине логотипа дальше от внешнего фона, они остаются.
function addLetterHoles(removed: Uint8Array, isBackground: Uint8Array, width: number, height: number) {
  const reach = Math.max(8, Math.round(Math.min(width, height) * HOLE_REACH))
  const distance = distanceFrom(removed, width, height, reach)
  const seen = new Uint8Array(width * height)
  const region = new Int32Array(width * height)

  for (let start = 0; start < removed.length; start += 1) {
    if (!isBackground[start] || removed[start] || seen[start]) {
      continue
    }
    region[0] = start
    let size = 1
    seen[start] = 1
    let isHole = false
    for (let head = 0; head < size; head += 1) {
      isHole ||= distance[region[head]] <= reach
      for (const next of neighbours(region[head], width, height)) {
        if (isBackground[next] && !removed[next] && !seen[next]) {
          seen[next] = 1
          region[size] = next
          size += 1
        }
      }
    }
    if (isHole) {
      for (let index = 0; index < size; index += 1) {
        removed[region[index]] = 1
      }
    }
  }
}

function strongestNearby(source: ImageData, pixel: number, background: Uint8ClampedArray): number {
  const { data, height, width } = source
  const cx = pixel % width
  const cy = Math.floor(pixel / width)
  let strongest = 0
  for (let y = Math.max(0, cy - EDGE_WIDTH - 1); y <= Math.min(height - 1, cy + EDGE_WIDTH + 1); y += 1) {
    for (let x = Math.max(0, cx - EDGE_WIDTH - 1); x <= Math.min(width - 1, cx + EDGE_WIDTH + 1); x += 1) {
      strongest = Math.max(strongest, colorDistance(data, (y * width + x) * 4, background))
    }
  }
  return strongest
}

// Край логотипа в файле смешан с фоном на несколько пикселей. Долю логотипа в пикселе считаем
// по тому, насколько он отличается от фона относительно соседнего «чистого» цвета логотипа,
// и вычитаем примесь фона — иначе остаётся светлая рваная кайма.
function softenEdge(pixels: ImageData, source: ImageData, pixel: number, background: Uint8ClampedArray) {
  const { data } = pixels
  const index = pixel * 4
  const solid = strongestNearby(source, pixel, background)
  const alpha = Math.min(1, colorDistance(data, index, background) / Math.max(solid, FILL_TOLERANCE * 2))

  if (alpha > 0.95) {
    return
  }
  if (alpha < 0.08) {
    data[index + 3] = 0
    return
  }
  for (let channel = 0; channel < 3; channel += 1) {
    data[index + channel] = background[channel] + (data[index + channel] - background[channel]) / alpha
  }
  data[index + 3] = Math.round(data[index + 3] * alpha)
}

function clearBackground(pixels: ImageData, background: Uint8ClampedArray) {
  const { data, height, width } = pixels
  const isBackground = new Uint8Array(width * height)
  for (let pixel = 0; pixel < isBackground.length; pixel += 1) {
    isBackground[pixel] = colorDistance(data, pixel * 4, background) <= FILL_TOLERANCE ? 1 : 0
  }

  const removed = findOuterBackground(isBackground, width, height)
  addLetterHoles(removed, isBackground, width, height)
  const distance = distanceFrom(removed, width, height, EDGE_WIDTH)
  const source = new ImageData(data.slice(), width, height)

  for (let pixel = 0; pixel < removed.length; pixel += 1) {
    if (removed[pixel]) {
      data[pixel * 4 + 3] = 0
    } else if (distance[pixel] <= EDGE_WIDTH) {
      softenEdge(pixels, source, pixel, background)
    }
  }
}

export async function removeBackground(logo: LoadedLogo): Promise<LoadedLogo> {
  const { naturalHeight: height, naturalWidth: width } = logo.image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Браузер не поддерживает обработку изображений')
  }

  context.drawImage(logo.image, 0, 0)
  const pixels = context.getImageData(0, 0, width, height)
  const background = findBackground(pixels)
  if (!background) {
    throw new Error('Не удалось определить цвет фона: углы картинки разного цвета')
  }

  clearBackground(pixels, background)
  if (!findBounds(pixels)) {
    throw new Error('После удаления фона ничего не осталось')
  }
  context.putImageData(pixels, 0, 0)

  const blob = await canvasToBlob(canvas, 'png')
  const image = await loadImage(new File([blob], logo.fileName, { type: 'image/png' }))
  return { fileName: logo.fileName, image, sourceFormat: 'png', url: image.src }
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
  // по умолчанию 'low': при сильном уменьшении большого файла появляются муар и рваные края
  context.imageSmoothingQuality = 'high'
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
