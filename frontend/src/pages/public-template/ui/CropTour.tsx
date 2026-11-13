import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'cropper-crop-tour-done'

const HINTS = [
  {
    target: 'frame',
    text: 'Это рамка обрезки: всё, что за ней, в файл не попадёт. Тяните за углы или двигайте рамку целиком.',
  },
  {
    target: 'auto',
    text: 'Автообрезка сама находит края логотипа и убирает пустые поля. Нажмите, если сбили рамку.',
  },
  {
    target: 'apply',
    text: 'Когда рамка на месте, примените обрезку. Потом логотип разместится на плашке.',
  },
]

function wasShown(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return true
  }
}

export function CropTour() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(() => (wasShown() ? -1 : 0))
  const [box, setBox] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ height: 0, width: 0 })
  const hint = HINTS[index]

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
      const rect = target?.getBoundingClientRect()
      // на больших экранах страница увеличена через zoom, а позиции внутри неё задаются до увеличения
      const zoom = document.documentElement.currentCSSZoom ?? 1
      setBox(
        rect
          ? new DOMRect(rect.x / zoom, rect.y / zoom, rect.width / zoom, rect.height / zoom)
          : null,
      )
      setViewport({ height: globalThis.innerHeight / zoom, width: globalThis.innerWidth / zoom })
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
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // без localStorage подсказка покажется ещё раз, это не мешает работе
    }
    setIndex(-1)
  }

  const isLast = index === HINTS.length - 1
  const below = box ? box.bottom + 190 < viewport.height : true

  return (
    <dialog aria-label="Подсказка по обрезке" className="crop-tour" onClose={finish} ref={dialogRef}>
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
        <p className="crop-tour__count">Шаг {index + 1} из {HINTS.length}</p>
        <p>{hint.text}</p>
        <div className="crop-tour__actions">
          <button
            className="primary-button"
            onClick={() => (isLast ? finish() : setIndex(index + 1))}
            type="button"
          >
            {isLast ? 'Понятно' : 'Далее'}
          </button>
          <button onClick={finish} type="button">Пропустить</button>
        </div>
      </div>
    </dialog>
  )
}
