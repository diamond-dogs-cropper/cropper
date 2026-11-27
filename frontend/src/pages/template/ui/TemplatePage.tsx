import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import {
  deleteTemplate,
  getTemplate,
  setTemplateOpen,
} from '../../../features/templates/api/templatesApi'
import {
  describeBackground,
  describePadding,
  describeUploadFormats,
  getFormatLabel,
  getTemplateLink,
} from '../../../features/templates/lib/templateText'
import { upsertRecipients, useCompanyData } from '../../../features/templates/lib/useCompanyData'
import { useCopyLink } from '../../../features/templates/lib/useCopyLink'
import type { Recipient, Template } from '../../../features/templates/model/templates.types'
import { CompaniesSection } from '../../../features/templates/ui/companies/CompaniesSection'
import { InviteForm } from '../../../features/templates/ui/InviteForm'
import { NotifyToggle } from '../../../features/templates/ui/NotifyToggle'
import { PlateThumb } from '../../../features/templates/ui/PlateThumb'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { useConfirm } from '../../../shared/ui/ConfirmDialog'
import { IconButton } from '../../../shared/ui/IconButton'
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  ExternalIcon,
  LockIcon,
  TrashIcon,
  UnlockIcon,
} from '../../../shared/ui/icons'
import { TemplatePageSkeleton } from '../../../shared/ui/PageSkeletons'

type LoadResult = { id: string } & ({ template: Template } | { message: string })

export function Component() {
  const { templateId = '' } = useParams()
  const location = useLocation()
  const { isCreated, routeTemplate } = readRouteState(location.state, templateId)
  const [load, setTemplate] = useTemplate(templateId, routeTemplate)
  const [companies, updateCompanies] = useCompanyData(templateId)

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
      <TemplateHero
        isCreated={isCreated}
        onChange={setTemplate}
        onInvited={recipient =>
          updateCompanies(data => ({
            ...data,
            recipients: upsertRecipients(data.recipients, [recipient]),
          }))
        }
        template={load.template}
      />
      <CompaniesBlock companies={companies} template={load.template} update={updateCompanies} />
    </section>
  )
}

interface TemplateHeroProps {
  isCreated: boolean
  onChange: (template: Template) => void
  onInvited: (recipient: Recipient) => void
  template: Template
}

function TemplateSpecs({ template }: Readonly<{ template: Template }>) {
  return (
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
  )
}

function TemplateHero({ isCreated, onChange, onInvited, template }: Readonly<TemplateHeroProps>) {
  const navigate = useNavigate()
  const [copy, copyLink] = useCopyLink()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirm()
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

  async function remove() {
    const isConfirmed = await confirm({
      action: 'Удалить шаблон',
      message: 'Загруженные по нему логотипы и список компаний тоже будут удалены.',
      title: `Удалить шаблон «${template.name}»?`,
      tone: 'danger',
    })
    if (!isConfirmed) {
      return
    }
    await run(async () => {
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
        <TemplateSpecs template={template} />
        <div className="share-link">
          <span className="share-link__url">{link}</span>
          <button className="primary-button" onClick={() => void copyLink(link)} type="button">
            {copy === 'copied' ? <CheckIcon /> : <CopyIcon />}
            {copy === 'copied' ? 'Скопировано' : 'Скопировать ссылку'}
          </button>
        </div>
        <InviteForm onInvited={onInvited} template={template} />
        <NotifyToggle onChange={onChange} template={template} />
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
        <IconButton
          disabled={isPending}
          label="Удалить шаблон"
          onClick={() => void remove()}
          tone="danger"
        >
          <TrashIcon />
        </IconButton>
      </div>
      {confirmDialog}
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
    let isCurrent = true

    if (!hasTemplate) {
      getTemplate(templateId)
        .then(template => isCurrent && setResult({ id: templateId, template }))
        .catch(
          (error: unknown) =>
            isCurrent && setResult({ id: templateId, message: getErrorMessage(error) }),
        )
    }

    return () => {
      isCurrent = false
    }
  }, [hasTemplate, templateId])

  const setTemplate = (template: Template) => setResult({ id: template.id, template })

  return [result?.id === templateId ? result : null, setTemplate] as const
}

type CompaniesBlockProps = Readonly<{
  companies: ReturnType<typeof useCompanyData>[0]
  template: Template
  update: ReturnType<typeof useCompanyData>[1]
}>

function CompaniesBlock({ companies, template, update }: CompaniesBlockProps) {
  if (companies === null) {
    return <output className="page-note">Загружаем логотипы…</output>
  }
  if ('message' in companies) {
    return <p className="form-error" role="alert">{companies.message}</p>
  }
  return <CompaniesSection data={companies} template={template} update={update} />
}
