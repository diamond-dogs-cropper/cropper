import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { PasswordField } from '../../../shared/ui/PasswordField'

export function Component() {
  return (
    <section className="auth-page" aria-labelledby="login-title">
      <div className="auth-card">
        <h1 id="login-title">Войдите в аккаунт</h1>
        <p className="auth-card__lead">
          Создавайте шаблоны и готовьте логотипы в едином формате.
        </p>
        <form className="auth-form">
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
          <div className="auth-form__options">
            <label className="checkbox">
              <input name="remember" type="checkbox" />
              <span>Запомнить меня</span>
            </label>
            <span className="disabled-link" title="Маршрут будет добавлен вместе с восстановлением пароля">
              Забыли пароль?
            </span>
          </div>
          <button className="primary-button" type="submit">Войти</button>
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
