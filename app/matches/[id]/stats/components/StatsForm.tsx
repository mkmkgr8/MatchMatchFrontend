'use client'

import { useState } from 'react'
import Image from 'next/image'
import { upsertStats } from '@/app/actions/stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type StatFields = {
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

type Player = {
  id: string
  displayName: string
  avatarUrl: string | null
  currentStats: StatFields | null
}

const defaultStats = (): StatFields => ({
  goals: 0, assists: 0, keyPasses: 0,
  shotsTaken: 0, shotsOnTarget: 0,
  fouls: 0, saves: 0,
  yellowCard: false, redCard: false,
})

export default function StatsForm({ matchId, players }: { matchId: string; players: Player[] }) {
  const [stats, setStats] = useState<Record<string, StatFields>>(
    Object.fromEntries(players.map(p => [p.id, p.currentStats ?? defaultStats()]))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [saved, setSaved]     = useState(false)

  function update(playerId: string, field: keyof StatFields, value: number | boolean) {
    setStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const playerStats = players.map(p => ({ userId: p.id, ...stats[p.id] }))
    const res = await upsertStats(matchId, playerStats)

    if ('error' in res) {
      setError(res.error ?? 'Something went wrong')
    } else {
      setSaved(true)
    }
    setLoading(false)
  }

  const numFields: { key: keyof StatFields; label: string }[] = [
    { key: 'goals',         label: 'G' },
    { key: 'assists',       label: 'A' },
    { key: 'keyPasses',     label: 'KP' },
    { key: 'shotsTaken',    label: 'Sh' },
    { key: 'shotsOnTarget', label: 'SoT' },
    { key: 'fouls',         label: 'F' },
    { key: 'saves',         label: 'Sv' },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Player</th>
              {numFields.map(f => (
                <th key={f.key} className="text-center py-2 px-2 font-medium w-14">{f.label}</th>
              ))}
              <th className="text-center py-2 px-2 font-medium w-10">Y</th>
              <th className="text-center py-2 px-2 font-medium w-10">R</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    {p.avatarUrl ? (
                      <Image src={p.avatarUrl} alt={p.displayName} width={28} height={28} className="rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {p.displayName[0]}
                      </div>
                    )}
                    <span className="whitespace-nowrap">{p.displayName}</span>
                  </div>
                </td>
                {numFields.map(f => (
                  <td key={f.key} className="py-2 px-1">
                    <Input
                      type="number"
                      min={0}
                      value={stats[p.id][f.key] as number}
                      onChange={e => update(p.id, f.key, parseInt(e.target.value) || 0)}
                      className="w-14 text-center px-1"
                    />
                  </td>
                ))}
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={stats[p.id].yellowCard}
                    onChange={e => update(p.id, 'yellowCard', e.target.checked)}
                    className="h-4 w-4 accent-yellow-400"
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={stats[p.id].redCard}
                    onChange={e => update(p.id, 'redCard', e.target.checked)}
                    className="h-4 w-4 accent-red-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        G=Goals A=Assists KP=Key Passes Sh=Shots SoT=Shots on Target F=Fouls Sv=Saves Y=Yellow R=Red
      </p>

      {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      {saved && <p className="text-sm text-primary mt-3">Stats saved ✓</p>}

      <Button type="submit" disabled={loading} className="w-full mt-4">
        {loading ? 'Saving…' : 'Save Stats'}
      </Button>
    </form>
  )
}
