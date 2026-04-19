import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import ProfileView from '../components/ProfileView'

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  if (params.id === me.id) redirect('/profile')

  const user = await prisma.user.findUnique({
    where:  { id: params.id },
    select: { id: true, displayName: true, username: true, avatarUrl: true },
  })
  if (!user) notFound()

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href="/">← Back</Link>
        </Button>
        <ProfileView user={user} />
      </main>
    </>
  )
}
