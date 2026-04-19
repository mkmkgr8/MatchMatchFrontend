'use client'

import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { uploadPhoto } from '@/app/actions/photos'
import { Button } from '@/components/ui/button'
import { Camera } from 'lucide-react'

export default function PhotoUploader({ matchId }: { matchId: string }) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB:        0.5,
        maxWidthOrHeight: 1280,
        useWebWorker:     true,
      })

      const fd = new FormData()
      fd.append('file', compressed, file.name)

      const res = await uploadPhoto(matchId, fd)
      if ('error' in res) setError(res.error ?? 'Upload failed')
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-4 w-4 mr-1" />
        {loading ? 'Uploading…' : 'Upload Photo'}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
