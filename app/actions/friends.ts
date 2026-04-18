'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { orderedPair } from '@/lib/friendship'
import { getCurrentUser } from '@/lib/auth'

async function getMe() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function sendFriendRequest(targetUserId: string) {
  const me = await getMe()

  const [userAId, userBId] = orderedPair(me.id, targetUserId)

  const [existingRequest, existingFriendship] = await Promise.all([
    prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: me.id,       receiverId: targetUserId },
          { senderId: targetUserId, receiverId: me.id },
        ],
      },
    }),
    prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    }),
  ])

  if (existingFriendship) return { error: 'Already friends' }
  if (existingRequest)    return { error: 'Request already exists' }

  await prisma.friendRequest.create({
    data: { senderId: me.id, receiverId: targetUserId },
  })

  revalidatePath('/friends')
  return { ok: true }
}

export async function respondToRequest(requestId: string, action: 'ACCEPTED' | 'REJECTED') {
  const me = await getMe()

  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })

  if (!request || request.receiverId !== me.id) return { error: 'Not found' }
  if (request.status !== 'PENDING')             return { error: 'Already resolved' }

  await prisma.friendRequest.update({
    where: { id: requestId },
    data:  { status: action },
  })

  if (action === 'ACCEPTED') {
    const [userAId, userBId] = orderedPair(me.id, request.senderId)
    await prisma.friendship.create({ data: { userAId, userBId } })
  }

  revalidatePath('/friends')
  return { ok: true }
}
