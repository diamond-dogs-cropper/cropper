export function getErrorProps(id: string, error?: string) {
  return error ? { 'aria-describedby': `${id}-error`, 'aria-invalid': true as const } : {}
}
