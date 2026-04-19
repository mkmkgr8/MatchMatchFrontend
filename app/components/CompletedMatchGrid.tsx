type GridPlayer = { userId: string; displayName: string }

type GridStat = {
  userId:     string
  goals:      number
  assists:    number
  fouls:      number
  yellowCard: boolean
  redCard:    boolean
}

type GridRating = { ratedId: string; raterId: string; score: number }

type Props = {
  players:     GridPlayer[]
  stats:       GridStat[]
  ratings:     GridRating[]
  ratingLabel: string
}

// Same algorithm as getEffectiveRatings but returns a single average for one player
function effectiveAvg(
  ratedId:    string,
  allPlayers: GridPlayer[],
  ratings:    GridRating[],
): number | null {
  const raters = allPlayers.filter(p => p.userId !== ratedId)
  if (raters.length === 0) return null

  const received = ratings.filter(r => r.ratedId === ratedId)
  if (received.length === 0) return null

  const submittedScores   = received.map(r => r.score)
  const submittedAvg      = submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length
  const defaultScore      = Math.ceil(submittedAvg)
  const submittedRaterIds = new Set(received.map(r => r.raterId))

  const allScores = raters.map(r =>
    submittedRaterIds.has(r.userId)
      ? received.find(s => s.raterId === r.userId)!.score
      : defaultScore
  )

  return allScores.reduce((a, b) => a + b, 0) / allScores.length
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

export default function CompletedMatchGrid({ players, stats, ratings, ratingLabel }: Props) {
  if (players.length === 0) return null

  const statsMap = new Map(stats.map(s => [s.userId, s]))
  const noStats  = stats.length === 0

  const avgMap = new Map<string, number | null>(
    players.map(p => [p.userId, effectiveAvg(p.userId, players, ratings)])
  )

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{ratingLabel}</p>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[460px]" style={{ fontSize: 12 }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>
                Player
              </th>
              <th className="py-2 px-2 w-10 text-center font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>G</th>
              <th className="py-2 px-2 w-10 text-center font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>A</th>
              <th className="py-2 px-2 w-14 text-center font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>Fouls</th>
              <th className="py-2 px-2 w-10 text-center font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>YC</th>
              <th className="py-2 px-2 w-10 text-center font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>RC</th>
              <th className="py-2 px-2 w-16 text-center font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 11 }}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const s       = statsMap.get(p.userId)
              const goals   = s?.goals      ?? 0
              const assists = s?.assists    ?? 0
              const fouls   = s?.fouls      ?? 0
              const yc      = s?.yellowCard ?? false
              const rc      = s?.redCard    ?? false
              const avg     = avgMap.get(p.userId) ?? null

              return (
                <tr
                  key={p.userId}
                  className="border-b last:border-0 hover:bg-secondary/30 transition-colors"
                  style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
                >
                  {/* Player */}
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="shrink-0 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground"
                        style={{ width: 22, height: 22, fontSize: 10 }}
                      >
                        {initials(p.displayName)}
                      </div>
                      <span>{firstName(p.displayName)}</span>
                    </div>
                  </td>

                  {/* Goals */}
                  <td className="py-1.5 px-2 text-center">
                    {goals > 0
                      ? <span style={{ color: '#27500A' }}>{goals}</span>
                      : <span className="text-muted-foreground">0</span>
                    }
                  </td>

                  {/* Assists */}
                  <td className="py-1.5 px-2 text-center">
                    {assists > 0
                      ? <span style={{ color: '#0C447C' }}>{assists}</span>
                      : <span className="text-muted-foreground">0</span>
                    }
                  </td>

                  {/* Fouls */}
                  <td className="py-1.5 px-2 text-center">
                    {fouls > 0
                      ? <span>{fouls}</span>
                      : <span className="text-muted-foreground">0</span>
                    }
                  </td>

                  {/* Yellow card */}
                  <td className="py-1.5 px-2 text-center">
                    {yc
                      ? (
                        <span
                          className="inline-flex items-center justify-center rounded font-semibold"
                          style={{ background: '#FAEEDA', color: '#633806', fontSize: 11, padding: '2px 6px' }}
                        >
                          Y
                        </span>
                      )
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>

                  {/* Red card */}
                  <td className="py-1.5 px-2 text-center">
                    {rc
                      ? (
                        <span
                          className="inline-flex items-center justify-center rounded font-semibold"
                          style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 11, padding: '2px 6px' }}
                        >
                          R
                        </span>
                      )
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>

                  {/* Rating */}
                  <td className="py-1.5 px-2 text-center">
                    {avg !== null
                      ? (
                        <span>
                          {(Math.round(avg * 10) / 10).toFixed(1)}{' '}
                          <span style={{ color: '#BA7517' }}>★</span>
                        </span>
                      )
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {noStats && (
          <p className="text-xs text-muted-foreground text-center py-2 border-t" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
            Stats not entered yet
          </p>
        )}
      </div>
    </div>
  )
}
