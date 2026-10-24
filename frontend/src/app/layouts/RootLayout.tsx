import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { routePaths } from '../router/routePaths'

function getPageTitle(pathname: string): string {
  if (pathname === routePaths.home) return 'Cropper — подготовка логотипов'
  if (pathname === routePaths.login) return 'Вход — Cropper'
  if (pathname === routePaths.register) return 'Регистрация — Cropper'
  if (pathname === routePaths.templateNew) return 'Новый шаблон — Cropper'
  if (pathname === routePaths.templates) return 'Мои шаблоны — Cropper'
  if (/^\/templates\/[^/]+$/.test(pathname)) return 'Шаблон — Cropper'
  if (/^\/t\/[^/]+$/.test(pathname)) return 'Подготовка логотипа — Cropper'

  return 'Страница не найдена — Cropper'
}

export function RootLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = getPageTitle(pathname)
  }, [pathname])

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
