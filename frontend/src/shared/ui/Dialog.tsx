import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './IconButton'
import { CloseIcon } from './icons'

interface DialogProps {
  children: ReactNode
  onClose: () => void
  title: string
}

export function Dialog({ children, onClose, title }: Readonly<DialogProps>) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    ref.current?.showModal()
    ref.current?.querySelector<HTMLElement>('input, textarea')?.focus()
  }, [])

  return (
    <dialog
      aria-labelledby={titleId}
      className="dialog"
      onClick={event => event.target === ref.current && onClose()}
      onClose={onClose}
      ref={ref}
    >
      <div className="dialog__head">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Закрыть" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      {children}
    </dialog>
  )
}
