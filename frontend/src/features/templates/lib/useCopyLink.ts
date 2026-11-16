import { useEffect, useState } from 'react'

export type CopyState = 'idle' | 'copied' | 'failed'

export function useCopyLink() {
  const [copy, setCopy] = useState<CopyState>('idle')

  useEffect(() => {
    if (copy === 'idle') {
      return
    }

    const timer = setTimeout(() => setCopy('idle'), 2500)
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
