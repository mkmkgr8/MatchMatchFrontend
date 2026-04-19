import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PhotoUploader from './components/PhotoUploader'

export default async function PhotosPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  const match = await prisma.match.findUnique({
    where: { id: params.id },
  }).catch(() => null)
  if (!match) notFound()

  const [photos, myPlayer] = await Promise.all([
    prisma.matchPhoto.findMany({
      where:   { matchId: params.id },
      include: { uploadedBy: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.matchPlayer.findUnique({
      where: { matchId_userId: { matchId: params.id, userId: me.id } },
    }).catch(() => null),
  ])

  const canUpload = myPlayer?.response === 'CONFIRMED'

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/matches/${params.id}`}>← Back</Link>
            </Button>
            <h1 className="text-2xl font-bold">Photos</h1>
          </div>
          {canUpload && <PhotoUploader matchId={params.id} />}
        </div>

        {photos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No photos yet.{canUpload ? ' Upload the first one!' : ''}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={photo.url}
                alt={`Photo by ${photo.uploadedBy.displayName}`}
                fill
                className="object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white">{photo.uploadedBy.displayName}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
