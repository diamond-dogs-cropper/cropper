import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import {
  deleteLogo,
  deleteTemplate,
  getArchiveUrl,
  getLogoUrl,
  getLogos,
  getTemplate,
  setTemplateOpen,
} from '../../../features/templates/api/templatesApi'
import {
  describeBackground,
  describePadding,
  describeUploadFormats,
  formatReceivedAt,
  getFormatLabel,
  getTemplateLink,
} from '../../../features/templates/lib/templateText'
import { useCopyLink } from '../../../features/templates/lib/useCopyLink'
import type { Logo, Template } from '../../../features/templates/model/templates.types'
import { InviteForm } from '../../../features/templates/ui/InviteForm'
import { PlateThumb } from '../../../features/templates/ui/PlateThumb'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { IconButton } from '../../../shared/ui/IconButton'
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalIcon,
  LockIcon,
  TrashIcon,
  UnlockIcon,
} from '../../../shared/ui/icons'
import { TemplatePageSkeleton } from '../../../shared/ui/PageSkeletons'
import { SearchField } from '../../../shared/ui/SearchField'

type LoadResult = { id: string } & ({ template: Template } | { message: string })
type LogosResult = { id: string } & ({ logos: Logo[] } | { message: string })

export function Component() {
  const { templateId = '' } = useParams()
  const location = useLocation()
  const { isCreated, routeTemplate } = readRouteState(location.state, templateId)
  const [load, setTemplate] = useTemplate(templateId, routeTemplate)
  const [logos, removeLogo] = useLogos(templateId)

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

  return (
    <section className="template-page" aria-labelledby="template-title">
      <Link className="back-link" to={routePaths.templates} viewTransition>
        <ArrowLeftIcon />
        Мои шаблоны
      </Link>
      <TemplateHero isCreated={isCreated} onChange={setTemplate} template={load.template} />
      <ReceivedLogos onDeleted={removeLogo} result={logos} template={load.template} />
    </section>
  )
}

interface TemplateHeroProps {
  isCreated: boolean
  onChange: (template: Template) => void
  template: Template
}

