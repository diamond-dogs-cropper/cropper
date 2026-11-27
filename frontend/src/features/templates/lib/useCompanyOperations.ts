import { useState } from 'react'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import type { ConfirmOptions } from '../../../shared/ui/ConfirmDialog'
import {
  addRecipients,
  deleteRecipient,
  getRecipients,
  inviteRecipients,
  updateRecipient,
  type NewRecipient,
} from '../api/recipientsApi'
import { deleteLogo } from '../api/templatesApi'
import type { Logo, Recipient, RecipientChanges, Template } from '../model/templates.types'
import { formatCompanyCount, getCompanyName } from './companies'
import { upsertRecipients, type CompanyData } from './useCompanyData'

export interface Notice {
  text: string
  tone: 'success' | 'error'
}

type Update = (change: (data: CompanyData) => CompanyData) => void

const INVITE_BATCH = 10

function inviteNotice(recipients: Recipient[], sent: number, error: string | null): Notice {
  if (error) {
    return { text: `Отправлено ${sent} из ${recipients.length}. ${error}`, tone: 'error' }
  }
  if (recipients.length === 1) {
    return { text: `Письмо отправлено: «${getCompanyName(recipients[0])}»`, tone: 'success' }
  }
  return { text: `Письма отправлены: ${sent}`, tone: 'success' }
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

export function useCompanyOperations(template: Template, update: Update, confirm: Confirm) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  async function run(id: string, action: () => Promise<void>) {
    setNotice(null)
    setPendingId(id)
    try {
      await action()
    } catch (error) {
      setNotice({ text: getErrorMessage(error), tone: 'error' })
    } finally {
      setPendingId(null)
    }
  }

  const replace = (recipient: Recipient) =>
    update(data => ({ ...data, recipients: upsertRecipients(data.recipients, [recipient]) }))

  async function save(recipient: Recipient, changes: RecipientChanges) {
    replace(await updateRecipient(template.id, recipient.id, changes))
  }

  function change(recipient: Recipient, changes: RecipientChanges) {
    const name = getCompanyName(recipient)
    const labels = { done: 'отмечено «Логотип есть»', skip: 'отмечено «Не нужен»' }
    const text = changes.mark ? `«${name}»: ${labels[changes.mark]}` : `«${name}»: отметка снята`
    void run(recipient.id, async () => {
      await save(recipient, changes)
      setNotice({ text, tone: 'success' })
    })
  }

  async function bind(recipient: Recipient, logo: Logo) {
    const isConfirmed =
      !recipient.logo ||
      (await confirm({
        action: 'Заменить',
        message: `У «${getCompanyName(recipient)}» уже есть логотип. Новый займёт его место, а прежний останется в списке как «Не из списка».`,
        title: 'Заменить логотип?',
      }))
    if (!isConfirmed) {
      return
    }
    await run(logo.id, async () => {
      await updateRecipient(template.id, recipient.id, { logo_id: logo.id })
      const recipients = await getRecipients(template.id)
      update(data => ({ ...data, recipients }))
      setNotice({ text: `Логотип привязан к «${getCompanyName(recipient)}»`, tone: 'success' })
    })
  }

  async function remove(recipient: Recipient) {
    const keepsLogo = recipient.logo
      ? 'Присланный логотип останется — он появится как «Не из списка».'
      : 'Именная ссылка компании перестанет быть именной.'
    const isConfirmed = await confirm({
      action: 'Удалить',
      message: keepsLogo,
      title: `Удалить «${getCompanyName(recipient)}» из списка?`,
      tone: 'danger',
    })
    if (!isConfirmed) {
      return
    }
    await run(recipient.id, async () => {
      await deleteRecipient(template.id, recipient.id)
      update(data => ({ ...data, recipients: data.recipients.filter(item => item.id !== recipient.id) }))
    })
  }

  async function removeLogo(logo: Logo, company: string) {
    const isConfirmed = await confirm({
      action: 'Удалить',
      message: 'Вернуть его будет нельзя.',
      title: `Удалить логотип «${company}»?`,
      tone: 'danger',
    })
    if (!isConfirmed) {
      return
    }
    await run(logo.id, async () => {
      await deleteLogo(template.id, logo.id)
      update(data => ({
        logos: data.logos.filter(item => item.id !== logo.id),
        recipients: data.recipients.map(item =>
          item.logo?.id === logo.id ? { ...item, logo: null } : item,
        ),
      }))
    })
  }

  async function invite(recipients: Recipient[]) {
    const reminders = recipients.filter(item => item.invited_at).length
    const isConfirmed =
      recipients.length === 1 ||
      (await confirm({
        action: 'Отправить',
        message: `Каждой компании уйдёт её именная ссылка. Новых писем: ${recipients.length - reminders}, напоминаний: ${reminders}.`,
        title: `Отправить письма: ${formatCompanyCount(recipients.length)}?`,
      }))
    if (!isConfirmed) {
      return
    }
    await run(recipients.length === 1 ? recipients[0].id : 'invite', async () => {
      let sent = 0
      let error: string | null = null
      // Письмо уходит за 1–3 с, поэтому шлём пачками: один долгий запрос упёрся бы в таймаут nginx.
      for (let start = 0; start < recipients.length && !error; start += INVITE_BATCH) {
        const batch = recipients.slice(start, start + INVITE_BATCH).map(item => item.id)
        const result = await inviteRecipients(template.id, batch)
        update(data => ({ ...data, recipients: upsertRecipients(data.recipients, result.recipients) }))
        sent += result.recipients.length
        error = result.error
        if (!error && start + INVITE_BATCH < recipients.length) {
          setNotice({ text: `Отправляем письма: ${sent} из ${recipients.length}…`, tone: 'success' })
        }
      }
      setNotice(inviteNotice(recipients, sent, error))
    })
  }

  async function add(items: NewRecipient[]) {
    const added = await addRecipients(template.id, items)
    update(data => ({ ...data, recipients: [...data.recipients, ...added] }))
    setNotice({
      text: `Добавлено: ${formatCompanyCount(added.length)}. Отправьте им письма или скопируйте именную ссылку в строке компании.`,
      tone: 'success',
    })
  }

  return { add, bind, change, invite, notice, pendingId, remove, removeLogo, save }
}
