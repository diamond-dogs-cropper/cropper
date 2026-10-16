import { Link } from 'react-router-dom'
import { routePaths } from '../../../app/router/routePaths'
import { PasswordField } from '../../../shared/ui/PasswordField'

export function Component() {
  return (
    <section className="auth-page" aria-labelledby="register-title">
      <div className="auth-card auth-card--register">
        <h1 id="register-title">Создайте аккаунт</h1>
        <p className="auth-card__lead">
          Один аккаунт для создания шаблонов и подготовки логотипов.
        </p>
        <form className="auth-form">
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
          <button className="primary-button" type="submit">Создать аккаунт</button>
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
