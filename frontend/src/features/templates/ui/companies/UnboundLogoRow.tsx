import { IconButton } from '../../../../shared/ui/IconButton'
import { DownloadIcon, TrashIcon } from '../../../../shared/ui/icons'
import { getLogoUrl } from '../../api/templatesApi'
import { formatReceivedAt, getFormatLabel } from '../../lib/templateText'
import type { Logo, Recipient, Template } from '../../model/templates.types'
import { BindPicker } from './BindPicker'

interface UnboundLogoRowProps {
  isBusy: boolean
  logo: Logo
  onBind: (recipient: Recipient, logo: Logo) => void
  onDelete: (logo: Logo) => void
  recipients: Recipient[]
  template: Template
}

export function UnboundLogoRow(props: Readonly<UnboundLogoRowProps>) {
  const { isBusy, logo, onBind, onDelete, recipients, template } = props
  const url = getLogoUrl(template.id, logo.id)
  const format = getFormatLabel(template.output_format)

  return (
    <li aria-busy={isBusy} className="company-row company-row--unbound">
      <div className="company-row__thumb">
        <img
          alt={`Логотип ${logo.company}`}
          className="checkerboard"
          loading="lazy"
          src={url}
          style={{ aspectRatio: `${template.width} / ${template.height}` }}
        />
      </div>
      <div className="company-row__info">
        <h3>{logo.company}</h3>
        <p>Не привязан к компании из списка · {formatReceivedAt(logo.created_at)}</p>
      </div>
      <span className="company-status company-status--unbound">Не из списка</span>
      <div className="company-row__actions">
        {recipients.length > 0 ? (
          <BindPicker
            company={logo.company}
            disabled={isBusy}
            onSelect={recipient => onBind(recipient, logo)}
            recipients={recipients}
          />
        ) : null}
        <a
          aria-label={`Скачать ${format}`}
          className="icon-button"
          data-tooltip={`Скачать ${format}`}
          download
          href={url}
        >
          <DownloadIcon />
        </a>
        <IconButton disabled={isBusy} label="Удалить логотип" onClick={() => onDelete(logo)} tone="danger">
          <TrashIcon />
        </IconButton>
      </div>
    </li>
  )
}
