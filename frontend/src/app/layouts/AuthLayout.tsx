import { Link, Outlet } from 'react-router-dom'
import { routePaths } from '../router/routePaths'
import { SiteHeader } from '../../widgets/site-header/ui/SiteHeader'

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <SiteHeader
        brandLabel="Логоформ"
        action={<Link to={routePaths.home}>На главную</Link>}
      />
      <main className="auth-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
