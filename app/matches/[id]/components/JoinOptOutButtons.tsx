'use client'

import { useState } from 'react'
import { respondToMatch } from '@/app/actions/matches'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  matchId: string
  currentResponse: 'CONFIRMED' | 'OPTED_OUT' | 'PENDING' | null
}

export default function JoinOptOutButtons({ matchId, currentResponse }: Props) {
  const [response, setResponse] = useState(currentResponse)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handle(action: 'CONFIRMED' | 'OPTED_OUT') {
    setLoading(true)
    setError(null)
    const res = await respondToMatch(matchId, action)
    if ('error' in res) {
      setError(res.error)
    } else {
      setResponse(action)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {response === 'CONFIRMED' ? (
        <>
          <Badge className="bg-green-100 text-green-800 border-green-200">You&apos;re in ✓</Badge>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => handle('OPTED_OUT')}>
            {loading ? '…' : 'Opt out'}
          </Button>
        </>
      ) : response === 'OPTED_OUT' ? (
        <>
          <Badge variant="secondary">Opted out</Badge>
          <Button size="sm" disabled={loading} onClick={() => handle('CONFIRMED')}>
            {loading ? '…' : 'Join'}
          </Button>
        </>
      ) : (
        <Button size="sm" disabled={loading} onClick={() => handle('CONFIRMED')}>
          {loading ? '…' : 'Join Match'}
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
