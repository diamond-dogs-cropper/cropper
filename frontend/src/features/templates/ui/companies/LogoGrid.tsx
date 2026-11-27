import { IconButton } from '../../../../shared/ui/IconButton'
import { DownloadIcon, TrashIcon } from '../../../../shared/ui/icons'
import { getLogoUrl } from '../../api/templatesApi'
import { formatReceivedAt, getFormatLabel } from '../../lib/templateText'
import type { Logo, Template } from '../../model/templates.types'

interface LogoGridProps {
  logos: Logo[]
  names: Map<string, string>
  onDelete: (logo: Logo) => void
  pendingId: string | null
  template: Template
}

export function LogoGrid({ logos, names, onDelete, pendingId, template }: Readonly<LogoGridProps>) {
  const format = getFormatLabel(template.output_format)

  return (
    <ul className="logo-grid">
      {logos.map(logo => {
        const url = getLogoUrl(template.id, logo.id)
        const company = names.get(logo.id) ?? logo.company
        return (
          <li className="logo-card" key={logo.id}>
            <div className="logo-card__image">
              <img
                alt={`Логотип компании ${company}`}
                className="checkerboard"
                loading="lazy"
                src={url}
                style={{ aspectRatio: `${template.width} / ${template.height}` }}
              />
            </div>
            <div className="logo-card__info">
              <h3>{company}</h3>
              <time dateTime={logo.created_at}>{formatReceivedAt(logo.created_at)}</time>
            </div>
            <div className="logo-card__actions">
              <a
                aria-label={`Скачать ${format}`}
                className="icon-button"
                data-tooltip={`Скачать ${format}`}
                download
                href={url}
              >
                <DownloadIcon />
              </a>
              <IconButton
                disabled={pendingId === logo.id}
                label="Удалить"
                onClick={() => onDelete(logo)}
                tone="danger"
              >
                <TrashIcon />
              </IconButton>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
