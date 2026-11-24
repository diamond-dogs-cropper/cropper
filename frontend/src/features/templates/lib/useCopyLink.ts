import { useEffect, useState } from 'react'

export type CopyState = 'idle' | 'copied' | 'failed'

const RESET_DELAY = 2500

export function useCopyLink() {
  const [copy, setCopy] = useState<CopyState>('idle')

  useEffect(() => {
    const timer = copy === 'idle' ? undefined : setTimeout(() => setCopy('idle'), RESET_DELAY)
    return () => clearTimeout(timer)
  }, [copy])

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return [copy, copyLink] as const
}
