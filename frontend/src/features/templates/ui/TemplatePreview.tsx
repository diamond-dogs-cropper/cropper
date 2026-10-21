import type { Plate } from '../lib/templateForm'
import { getFormatLabel } from '../lib/templateText'
import type { OutputFormat } from '../model/templates.types'

const AREA = { height: 352, width: 656 }

type TemplatePreviewProps = {
  outputFormat: OutputFormat
  plate: Plate | null
}

function percent(part: number, whole: number): string {
  return `${(part / whole) * 100}%`
}

export function TemplatePreview({ outputFormat, plate }: Readonly<TemplatePreviewProps>) {
  return (
    <section className="panel template-preview" aria-labelledby="template-preview-title">
      <div className="template-preview__header">
        <h2 id="template-preview-title">Предпросмотр плашки</h2>
        {plate ? (
          <span>
            {plate.width} × {plate.height}&nbsp;px · {getFormatLabel(outputFormat)}
          </span>
        ) : null}
      </div>
      <div className="template-preview__canvas">
        {plate ? (
          <div
            className={plate.background === null ? 'plate plate--transparent' : 'plate'}
            style={{
              aspectRatio: `${plate.width} / ${plate.height}`,
              background: plate.background ?? undefined,
              width: `min(100%, ${(plate.width * Math.min(1, AREA.width / plate.width, AREA.height / plate.height))}px)`,
            }}
          >
            <div
              className="plate__safe-area"
              style={{
                bottom: percent(plate.padding.bottom, plate.height),
                left: percent(plate.padding.left, plate.width),
                right: percent(plate.padding.right, plate.width),
                top: percent(plate.padding.top, plate.height),
              }}
            >
              <strong>Логотип компании</strong>
              <span>Пример размещения</span>
            </div>
          </div>
        ) : (
          <p>Укажите размер плашки и отступы, чтобы увидеть предпросмотр.</p>
        )}
      </div>
      {plate ? (
        <div className="template-preview__legend">
          <strong>
            Безопасная область: {plate.width - plate.padding.left - plate.padding.right} ×{' '}
            {plate.height - plate.padding.top - plate.padding.bottom}&nbsp;px
          </strong>
          <span>Синяя рамка обозначает охранные отступы и не попадёт в готовый файл.</span>
        </div>
      ) : null}
    </section>
  )
}
