import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  const { userId } = auth()
  if (userId) redirect('/')

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40">
      <SignUp />
    </main>
  )
}
