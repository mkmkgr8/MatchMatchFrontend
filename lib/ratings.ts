import { prisma } from '@/lib/prisma'

export async function getEffectiveRatings(matchId: string, ratedId: string) {
  const [confirmedPlayers, submitted] = await Promise.all([
    prisma.matchPlayer.findMany({
      where: { matchId, response: 'CONFIRMED', userId: { not: ratedId } },
      include: { user: true },
    }),
    prisma.rating.findMany({
      where: { matchId, ratedId },
      include: { rater: true },
    }),
  ])

  const submittedMap = new Map(submitted.map(r => [r.raterId, r]))
  const scores       = submitted.map(r => r.score)
  const avg          = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const defaultScore = avg !== null ? Math.ceil(avg) : null

  return confirmedPlayers.map(p => ({
    raterId:   p.userId,
    raterName: p.user.displayName,
    score:     submittedMap.has(p.userId) ? submittedMap.get(p.userId)!.score : defaultScore,
    isDefault: !submittedMap.has(p.userId),
  }))
}
