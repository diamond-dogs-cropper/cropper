import { createContext } from 'react'
import type { AuthState, Credentials } from './auth.types'

type AuthContextValue = {
  login: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  register: (credentials: Credentials) => Promise<void>
  state: AuthState
}

export const AuthContext = createContext<AuthContextValue | null>(null)
