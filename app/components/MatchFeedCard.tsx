'use client'

import { useState } from 'react'
import Link from 'next/link'
import { respondToMatch } from '@/app/actions/matches'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Users, Coins } from 'lucide-react'
import { toIST } from '@/lib/time'

type Props = {
  match: {
    id: string
    title: string
    location: string
    format: number
    pricePerHead: string
    startTime: string
    endTime: string
    confirmBy: string
    status: string
  }
  creator: { displayName: string }
  confirmedCount: number
  myResponse: 'CONFIRMED' | 'OPTED_OUT' | 'PENDING' | null
  windowOpen: boolean
}

export default function MatchFeedCard({ match, creator, confirmedCount, myResponse, windowOpen }: Props) {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(myResponse)

  async function handle(action: 'CONFIRMED' | 'OPTED_OUT') {
    setLoading(true)
    const res = await respondToMatch(match.id, action)
    if (!('error' in res)) setResponse(action)
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <Link href={`/matches/${match.id}`} className="font-semibold text-base hover:text-primary transition-colors">
              {match.title}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">by {creator.displayName}</p>
          </div>
          <Badge variant="secondary">{match.format}v{match.format}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {toIST(match.startTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {match.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {confirmedCount} confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            £{match.pricePerHead}/head
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!windowOpen && (
            <span className="text-xs text-muted-foreground">Confirm window closed</span>
          )}
          {windowOpen && response === 'CONFIRMED' && (
            <>
              <Badge className="bg-green-100 text-green-800 border-green-200">You&apos;re in ✓</Badge>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => handle('OPTED_OUT')}>
                Opt out
              </Button>
            </>
          )}
          {windowOpen && response === 'OPTED_OUT' && (
            <>
              <Badge variant="secondary">Opted out</Badge>
              <Button size="sm" disabled={loading} onClick={() => handle('CONFIRMED')}>
                Join
              </Button>
            </>
          )}
          {windowOpen && (response === 'PENDING' || response === null) && (
            <Button size="sm" disabled={loading} onClick={() => handle('CONFIRMED')}>
              {loading ? '…' : 'Join'}
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="ml-auto">
            <Link href={`/matches/${match.id}`}>Details →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
