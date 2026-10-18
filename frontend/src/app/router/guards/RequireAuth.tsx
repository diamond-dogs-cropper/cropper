import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../../features/auth/model/useAuth'
import { routePaths } from '../routePaths'
import { AuthStateFallback } from './AuthStateFallback'

export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading' || state.status === 'error') {
    return <AuthStateFallback />
  }

  if (state.status === 'guest') {
    const from = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate replace to={`${routePaths.login}?from=${from}`} />
  }

  return <Outlet />
}
