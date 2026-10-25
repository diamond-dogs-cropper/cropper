import { Link } from 'react-router-dom'
import { getTemplatePath } from '../../../app/router/routePaths'
import {
  describeRowSummary,
  formatCreatedAt,
  getFormatLabel,
} from '../lib/templateText'
import type { Template } from '../model/templates.types'

type TemplateRowProps = {
  isPending: boolean
  onDelete: (template: Template) => void
  onToggleOpen: (template: Template) => void
  template: Template
}

export function TemplateRow({
  isPending,
  onDelete,
  onToggleOpen,
  template,
}: Readonly<TemplateRowProps>) {
  const path = getTemplatePath(template.id)

  return (
    <li className="template-row">
      <div aria-hidden="true" className="template-row__thumb">
        Лого
      </div>
      <div className="template-row__copy">
        <h2>
          {template.name}
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
        <Link className="outline-button" state={{ template }} to={path} viewTransition>
          Получить ссылку
        </Link>
        <div className="template-row__more">
          <Link state={{ template }} to={path} viewTransition>Открыть шаблон</Link>
          <button disabled={isPending} onClick={() => onToggleOpen(template)} type="button">
            {template.is_open ? 'Закрыть сбор' : 'Открыть сбор'}
          </button>
          <button
            className="template-row__delete"
            disabled={isPending}
            onClick={() => onDelete(template)}
            type="button"
          >
            Удалить
          </button>
        </div>
      </div>
    </li>
  )
}
