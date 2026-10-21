import { ApiError } from './apiClient'

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Не удалось связаться с сервером. Попробуйте ещё раз.'
}
