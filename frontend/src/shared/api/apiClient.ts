export const HTTP_NO_CONTENT = 204
export const HTTP_UNAUTHORIZED = 401
export const HTTP_NOT_FOUND = 404

type ApiErrorDetails = {
  field: string
  message: string
}[]

interface ApiErrorBody {
  code?: string
  details?: ApiErrorDetails
  message?: string
}

export class ApiError extends Error {
  readonly code: string
  readonly details?: ApiErrorDetails
  readonly status: number

  constructor(status: number, body: ApiErrorBody = {}) {
    super(body.message ?? 'Не удалось выполнить запрос')
    this.name = 'ApiError'
    this.status = status
    this.code = body.code ?? 'request_failed'
    this.details = body.details
  }
}

async function readError(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response))
  }

  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
