'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
}): Promise<{ error: string } | never> {
  const me = await getCurrentUser()
  if (!me) return { error: 'Unauthorized' }

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

  let matchId: string
  try {
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
        players: { create: { userId: me.id, response: 'CONFIRMED' } },
      },
    })
    revalidatePath('/')
    matchId = match.id
  } catch {
    return { error: 'Failed to create match. Please try again.' }
  }

  redirect(`/matches/${matchId}`)
}

export async function respondToMatch(
  matchId: string,
  action: 'CONFIRMED' | 'OPTED_OUT'
): Promise<{ error: string } | { ok: true }> {
  try {
    const me = await getCurrentUser()
    if (!me) return { error: 'Unauthorized' }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match)                        return { error: 'Match not found' }
    if (match.status !== 'UPCOMING')   return { error: 'Match is no longer open' }
    if (new Date() >= match.confirmBy) return { error: 'Confirm window has closed' }

    await prisma.matchPlayer.upsert({
      where:  { matchId_userId: { matchId, userId: me.id } },
      create: { matchId, userId: me.id, response: action },
      update: { response: action },
    })

    revalidatePath('/')
    revalidatePath(`/matches/${matchId}`)
    return { ok: true }
  } catch {
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function cancelMatch(matchId: string): Promise<{ error: string } | { ok: true }> {
  try {
    const me = await getCurrentUser()
    if (!me) return { error: 'Unauthorized' }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match)                    return { error: 'Match not found' }
    if (match.creatorId !== me.id) return { error: 'Not authorised' }

    await prisma.match.update({ where: { id: matchId }, data: { status: 'CANCELLED' } })

    revalidatePath('/')
    revalidatePath(`/matches/${matchId}`)
    return { ok: true }
  } catch {
    return { error: 'Something went wrong. Please try again.' }
  }
}
