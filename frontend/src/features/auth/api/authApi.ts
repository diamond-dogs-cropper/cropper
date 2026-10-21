import { ApiError, apiRequest } from '../../../shared/api/apiClient'
import type { Credentials, User } from '../model/auth.types'

const AUTH_URL = '/api/auth'
let currentUserRequest: Promise<User | null> | null = null

async function requestCurrentUser(): Promise<User | null> {
  try {
    return await apiRequest<User>(`${AUTH_URL}/me`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}

export function getCurrentUser(): Promise<User | null> {
  currentUserRequest ??= requestCurrentUser().catch((error: unknown) => {
    currentUserRequest = null
    throw error
  })

  return currentUserRequest
}

export async function login(credentials: Credentials): Promise<User> {
  const user = await apiRequest<User>(`${AUTH_URL}/login`, {
    body: JSON.stringify(credentials),
    method: 'POST',
  })
  currentUserRequest = Promise.resolve(user)
  return user
}

export async function register(credentials: Credentials): Promise<User> {
  const user = await apiRequest<User>(`${AUTH_URL}/register`, {
    body: JSON.stringify(credentials),
    method: 'POST',
  })
  currentUserRequest = Promise.resolve(user)
  return user
}

export async function logout(): Promise<void> {
  await apiRequest<void>(`${AUTH_URL}/logout`, { method: 'POST' })
  currentUserRequest = Promise.resolve(null)
}

export function refreshCurrentUser(): Promise<User | null> {
  currentUserRequest = null
  return getCurrentUser()
}
