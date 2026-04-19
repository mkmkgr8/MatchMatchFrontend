'use client'

import { useEffect } from 'react'
import { buttonVariants } from '@/components/ui/button'

export default function FriendsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="max-w-md mx-auto px-4 py-20 text-center">
      <h2 className="text-lg font-semibold mb-2">Could not load friends</h2>
      <p className="text-sm text-muted-foreground mb-6">
        There was a problem loading your friends list. Please try again.
      </p>
      <button onClick={reset} className={buttonVariants({ size: 'sm' })}>
        Try again
      </button>
    </main>
  )
}
