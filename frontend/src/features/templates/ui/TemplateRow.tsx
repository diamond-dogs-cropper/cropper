import { Link } from 'react-router-dom'
import { getTemplatePath } from '../../../app/router/routePaths'
import { IconButton } from '../../../shared/ui/IconButton'
import { CheckIcon, CopyIcon, ExternalIcon } from '../../../shared/ui/icons'
import {
  describeRowSummary,
  formatCreatedAt,
  getFormatLabel,
  getTemplateLink,
} from '../lib/templateText'
import { useCopyLink } from '../lib/useCopyLink'
import type { Template } from '../model/templates.types'
import { PlateThumb } from './PlateThumb'

const COPY_LABELS = {
  copied: 'Ссылка скопирована',
  failed: 'Не удалось скопировать',
  idle: 'Скопировать ссылку для компаний',
}

export function TemplateRow({ template }: Readonly<{ template: Template }>) {
  const [copy, copyLink] = useCopyLink()
  const link = getTemplateLink(template.id)

  return (
    <li className="template-row">
      <PlateThumb box={{ height: 48, width: 72 }} template={template} />
      <div className="template-row__copy">
        <h2>
          <Link
            className="template-row__link"
            state={{ template }}
            to={getTemplatePath(template.id)}
            viewTransition
          >
            {template.name}
          </Link>
          {template.is_open ? null : <span className="badge">Сбор закрыт</span>}
        </h2>
        <p>{describeRowSummary(template)}</p>
      </div>
      <p className="template-row__params">
        {template.width} × {template.height}&nbsp;px · {getFormatLabel(template.output_format)}
      </p>
      <time className="template-row__date" dateTime={template.created_at}>
        {formatCreatedAt(template.created_at)}
      </time>
      <div className="template-row__actions">
        <IconButton label={COPY_LABELS[copy]} onClick={() => void copyLink(link)}>
          {copy === 'copied' ? <CheckIcon /> : <CopyIcon />}
        </IconButton>
        <a
          aria-label="Открыть страницу для компаний"
          className="icon-button"
          data-tooltip="Открыть страницу для компаний"
          href={link}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalIcon />
        </a>
      </div>
    </li>
  )
}
