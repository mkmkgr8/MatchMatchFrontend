import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import ProfileView from './components/ProfileView'

export default async function OwnProfilePage() {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <ProfileView user={me} />
      </main>
    </>
  )
}
