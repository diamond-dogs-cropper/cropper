import { IconButton } from '../../../../shared/ui/IconButton'
import { CheckIcon, DownloadIcon, LinkIcon } from '../../../../shared/ui/icons'
import { Menu, type MenuItem } from '../../../../shared/ui/Menu'
import { getLogoUrl } from '../../api/templatesApi'
import {
  describeState,
  getCompanyName,
  getCompanyState,
  getRecipientLink,
} from '../../lib/companies'
import { getFormatLabel } from '../../lib/templateText'
import { useCopyLink } from '../../lib/useCopyLink'
import type { Recipient, RecipientChanges, Template } from '../../model/templates.types'

export interface CompanyActions {
  onChange: (recipient: Recipient, changes: RecipientChanges) => void
  onDelete: (recipient: Recipient) => void
  onDeleteLogo: (recipient: Recipient) => void
  onEdit: (recipient: Recipient) => void
  onInvite: (recipients: Recipient[]) => void
}

interface CompanyRowProps {
  actions: CompanyActions
  isBusy: boolean
  recipient: Recipient
  template: Template
}

function buildMenu(recipient: Recipient, actions: CompanyActions, copy: () => void): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'Изменить или добавить заметку', onSelect: () => actions.onEdit(recipient) },
  ]
  const mark = (value: Recipient['mark']) => () => actions.onChange(recipient, { mark: value })

  if (recipient.logo) {
    items.push(
      { label: 'Скопировать ссылку для замены', onSelect: copy },
      { label: 'Удалить логотип', onSelect: () => actions.onDeleteLogo(recipient), tone: 'danger' },
    )
  } else {
    items.push(
      recipient.mark === 'done'
        ? { label: 'Снять отметку «Логотип есть»', onSelect: mark(null) }
        : { label: 'Отметить: логотип уже есть', onSelect: mark('done') },
      recipient.mark === 'skip'
        ? { label: 'Снять отметку «Не нужен»', onSelect: mark(null) }
        : { label: 'Отметить: логотип не нужен', onSelect: mark('skip') },
    )
  }
  items.push({ label: 'Удалить из списка', onSelect: () => actions.onDelete(recipient), tone: 'danger' })
  return items
}

function RowThumb({ recipient, template }: Readonly<{ recipient: Recipient; template: Template }>) {
  if (recipient.logo) {
    return (
      <img
        alt={`Логотип ${getCompanyName(recipient)}`}
        className="checkerboard"
        loading="lazy"
        src={getLogoUrl(template.id, recipient.logo.id)}
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      />
    )
  }
  return <span aria-hidden="true">{recipient.mark === 'done' ? <CheckIcon /> : null}</span>
}

function RowDetails({ recipient }: Readonly<{ recipient: Recipient }>) {
  const sentAs = recipient.logo && recipient.company && recipient.logo.company !== recipient.company
  const parts = [
    recipient.company ? recipient.email ?? 'без почты' : null,
    sentAs ? `прислали как: ${recipient.logo?.company}` : null,
  ].filter(Boolean)

  return (
    <div className="company-row__info">
      <h3>{getCompanyName(recipient)}</h3>
      {parts.length > 0 ? <p>{parts.join(' · ')}</p> : null}
      {recipient.note ? <p className="company-row__note">{recipient.note}</p> : null}
    </div>
  )
}

export function CompanyRow({ actions, isBusy, recipient, template }: Readonly<CompanyRowProps>) {
  const [copy, copyLink] = useCopyLink()
  const state = getCompanyState(recipient)
  const link = getRecipientLink(template.id, recipient.id)
  const canInvite = template.is_open && recipient.email && (state === 'waiting' || state === 'invited')
  const copyLabel = {
    copied: 'Ссылка скопирована',
    failed: 'Не удалось скопировать',
    idle: 'Скопировать ссылку для компании',
  }[copy]

  return (
    <li aria-busy={isBusy} className={`company-row company-row--${state}`}>
      <div className={recipient.logo ? 'company-row__thumb' : 'company-row__thumb company-row__thumb--empty'}>
        <RowThumb recipient={recipient} template={template} />
      </div>
      <RowDetails recipient={recipient} />
      <span className={`company-status company-status--${state}`}>{describeState(recipient)}</span>
      <div className="company-row__actions">
        {canInvite ? (
          <button
            aria-label={`${state === 'invited' ? 'Напомнить' : 'Отправить письмо'}: ${getCompanyName(recipient)}`}
            className="outline-button outline-button--small"
            disabled={isBusy}
            onClick={() => actions.onInvite([recipient])}
            type="button"
          >
            {state === 'invited' ? 'Напомнить' : 'Отправить письмо'}
          </button>
        ) : null}
        {recipient.logo ? (
          <a
            aria-label={`Скачать ${getFormatLabel(template.output_format)}`}
            className="icon-button"
            data-tooltip={`Скачать ${getFormatLabel(template.output_format)}`}
            download
            href={getLogoUrl(template.id, recipient.logo.id)}
          >
            <DownloadIcon />
          </a>
        ) : (
          <IconButton label={copyLabel} onClick={() => void copyLink(link)}>
            {copy === 'copied' ? <CheckIcon /> : <LinkIcon />}
          </IconButton>
        )}
        <Menu
          items={buildMenu(recipient, actions, () => void copyLink(link))}
          label={`Действия: ${getCompanyName(recipient)}`}
          tooltip="Действия"
        />
      </div>
    </li>
  )
}
