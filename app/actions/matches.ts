'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

async function getMe() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function createMatch(input: {
  title: string
  location: string
  format: number
  pricePerHead: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  confirmByTime: string | null
}) {
  const me = await getMe()

  const startTime = new Date(`${input.startDate}T${input.startTime}`)
  const endTime   = new Date(`${input.endDate}T${input.endTime}`)

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { error: 'Invalid date/time values' }
  }
  if (endTime <= startTime) {
    return { error: 'End time must be after start time' }
  }

  const confirmBy = input.confirmByTime
    ? new Date(`${input.startDate}T${input.confirmByTime}`)
    : new Date(startTime.getTime() - 3 * 60 * 60 * 1000)

  const ratingWindowEnd = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)

  const match = await prisma.match.create({
    data: {
      creatorId:    me.id,
      title:        input.title,
      location:     input.location,
      format:       input.format,
      pricePerHead: input.pricePerHead,
      startTime,
      endTime,
      confirmBy,
      ratingWindowEnd,
      status: 'UPCOMING',
      players: {
        create: { userId: me.id, response: 'CONFIRMED' },
      },
    },
  })

  revalidatePath('/')
  redirect(`/matches/${match.id}`)
}

export async function respondToMatch(matchId: string, action: 'CONFIRMED' | 'OPTED_OUT') {
  const me    = await getMe()
  const match = await prisma.match.findUnique({ where: { id: matchId } })

  if (!match) return { error: 'Match not found' }
  if (match.status !== 'UPCOMING') return { error: 'Match is no longer open' }
  if (new Date() >= match.confirmBy) return { error: 'Confirm window has closed' }

  await prisma.matchPlayer.upsert({
    where:  { matchId_userId: { matchId, userId: me.id } },
    create: { matchId, userId: me.id, response: action },
    update: { response: action },
  })

  revalidatePath('/')
  revalidatePath(`/matches/${matchId}`)
  return { ok: true }
}

export async function cancelMatch(matchId: string) {
  const me    = await getMe()
  const match = await prisma.match.findUnique({ where: { id: matchId } })

  if (!match) return { error: 'Match not found' }
  if (match.creatorId !== me.id) return { error: 'Not authorised' }

  await prisma.match.update({ where: { id: matchId }, data: { status: 'CANCELLED' } })

  revalidatePath('/')
  revalidatePath(`/matches/${matchId}`)
  return { ok: true }
}
