import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
  const { userId: clerkId } = auth()
  if (!clerkId) return null

  const existing = await prisma.user.findUnique({ where: { clerkId } })
  if (existing) return existing

  // Webhook fallback: create the DB record on first page load if it doesn't exist.
  // This handles cases where the Clerk webhook didn't fire (local dev, misconfiguration, etc.)
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email       = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) return null

  const emailPrefix = email.split('@')[0]
  const displayName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean).join(' ').trim() || emailPrefix

  return prisma.user.upsert({
    where:  { clerkId },
    create: {
      clerkId,
      email,
      username:    clerkUser.username ?? emailPrefix,
      displayName,
      avatarUrl:   clerkUser.imageUrl ?? null,
    },
    update: {},
  })
}
