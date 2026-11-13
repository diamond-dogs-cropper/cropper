import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import type { CropArea, LoadedLogo, Placement } from '../../../features/templates/lib/logoFile'
import { getFormatLabel } from '../../../features/templates/lib/templateText'
import type { Logo, Template } from '../../../features/templates/model/templates.types'
import { LogoCanvas } from './LogoCanvas'

interface SentStepProps {
  crop: CropArea
  downloadUrl: string
  fileName: string
  logo: LoadedLogo
  placement: Placement
  sent: Logo
  template: Template
}

export function SentStep({ crop, downloadUrl, fileName, logo, placement, sent, template }: Readonly<SentStepProps>) {
  return (
    <section className="panel recipient-sent">
      <output className="recipient-sent__notice">✓ Файл передан организатору</output>
      <div className="recipient-sent__body">
        <div className="recipient-sent__preview">
          <div
            className={template.background_color ? 'result-plate' : 'result-plate plate--transparent'}
            style={{ aspectRatio: `${template.width} / ${template.height}` }}
          >
            <LogoCanvas crop={crop} logo={logo} placement={placement} template={template} />
          </div>
        </div>
        <div className="recipient-sent__copy">
          <h2>{sent.company}</h2>
          <p className="recipient-sent__template">Шаблон: {template.name}</p>
          <p className="recipient-sent__file">
            {fileName} · {template.width} × {template.height} px
          </p>
          <p>
            Организатор получил логотип и название компании. Отправлять файл ещё раз не нужно.
          </p>
        </div>
      </div>
      <div className="recipient-sent__actions">
        <a className="outline-button" download={fileName} href={downloadUrl}>
          Скачать {getFormatLabel(template.output_format)}
        </a>
        <Link className="outline-button" to={routePaths.home} viewTransition>На главную</Link>
      </div>
    </section>
  )
}
