import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { getTemplates, getTemplatesSnapshot } from '../../../features/templates/api/templatesApi'
import { formatTemplateCount } from '../../../features/templates/lib/templateText'
import type { Template } from '../../../features/templates/model/templates.types'
import { TemplateRow } from '../../../features/templates/ui/TemplateRow'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { ButtonLink } from '../../../shared/ui/ButtonLink'
import { TemplatesPageSkeleton } from '../../../shared/ui/PageSkeletons'
import { SearchField } from '../../../shared/ui/SearchField'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; templates: Template[] }

export function Component() {
  const [state, setState] = useState<ListState>(() => {
    const snapshot = getTemplatesSnapshot()
    return snapshot ? { status: 'ready', templates: snapshot } : { status: 'loading' }
  })
  const [query, setQuery] = useState('')

  useEffect(() => {
    let isCurrent = true

    getTemplates()
      .then(loaded => isCurrent && setState({ status: 'ready', templates: loaded }))
      .catch((error: unknown) => {
        if (!isCurrent) {
          return
        }
        setState(current =>
          current.status === 'ready'
            ? current
            : { status: 'error', message: getErrorMessage(error) },
        )
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const templates = state.status === 'ready' ? state.templates : []
  const needle = query.trim().toLowerCase()
  const visible = templates.filter(template => template.name.toLowerCase().includes(needle))

  return (
    <section className="templates-page" aria-labelledby="templates-title">
      <div className="page-head">
        <div>
          <h1 id="templates-title">Мои шаблоны</h1>
          <p>Создавайте шаблоны и передавайте компаниям одну ссылку с вашими требованиями.</p>
        </div>
        <ButtonLink to={routePaths.templateNew}>Создать шаблон</ButtonLink>
      </div>

      {state.status === 'loading' ? <TemplatesPageSkeleton /> : null}

      {state.status === 'error' ? (
        <div className="empty-state" role="alert">
          <h2>Не удалось загрузить шаблоны</h2>
          <p>{state.message}</p>
        </div>
      ) : null}

      {state.status === 'ready' && templates.length === 0 ? (
        <div className="empty-state">
          <h2>Шаблонов пока нет</h2>
          <p>
            <Link to={routePaths.templateNew} viewTransition>Создайте первый шаблон</Link> и отправьте ссылку компаниям.
          </p>
        </div>
      ) : null}

      {state.status === 'ready' && templates.length > 0 ? (
        <>
          <div className="list-toolbar">
            <SearchField label="Найти шаблон" onChange={setQuery} value={query} />
            <span aria-live="polite">{formatTemplateCount(visible.length)}</span>
          </div>
          {visible.length > 0 ? (
            <ul className="panel template-list">
              {visible.map(template => (
                <TemplateRow key={template.id} template={template} />
              ))}
            </ul>
          ) : (
            <p className="page-note">По запросу «{query.trim()}» ничего не найдено.</p>
          )}
        </>
      ) : null}
    </section>
  )
}
