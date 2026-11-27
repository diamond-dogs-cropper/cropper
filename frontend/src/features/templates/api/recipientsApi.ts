import { apiRequest } from '../../../shared/api/apiClient'
import type { Recipient, RecipientChanges } from '../model/templates.types'

const TEMPLATES_URL = '/api/templates'

export interface NewRecipient {
  company: string
  email: string | null
}

export interface InviteResult {
  error: string | null
  recipients: Recipient[]
}

export function getRecipients(templateId: string): Promise<Recipient[]> {
  return apiRequest<Recipient[]>(`${TEMPLATES_URL}/${templateId}/recipients`)
}

export function addRecipients(templateId: string, items: NewRecipient[]): Promise<Recipient[]> {
  return apiRequest<Recipient[]>(`${TEMPLATES_URL}/${templateId}/recipients`, {
    body: JSON.stringify({ items }),
    method: 'POST',
  })
}

export function updateRecipient(
  templateId: string,
  recipientId: string,
  changes: RecipientChanges,
): Promise<Recipient> {
  return apiRequest<Recipient>(`${TEMPLATES_URL}/${templateId}/recipients/${recipientId}`, {
    body: JSON.stringify(changes),
    method: 'PATCH',
  })
}

export function deleteRecipient(templateId: string, recipientId: string): Promise<void> {
  return apiRequest<undefined>(`${TEMPLATES_URL}/${templateId}/recipients/${recipientId}`, {
    method: 'DELETE',
  })
}

export function inviteRecipients(templateId: string, ids: string[]): Promise<InviteResult> {
  return apiRequest<InviteResult>(`${TEMPLATES_URL}/${templateId}/recipients/invites`, {
    body: JSON.stringify({ ids }),
    method: 'POST',
  })
}
