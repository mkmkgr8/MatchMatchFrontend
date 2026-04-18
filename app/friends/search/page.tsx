import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import SearchBox from './components/SearchBox'

export default function SearchPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/friends">← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold">Find Friends</h1>
        </div>
        <SearchBox />
      </main>
    </>
  )
}
