import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'

export function Component() {
  return (
    <main className="status-page">
      <p className="status-page__code">404</p>
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь на главную.</p>
      <Link className="button-link button-link--large" to={routePaths.home}>
        На главную
      </Link>
    </main>
  )
}
