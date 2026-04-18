import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return Response.json({ users: [] })

  const candidates = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: me.id } },
        {
          OR: [
            { username:    { contains: q, mode: 'insensitive' } },
            { email:       { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: 10,
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  })

  if (candidates.length === 0) return Response.json({ users: [] })

  const targetIds = candidates.map(u => u.id)

  const [requests, friendships] = await Promise.all([
    prisma.friendRequest.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { senderId: me.id,              receiverId: { in: targetIds } },
          { senderId: { in: targetIds },  receiverId: me.id },
        ],
      },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: me.id,             userBId: { in: targetIds } },
          { userAId: { in: targetIds }, userBId: me.id },
        ],
      },
    }),
  ])

  const friendSet   = new Set(friendships.flatMap(f => [f.userAId, f.userBId]).filter(id => id !== me.id))
  const sentMap     = new Map(requests.filter(r => r.senderId   === me.id).map(r => [r.receiverId, r.id]))
  const receivedMap = new Map(requests.filter(r => r.receiverId === me.id).map(r => [r.senderId,   r.id]))

  const users = candidates.map(u => ({
    ...u,
    status: friendSet.has(u.id)
      ? 'friends'
      : sentMap.has(u.id)
      ? 'sent'
      : receivedMap.has(u.id)
      ? 'received'
      : 'none',
    requestId: sentMap.get(u.id) ?? receivedMap.get(u.id) ?? null,
  }))

  return Response.json({ users })
}
