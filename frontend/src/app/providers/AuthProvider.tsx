import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshCurrentUser,
  register as registerRequest,
} from '../../features/auth/api/authApi'
import { AuthContext } from '../../features/auth/model/AuthContext'
import type { AuthState, Credentials, User } from '../../features/auth/model/auth.types'

type AuthProviderProps = {
  children: ReactNode
}

const initialState: AuthState = { status: 'loading', user: null }

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState)

  const applyUser = useCallback((user: User | null) => {
    setState(user ? { status: 'authenticated', user } : { status: 'guest', user: null })
  }, [])

  const refresh = useCallback(async () => {
    setState(initialState)

    try {
      applyUser(await refreshCurrentUser())
    } catch {
      setState({ status: 'error', user: null })
    }
  }, [applyUser])

  useEffect(() => {
    let isActive = true

    getCurrentUser()
      .then((user) => {
        if (isActive) applyUser(user)
      })
      .catch(() => {
        if (isActive) setState({ status: 'error', user: null })
      })

    return () => {
      isActive = false
    }
  }, [applyUser])

  const login = useCallback(async (credentials: Credentials) => {
    setState({ status: 'authenticated', user: await loginRequest(credentials) })
  }, [])

  const register = useCallback(async (credentials: Credentials) => {
    setState({ status: 'authenticated', user: await registerRequest(credentials) })
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setState({ status: 'guest', user: null })
  }, [])

  const value = useMemo(
    () => ({ login, logout, refresh, register, state }),
    [login, logout, refresh, register, state],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
