import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { getAuthErrorMessage } from '../../../features/auth/lib/authError'
import { getSafeRedirect } from '../../../features/auth/lib/getSafeRedirect'
import { readField } from '../../../features/auth/lib/readField'
import { useAuth } from '../../../features/auth/model/useAuth'
import { PasswordField } from '../../../shared/ui/PasswordField'

export function Component() {
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    setError(null)
    setIsPending(true)

    const formData = new FormData(event.currentTarget)

    try {
      await login({
        email: readField(formData, 'email'),
        password: readField(formData, 'password'),
      })
      navigate(getSafeRedirect(location.search, routePaths.templates), { replace: true })
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError))
      setIsPending(false)
    }
  }

  return (
    <section className="auth-page" aria-labelledby="login-title">
      <div className="auth-card">
        <h1 id="login-title">Войдите в аккаунт</h1>
        <p className="auth-card__lead">
          Создавайте шаблоны и готовьте логотипы в едином формате.
        </p>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field" htmlFor="login-email">
            <span className="field__label">Электронная почта</span>
            <input
              autoComplete="email"
              id="login-email"
              name="email"
              placeholder="name@company.ru"
              required
              type="email"
            />
          </label>
          <PasswordField
            autoComplete="current-password"
            id="login-password"
            label="Пароль"
            name="password"
          />
          <div className="auth-form__options auth-form__options--end">
            <span className="disabled-link" title="Восстановление пароля пока не поддерживается API">
              Забыли пароль?
            </span>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Входим…' : 'Войти'}
          </button>
        </form>
        <p className="auth-card__switch">
          Нет аккаунта? <Link to={routePaths.register}>Зарегистрироваться</Link>
        </p>
      </div>
      <p className="auth-page__note">
        Если вы готовите логотип для мероприятия,<br />откройте ссылку от организатора.
      </p>
    </section>
  )
}
