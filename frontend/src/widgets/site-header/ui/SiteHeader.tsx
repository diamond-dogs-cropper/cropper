import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { Brand } from '../../../shared/ui/Brand'

type SiteHeaderProps = {
  action?: ReactNode
  brandLabel?: string
  withMark?: boolean
}

export function SiteHeader({
  action,
  brandLabel = 'Cropper',
  withMark = false,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="site-header__brand-link" to={routePaths.home} aria-label="На главную">
        <Brand label={brandLabel} withMark={withMark} />
      </Link>
      {action ? <nav aria-label="Основная навигация">{action}</nav> : null}
    </header>
  )
}
