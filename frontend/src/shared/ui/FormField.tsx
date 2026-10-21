import type { ReactNode } from 'react'

type FormFieldProps = {
  children: ReactNode
  error?: string
  hint?: string
  htmlFor: string
  label: string
}

export function FormField({ children, error, hint, htmlFor, label }: Readonly<FormFieldProps>) {
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="form-field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      ) : null}
      {!error && hint ? <span className="form-field__hint">{hint}</span> : null}
    </div>
  )
}
