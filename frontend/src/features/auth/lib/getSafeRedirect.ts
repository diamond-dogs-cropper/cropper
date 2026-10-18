export function getSafeRedirect(search: string, fallback: string): string {
  const redirect = new URLSearchParams(search).get('from')

  if (
    !redirect ||
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.includes('\\')
  ) {
    return fallback
  }

  return redirect
}
