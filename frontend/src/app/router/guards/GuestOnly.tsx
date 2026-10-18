import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../../features/auth/model/useAuth'
import { routePaths } from '../routePaths'
import { AuthStateFallback } from './AuthStateFallback'

export function GuestOnly() {
  const { state } = useAuth()

  if (state.status === 'loading' || state.status === 'error') {
    return <AuthStateFallback />
  }

  if (state.status === 'authenticated') {
    return <Navigate replace to={routePaths.templates} />
  }

  return <Outlet />
}
