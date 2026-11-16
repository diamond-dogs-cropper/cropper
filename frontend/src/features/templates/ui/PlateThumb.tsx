import type { Template } from '../model/templates.types'

interface PlateThumbProps {
  box: { height: number; width: number }
  template: Template
}

function percent(part: number, whole: number): string {
  return `${(part / whole) * 100}%`
}

export function PlateThumb({ box, template }: Readonly<PlateThumbProps>) {
  const { background_color: background, height, width } = template
  const scale = Math.min(box.width / width, box.height / height)

  return (
    <div aria-hidden="true" className="plate-thumb" style={{ height: box.height, width: box.width }}>
      <div
        className={background === null ? 'plate-thumb__plate checkerboard' : 'plate-thumb__plate'}
        style={{ background: background ?? undefined, height: height * scale, width: width * scale }}
      >
        <span
          className="plate-thumb__safe"
          style={{
            bottom: percent(template.padding_bottom, height),
            left: percent(template.padding_left, width),
            right: percent(template.padding_right, width),
            top: percent(template.padding_top, height),
          }}
        />
      </div>
    </div>
  )
}
