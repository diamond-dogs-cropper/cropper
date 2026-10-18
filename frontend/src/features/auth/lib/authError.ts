import { ApiError } from '../../../shared/api/apiClient'

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Не удалось связаться с сервером. Попробуйте ещё раз.'
}
