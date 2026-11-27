import { apiRequest } from '../../../shared/api/apiClient'
import type { Logo, PublicTemplate } from '../model/templates.types'

const PUBLIC_TEMPLATES_URL = '/api/public/templates'

function withRecipient(params: Record<string, string>, recipientId: string | null) {
  return new URLSearchParams(recipientId ? { ...params, r: recipientId } : params)
}

export function getPublicTemplate(id: string, recipientId: string | null): Promise<PublicTemplate> {
  const query = withRecipient({}, recipientId)
  return apiRequest<PublicTemplate>(`${PUBLIC_TEMPLATES_URL}/${id}?${query}`)
}

export function uploadLogo(
  templateId: string,
  recipientId: string | null,
  company: string,
  png: Blob,
): Promise<Logo> {
  const query = withRecipient({ company }, recipientId)

  return apiRequest<Logo>(`${PUBLIC_TEMPLATES_URL}/${templateId}/logos?${query}`, {
    body: png,
    headers: { 'Content-Type': 'image/png' },
    method: 'POST',
  })
}
