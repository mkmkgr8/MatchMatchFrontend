import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { auth } from '@clerk/nextjs/server'
import MatchFeedCard from './components/MatchFeedCard'

export default async function FeedPage() {
  const { userId: clerkId } = auth()

  if (!clerkId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-4xl font-bold text-primary mb-3">MatchMatch</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Organise football matches with your friends.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
  }).catch(() => [])
  const friendIds = friendships.map(f => (f.userAId === me.id ? f.userBId : f.userAId))
  const visibleCreatorIds = [...friendIds, me.id]

  const include = {
    creator: true,
    players: { include: { user: true } },
  } as const

  const [upcomingMatches, completedMatches] = await Promise.all([
    prisma.match.findMany({
      where: {
        creatorId: { in: visibleCreatorIds },
        status:    'UPCOMING',
        startTime: { gte: new Date() },
        players:   { none: { userId: me.id, response: 'OPTED_OUT' } },
      },
      orderBy: { startTime: 'asc' },
      include,
    }).catch(() => []),

    prisma.match.findMany({
      where: {
        creatorId: { in: visibleCreatorIds },
        status:    'COMPLETED',
      },
      orderBy: { startTime: 'desc' },
      include,
    }).catch(() => []),
  ])

  function toCard(match: typeof upcomingMatches[number]) {
    const myPlayer  = match.players.find(p => p.userId === me!.id)
    const confirmed = match.players.filter(p => p.response === 'CONFIRMED').length
    const windowOpen = new Date() < match.confirmBy

    return (
      <MatchFeedCard
        key={match.id}
        match={{
          id:           match.id,
          title:        match.title,
          location:     match.location,
          format:       match.format,
          pricePerHead: match.pricePerHead.toString(),
          startTime:    match.startTime.toISOString(),
          endTime:      match.endTime.toISOString(),
          confirmBy:    match.confirmBy.toISOString(),
          status:       match.status,
        }}
        creator={{ displayName: match.creator.displayName }}
        confirmedCount={confirmed}
        myResponse={myPlayer?.response ?? null}
        windowOpen={windowOpen}
      />
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* Upcoming */}
        <section>
          <h2 className="text-xl font-bold mb-4">Upcoming</h2>

          {friendIds.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground mb-4">Add friends to see their matches here.</p>
                <Button asChild>
                  <Link href="/friends/search">Find Friends</Link>
                </Button>
              </CardContent>
            </Card>
          ) : upcomingMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming matches.</p>
          ) : (
            <div className="space-y-4">{upcomingMatches.map(toCard)}</div>
          )}
        </section>

        {/* Completed */}
        <section>
          <h2 className="text-xl font-bold mb-4">Recent matches</h2>

          {completedMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent matches.</p>
          ) : (
            <div className="space-y-4">{completedMatches.map(toCard)}</div>
          )}
        </section>

      </main>
    </>
  )
}
