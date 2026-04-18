import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    email_addresses: { email_address: string }[]
    username: string | null
    image_url: string
    first_name: string | null
    last_name: string | null
  }
}

type ClerkEvent = ClerkUserCreatedEvent | { type: string; data: unknown }

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return new Response('CLERK_WEBHOOK_SECRET not set', { status: 500 })
  }

  const headerPayload = headers()
  const svixId        = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const body = await req.text()

  let evt: ClerkEvent
  try {
    const wh = new Webhook(secret)
    evt = wh.verify(body, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, username, image_url, first_name, last_name } = evt.data

    const email       = email_addresses[0]?.email_address
    const emailPrefix = email?.split('@')[0] ?? id

    const displayName = [first_name, last_name].filter(Boolean).join(' ').trim() || emailPrefix

    await prisma.user.create({
      data: {
        clerkId:     id,
        email,
        username:    username ?? emailPrefix,
        displayName,
        avatarUrl:   image_url,
      },
    })
  }

  return Response.json({ ok: true })
}
