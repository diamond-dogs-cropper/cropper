import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import {
  deleteTemplate,
  getTemplates,
  setTemplateOpen,
} from '../../../features/templates/api/templatesApi'
import { formatTemplateCount } from '../../../features/templates/lib/templateText'
import type { Template } from '../../../features/templates/model/templates.types'
import { TemplateRow } from '../../../features/templates/ui/TemplateRow'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { ButtonLink } from '../../../shared/ui/ButtonLink'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; templates: Template[] }

export function Component() {
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    getTemplates()
      .then((templates) => isCurrent && setState({ status: 'ready', templates }))
      .catch(
        (error: unknown) => isCurrent && setState({ status: 'error', message: getErrorMessage(error) }),
      )

    return () => {
      isCurrent = false
    }
  }, [])

  function changeTemplates(change: (templates: Template[]) => Template[]) {
    setState((current) =>
      current.status === 'ready' ? { status: 'ready', templates: change(current.templates) } : current,
    )
  }

  async function runAction(template: Template, action: () => Promise<void>) {
    setActionError(null)
    setPendingId(template.id)

    try {
      await action()
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setPendingId(null)
    }
  }

  function toggleOpen(template: Template) {
    return runAction(template, async () => {
      const updated = await setTemplateOpen(template.id, !template.is_open)
      changeTemplates((templates) => templates.map((item) => (item.id === updated.id ? updated : item)))
    })
  }

  function remove(template: Template) {
    const question = `Удалить шаблон «${template.name}»? Загруженные по нему логотипы тоже будут удалены.`
    if (!window.confirm(question)) return Promise.resolve()

    return runAction(template, async () => {
      await deleteTemplate(template.id)
      changeTemplates((templates) => templates.filter((item) => item.id !== template.id))
    })
  }

  const templates = state.status === 'ready' ? state.templates : []
  const needle = query.trim().toLowerCase()
  const visible = templates.filter((template) => template.name.toLowerCase().includes(needle))

  return (
    <section className="templates-page" aria-labelledby="templates-title">
      <div className="page-head">
        <div>
          <h1 id="templates-title">Мои шаблоны</h1>
          <p>Создавайте шаблоны и передавайте компаниям одну ссылку с вашими требованиями.</p>
        </div>
        <ButtonLink to={routePaths.templateNew}>Создать шаблон</ButtonLink>
      </div>

      {state.status === 'loading' ? <p className="page-note">Загружаем шаблоны…</p> : null}

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
            Создайте первый шаблон и отправьте ссылку компаниям — <Link to={routePaths.templateNew}>создать шаблон</Link>.
          </p>
        </div>
      ) : null}

      {state.status === 'ready' && templates.length > 0 ? (
        <>
          <div className="list-toolbar">
            <input
              aria-label="Поиск по названию"
              autoComplete="off"
              name="search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти шаблон по названию"
              type="search"
              value={query}
            />
            <span aria-live="polite">{formatTemplateCount(visible.length)}</span>
          </div>
          {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
          <div className="panel template-table">
            <div aria-hidden="true" className="template-table__head">
              <span>Плашка</span>
              <span>Название</span>
              <span>Параметры</span>
              <span>Создан</span>
              <span>Действия</span>
            </div>
            {visible.length > 0 ? (
              <ul className="template-table__rows">
                {visible.map((template) => (
                  <TemplateRow
                    isPending={pendingId === template.id}
                    key={template.id}
                    onDelete={(item) => void remove(item)}
                    onToggleOpen={(item) => void toggleOpen(item)}
                    template={template}
                  />
                ))}
              </ul>
            ) : (
              <p className="page-note">По запросу «{query.trim()}» ничего не найдено.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
