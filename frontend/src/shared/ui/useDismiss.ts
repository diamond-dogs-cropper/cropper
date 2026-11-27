import { useEffect, type RefObject } from 'react'

export function useDismiss(ref: RefObject<HTMLElement | null>, isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const closeOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        close()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && close()
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [close, isOpen, ref])
}
