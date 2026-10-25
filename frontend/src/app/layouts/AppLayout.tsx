import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getAuthErrorMessage } from '../../features/auth/lib/authError'
import { useAuth } from '../../features/auth/model/useAuth'
import { SiteHeader } from '../../widgets/site-header/ui/SiteHeader'
import { routePaths } from '../router/routePaths'

export function AppLayout() {
  const { logout, state } = useAuth()
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const email = state.status === 'authenticated' ? state.user.email : ''

  async function handleLogout() {
    setError(null)
    setIsPending(true)

    try {
      await logout()
      navigate(routePaths.home, { replace: true, viewTransition: true })
    } catch (logoutError) {
      setError(getAuthErrorMessage(logoutError))
      setIsPending(false)
    }
  }

  return (
    <div className="app-layout">
      <SiteHeader
        action={
          <>
            <div className="app-nav">
              <NavLink to={routePaths.home} end viewTransition>На главную</NavLink>
              <NavLink to={routePaths.templates} viewTransition>Мои шаблоны</NavLink>
            </div>
            <div className="account-actions">
              <span>{email}</span>
              <button disabled={isPending} onClick={() => void handleLogout()} type="button">
                {isPending ? 'Выходим…' : 'Выйти'}
              </button>
            </div>
          </>
        }
        withMark
      />
      {error ? <p className="app-layout__error" role="alert">{error}</p> : null}
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
