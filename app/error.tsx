'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className={buttonVariants({ size: 'sm' })}>
            Try again
          </button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
