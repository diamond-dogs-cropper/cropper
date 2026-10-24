import { apiRequest } from '../../../shared/api/apiClient'
import type { Template } from '../model/templates.types'

const PUBLIC_TEMPLATES_URL = '/api/public/templates'

export function getPublicTemplate(id: string): Promise<Template> {
  return apiRequest<Template>(`${PUBLIC_TEMPLATES_URL}/${id}`)
}
