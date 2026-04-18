'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelMatch } from '@/app/actions/matches'
import { Button } from '@/components/ui/button'

export default function CancelMatchButton({ matchId }: { matchId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    if (!confirm('Cancel this match? This cannot be undone.')) return
    setLoading(true)
    await cancelMatch(matchId)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button variant="destructive" size="sm" disabled={loading} onClick={handle}>
      {loading ? '…' : 'Cancel Match'}
    </Button>
  )
}
