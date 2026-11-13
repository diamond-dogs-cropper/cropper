import { apiRequest } from '../../../shared/api/apiClient'
import type { Logo, Template } from '../model/templates.types'

const PUBLIC_TEMPLATES_URL = '/api/public/templates'

export function getPublicTemplate(id: string): Promise<Template> {
  return apiRequest<Template>(`${PUBLIC_TEMPLATES_URL}/${id}`)
}

export function uploadLogo(templateId: string, company: string, png: Blob): Promise<Logo> {
  const query = new URLSearchParams({ company })

  return apiRequest<Logo>(`${PUBLIC_TEMPLATES_URL}/${templateId}/logos?${query}`, {
    body: png,
    headers: { 'Content-Type': 'image/png' },
    method: 'POST',
  })
}
