import { clearBackground } from './backgroundRemoval'

interface Job {
  background: Uint8ClampedArray
  pixels: ImageData
}

globalThis.addEventListener('message', (event: MessageEvent<Job>) => {
  const { background, pixels } = event.data
  clearBackground(pixels, background)
  globalThis.postMessage(pixels, { transfer: [pixels.data.buffer] })
})
