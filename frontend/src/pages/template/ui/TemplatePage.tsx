import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { getTemplate } from '../../../features/templates/api/templatesApi'
import {
  describeBackground,
  describePadding,
  describeUploadFormats,
  getFormatLabel,
  getTemplateLink,
} from '../../../features/templates/lib/templateText'
import type { Template } from '../../../features/templates/model/templates.types'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'

type LoadResult = { id: string } & ({ template: Template } | { message: string })

type CopyState = 'idle' | 'copied' | 'failed'

export function Component() {
  const { templateId = '' } = useParams()
  const location = useLocation()
  const [result, setResult] = useState<LoadResult | null>(null)
  const [copy, setCopy] = useState<CopyState>('idle')
  const isCreated = Boolean((location.state as { created?: boolean } | null)?.created)
  const load = result?.id === templateId ? result : null

  useEffect(() => {
    let isCurrent = true

    getTemplate(templateId)
      .then((template) => isCurrent && setResult({ id: templateId, template }))
      .catch(
        (error: unknown) =>
          isCurrent && setResult({ id: templateId, message: getErrorMessage(error) }),
      )

    return () => {
      isCurrent = false
    }
  }, [templateId])

  useEffect(() => {
    if (copy !== 'copied') return

    const timer = setTimeout(() => setCopy('idle'), 2500)
    return () => clearTimeout(timer)
  }, [copy])

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  if (!load) {
    return <p className="page-note">Загружаем шаблон…</p>
  }

  if ('message' in load) {
    return (
      <section className="empty-state" role="alert">
        <h2>Не удалось открыть шаблон</h2>
        <p>{load.message}</p>
        <Link to={routePaths.templates}>К списку шаблонов</Link>
      </section>
    )
  }

  const { template } = load
  const link = getTemplateLink(template.id)

  return (
    <section className="template-page" aria-labelledby="template-title">
      <div className="page-head">
        <div>
          <h1 id="template-title">{isCreated ? 'Шаблон создан' : 'Ссылка на шаблон'}</h1>
          <p>Скопируйте ссылку и отправьте её представителям компаний.</p>
        </div>
        <Link to={routePaths.templates}>К списку шаблонов</Link>
      </div>
      <div className="panel template-share">
        <div className="template-share__main">
          <h2>Ссылка для подготовки логотипа</h2>
          <p className="template-share__lead">
            Одна и та же ссылка подходит всем компаниям. В ней уже заданы размер, фон и отступы.
          </p>
          <p className="template-share__link">{link}</p>
          <div className="template-share__actions">
            <button className="primary-button" onClick={() => void copyLink(link)} type="button">
              Скопировать ссылку
            </button>
            <a className="outline-button" href={link} rel="noreferrer" target="_blank">
              Открыть редактор
            </a>
          </div>
          <h3>Что увидит представитель компании</h3>
          <ol className="template-share__steps">
            <li>Загрузку {describeUploadFormats(template.upload_formats)}</li>
            <li>Обрезку и размещение логотипа на плашке</li>
            <li>Предпросмотр и скачивание готового файла</li>
          </ol>
          {copy === 'copied' ? (
            <output className="template-share__notice">✓ Ссылка скопирована</output>
          ) : null}
          {copy === 'failed' ? (
            <p className="form-error" role="alert">Не удалось скопировать. Выделите ссылку вручную.</p>
          ) : null}
        </div>
        <aside className="template-summary">
          <h3>{template.name}</h3>
          <p className="template-summary__size">
            {template.width} × {template.height}&nbsp;px · {getFormatLabel(template.output_format)}
          </p>
          <p>Фон: {describeBackground(template.background_color)}</p>
          <p>Отступы: {describePadding(template)}</p>
        </aside>
      </div>
    </section>
  )
}
