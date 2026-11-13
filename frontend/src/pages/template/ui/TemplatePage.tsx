import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import {
  deleteLogo,
  getArchiveUrl,
  getLogoUrl,
  getLogos,
  getTemplate,
} from '../../../features/templates/api/templatesApi'
import {
  describeBackground,
  describePadding,
  describeRowSummary,
  describeUploadFormats,
  formatReceivedAt,
  getFormatLabel,
  getTemplateLink,
} from '../../../features/templates/lib/templateText'
import type { Logo, Template } from '../../../features/templates/model/templates.types'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { TemplatePageSkeleton } from '../../../shared/ui/PageSkeletons'

type LoadResult = { id: string } & ({ template: Template } | { message: string })
type LogosResult = { id: string } & ({ logos: Logo[] } | { message: string })

type CopyState = 'idle' | 'copied' | 'failed'
type Tab = 'logos' | 'settings'

export function Component() {
  const { templateId = '' } = useParams()
  const location = useLocation()
  const [logos, removeLogo] = useLogos(templateId)
  const [copy, copyLink] = useCopyLink()
  const { isCreated, routeTemplate } = readRouteState(location.state, templateId)
  const [tab, setTab] = useState<Tab>(isCreated ? 'settings' : 'logos')
  const load = useTemplate(templateId, routeTemplate)

  if (!load) {
    return <TemplatePageSkeleton />
  }

  if ('message' in load) {
    return (
      <section className="empty-state" role="alert">
        <h2>Не удалось открыть шаблон</h2>
        <p>{load.message}</p>
        <Link to={routePaths.templates} viewTransition>К списку шаблонов</Link>
      </section>
    )
  }

  const { template } = load
  const link = getTemplateLink(template.id)

  return (
    <section className="template-page" aria-labelledby="template-title">
      <TemplateHead copy={copy} isCreated={isCreated} onCopy={() => void copyLink(link)} template={template} />
      <TemplateTabs logos={logos} onChange={setTab} tab={tab} />

      {tab === 'logos' ? (
        <ReceivedLogos
          onDeleted={removeLogo}
          result={logos}
          template={template}
        />
      ) : (
        <TemplateSettings link={link} onCopy={() => void copyLink(link)} template={template} />
      )}
    </section>
  )
}

interface TemplateHeadProps {
  copy: CopyState
  isCreated: boolean
  onCopy: () => void
  template: Template
}

function TemplateHead({ copy, isCreated, onCopy, template }: Readonly<TemplateHeadProps>) {
  const summary = describeRowSummary(template)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 id="template-title">{template.name}</h1>
          <p>
            {template.width} × {template.height}&nbsp;px · {getFormatLabel(template.output_format)} ·{' '}
            {summary.charAt(0).toLowerCase() + summary.slice(1)}
          </p>
        </div>
        <button className="primary-button" onClick={onCopy} type="button">
          Скопировать ссылку
        </button>
      </div>
      {isCreated ? (
        <output className="template-share__notice">
          ✓ Шаблон создан. Скопируйте ссылку и отправьте её компаниям.
        </output>
      ) : null}
      {copy === 'copied' ? (
        <output className="template-share__notice">✓ Ссылка скопирована</output>
      ) : null}
      {copy === 'failed' ? (
        <p className="form-error" role="alert">
          Не удалось скопировать. Откройте «Настройки шаблона» и выделите ссылку вручную.
        </p>
      ) : null}
    </>
  )
}

interface TemplateTabsProps {
  logos: LogosResult | null
  onChange: (tab: Tab) => void
  tab: Tab
}

function TemplateTabs({ logos, onChange, tab }: Readonly<TemplateTabsProps>) {
  const current = (value: Tab) => (tab === value ? 'page' : undefined)
  const count = logos && 'logos' in logos ? logos.logos.length : null

  return (
    <nav aria-label="Разделы шаблона" className="template-tabs">
      <button aria-current={current('logos')} onClick={() => onChange('logos')} type="button">
        Полученные логотипы{count === null ? '' : ` · ${count}`}
      </button>
      <button aria-current={current('settings')} onClick={() => onChange('settings')} type="button">
        Настройки шаблона
      </button>
    </nav>
  )
}

function readRouteState(state: unknown, templateId: string) {
  const routeState = state as { created?: boolean; template?: Template } | null
  const routeTemplate = routeState?.template?.id === templateId ? routeState.template : null
  return { isCreated: Boolean(routeState?.created && routeTemplate), routeTemplate }
}

