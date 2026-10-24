import { useEffect, useRef } from 'react'
import {
  drawLogo,
  type CropArea,
  type LoadedLogo,
  type Placement,
} from '../../../features/templates/lib/logoFile'
import type { Template } from '../../../features/templates/model/templates.types'

type LogoCanvasProps = {
  crop: CropArea
  logo: LoadedLogo
  placement: Placement
  template: Template
}

export function LogoCanvas({ crop, logo, placement, template }: Readonly<LogoCanvasProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      drawLogo(canvasRef.current, logo, crop, template, placement, 1200)
    }
  }, [crop, logo, placement, template])

  return (
    <canvas
      aria-label="Предпросмотр готовой плашки"
      ref={canvasRef}
      style={{ aspectRatio: `${template.width} / ${template.height}` }}
    />
  )
}
