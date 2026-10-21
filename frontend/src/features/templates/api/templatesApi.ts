import { apiRequest } from '../../../shared/api/apiClient'
import type { Template, TemplateInput } from '../model/templates.types'

const TEMPLATES_URL = '/api/templates'

export function createTemplate(input: TemplateInput): Promise<Template> {
  return apiRequest<Template>(TEMPLATES_URL, {
    body: JSON.stringify(input),
    method: 'POST',
  })
}

export function getTemplates(): Promise<Template[]> {
  return apiRequest<Template[]>(TEMPLATES_URL)
}

export function getTemplate(id: string): Promise<Template> {
  return apiRequest<Template>(`${TEMPLATES_URL}/${id}`)
}

export function setTemplateOpen(id: string, isOpen: boolean): Promise<Template> {
  return apiRequest<Template>(`${TEMPLATES_URL}/${id}`, {
    body: JSON.stringify({ is_open: isOpen }),
    method: 'PATCH',
  })
}

export function deleteTemplate(id: string): Promise<void> {
  return apiRequest<void>(`${TEMPLATES_URL}/${id}`, { method: 'DELETE' })
}