function useTemplate(templateId: string, routeTemplate: Template | null): LoadResult | null {
  const [result, setResult] = useState<LoadResult | null>(null)

  useEffect(() => {
    if (routeTemplate) {
      return
    }

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
  }, [routeTemplate, templateId])

  if (routeTemplate) {
    return { id: templateId, template: routeTemplate }
  }
  return result?.id === templateId ? result : null
}

function useLogos(templateId: string) {
  const [result, setResult] = useState<LogosResult | null>(null)

  useEffect(() => {
    let isCurrent = true

    getLogos(templateId)
      .then((items) => isCurrent && setResult({ id: templateId, logos: items }))
      .catch(
        (error: unknown) =>
          isCurrent && setResult({ id: templateId, message: getErrorMessage(error) }),
      )

    return () => {
      isCurrent = false
    }
  }, [templateId])

  const remove = (logoId: string) =>
    setResult((current) =>
      current && 'logos' in current
        ? { ...current, logos: current.logos.filter((logo) => logo.id !== logoId) }
        : current,
    )

  return [result?.id === templateId ? result : null, remove] as const
}

function useCopyLink() {
  const [copy, setCopy] = useState<CopyState>('idle')

  useEffect(() => {
    if (copy !== 'copied') {
      return
    }

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

  return [copy, copyLink] as const
}

interface TemplateSettingsProps {
  link: string
  onCopy: () => void
  template: Template
}

function TemplateSettings({ link, onCopy, template }: Readonly<TemplateSettingsProps>) {
  return (
    <div className="panel template-share">
      <div className="template-share__main">
        <h2>Ссылка для подготовки логотипа</h2>
        <p className="template-share__lead">
          Одна и та же ссылка подходит всем компаниям. В ней уже заданы размер, фон и отступы.
        </p>
        <p className="template-share__link">{link}</p>
        <div className="template-share__actions">
          <button className="primary-button" onClick={onCopy} type="button">
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
          <li>Проверку и отправку готового файла вам в кабинет</li>
        </ol>
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
  )
}

interface ReceivedLogosProps {
  onDeleted: (logoId: string) => void
  result: LogosResult | null
  template: Template
}

function ReceivedLogos({ onDeleted, result, template }: Readonly<ReceivedLogosProps>) {
  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const format = getFormatLabel(template.output_format)

  if (!result) {
    return <output className="page-note">Загружаем логотипы…</output>
  }

  if ('message' in result) {
    return <p className="form-error" role="alert">{result.message}</p>
  }

  async function remove(logo: Logo) {
    if (!confirm(`Удалить логотип компании «${logo.company}»? Вернуть его будет нельзя.`)) {
      return
    }
    setError(null)
    setPendingId(logo.id)

    try {
      await deleteLogo(template.id, logo.id)
      onDeleted(logo.id)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setPendingId(null)
    }
  }

  const query = search.trim().toLowerCase()
  const visible = result.logos.filter((logo) => logo.company.toLowerCase().includes(query))

  return (
    <>
      <div className="logo-bar">
        <div className="form-field">
          <label className="form-field__label" htmlFor="logo-search">Поиск компании</label>
          <input
            autoComplete="off"
            id="logo-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название"
            type="search"
            value={search}
          />
        </div>
        {result.logos.length > 0 ? (
          <a className="primary-button" download href={getArchiveUrl(template.id)}>
            Скачать все · ZIP
          </a>
        ) : null}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {visible.length > 0 ? (
        <div className="panel logo-table">
          <div aria-hidden="true" className="logo-table__head">
            <span>Логотип</span>
            <span>Компания</span>
            <span>Получен</span>
            <span>Файл</span>
          </div>
          <ul className="logo-table__rows">
            {visible.map((logo) => {
              const url = getLogoUrl(template.id, logo.id)

              return (
                <li className="logo-row" key={logo.id}>
                  <div className="logo-row__tile">
                    <img alt={`Логотип компании ${logo.company}`} loading="lazy" src={url} />
                  </div>
                  <h2>{logo.company}</h2>
                  <time dateTime={logo.created_at}>{formatReceivedAt(logo.created_at)}</time>
                  <div className="logo-row__actions">
                    <a className="outline-button" download href={url}>Скачать {format}</a>
                    <button disabled={pendingId === logo.id} onClick={() => void remove(logo)} type="button">
                      Удалить
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {result.logos.length > 0 && visible.length === 0 ? (
        <p className="page-note">По запросу «{search.trim()}» ничего не найдено.</p>
      ) : null}

      <div className="panel logo-note">
        <h2>Логотипы появляются здесь после отправки участником</h2>
        <p>
          Все файлы подготовлены по требованиям шаблона: {template.width} × {template.height}&nbsp;px,{' '}
          {format}.
        </p>
      </div>
    </>
  )
}
