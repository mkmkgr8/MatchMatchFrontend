import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RatingForm from './components/RatingForm'

export default async function RatePage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  const match = await prisma.match.findUnique({
    where:   { id: params.id },
    include: {
      players: {
        where:   { response: 'CONFIRMED' },
        include: { user: true },
      },
    },
  })
  if (!match) notFound()

  const now = new Date()
  if (now < match.endTime)         return <ClosedPage message="Match hasn't ended yet." matchId={params.id} />
  if (now > match.ratingWindowEnd) return <ClosedPage message="Rating window has closed (24hrs after match end)." matchId={params.id} />

  const myPlayer = match.players.find(p => p.userId === me.id)
  if (!myPlayer || myPlayer.response !== 'CONFIRMED') {
    return <ClosedPage message="Only confirmed players can submit ratings." matchId={params.id} />
  }

  const others = match.players.filter(p => p.userId !== me.id)

  const existing = await prisma.rating.findMany({
    where: { matchId: params.id, raterId: me.id },
  })
  const existingMap = new Map(existing.map(r => [r.ratedId, r.score]))

  const players = others.map(p => ({
    id:          p.userId,
    displayName: p.user.displayName,
    avatarUrl:   p.user.avatarUrl,
    currentScore: existingMap.get(p.userId) ?? null,
  }))

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/matches/${params.id}`}>← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold">Rate Players</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Rate your teammates 1–10. You can update ratings until the window closes.
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{match.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingForm matchId={params.id} players={players} />
          </CardContent>
        </Card>
      </main>
    </>
  )
}

function ClosedPage({ message, matchId }: { message: string; matchId: string }) {
  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground mb-4">{message}</p>
        <Button asChild variant="outline">
          <Link href={`/matches/${matchId}`}>← Back to Match</Link>
        </Button>
      </main>
    </>
  )
}
