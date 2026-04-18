import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MatchForm from './components/MatchForm'

export default async function NewMatchPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/sign-in')

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Create a Match</h1>
        <MatchForm />
      </main>
    </>
  )
}
