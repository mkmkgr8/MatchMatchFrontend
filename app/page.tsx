import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock, Users, DollarSign } from 'lucide-react'
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
  if (!me) redirect('/sign-in') // only reachable if DB is down

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
  })
  const friendIds = friendships.map(f => (f.userAId === me.id ? f.userBId : f.userAId))

  const matches = friendIds.length === 0 ? [] : await prisma.match.findMany({
    where: {
      creatorId: { in: friendIds },
      status:    'UPCOMING',
      startTime: { gte: new Date() },
      players:   { none: { userId: me.id, response: 'OPTED_OUT' } },
    },
    orderBy: { startTime: 'asc' },
    include: {
      creator: true,
      players: { include: { user: true } },
    },
  })

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Upcoming Matches</h1>

        {friendIds.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Add friends to see their matches here.</p>
              <Button asChild>
                <Link href="/friends/search">Find Friends</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {friendIds.length > 0 && matches.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No upcoming matches from your friends.</p>
              <Button asChild>
                <Link href="/matches/new">Create a Match</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {matches.map(match => {
            const myPlayer = match.players.find(p => p.userId === me.id)
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
          })}
        </div>
      </main>
    </>
  )
}
