import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-brand-700">⚽ MatchMatch</span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="max-w-2xl mx-auto mt-12 px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          {user.imageUrl && (
            <Image
              src={user.imageUrl}
              alt={user.fullName ?? 'Avatar'}
              width={72}
              height={72}
              className="rounded-full mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Welcome, {user.firstName ?? user.username ?? 'Footballer'}!
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {user.primaryEmailAddress?.emailAddress}
          </p>
          <p className="text-gray-400 text-sm">
            More features coming soon — friends, matches, ratings and stats.
          </p>
        </div>
      </div>
    </main>
  )
}
