import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSafeRedirect } from '../../../features/auth/lib/getSafeRedirect'
import { useAuth } from '../../../features/auth/model/useAuth'
import { routePaths } from '../routePaths'
import { AuthStateFallback } from './AuthStateFallback'

export function GuestOnly() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading' || state.status === 'error') {
    return <AuthStateFallback />
  }

  if (state.status === 'authenticated') {
    return <Navigate replace to={getSafeRedirect(location.search, routePaths.templates)} />
  }

  return <Outlet />
}
