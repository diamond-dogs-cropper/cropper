export const routePaths = {
  home: '/',
  login: '/login',
  register: '/register',
  publicTemplate: '/t/:templateId',
  templates: '/templates',
  templateNew: '/templates/new',
  template: '/templates/:templateId',
} as const

export function getTemplatePath(id: string): string {
  return `${routePaths.templates}/${id}`
}
