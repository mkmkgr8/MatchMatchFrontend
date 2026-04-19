import Link from 'next/link'
import { getEffectiveRatings } from '@/lib/ratings'
import { prisma } from '@/lib/prisma'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type User = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
  createdAt: Date
}

export default async function ProfileView({ user }: { user: User }) {
  const confirmedMatches = await prisma.matchPlayer.findMany({
    where:   { userId: user.id, response: 'CONFIRMED' },
    include: { match: true },
    orderBy: { match: { startTime: 'desc' } },
  }).catch(() => [])

  const stats = await prisma.matchStat.findMany({
    where:   { userId: user.id },
    include: { match: { select: { title: true, startTime: true } } },
    orderBy: { match: { startTime: 'desc' } },
  }).catch(() => [])

  const completedMatchIds = confirmedMatches
    .filter(mp => mp.match.status === 'COMPLETED' || new Date() > mp.match.endTime)
    .map(mp => mp.matchId)

  const ratingsData = (await Promise.allSettled(
    completedMatchIds.slice(0, 10).map(async matchId => {
      const match    = confirmedMatches.find(mp => mp.matchId === matchId)!.match
      const ratings  = await getEffectiveRatings(matchId, user.id).catch(() => [])
      const scores   = ratings.map(r => r.score).filter((s): s is number => s !== null)
      const avg      = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
      return { match, ratings, avg }
    })
  )).flatMap(r => r.status === 'fulfilled' ? [r.value] : [])

  const totalStats = stats.reduce(
    (acc, s) => ({
      goals:         acc.goals         + s.goals,
      assists:       acc.assists       + s.assists,
      keyPasses:     acc.keyPasses     + s.keyPasses,
      shotsTaken:    acc.shotsTaken    + s.shotsTaken,
      shotsOnTarget: acc.shotsOnTarget + s.shotsOnTarget,
      fouls:         acc.fouls         + s.fouls,
      saves:         acc.saves         + s.saves,
    }),
    { goals: 0, assists: 0, keyPasses: 0, shotsTaken: 0, shotsOnTarget: 0, fouls: 0, saves: 0 }
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xl">{user.displayName[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {confirmedMatches.length} match{confirmedMatches.length !== 1 ? 'es' : ''} played
          </p>
        </div>
      </div>

      {/* Aggregate Stats */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Career Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-4 text-center">
              {[
                { label: 'Goals',   value: totalStats.goals },
                { label: 'Assists', value: totalStats.assists },
                { label: 'KP',      value: totalStats.keyPasses },
                { label: 'Shots',   value: totalStats.shotsTaken },
                { label: 'SoT',     value: totalStats.shotsOnTarget },
                { label: 'Fouls',   value: totalStats.fouls },
                { label: 'Saves',   value: totalStats.saves },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings per match */}
      {ratingsData.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Ratings Received</h2>
          <div className="space-y-3">
            {ratingsData.map(({ match, ratings, avg }) => (
              <Card key={match.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Link href={`/matches/${match.id}`} className="font-medium text-sm hover:text-primary transition-colors">
                        {match.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(match.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {avg !== null && (
                      <Badge variant="secondary" className="text-base font-bold px-3">
                        {avg.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {ratings.map(r => (
                      <div key={r.raterId} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {r.raterName}
                          {r.isDefault && <span className="text-xs ml-1">(default)</span>}
                        </span>
                        <span className="font-medium">
                          {r.score !== null ? r.score : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Per-match stats */}
      {stats.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Match Stats</h2>
          <div className="space-y-2">
            {stats.map(s => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/matches/${s.matchId}`} className="font-medium text-sm hover:text-primary transition-colors">
                      {s.match.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.match.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {s.goals         > 0 && <span>{s.goals}G</span>}
                    {s.assists       > 0 && <span>{s.assists}A</span>}
                    {s.keyPasses     > 0 && <span>{s.keyPasses}KP</span>}
                    {s.shotsTaken    > 0 && <span>{s.shotsTaken}Sh</span>}
                    {s.shotsOnTarget > 0 && <span>{s.shotsOnTarget}SoT</span>}
                    {s.fouls         > 0 && <span>{s.fouls}F</span>}
                    {s.saves         > 0 && <span>{s.saves}Sv</span>}
                    {s.yellowCard && <Badge variant="outline" className="text-yellow-600 border-yellow-400 py-0">Y</Badge>}
                    {s.redCard    && <Badge variant="outline" className="text-red-600 border-red-400 py-0">R</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {confirmedMatches.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">No matches played yet.</p>
      )}
    </div>
  )
}
