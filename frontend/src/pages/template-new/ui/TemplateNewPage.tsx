import { useEffect, useState, type ReactNode, type SubmitEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getTemplatePath, routePaths } from '../../../app/router/routePaths'
import { addRecipients, getRecipients } from '../../../features/templates/api/recipientsApi'
import {
  createTemplate,
  getTemplate,
  setTemplateNotify,
} from '../../../features/templates/api/templatesApi'
import {
  defaultValues,
  readPlate,
  toFormValues,
  validate,
  type FormValues,
} from '../../../features/templates/lib/templateForm'
import type { Recipient, Template } from '../../../features/templates/model/templates.types'
import { TemplateForm } from '../../../features/templates/ui/TemplateForm'
import { TemplatePreview } from '../../../features/templates/ui/TemplatePreview'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { ButtonLink } from '../../../shared/ui/ButtonLink'
import { ArrowLeftIcon } from '../../../shared/ui/icons'

const RECIPIENTS_BATCH = 500

interface Source {
  recipients: Recipient[]
  template: Template
}

export function Component() {
  const [params] = useSearchParams()
  const sourceId = params.get('from')

  return sourceId ? <SimilarTemplate key={sourceId} sourceId={sourceId} /> : <NewTemplate source={null} />
}

function SimilarTemplate({ sourceId }: Readonly<{ sourceId: string }>) {
  const [source, setSource] = useState<Source | { message: string } | null>(null)

  useEffect(() => {
    let isCurrent = true
    Promise.all([getTemplate(sourceId), getRecipients(sourceId)])
      .then(([template, recipients]) => isCurrent && setSource({ recipients, template }))
      .catch((error: unknown) => isCurrent && setSource({ message: getErrorMessage(error) }))
    return () => {
      isCurrent = false
    }
  }, [sourceId])

  if (source === null) {
    return (
      <PageFrame backTo={getTemplatePath(sourceId)} subtitle="Загружаем параметры…" title="Похожий шаблон">
        <output className="page-note">Загружаем исходный шаблон…</output>
      </PageFrame>
    )
  }

  if ('message' in source) {
    return (
      <PageFrame backTo={routePaths.templates} title="Похожий шаблон">
        <div className="empty-state" role="alert">
          <h2>Не удалось загрузить исходный шаблон</h2>
          <p>{source.message}</p>
          <ButtonLink to={routePaths.templateNew}>Создать с нуля</ButtonLink>
        </div>
      </PageFrame>
    )
  }

  return <NewTemplate source={source} />
}

interface PageFrameProps {
  backTo: string
  children: ReactNode
  subtitle?: string
  title: string
}

function PageFrame({ backTo, children, subtitle, title }: Readonly<PageFrameProps>) {
  const isList = backTo === routePaths.templates

  return (
    <section className="template-new-page" aria-labelledby="template-new-title">
      <Link className="back-link" to={backTo} viewTransition>
        <ArrowLeftIcon />
        {isList ? 'Мои шаблоны' : 'К исходному шаблону'}
      </Link>
      <div className="page-head">
        <div>
          <h1 id="template-new-title">{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

async function copyCompanies(templateId: string, recipients: Recipient[]) {
  const items = recipients.map(({ company, email }) => ({ company, email }))
  for (let start = 0; start < items.length; start += RECIPIENTS_BATCH) {
    await addRecipients(templateId, items.slice(start, start + RECIPIENTS_BATCH))
  }
}

function NewTemplate({ source }: Readonly<{ source: Source | null }>) {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(() =>
    source ? toFormValues(source.template, source.template.name) : defaultValues,
  )
  const [withCompanies, setWithCompanies] = useState(true)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const { errors, input } = validate(values)
  const companyCount = source?.recipients.length ?? 0

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) {
      return
    }

    const form = event.currentTarget
    setShowErrors(true)
    if (!input) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setError(null)
    setIsPending(true)

    let template: Template
    try {
      template = await createTemplate(input)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setIsPending(false)
      return
    }

    let companiesFailed = false
    if (source) {
      if (source.template.notify) {
        template = await setTemplateNotify(template.id, true).catch(() => template)
      }
      if (withCompanies && companyCount > 0) {
        companiesFailed = await copyCompanies(template.id, source.recipients).then(
          () => false,
          () => true,
        )
      }
    }

    navigate(getTemplatePath(template.id), {
      state: {
        companiesFailed,
        created: true,
        source: source ? { id: source.template.id, isOpen: source.template.is_open, name: source.template.name } : null,
        template,
      },
      viewTransition: true,
    })
  }

  return (
    <PageFrame
      backTo={source ? getTemplatePath(source.template.id) : routePaths.templates}
      subtitle={
        source
          ? `Параметры взяты из «${source.template.name}». Поменяйте нужное — исходный шаблон и его ссылка останутся как есть.`
          : 'Задайте плашку — справа сразу видно, как она будет выглядеть.'
      }
      title={source ? 'Похожий шаблон' : 'Новый шаблон'}
    >
      <div className="template-new-page__body">
        <TemplateForm
          error={error}
          errors={showErrors ? errors : { outputFormat: errors.outputFormat }}
          isPending={isPending}
          onChange={patch => setValues(current => ({ ...current, ...patch }))}
          onSubmit={event => void handleSubmit(event)}
          values={values}
        >
          {companyCount > 0 ? (
            <section className="form-section">
              <h2>Компании</h2>
              <div className="form-field">
                <label className="checkbox template-form__companies">
                  <input
                    aria-describedby="copy-companies-hint"
                    checked={withCompanies}
                    onChange={event => setWithCompanies(event.target.checked)}
                    type="checkbox"
                  />
                  Перенести компании из исходного шаблона ({companyCount})
                </label>
                <span className="form-field__hint" id="copy-companies-hint">
                  Перенесём названия и почту. Отметки, логотипы и даты писем не переносятся.
                </span>
              </div>
            </section>
          ) : null}
        </TemplateForm>
        <TemplatePreview outputFormat={values.outputFormat} plate={readPlate(values)} />
      </div>
    </PageFrame>
  )
}
