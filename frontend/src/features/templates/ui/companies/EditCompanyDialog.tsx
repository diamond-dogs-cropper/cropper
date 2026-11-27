import { useState, type SubmitEvent } from 'react'
import { getErrorMessage } from '../../../../shared/api/getErrorMessage'
import { Dialog } from '../../../../shared/ui/Dialog'
import { FormField } from '../../../../shared/ui/FormField'
import { EMAIL_PATTERN } from '../../lib/companies'
import type { Recipient, RecipientChanges } from '../../model/templates.types'

interface EditCompanyDialogProps {
  onClose: () => void
  onSave: (changes: RecipientChanges) => Promise<void>
  recipient: Recipient
}

export function EditCompanyDialog({ onClose, onSave, recipient }: Readonly<EditCompanyDialogProps>) {
  const [company, setCompany] = useState(recipient.company)
  const [email, setEmail] = useState(recipient.email ?? '')
  const [note, setNote] = useState(recipient.note)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isChecked, setIsChecked] = useState(false)
  const emailError =
    isChecked && email.trim() && !EMAIL_PATTERN.test(email.trim())
      ? 'Проверьте адрес: например, pr@company.ru'
      : undefined

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsChecked(true)
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      return
    }
    setError(null)
    setIsPending(true)
    try {
      await onSave({ company: company.trim(), email: email.trim() || null, note: note.trim() })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setIsPending(false)
    }
  }

  return (
    <Dialog onClose={onClose} title="Изменить компанию">
      <form className="edit-company" noValidate onSubmit={event => void submit(event)}>
        <FormField htmlFor="edit-company" label="Название">
          <input
            id="edit-company"
            maxLength={100}
            onChange={event => setCompany(event.target.value)}
            placeholder="ООО «Ромашка»"
            value={company}
          />
        </FormField>
        <FormField error={emailError} htmlFor="edit-email" label="Почта">
          <input
            id="edit-email"
            onChange={event => setEmail(event.target.value)}
            placeholder="pr@company.ru"
            type="email"
            value={email}
          />
        </FormField>
        <FormField htmlFor="edit-note" label="Заметка">
          <textarea
            id="edit-note"
            maxLength={200}
            onChange={event => setNote(event.target.value)}
            placeholder="Например: логотип пришлют после ребрендинга"
            rows={3}
            value={note}
          />
        </FormField>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog__actions">
          <button className="outline-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
