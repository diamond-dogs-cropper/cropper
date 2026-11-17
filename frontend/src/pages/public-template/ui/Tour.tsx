import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface TourHint {
  target: string
  text: string
}

interface TourProps {
  hints: TourHint[]
  isForced?: boolean
  label: string
  storageKey: string
}

function wasShown(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) !== null
  } catch {
    return true
  }
}

export function Tour({ hints, isForced = false, label, storageKey }: Readonly<TourProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(() => (isForced || !wasShown(storageKey) ? 0 : -1))
  const [box, setBox] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ height: 0, width: 0 })
  const hint = hints[index]

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [hint])

  useLayoutEffect(() => {
    if (!hint) {
      return
    }

    const target = document.querySelector(`[data-tour="${hint.target}"]`)
    target?.scrollIntoView({ block: 'nearest' })

    const measure = () => {
      setBox(target?.getBoundingClientRect() ?? null)
      setViewport({ height: globalThis.innerHeight, width: globalThis.innerWidth })
    }
    const options = { capture: true, passive: true }

    measure()
    globalThis.addEventListener('resize', measure)
    globalThis.addEventListener('scroll', measure, options)
    return () => {
      globalThis.removeEventListener('resize', measure)
      globalThis.removeEventListener('scroll', measure, options)
    }
  }, [hint])

  if (!hint) {
    return null
  }

  function finish() {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // без localStorage подсказка покажется ещё раз, это не мешает работе
    }
    setIndex(-1)
  }

  const isLast = index === hints.length - 1
  const below = box ? box.bottom + 190 < viewport.height : true

  return (
    <dialog aria-label={label} className="crop-tour" onClose={finish} ref={dialogRef}>
      {box ? (
        <div
          className="crop-tour__spot"
          style={{ height: box.height + 16, left: box.left - 8, top: box.top - 8, width: box.width + 16 }}
        />
      ) : null}
      <div
        className="crop-tour__card"
        style={
          box
            ? {
                left: Math.max(16, Math.min(box.left, viewport.width - 336)),
                top: below ? box.bottom + 20 : Math.max(16, box.top - 190),
              }
            : undefined
        }
      >
        <p className="crop-tour__count">Шаг {index + 1} из {hints.length}</p>
        <p>{hint.text}</p>
        <div className="crop-tour__actions">
          <button
            className="primary-button"
            onClick={() => (isLast ? finish() : setIndex(index + 1))}
            type="button"
          >
            {isLast ? 'Понятно' : 'Далее'}
          </button>
          {index > 0 ? <button onClick={() => setIndex(index - 1)} type="button">Назад</button> : null}
          {isLast ? null : <button onClick={finish} type="button">Пропустить</button>}
        </div>
      </div>
    </dialog>
  )
}
