export function colorDistance(data: Uint8ClampedArray, index: number, color: Uint8ClampedArray): number {
  return Math.max(
    Math.abs(data[index] - color[0]),
    Math.abs(data[index + 1] - color[1]),
    Math.abs(data[index + 2] - color[2]),
  )
}

const FILL_TOLERANCE = 32
const EDGE_WIDTH = 3
const HOLE_REACH = 0.05

function visitNeighbours(pixel: number, width: number, height: number, visit: (next: number) => void) {
  const x = pixel % width
  if (x > 0) {
    visit(pixel - 1)
  }
  if (x < width - 1) {
    visit(pixel + 1)
  }
  if (pixel >= width) {
    visit(pixel - width)
  }
  if (pixel < width * (height - 1)) {
    visit(pixel + width)
  }
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
    visitNeighbours(queue[head], width, height, visit)
  }
  return removed
}

function distanceFrom(mask: Uint8Array, width: number, height: number, limit: number): Uint16Array {
  const distance = new Uint16Array(width * height).fill(limit + 1)
  const queue = new Int32Array(width * height)
  let tail = 0
  // в очередь идёт только граница маски: внутренние пиксели ничего не добавляют, а на большом
  // фото их миллионы
  mask.forEach((value, pixel) => {
    if (!value) {
      return
    }
    distance[pixel] = 0
    let isEdge = false
    visitNeighbours(pixel, width, height, (next) => {
      isEdge ||= !mask[next]
    })
    if (isEdge) {
      queue[tail] = pixel
      tail += 1
    }
  })

  const visit = (next: number, step: number) => {
    if (distance[next] > step) {
      distance[next] = step
      queue[tail] = next
      tail += 1
    }
  }
  for (let head = 0; head < tail; head += 1) {
    const pixel = queue[head]
    const step = distance[pixel] + 1
    if (step <= limit) {
      visitNeighbours(pixel, width, height, (next) => visit(next, step))
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

  let size = 0
  const visit = (next: number) => {
    if (isBackground[next] && !removed[next] && !seen[next]) {
      seen[next] = 1
      region[size] = next
      size += 1
    }
  }

  for (let start = 0; start < removed.length; start += 1) {
    if (!isBackground[start] || removed[start] || seen[start]) {
      continue
    }
    size = 0
    visit(start)
    let isHole = false
    for (let head = 0; head < size; head += 1) {
      isHole ||= distance[region[head]] <= reach
      visitNeighbours(region[head], width, height, visit)
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

export function clearBackground(pixels: ImageData, background: Uint8ClampedArray) {
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
