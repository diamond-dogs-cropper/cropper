import { useCallback, useRef, useState } from 'react'
import { ChevronDownIcon } from '../../../../shared/ui/icons'
import { useDismiss } from '../../../../shared/ui/useDismiss'
import { getCompanyName, isSimilarCompany, normalizeCompany } from '../../lib/companies'
import type { Recipient } from '../../model/templates.types'

interface BindPickerProps {
  company: string
  disabled: boolean
  onSelect: (recipient: Recipient) => void
  recipients: Recipient[]
}

const SEARCH_FROM = 7

function rank(recipient: Recipient, company: string) {
  return (isSimilarCompany(recipient.company, company) ? 0 : 2) + (recipient.logo ? 1 : 0)
}

export function BindPicker({ company, disabled, onSelect, recipients }: Readonly<BindPickerProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])
  useDismiss(ref, isOpen, close)

  const search = normalizeCompany(query)
  const options = [...recipients]
    .sort((a, b) => rank(a, company) - rank(b, company))
    .filter(item => normalizeCompany(`${item.company} ${item.email ?? ''}`).includes(search))

  function select(recipient: Recipient) {
    close()
    onSelect(recipient)
  }

  return (
    <div className="picker" ref={ref}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="outline-button outline-button--small picker__toggle"
        disabled={disabled}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        type="button"
      >
        Привязать к компании
        <ChevronDownIcon />
      </button>
      {isOpen ? (
        <div className="picker__popover">
          {recipients.length >= SEARCH_FROM ? (
            <input
              aria-label="Найти компанию"
              autoFocus
              className="picker__search"
              onChange={event => setQuery(event.target.value)}
              placeholder="Найти компанию"
              value={query}
            />
          ) : null}
          <ul aria-label={`Привязать логотип «${company}»`} className="picker__list" role="listbox">
            {options.map(recipient => (
              <li key={recipient.id}>
                <button
                  aria-selected="false"
                  className="picker__item"
                  onClick={() => select(recipient)}
                  role="option"
                  type="button"
                >
                  <span className="picker__name">{getCompanyName(recipient)}</span>
                  {isSimilarCompany(recipient.company, company) ? (
                    <span className="picker__hint picker__hint--match">похоже</span>
                  ) : null}
                  {recipient.logo ? <span className="picker__hint">заменит логотип</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {options.length === 0 ? <p className="picker__empty">Ничего не найдено</p> : null}
        </div>
      ) : null}
    </div>
  )
}
