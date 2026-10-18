import { useAuth } from '../../../features/auth/model/useAuth'

export function AuthStateFallback() {
  const { refresh, state } = useAuth()

  if (state.status === 'loading') {
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
