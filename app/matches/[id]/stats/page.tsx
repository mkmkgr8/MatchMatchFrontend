import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatsForm from './components/StatsForm'

export default async function StatsPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  const match = await prisma.match.findUnique({
    where:   { id: params.id },
    include: {
      players: {
        where:   { response: 'CONFIRMED' },
        include: { user: true },
      },
      stats: true,
    },
  })
  if (!match) notFound()
  if (match.creatorId !== me.id) redirect(`/matches/${params.id}`)

  const now           = new Date()
  const editWindowEnd = new Date(match.endTime.getTime() + 48 * 60 * 60 * 1000)

  if (now < match.endTime) {
    return <ClosedPage message="Match hasn't ended yet." matchId={params.id} />
  }
  if (now > editWindowEnd) {
    return <ClosedPage message="Stats editing window has closed (48hrs after match end)." matchId={params.id} />
  }

  const statsMap = new Map(match.stats.map(s => [s.userId, s]))

  const players = match.players.map(p => ({
    id:           p.userId,
    displayName:  p.user.displayName,
    avatarUrl:    p.user.avatarUrl,
    currentStats: statsMap.get(p.userId) ?? null,
  }))

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/matches/${params.id}`}>← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold">Enter Stats</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{match.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsForm matchId={params.id} players={players} />
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
