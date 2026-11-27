import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router-dom'
import { routePaths } from '../router/routePaths'

function getPageTitle(pathname: string, search: string): string {
  if (pathname === routePaths.home) {
    return 'Cropper — подготовка логотипов'
  }
  if (pathname === routePaths.login) {
    return 'Вход — Cropper'
  }
  if (pathname === routePaths.register) {
    return 'Регистрация — Cropper'
  }
  if (pathname === routePaths.templateNew) {
    return new URLSearchParams(search).has('from') ? 'Похожий шаблон — Cropper' : 'Новый шаблон — Cropper'
  }
  if (pathname === routePaths.templates) {
    return 'Мои шаблоны — Cropper'
  }
  if (/^\/templates\/[^/]+$/.test(pathname)) {
    return 'Шаблон — Cropper'
  }
  if (/^\/t\/[^/]+$/.test(pathname)) {
    return 'Подготовка логотипа — Cropper'
  }

  return 'Страница не найдена — Cropper'
}

export function RootLayout() {
  const { pathname, search } = useLocation()
  const navigation = useNavigation()
  const isNavigating = navigation.state !== 'idle'

  useEffect(() => {
    document.title = getPageTitle(pathname, search)
  }, [pathname, search])

  return (
    <>
      <div
        aria-hidden="true"
        className={`navigation-progress${isNavigating ? ' navigation-progress--active' : ''}`}
      >
        <span />
      </div>
      <output className="visually-hidden">{isNavigating ? 'Загрузка страницы' : ''}</output>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
