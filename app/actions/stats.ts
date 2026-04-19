'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type StatInput = {
  userId: string
  goals: number
  assists: number
  keyPasses: number
  shotsTaken: number
  shotsOnTarget: number
  fouls: number
  saves: number
  yellowCard: boolean
  redCard: boolean
}

export async function upsertStats(
  matchId: string,
  playerStats: StatInput[]
): Promise<{ error: string } | { ok: true }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match)                    return { error: 'Match not found' }
    if (match.creatorId !== user.id) return { error: 'Not authorised' }

    const now           = new Date()
    const editWindowEnd = new Date(match.endTime.getTime() + 48 * 60 * 60 * 1000)

    if (now < match.endTime) return { error: 'Match not finished yet' }
    if (now > editWindowEnd) return { error: 'Stats editing window has closed (48hrs after match)' }

    await prisma.$transaction(
      playerStats.map(({ userId, ...stats }) =>
        prisma.matchStat.upsert({
          where:  { matchId_userId: { matchId, userId } },
          create: { matchId, userId, ...stats },
          update: { ...stats },
        })
      )
    )

    revalidatePath(`/matches/${matchId}/stats`)
    revalidatePath(`/matches/${matchId}`)
    return { ok: true }
  } catch {
    return { error: 'Failed to save stats. Please try again.' }
  }
}
