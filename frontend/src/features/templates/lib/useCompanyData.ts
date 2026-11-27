import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { getRecipients } from '../api/recipientsApi'
import { getLogos } from '../api/templatesApi'
import type { Logo, Recipient } from '../model/templates.types'

export interface CompanyData {
  logos: Logo[]
  recipients: Recipient[]
}

type LoadState = { id: string } & (CompanyData | { message: string })

export function useCompanyData(templateId: string) {
  const [state, setState] = useState<LoadState | null>(null)

  useEffect(() => {
    let isCurrent = true

    Promise.all([getLogos(templateId), getRecipients(templateId)])
      .then(([logos, recipients]) => isCurrent && setState({ id: templateId, logos, recipients }))
      .catch(
        (error: unknown) => isCurrent && setState({ id: templateId, message: getErrorMessage(error) }),
      )

    return () => {
      isCurrent = false
    }
  }, [templateId])

  const update = useCallback(
    (change: (data: CompanyData) => CompanyData) =>
      setState(current => (current && 'logos' in current ? { ...current, ...change(current) } : current)),
    [],
  )

  return [state?.id === templateId ? state : null, update] as const
}

export function upsertRecipients(current: Recipient[], changed: Recipient[]): Recipient[] {
  const byId = new Map(changed.map(item => [item.id, item]))
  const updated = current.map(item => byId.get(item.id) ?? item)
  const added = changed.filter(item => !current.some(existing => existing.id === item.id))
  return [...updated, ...added]
}
