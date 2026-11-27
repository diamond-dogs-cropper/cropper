import { useCallback, useState } from 'react'
import { Dialog } from './Dialog'

export interface ConfirmOptions {
  action: string
  message: string
  title: string
  tone?: 'danger'
}

type ConfirmRequest = ConfirmOptions & { resolve: (isConfirmed: boolean) => void }

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>(resolve => setRequest({ ...options, resolve })),
    [],
  )

  function finish(isConfirmed: boolean) {
    request?.resolve(isConfirmed)
    setRequest(null)
  }

  const dialog = request ? (
    <Dialog onClose={() => finish(false)} title={request.title}>
      <p className="confirm-dialog__message">{request.message}</p>
      <div className="dialog__actions">
        <button className="outline-button" onClick={() => finish(false)} type="button">
          Отмена
        </button>
        <button
          className={request.tone === 'danger' ? 'primary-button primary-button--danger' : 'primary-button'}
          onClick={() => finish(true)}
          type="button"
        >
          {request.action}
        </button>
      </div>
    </Dialog>
  ) : null

  return [confirm, dialog] as const
}
