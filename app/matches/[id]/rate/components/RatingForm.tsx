'use client'

import { useState } from 'react'
import Image from 'next/image'
import { submitRatings } from '@/app/actions/ratings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Player = {
  id: string
  displayName: string
  avatarUrl: string | null
  currentScore: number | null
}

export default function RatingForm({ matchId, players }: { matchId: string; players: Player[] }) {
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(players.map(p => [p.id, p.currentScore?.toString() ?? '']))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const ratings = players
      .map(p => ({ ratedId: p.id, score: parseInt(scores[p.id] ?? '') }))
      .filter(r => !isNaN(r.score))

    if (ratings.length === 0) {
      setError('Enter at least one score.')
      setLoading(false)
      return
    }

    const res = await submitRatings(matchId, ratings)
    if ('error' in res) {
      setError(res.error)
    } else {
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {players.map(p => (
        <div key={p.id} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {p.avatarUrl ? (
              <Image src={p.avatarUrl} alt={p.displayName} width={36} height={36} className="rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                {p.displayName[0]}
              </div>
            )}
            <span className="text-sm font-medium">{p.displayName}</span>
          </div>
          <Input
            type="number"
            min={1}
            max={10}
            placeholder="1–10"
            value={scores[p.id]}
            onChange={e => setScores(prev => ({ ...prev, [p.id]: e.target.value }))}
            className="w-20 text-center"
          />
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-primary">Ratings saved ✓</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving…' : 'Save Ratings'}
      </Button>
    </form>
  )
}
