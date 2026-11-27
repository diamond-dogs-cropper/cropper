import { useCallback, useRef, useState } from 'react'
import { IconButton } from './IconButton'
import { MoreIcon } from './icons'
import { useDismiss } from './useDismiss'

export interface MenuItem {
  label: string
  onSelect: () => void
  tone?: 'danger'
}

interface MenuProps {
  items: MenuItem[]
  label: string
  tooltip: string
}

export function Menu({ items, label, tooltip }: Readonly<MenuProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setIsOpen(false), [])

  useDismiss(ref, isOpen, close)

  return (
    <div className="menu" ref={ref}>
      <IconButton
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={isOpen ? 'menu__toggle--open' : undefined}
        data-tooltip={tooltip}
        label={label}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreIcon />
      </IconButton>
      {isOpen ? (
        <ul className="menu__list" role="menu">
          {items.map(item => (
            <li key={item.label} role="none">
              <button
                className={item.tone ? `menu__item menu__item--${item.tone}` : 'menu__item'}
                onClick={() => {
                  setIsOpen(false)
                  item.onSelect()
                }}
                role="menuitem"
                type="button"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