function TemplateHero({ isCreated, onChange, template }: Readonly<TemplateHeroProps>) {
  const navigate = useNavigate()
  const [copy, copyLink] = useCopyLink()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const link = getTemplateLink(template.id)

  async function run(action: () => Promise<void>) {
    setError(null)
    setIsPending(true)
    try {
      await action()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsPending(false)
    }
  }

  function toggleOpen() {
    return run(async () => onChange(await setTemplateOpen(template.id, !template.is_open)))
  }

  function remove() {
    const question = `Удалить шаблон «${template.name}»? Загруженные по нему логотипы тоже будут удалены.`
    if (!confirm(question)) {
      return
    }
    void run(async () => {
      await deleteTemplate(template.id)
      navigate(routePaths.templates, { replace: true, viewTransition: true })
    })
  }

  return (
    <header className="panel template-hero">
      <div className="template-hero__plate">
        <PlateThumb box={{ height: 160, width: 260 }} template={template} />
      </div>
      <div className="template-hero__info">
        <h1 id="template-title">
          {template.name}
          {template.is_open ? null : <span className="badge">Сбор закрыт</span>}
        </h1>
        <dl className="template-specs">
          <div>
            <dt>Размер</dt>
            <dd>{template.width} × {template.height}&nbsp;px</dd>
          </div>
          <div>
            <dt>Формат</dt>
            <dd>{getFormatLabel(template.output_format)}</dd>
          </div>
          <div>
            <dt>Фон</dt>
            <dd>
              <span
                className={template.background_color ? 'swatch' : 'swatch checkerboard'}
                style={{ background: template.background_color ?? undefined }}
              />
              {describeBackground(template.background_color)}
            </dd>
          </div>
          <div>
            <dt>Отступы</dt>
            <dd>{describePadding(template)}</dd>
          </div>
          <div>
            <dt>Принимаем</dt>
            <dd>{describeUploadFormats(template.upload_formats)}</dd>
          </div>
        </dl>
        <div className="share-link">
          <span className="share-link__url">{link}</span>
          <button className="primary-button" onClick={() => void copyLink(link)} type="button">
            {copy === 'copied' ? <CheckIcon /> : <CopyIcon />}
            {copy === 'copied' ? 'Скопировано' : 'Скопировать ссылку'}
          </button>
        </div>
        <InviteForm template={template} />
        {isCreated && copy === 'idle' ? (
          <output className="template-hero__notice">
            Шаблон создан. Скопируйте ссылку и отправьте её компаниям.
          </output>
        ) : null}
        {copy === 'failed' ? (
          <p className="form-error" role="alert">Не удалось скопировать. Выделите ссылку вручную.</p>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
      <div className="template-hero__actions">
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
        <IconButton
          disabled={isPending}
          label={template.is_open ? 'Закрыть сбор логотипов' : 'Открыть сбор логотипов'}
          onClick={() => void toggleOpen()}
        >
          {template.is_open ? <LockIcon /> : <UnlockIcon />}
        </IconButton>
        <IconButton disabled={isPending} label="Удалить шаблон" onClick={remove} tone="danger">
          <TrashIcon />
        </IconButton>
      </div>
    </header>
  )
}

function readRouteState(state: unknown, templateId: string) {
  const routeState = state as { created?: boolean; template?: Template } | null
  const routeTemplate = routeState?.template?.id === templateId ? routeState.template : null
  const isCreated = Boolean(routeState?.created && routeTemplate)
  return { isCreated, routeTemplate }
}

function useTemplate(templateId: string, routeTemplate: Template | null) {
  const [result, setResult] = useState<LoadResult | null>(
    routeTemplate ? { id: templateId, template: routeTemplate } : null,
  )
  const hasTemplate = result?.id === templateId && 'template' in result

  useEffect(() => {
    if (hasTemplate) {
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
  }, [hasTemplate, templateId])

  const setTemplate = (template: Template) => setResult({ id: template.id, template })

  return [result?.id === templateId ? result : null, setTemplate] as const
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

interface ReceivedLogosProps {
  onDeleted: (logoId: string) => void
  result: LogosResult | null
  template: Template
}

function ReceivedLogos({ onDeleted, result, template }: Readonly<ReceivedLogosProps>) {
  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logos = result && 'logos' in result ? result.logos : []
  const query = search.trim().toLowerCase()
  const visible = logos.filter((logo) => logo.company.toLowerCase().includes(query))

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

  return (
    <section aria-labelledby="logos-title" className="logos">
      <div className="logos__bar">
        <h2 id="logos-title">
          Логотипы <span>{logos.length}</span>
        </h2>
        {logos.length > 0 ? (
          <>
            <SearchField label="Найти компанию" onChange={setSearch} value={search} />
            <a className="outline-button" download href={getArchiveUrl(template.id)}>
              <DownloadIcon />
              Скачать все · ZIP
            </a>
          </>
        ) : null}
      </div>

      {result === null ? <output className="page-note">Загружаем логотипы…</output> : null}
      {result && 'message' in result ? <p className="form-error" role="alert">{result.message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {result && 'logos' in result && logos.length === 0 ? (
        <div className="logos__empty">
          <PlateThumb box={{ height: 72, width: 128 }} template={template} />
          <p>
            Логотипов пока нет. Отправьте ссылку компаниям — готовые файлы появятся здесь, уже{' '}
            {template.width} × {template.height}&nbsp;px в {getFormatLabel(template.output_format)}.
          </p>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <ul className="logo-grid">
          {visible.map((logo) => (
            <LogoCard
              isPending={pendingId === logo.id}
              key={logo.id}
              logo={logo}
              onDelete={() => void remove(logo)}
              template={template}
            />
          ))}
        </ul>
      ) : null}
      {logos.length > 0 && visible.length === 0 ? (
        <p className="page-note">По запросу «{search.trim()}» ничего не найдено.</p>
      ) : null}
    </section>
  )
}

interface LogoCardProps {
  isPending: boolean
  logo: Logo
  onDelete: () => void
  template: Template
}

function LogoCard({ isPending, logo, onDelete, template }: Readonly<LogoCardProps>) {
  const url = getLogoUrl(template.id, logo.id)

  return (
    <li className="logo-card">
      <div className="logo-card__image">
        <img
          alt={`Логотип компании ${logo.company}`}
          className="checkerboard"
          loading="lazy"
          src={url}
          style={{ aspectRatio: `${template.width} / ${template.height}` }}
        />
      </div>
      <div className="logo-card__info">
        <h3>{logo.company}</h3>
        <time dateTime={logo.created_at}>{formatReceivedAt(logo.created_at)}</time>
      </div>
      <div className="logo-card__actions">
        <a
          aria-label={`Скачать ${getFormatLabel(template.output_format)}`}
          className="icon-button"
          data-tooltip={`Скачать ${getFormatLabel(template.output_format)}`}
          download
          href={url}
        >
          <DownloadIcon />
        </a>
        <IconButton disabled={isPending} label="Удалить" onClick={onDelete} tone="danger">
          <TrashIcon />
        </IconButton>
      </div>
    </li>
  )
}
