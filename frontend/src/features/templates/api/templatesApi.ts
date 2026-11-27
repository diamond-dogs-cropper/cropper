import { apiRequest } from '../../../shared/api/apiClient'
import type { Logo, Recipient, Template, TemplateInput } from '../model/templates.types'

const TEMPLATES_URL = '/api/templates'
let templatesSnapshot: Template[] | null = null

function updateSnapshot(template: Template) {
  if (!templatesSnapshot) {
    return
  }

  const exists = templatesSnapshot.some(item => item.id === template.id)
  templatesSnapshot = exists
    ? templatesSnapshot.map(item => (item.id === template.id ? template : item))
    : [template, ...templatesSnapshot]
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  const template = await apiRequest<Template>(TEMPLATES_URL, {
    body: JSON.stringify(input),
    method: 'POST',
  })
  updateSnapshot(template)
  return template
}

export async function getTemplates(): Promise<Template[]> {
  const templates = await apiRequest<Template[]>(TEMPLATES_URL)
  templatesSnapshot = templates
  return templates
}

export function getTemplatesSnapshot(): Template[] | null {
  return templatesSnapshot
}

export function clearTemplatesSnapshot() {
  templatesSnapshot = null
}

export function getTemplate(id: string): Promise<Template> {
  return apiRequest<Template>(`${TEMPLATES_URL}/${id}`)
}

export function getLogos(templateId: string): Promise<Logo[]> {
  return apiRequest<Logo[]>(`${TEMPLATES_URL}/${templateId}/logos`)
}

export function deleteLogo(templateId: string, logoId: string): Promise<void> {
  return apiRequest<undefined>(`${TEMPLATES_URL}/${templateId}/logos/${logoId}`, { method: 'DELETE' })
}

export function getLogoUrl(templateId: string, logoId: string): string {
  return `${TEMPLATES_URL}/${templateId}/logos/${logoId}/file`
}

export function getArchiveUrl(templateId: string): string {
  return `${TEMPLATES_URL}/${templateId}/logos/archive`
}

async function patchTemplate(
  id: string,
  changes: Partial<Pick<Template, 'is_open' | 'notify'>>,
): Promise<Template> {
  const template = await apiRequest<Template>(`${TEMPLATES_URL}/${id}`, {
    body: JSON.stringify(changes),
    method: 'PATCH',
  })
  updateSnapshot(template)
  return template
}

export function setTemplateOpen(id: string, isOpen: boolean): Promise<Template> {
  return patchTemplate(id, { is_open: isOpen })
}

export function setTemplateNotify(id: string, notify: boolean): Promise<Template> {
  return patchTemplate(id, { notify })
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiRequest<undefined>(`${TEMPLATES_URL}/${id}`, { method: 'DELETE' })
  if (templatesSnapshot) {
    templatesSnapshot = templatesSnapshot.filter(template => template.id !== id)
  }
}

export function sendInvite(templateId: string, email: string): Promise<Recipient> {
  return apiRequest<Recipient>(`${TEMPLATES_URL}/${templateId}/invites`, {
    body: JSON.stringify({ email }),
    method: 'POST',
  })
}
