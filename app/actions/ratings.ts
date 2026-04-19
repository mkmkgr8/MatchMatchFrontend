'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function submitRatings(
  matchId: string,
  ratings: { ratedId: string; score: number }[]
): Promise<{ error: string } | { ok: true }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) return { error: 'Match not found' }

    const now = new Date()
    if (now < match.endTime)         return { error: 'Match not finished yet' }
    if (now > match.ratingWindowEnd) return { error: 'Rating window has closed' }

    const player = await prisma.matchPlayer.findUnique({
      where: { matchId_userId: { matchId, userId: user.id } },
    })
    if (!player || player.response !== 'CONFIRMED') {
      return { error: 'Not a confirmed player in this match' }
    }

    for (const { score } of ratings) {
      if (score < 1 || score > 10) return { error: 'Score must be between 1 and 10' }
    }

    await prisma.$transaction(
      ratings.map(({ ratedId, score }) =>
        prisma.rating.upsert({
          where:  { matchId_raterId_ratedId: { matchId, raterId: user.id, ratedId } },
          create: { matchId, raterId: user.id, ratedId, score },
          update: { score },
        })
      )
    )

    revalidatePath(`/matches/${matchId}/rate`)
    revalidatePath('/profile')
    return { ok: true }
  } catch {
    return { error: 'Failed to save ratings. Please try again.' }
  }
}
