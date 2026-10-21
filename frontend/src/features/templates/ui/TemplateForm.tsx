import type { FormEvent } from 'react'
import { FormField } from '../../../shared/ui/FormField'
import { getErrorProps } from '../../../shared/ui/getErrorProps'
import {
  outputFormats,
  uploadFormats,
  type FormErrors,
  type FormValues,
} from '../lib/templateForm'
import type { OutputFormat, UploadFormat } from '../model/templates.types'
import { BackgroundField } from './BackgroundField'
import { PaddingField } from './PaddingField'

type TemplateFormProps = {
  error: string | null
  errors: FormErrors
  isPending: boolean
  onChange: (patch: Partial<FormValues>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  values: FormValues
}

export function TemplateForm({
  error,
  errors,
  isPending,
  onChange,
  onSubmit,
  values,
}: Readonly<TemplateFormProps>) {
  function toggleUploadFormat(format: UploadFormat) {
    const selected = values.uploadFormats.includes(format)
      ? values.uploadFormats.filter((item) => item !== format)
      : [...values.uploadFormats, format]

    onChange({
      uploadFormats: uploadFormats.map((item) => item.value).filter((item) => selected.includes(item)),
    })
  }

  return (
    <form className="panel template-form" noValidate onSubmit={onSubmit}>
      <h2>Параметры шаблона</h2>
      <FormField error={errors.name} htmlFor="template-name" label="Название">
        <input
          {...getErrorProps('template-name', errors.name)}
          autoComplete="off"
          id="template-name"
          maxLength={100}
          name="name"
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Партнёры конференции"
          value={values.name}
        />
      </FormField>
      <FormField htmlFor="template-description" label="Описание" hint="Необязательно">
        <textarea
          autoComplete="off"
          id="template-description"
          maxLength={500}
          name="description"
          onChange={(event) => onChange({ description: event.target.value })}
          rows={3}
          value={values.description}
        />
      </FormField>
      <div className="form-grid">
        <FormField error={errors.width} htmlFor="template-width" label="Ширина, px">
          <input
            {...getErrorProps('template-width', errors.width)}
            autoComplete="off"
            id="template-width"
            inputMode="numeric"
            name="width"
            onChange={(event) => onChange({ width: event.target.value })}
            value={values.width}
          />
        </FormField>
        <FormField error={errors.height} htmlFor="template-height" label="Высота, px">
          <input
            {...getErrorProps('template-height', errors.height)}
            autoComplete="off"
            id="template-height"
            inputMode="numeric"
            name="height"
            onChange={(event) => onChange({ height: event.target.value })}
            value={values.height}
          />
        </FormField>
      </div>
      <FormField error={errors.outputFormat} htmlFor="template-format" label="Формат готового файла">
        <select
          {...getErrorProps('template-format', errors.outputFormat)}
          id="template-format"
          onChange={(event) => onChange({ outputFormat: event.target.value as OutputFormat })}
          value={values.outputFormat}
        >
          {outputFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
      </FormField>
      <fieldset
        aria-describedby={errors.uploadFormats ? 'upload-formats-error' : undefined}
        className="form-field"
      >
        <legend className="form-field__label">Форматы загрузки логотипа</legend>
        <div className="checkbox-row">
          {uploadFormats.map((format) => (
            <label className="checkbox" key={format.value}>
              <input
                checked={values.uploadFormats.includes(format.value)}
                onChange={() => toggleUploadFormat(format.value)}
                type="checkbox"
              />
              {format.label}
            </label>
          ))}
        </div>
        {errors.uploadFormats ? (
          <span className="form-field__error" id="upload-formats-error" role="alert">
            {errors.uploadFormats}
          </span>
        ) : null}
      </fieldset>
      <BackgroundField error={errors.background} onChange={onChange} values={values} />
      <PaddingField error={errors.padding} onChange={onChange} values={values} />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? 'Создаём…' : 'Создать шаблон'}
      </button>
    </form>
  )
}
