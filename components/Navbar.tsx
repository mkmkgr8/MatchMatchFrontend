import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function Navbar() {
  const { userId } = auth()
  if (!userId) return null

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-primary text-lg">
            ⚽ MatchMatch
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/"         className="text-muted-foreground hover:text-foreground transition-colors">Feed</Link>
            <Link href="/friends"  className="text-muted-foreground hover:text-foreground transition-colors">Friends</Link>
            <Link href="/profile"  className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm">
            <Link href="/matches/new">
              <Plus className="h-4 w-4" />
              New Match
            </Link>
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  )
}
