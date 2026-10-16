import { useState } from 'react'

type PasswordFieldProps = {
  autoComplete: 'current-password' | 'new-password'
  hint?: string
  id: string
  label: string
  name: string
}

export function PasswordField({ autoComplete, hint, id, label, name }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="password-input">
        <input
          autoComplete={autoComplete}
          id={id}
          minLength={8}
          name={name}
          placeholder="••••••••••••"
          required
          type={isVisible ? 'text' : 'password'}
        />
        <button
          aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
          onClick={() => setIsVisible((value) => !value)}
          type="button"
        >
          {isVisible ? 'Скрыть' : 'Показать'}
        </button>
      </span>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}
