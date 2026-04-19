'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function MatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="max-w-md mx-auto px-4 py-20 text-center">
      <h2 className="text-lg font-semibold mb-2">Could not load match</h2>
      <p className="text-sm text-muted-foreground mb-6">
        There was a problem fetching this match. Please try again.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={reset} className={buttonVariants({ size: 'sm' })}>
          Try again
        </button>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Back to feed
        </Link>
      </div>
    </main>
  )
}
