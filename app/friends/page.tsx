import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import FriendsList from './components/FriendsList'
import IncomingRequests from './components/IncomingRequests'

export default async function FriendsPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  const [friendships, incoming] = await Promise.all([
    prisma.friendship.findMany({
      where:   { OR: [{ userAId: me.id }, { userBId: me.id }] },
      include: { userA: true, userB: true },
    }).catch(() => []),
    prisma.friendRequest.findMany({
      where:   { receiverId: me.id, status: 'PENDING' },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
  ])

  const friends = friendships.map(f => (f.userAId === me.id ? f.userB : f.userA))

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Friends</h1>
          <Button asChild size="sm">
            <Link href="/friends/search">+ Add Friends</Link>
          </Button>
        </div>

        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Incoming Requests ({incoming.length})
            </h2>
            <IncomingRequests requests={incoming} />
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Your Friends ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No friends yet.{' '}
                <Link href="/friends/search" className="text-primary hover:underline">
                  Search for people to add.
                </Link>
              </CardContent>
            </Card>
          ) : (
            <FriendsList friends={friends} />
          )}
        </section>
      </main>
    </>
  )
}
