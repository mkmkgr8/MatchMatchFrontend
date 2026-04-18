'use client'

import { useState } from 'react'
import { createMatch } from '@/app/actions/matches'
import { timeSlots } from '@/lib/timeSlots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function MatchForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)

    const res = await createMatch({
      title:         fd.get('title') as string,
      location:      fd.get('location') as string,
      format:        Number(fd.get('format')),
      pricePerHead:  fd.get('pricePerHead') as string,
      startDate:     fd.get('startDate') as string,
      startTime:     fd.get('startTime') as string,
      endDate:       fd.get('endDate') as string,
      endTime:       fd.get('endTime') as string,
      confirmByTime: (fd.get('confirmByTime') as string) || null,
    })

    if (res && 'error' in res) {
      setError(res.error)
      setLoading(false)
    }
    // on success, createMatch redirects — no need to handle here
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Sunday Kickabout" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="Hackney Marshes, Pitch 4" required />
      </div>

      <div className="space-y-1.5">
        <Label>Format</Label>
        <Select name="format" required>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5-a-side</SelectItem>
            <SelectItem value="7">7-a-side</SelectItem>
            <SelectItem value="11">11-a-side</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pricePerHead">Price per head (£)</Label>
        <Input id="pricePerHead" name="pricePerHead" type="number" min="0" step="0.01" placeholder="5.00" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" min={today} required />
        </div>
        <div className="space-y-1.5">
          <Label>Start time</Label>
          <Select name="startTime" required>
            <SelectTrigger>
              <SelectValue placeholder="HH:MM" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" min={today} required />
        </div>
        <div className="space-y-1.5">
          <Label>End time</Label>
          <Select name="endTime" required>
            <SelectTrigger>
              <SelectValue placeholder="HH:MM" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Confirm by (optional — defaults to 3hrs before start)</Label>
        <Select name="confirmByTime">
          <SelectTrigger>
            <SelectValue placeholder="Use default (start − 3hrs)" />
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating…' : 'Create Match'}
      </Button>
    </form>
  )
}
