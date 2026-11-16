import type { SubmitEvent } from 'react'
import { FormField } from '../../../shared/ui/FormField'
import { getErrorProps } from '../../../shared/ui/getErrorProps'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import {
  outputFormats,
  sizePresets,
  uploadFormats,
  type FormErrors,
  type FormValues,
} from '../lib/templateForm'
import type { OutputFormat, UploadFormat } from '../model/templates.types'
import { BackgroundField } from './BackgroundField'
import { PaddingField } from './PaddingField'

interface TemplateFormProps {
  error: string | null
  errors: FormErrors
  isPending: boolean
  onChange: (patch: Partial<FormValues>) => void
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
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
      <section className="form-section">
        <h2>Основное</h2>
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
        <FormField
          htmlFor="template-description"
          label="Описание"
          hint="Необязательно. Компании увидят его на странице загрузки и в письме."
        >
          <textarea
            autoComplete="off"
            id="template-description"
            maxLength={500}
            name="description"
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Например: логотип для экрана на сцене и бейджей"
            rows={2}
            value={values.description}
          />
        </FormField>
      </section>

      <section className="form-section">
        <h2>Плашка</h2>
        <div className="form-grid form-grid--plate">
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
        <div aria-label="Готовые размеры" className="chip-row" role="group">
          {sizePresets.map(([width, height]) => {
            const isCurrent = values.width === String(width) && values.height === String(height)
            return (
              <button
                aria-pressed={isCurrent}
                className="chip"
                key={`${width}x${height}`}
                onClick={() => onChange({ height: String(height), width: String(width) })}
                type="button"
              >
                {width}×{height}
              </button>
            )
          })}
        </div>
        <BackgroundField error={errors.background} onChange={onChange} values={values} />
        <PaddingField error={errors.padding} onChange={onChange} values={values} />
      </section>

      <section className="form-section">
        <h2>Файлы</h2>
        <fieldset
          aria-describedby={errors.uploadFormats ? 'upload-formats-error' : undefined}
          className="form-field"
        >
          <legend className="form-field__label">Компании могут загрузить</legend>
          <div className="chip-row">
            {uploadFormats.map((format) => (
              <label className="chip" key={format.value}>
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
        <div className="form-field">
          <span className="form-field__label">Готовый файл</span>
          <SegmentedControl<OutputFormat>
            label="Формат готового файла"
            name="output-format"
            onChange={(outputFormat) => onChange({ outputFormat })}
            options={outputFormats}
            value={values.outputFormat}
          />
          {errors.outputFormat ? (
            <span className="form-field__error" role="alert">{errors.outputFormat}</span>
          ) : null}
        </div>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? 'Создаём…' : 'Создать шаблон'}
      </button>
    </form>
  )
}
