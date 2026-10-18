import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Не удалось открыть страницу.'

  return (
    <main className="status-page">
      <p className="status-page__code">Ошибка</p>
      <h1>Что-то пошло не так</h1>
      <p>{message}</p>
      <Link className="button-link button-link--large" to={routePaths.home}>
        На главную
      </Link>
    </main>
  )
}
