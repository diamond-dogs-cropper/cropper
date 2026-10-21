import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTemplatePath, routePaths } from '../../../app/router/routePaths'
import { createTemplate } from '../../../features/templates/api/templatesApi'
import {
  defaultValues,
  readPlate,
  validate,
  type FormValues,
} from '../../../features/templates/lib/templateForm'
import { TemplateForm } from '../../../features/templates/ui/TemplateForm'
import { TemplatePreview } from '../../../features/templates/ui/TemplatePreview'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'

export function Component() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>(defaultValues)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const { errors, input } = validate(values)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const form = event.currentTarget
    setShowErrors(true)
    if (!input) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setError(null)
    setIsPending(true)

    try {
      const template = await createTemplate(input)
      navigate(getTemplatePath(template.id), { state: { created: true } })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setIsPending(false)
    }
  }

  return (
    <section className="template-new-page" aria-labelledby="template-new-title">
      <div className="page-head">
        <div>
          <h1 id="template-new-title">Новый шаблон</h1>
          <p>Укажите параметры плашки. Компании получат их вместе со ссылкой.</p>
        </div>
        <Link to={routePaths.templates}>К списку шаблонов</Link>
      </div>
      <div className="template-new-page__body">
        <TemplateForm
          error={error}
          errors={showErrors ? errors : { outputFormat: errors.outputFormat }}
          isPending={isPending}
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
          onSubmit={(event) => void handleSubmit(event)}
          values={values}
        />
        <TemplatePreview outputFormat={values.outputFormat} plate={readPlate(values)} />
      </div>
    </section>
  )
}
