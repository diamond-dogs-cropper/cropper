import { useState, type SubmitEvent } from 'react'
import { getErrorMessage } from '../../../../shared/api/getErrorMessage'
import { Dialog } from '../../../../shared/ui/Dialog'
import type { NewRecipient } from '../../api/recipientsApi'
import { formatCompanyCount, parseCompanyList } from '../../lib/companies'
import type { Recipient } from '../../model/templates.types'

interface AddCompaniesDialogProps {
  existing: Recipient[]
  onAdd: (items: NewRecipient[]) => Promise<void>
  onClose: () => void
}

const EXAMPLE = 'Яндекс, pr@yandex.ru\nСбер; brand@sber.ru\nТинькофф'

export function AddCompaniesDialog({ existing, onAdd, onClose }: Readonly<AddCompaniesDialogProps>) {
  const [text, setText] = useState('')
  const [overrides, setOverrides] = useState<Record<number, boolean>>({})
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const parsed = parseCompanyList(text, existing)
  const isChecked = (line: number, duplicate: boolean) => overrides[line] ?? !duplicate
  const selected = parsed.filter(item => isChecked(item.line, item.duplicate))
  const duplicates = parsed.filter(item => item.duplicate).length

  function changeText(value: string) {
    setText(value)
    setOverrides({})
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await onAdd(selected.map(({ company, email }) => ({ company, email })))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setIsPending(false)
    }
  }

  return (
    <Dialog onClose={onClose} title="Добавить компании">
      <form className="add-companies" onSubmit={event => void submit(event)}>
        <label className="add-companies__label" htmlFor="company-list">
          По одной компании на строку. Почту можно указать через запятую или точку с запятой — или
          вставить две колонки из Excel или Google Таблиц.
        </label>
        <textarea
          id="company-list"
          onChange={event => changeText(event.target.value)}
          placeholder={EXAMPLE}
          rows={6}
          value={text}
        />
        {parsed.length > 0 ? (
          <>
            <p className="add-companies__summary">
              Распознано: {formatCompanyCount(parsed.length)}
              {duplicates > 0 ? ` · повторов: ${duplicates}, они не отмечены` : ''}. Снимите
              галочку со строк, которые добавлять не нужно, например с заголовка таблицы.
            </p>
            <ul className="add-companies__preview">
              {parsed.map(item => (
                <li key={item.line}>
                  <label>
                    <input
                      aria-label={item.company || item.email || 'Строка'}
                      checked={isChecked(item.line, item.duplicate)}
                      onChange={event =>
                        setOverrides({ ...overrides, [item.line]: event.target.checked })
                      }
                      type="checkbox"
                    />
                    <span className="add-companies__company">
                      {item.company || <em>без названия</em>}
                    </span>
                    <span className="add-companies__email">{item.email ?? 'без почты'}</span>
                    {item.duplicate ? <span className="badge">уже есть</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog__actions">
          <button className="outline-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" disabled={isPending || selected.length === 0} type="submit">
            {isPending ? 'Добавляем…' : `Добавить ${selected.length > 0 ? selected.length : ''}`}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
