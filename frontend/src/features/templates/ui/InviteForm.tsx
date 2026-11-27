import { useState, type SubmitEvent } from 'react'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { sendInvite } from '../api/templatesApi'
import type { Recipient, Template } from '../model/templates.types'

type InviteState =
  | { status: 'idle' | 'sending' }
  | { email: string; status: 'sent' }
  | { message: string; status: 'error' }

interface InviteFormProps {
  onInvited: (recipient: Recipient) => void
  template: Template
}

export function InviteForm({ onInvited, template }: Readonly<InviteFormProps>) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<InviteState>({ status: 'idle' })

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ status: 'sending' })

    try {
      onInvited(await sendInvite(template.id, email.trim()))
      setState({ email: email.trim(), status: 'sent' })
      setEmail('')
    } catch (error) {
      setState({ message: getErrorMessage(error), status: 'error' })
    }
  }

  if (!template.is_open) {
    return <p className="invite-form__note">Сбор закрыт — приглашения по почте недоступны.</p>
  }

  return (
    <form className="invite-form" onSubmit={event => void submit(event)}>
      <input
        aria-label="Почта компании"
        autoComplete="off"
        name="email"
        onChange={event => setEmail(event.target.value)}
        placeholder="Пригласить по почте — компания появится в списке ниже"
        required
        type="email"
        value={email}
      />
      <button className="outline-button" disabled={state.status === 'sending'} type="submit">
        {state.status === 'sending' ? 'Отправляем…' : 'Отправить'}
      </button>
      {state.status === 'sent' ? (
        <output className="invite-form__note invite-form__note--success">
          Приглашение отправлено на {state.email}. Адрес добавлен в список компаний ниже — там
          видно, прислали ли логотип.
        </output>
      ) : null}
      {state.status === 'error' ? (
        <p className="invite-form__note invite-form__note--error" role="alert">{state.message}</p>
      ) : null}
    </form>
  )
}
