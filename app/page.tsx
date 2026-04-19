import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { auth } from '@clerk/nextjs/server'
import MatchFeedCard from './components/MatchFeedCard'
import CompletedMatchGrid from './components/CompletedMatchGrid'

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
    where:  { OR: [{ userAId: me.id }, { userBId: me.id }] },
    select: { userAId: true, userBId: true },
  }).catch(() => [])
  const friendIds = friendships.map(f => (f.userAId === me.id ? f.userBId : f.userAId))
  const visibleCreatorIds = [...friendIds, me.id]

  // Upcoming: players need only userId + response (for join/opt-out state)
  const upcomingMatchSelect = {
    id:           true,
    title:        true,
    location:     true,
    format:       true,
    pricePerHead: true,
    startTime:    true,
    endTime:      true,
    confirmBy:    true,
    status:       true,
    creator: { select: { displayName: true } },
    players: { select: { userId: true, response: true } },
  } as const

  // Completed: also needs ratingWindowEnd and player display names for the stats grid
  const completedMatchSelect = {
    id:              true,
    title:           true,
    location:        true,
    format:          true,
    pricePerHead:    true,
    startTime:       true,
    endTime:         true,
    confirmBy:       true,
    status:          true,
    ratingWindowEnd: true,
    creator: { select: { displayName: true } },
    players: {
      where:  { response: 'CONFIRMED' as const },
      select: { userId: true, response: true, user: { select: { displayName: true } } },
    },
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
      take:    20,
      select:  upcomingMatchSelect,
    }).catch(() => []),

    prisma.match.findMany({
      where: {
        creatorId: { in: visibleCreatorIds },
        status:    'COMPLETED',
      },
      orderBy: { startTime: 'desc' },
      take:    20,
      select:  completedMatchSelect,
    }).catch(() => []),
  ])

  // Batch-fetch stats + ratings for all completed matches in two queries
  const completedIds = completedMatches.map(m => m.id)
  const [allStats, allRatings] = completedIds.length === 0
    ? [[], []] as const
    : await Promise.all([
        prisma.matchStat.findMany({
          where:  { matchId: { in: completedIds } },
          select: { matchId: true, userId: true, goals: true, assists: true, fouls: true, yellowCard: true, redCard: true },
        }).catch(() => []),
        prisma.rating.findMany({
          where:  { matchId: { in: completedIds } },
          select: { matchId: true, ratedId: true, raterId: true, score: true },
        }).catch(() => []),
      ])

  function toCard(match: typeof upcomingMatches[number]) {
    const myPlayer   = match.players.find(p => p.userId === me!.id)
    const confirmed  = match.players.filter(p => p.response === 'CONFIRMED').length
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
            <div className="space-y-4">
              {completedMatches.map(m => {
                const myPlayer  = m.players.find(p => p.userId === me!.id)
                const confirmed = m.players.filter(p => p.response === 'CONFIRMED').length

                const matchStats = allStats
                  .filter(s => s.matchId === m.id)
                  .map(s => ({ userId: s.userId, goals: s.goals, assists: s.assists, fouls: s.fouls, yellowCard: s.yellowCard, redCard: s.redCard }))

                const matchRatings = allRatings
                  .filter(r => r.matchId === m.id)
                  .map(r => ({ ratedId: r.ratedId, raterId: r.raterId, score: r.score }))

                const gridPlayers = m.players.map(p => ({
                  userId:      p.userId,
                  displayName: p.user.displayName,
                }))

                return (
                  <div key={m.id} className="space-y-1">
                    <MatchFeedCard
                      match={{
                        id:           m.id,
                        title:        m.title,
                        location:     m.location,
                        format:       m.format,
                        pricePerHead: m.pricePerHead.toString(),
                        startTime:    m.startTime.toISOString(),
                        endTime:      m.endTime.toISOString(),
                        confirmBy:    m.confirmBy.toISOString(),
                        status:       m.status,
                      }}
                      creator={{ displayName: m.creator.displayName }}
                      confirmedCount={confirmed}
                      myResponse={myPlayer?.response ?? null}
                      windowOpen={false}
                    />
                    <CompletedMatchGrid
                      players={gridPlayers}
                      stats={matchStats}
                      ratings={matchRatings}
                      ratingWindowEnd={m.ratingWindowEnd}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </main>
    </>
  )
}
