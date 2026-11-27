import { useState } from 'react'
import { useAuth } from '../../auth/model/useAuth'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { setTemplateNotify } from '../api/templatesApi'
import type { Template } from '../model/templates.types'

interface NotifyToggleProps {
  onChange: (template: Template) => void
  template: Template
}

export function NotifyToggle({ onChange, template }: Readonly<NotifyToggleProps>) {
  const { state } = useAuth()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setError(null)
    setIsPending(true)
    try {
      onChange(await setTemplateNotify(template.id, !template.notify))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="notify-toggle">
      <label>
        <input
          aria-label="Сообщать о новых логотипах на почту"
          checked={template.notify}
          disabled={isPending}
          onChange={() => void toggle()}
          role="switch"
          type="checkbox"
        />
        <span className="notify-toggle__track" aria-hidden="true" />
        <span>
          Сообщать о новых логотипах на почту
          {state.user ? <span className="notify-toggle__email"> {state.user.email}</span> : null}
        </span>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  )
}
