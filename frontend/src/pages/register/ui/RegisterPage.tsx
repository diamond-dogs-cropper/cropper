import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { getAuthErrorMessage } from '../../../features/auth/lib/authError'
import { useAuth } from '../../../features/auth/model/useAuth'
import { PasswordField } from '../../../shared/ui/PasswordField'

export function Component() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    setError(null)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password'))
    const passwordConfirmation = String(formData.get('passwordConfirmation'))

    if (password !== passwordConfirmation) {
      setError('Пароли не совпадают')
      return
    }

    setIsPending(true)

    try {
      await register({ email: String(formData.get('email')), password })
      navigate(routePaths.templates, { replace: true })
    } catch (registerError) {
      setError(getAuthErrorMessage(registerError))
      setIsPending(false)
    }
  }

  return (
    <section className="auth-page" aria-labelledby="register-title">
      <div className="auth-card auth-card--register">
        <h1 id="register-title">Создайте аккаунт</h1>
        <p className="auth-card__lead">
          Один аккаунт для создания шаблонов и подготовки логотипов.
        </p>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field" htmlFor="register-email">
            <span className="field__label">Электронная почта</span>
            <input
              autoComplete="email"
              id="register-email"
              name="email"
              placeholder="name@company.ru"
              required
              type="email"
            />
          </label>
          <PasswordField
            autoComplete="new-password"
            hint="Минимум 8 символов."
            id="register-password"
            label="Пароль"
            name="password"
          />
          <PasswordField
            autoComplete="new-password"
            id="register-password-confirmation"
            label="Повторите пароль"
            name="passwordConfirmation"
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? 'Создаём аккаунт…' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="legal-copy">
          Создавая аккаунт, вы принимаете условия сервиса и политику конфиденциальности.
        </p>
        <p className="planned-links" aria-label="Юридические документы">
          <span>Условия сервиса</span>
          <span>Конфиденциальность</span>
        </p>
        <p className="auth-card__switch">
          Уже есть аккаунт? <Link to={routePaths.login}>Войти</Link>
        </p>
      </div>
      <p className="auth-page__note">
        Для подготовки логотипа по ссылке организатора<br />регистрация не требуется.
      </p>
    </section>
  )
}
