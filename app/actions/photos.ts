'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function uploadPhoto(
  matchId: string,
  formData: FormData
): Promise<{ error: string } | { ok: true; url: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    const player = await prisma.matchPlayer.findUnique({
      where: { matchId_userId: { matchId, userId: user.id } },
    })
    if (!player || player.response !== 'CONFIRMED') {
      return { error: 'Only confirmed players can upload photos' }
    }

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { error: 'No file provided' }

    const supabase = createServiceClient()
    const path     = `${matchId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { data, error } = await supabase.storage
      .from('match-photos')
      .upload(path, file, { contentType: file.type })

    if (error) return { error: error.message }

    const { data: { publicUrl } } = supabase.storage.from('match-photos').getPublicUrl(data.path)

    await prisma.matchPhoto.create({
      data: { matchId, uploadedById: user.id, url: publicUrl },
    })

    revalidatePath(`/matches/${matchId}/photos`)
    return { ok: true, url: publicUrl }
  } catch {
    return { error: 'Upload failed. Please try again.' }
  }
}
