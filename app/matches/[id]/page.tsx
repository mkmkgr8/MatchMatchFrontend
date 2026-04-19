import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Clock, Users, Coins, Camera, BarChart2, Star } from 'lucide-react'
import { toIST } from '@/lib/time'
import JoinOptOutButtons from './components/JoinOptOutButtons'
import CancelMatchButton from './components/CancelMatchButton'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  UPCOMING:  'default',
  ONGOING:   'secondary',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  const match = await prisma.match.findUnique({
    where:   { id: params.id },
    include: {
      creator: true,
      players: { include: { user: true }, orderBy: { joinedAt: 'asc' } },
      photos:  { take: 1 },
    },
  })
  if (!match) notFound()

  const now = new Date()

  if (match.status === 'UPCOMING' && now > match.endTime) {
    await prisma.match.update({ where: { id: params.id }, data: { status: 'COMPLETED' } }).catch(() => null)
    match.status = 'COMPLETED'
  }

  const myPlayer      = match.players.find(p => p.userId === me.id)
  const isCreator     = match.creatorId === me.id
  const windowOpen    = now < match.confirmBy && match.status === 'UPCOMING'
  const ratingOpen    = now >= match.endTime && now <= match.ratingWindowEnd
  const statsEditable = isCreator && now >= match.endTime && now <= new Date(match.endTime.getTime() + 48 * 60 * 60 * 1000)
  const isConfirmed   = myPlayer?.response === 'CONFIRMED'

  const confirmed  = match.players.filter(p => p.response === 'CONFIRMED')
  const pending    = match.players.filter(p => p.response === 'PENDING')
  const optedOut   = match.players.filter(p => p.response === 'OPTED_OUT')

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{match.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">by {match.creator.displayName}</p>
          </div>
          <Badge variant={statusVariant[match.status]}>{match.status}</Badge>
        </div>

        {/* Info */}
        <Card>
          <CardContent className="p-5 grid grid-cols-2 gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {toIST(match.startTime)}
              {' → '}
              {toIST(match.endTime)}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {match.location}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {match.format}v{match.format} · {confirmed.length} confirmed
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4" />
              £{match.pricePerHead.toString()}/head
            </span>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {windowOpen && (
            <JoinOptOutButtons
              matchId={match.id}
              currentResponse={myPlayer?.response ?? null}
            />
          )}
          {!windowOpen && match.status === 'UPCOMING' && (
            <p className="text-sm text-muted-foreground">Confirm window has closed.</p>
          )}
          {isCreator && match.status === 'UPCOMING' && (
            <CancelMatchButton matchId={match.id} />
          )}
          {isConfirmed && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/matches/${match.id}/photos`}>
                <Camera className="h-4 w-4 mr-1" /> Photos
              </Link>
            </Button>
          )}
          {statsEditable && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/matches/${match.id}/stats`}>
                <BarChart2 className="h-4 w-4 mr-1" /> Stats
              </Link>
            </Button>
          )}
          {ratingOpen && isConfirmed && (
            <Button asChild size="sm">
              <Link href={`/matches/${match.id}/rate`}>
                <Star className="h-4 w-4 mr-1" /> Rate Players
              </Link>
            </Button>
          )}
        </div>

        {/* Players */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Players</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            {confirmed.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Confirmed ({confirmed.length})</p>
                <div className="space-y-2">
                  {confirmed.map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.user.avatarUrl ?? undefined} />
                        <AvatarFallback>{p.user.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <Link href={`/profile/${p.userId}`} className="text-sm hover:text-primary transition-colors">
                        {p.user.displayName}
                        {p.userId === match.creatorId && <span className="ml-1 text-xs text-muted-foreground">(creator)</span>}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Pending ({pending.length})</p>
                <div className="space-y-2">
                  {pending.map(p => (
                    <div key={p.id} className="flex items-center gap-3 opacity-60">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.user.avatarUrl ?? undefined} />
                        <AvatarFallback>{p.user.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.user.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {optedOut.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Opted out ({optedOut.length})</p>
                <div className="space-y-2">
                  {optedOut.map(p => (
                    <div key={p.id} className="flex items-center gap-3 opacity-40 line-through">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.user.avatarUrl ?? undefined} />
                        <AvatarFallback>{p.user.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.user.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos preview */}
        {match.photos.length > 0 && (
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/matches/${match.id}/photos`}>View Photos →</Link>
            </Button>
          </div>
        )}
      </main>
    </>
  )
}
