import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  const { userId } = auth()
  if (userId) redirect('/')

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40">
      <SignIn />
    </main>
  )
}
