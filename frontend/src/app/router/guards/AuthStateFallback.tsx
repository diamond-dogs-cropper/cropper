import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../features/auth/model/useAuth'
import { TemplatePageSkeleton, TemplatesPageSkeleton } from '../../../shared/ui/PageSkeletons'
import { SiteHeader } from '../../../widgets/site-header/ui/SiteHeader'
import { routePaths } from '../routePaths'

export function AuthStateFallback() {
  const { refresh, state } = useAuth()
  const { pathname } = useLocation()

  if (state.status === 'loading') {
    if (pathname.startsWith(routePaths.templates)) {
      return (
        <div className="app-layout">
          <SiteHeader
            action={<span aria-hidden="true" className="skeleton skeleton-account" />}
            withMark
          />
          <main className="app-layout__content">
            {pathname === routePaths.templates ? (
              <>
                <div aria-hidden="true" className="page-head">
                  <div>
                    <span className="skeleton skeleton-heading" />
                    <span className="skeleton skeleton-line skeleton-line--large" />
                  </div>
                  <span className="skeleton skeleton-button skeleton-button--wide" />
                </div>
                <TemplatesPageSkeleton />
              </>
            ) : <TemplatePageSkeleton />}
          </main>
        </div>
      )
    }

    return (
      <main className="status-page" aria-live="polite">
        <p className="status-page__code">Cropper</p>
        <h1>Проверяем сессию</h1>
      </main>
    )
  }

  return (
    <main className="status-page" role="alert">
      <p className="status-page__code">Ошибка</p>
      <h1>Сервер недоступен</h1>
      <p>Не удалось проверить сессию. Проверьте соединение и попробуйте снова.</p>
      <button className="primary-button" onClick={() => void refresh()} type="button">
        Повторить
      </button>
    </main>
  )
}
