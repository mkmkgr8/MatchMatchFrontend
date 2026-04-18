# ⚽ Football Friends App — Final Product Spec

## Decisions Log
All ambiguities resolved. This document is the source of truth.

| Decision | Resolved |
|---|---|
| Auth | Google SSO via Clerk |
| Friend search | Registered users only |
| Friendship storage | One row, userA < userB (order convention) |
| Match format | Integer (5, 7, 11) |
| Price | Fixed cost per head, informational only |
| Match visibility | Only matches created by friends |
| Confirm-by default | 3 hours before match start, creator can override |
| Match cancellation | Creator can cancel anytime |
| Minimum players | None — informational only |
| Photo upload | Any confirmed/joined player |
| Ratings | 24hr window, fully visible (who gave what score) |
| Rating default | Avg of received ratings with ceil, for non-voters |
| Attended flag | Skipped for now |
| Stats fields | Goals, Assists, Key Passes, Shots Taken, Shots on Target, Fouls, Saves, Yellow/Red Card |
| Stats edit window | Editable within 48hrs of match end, locked after |
| Stats scope | Per player only |
| Notifications | Manual refresh only (no push) |
| Match feed order | Chronological — closest upcoming first |
| Platform | Web only (Next.js) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Auth | Clerk (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma |
| Media Storage | Supabase Storage |
| Hosting | Vercel |

---

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  clerkId     String   @unique       // Clerk's user ID, synced via webhook
  username    String   @unique
  email       String   @unique
  displayName String
  avatarUrl   String?
  createdAt   DateTime @default(now())

  // Friendships
  friendshipsA   Friendship[] @relation("userA")
  friendshipsB   Friendship[] @relation("userB")

  // Friend requests
  sentRequests     FriendRequest[] @relation("sender")
  receivedRequests FriendRequest[] @relation("receiver")

  // Matches
  createdMatches Match[]
  matchPlayers   MatchPlayer[]

  // Photos
  uploadedPhotos MatchPhoto[]

  // Ratings
  ratingsSent    Rating[]     @relation("rater")
  ratingsReceived Rating[]    @relation("rated")

  // Stats
  stats          MatchStat[]
}

// One row per friendship, userA.id < userB.id always enforced at app layer
model Friendship {
  id        String   @id @default(cuid())
  userAId   String
  userBId   String
  createdAt DateTime @default(now())

  userA User @relation("userA", fields: [userAId], references: [id])
  userB User @relation("userB", fields: [userBId], references: [id])

  @@unique([userAId, userBId])
}

model FriendRequest {
  id         String              @id @default(cuid())
  senderId   String
  receiverId String
  status     FriendRequestStatus @default(PENDING)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt

  sender   User @relation("sender",   fields: [senderId],   references: [id])
  receiver User @relation("receiver", fields: [receiverId], references: [id])

  @@unique([senderId, receiverId])
}

enum FriendRequestStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model Match {
  id          String      @id @default(cuid())
  creatorId   String
  title       String
  location    String
  format      Int                          // 5, 7, or 11
  pricePerHead Decimal    @db.Decimal(10,2)
  startTime   DateTime
  endTime     DateTime
  confirmBy   DateTime                     // default: startTime - 3hrs, creator can override
  status      MatchStatus @default(UPCOMING)
  createdAt   DateTime    @default(now())

  ratingWindowEnd DateTime               // = endTime + 24hrs, set on creation

  creator     User          @relation(fields: [creatorId], references: [id])
  players     MatchPlayer[]
  photos      MatchPhoto[]
  stats       MatchStat[]
  ratings     Rating[]
}

enum MatchStatus {
  UPCOMING
  ONGOING
  COMPLETED
  CANCELLED
}

model MatchPlayer {
  id       String            @id @default(cuid())
  matchId  String
  userId   String
  response MatchPlayerStatus @default(PENDING)
  joinedAt DateTime          @default(now())

  match Match @relation(fields: [matchId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([matchId, userId])
}

enum MatchPlayerStatus {
  PENDING     // invited, not responded
  CONFIRMED   // joining
  OPTED_OUT   // not joining
}

model MatchPhoto {
  id           String   @id @default(cuid())
  matchId      String
  uploadedById String
  url          String   // Supabase Storage public URL
  createdAt    DateTime @default(now())

  match      Match @relation(fields: [matchId], references: [id])
  uploadedBy User  @relation(fields: [uploadedById], references: [id])
}

model MatchStat {
  id             String  @id @default(cuid())
  matchId        String
  userId         String
  goals          Int     @default(0)
  assists        Int     @default(0)
  keyPasses      Int     @default(0)
  shotsTaken     Int     @default(0)
  shotsOnTarget  Int     @default(0)
  fouls          Int     @default(0)
  saves          Int     @default(0)
  yellowCard     Boolean @default(false)
  redCard        Boolean @default(false)

  match Match @relation(fields: [matchId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([matchId, userId])
}

model Rating {
  id        String   @id @default(cuid())
  matchId   String
  raterId   String
  ratedId   String
  score     Int                          // 1–10
  createdAt DateTime @default(now())

  match Match @relation(fields: [matchId], references: [id])
  rater User  @relation("rater", fields: [raterId], references: [id])
  rated User  @relation("rated", fields: [ratedId], references: [id])

  @@unique([matchId, raterId, ratedId])
}
```

---

## Friendship Logic (Order Convention)

To maintain one row per friendship, always enforce `userA.id < userB.id` at the application layer before any insert or query:

```ts
// lib/friendship.ts

export function orderedPair(idA: string, idB: string) {
  return idA < idB ? [idA, idB] : [idB, idA]
}

// Creating a friendship
const [userAId, userBId] = orderedPair(currentUserId, targetUserId)
await prisma.friendship.create({ data: { userAId, userBId } })

// Checking if two users are friends
const [userAId, userBId] = orderedPair(currentUserId, targetUserId)
const friendship = await prisma.friendship.findUnique({
  where: { userAId_userBId: { userAId, userBId } }
})
```

---

## Features

---

### 0. Google SSO

- Clerk handles Google OAuth entirely
- On first sign-in, Clerk fires a `user.created` webhook
- Your webhook handler inserts the user into your `User` table

```ts
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const payload = await req.json()

  if (payload.type === 'user.created') {
    const { id, email_addresses, username, image_url, first_name, last_name } = payload.data

    await prisma.user.create({
      data: {
        clerkId:     id,
        email:       email_addresses[0].email_address,
        username:    username ?? email_addresses[0].email_address.split('@')[0],
        displayName: `${first_name} ${last_name}`.trim(),
        avatarUrl:   image_url,
      }
    })
  }

  return Response.json({ ok: true })
}
```

---

### 1. Friend Requests

**Search:** query registered users by `username` OR `email` (case-insensitive), exclude self and existing friends.

```ts
// Search registered users
const results = await prisma.user.findMany({
  where: {
    AND: [
      { id: { not: currentUserId } },
      {
        OR: [
          { username:    { contains: query, mode: 'insensitive' } },
          { email:       { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ]
      }
    ]
  },
  take: 10
})
```

**Send request:**
- Check no existing `FriendRequest` or `Friendship` between the two users
- Insert `FriendRequest` with status `PENDING`

**Accept / Reject:**
- Update `FriendRequest.status`
- On `ACCEPTED`: insert `Friendship` using `orderedPair()`

**States to show in UI:**
- Not connected → "Add Friend" button
- Request sent → "Pending" (greyed out)
- Request received → "Accept / Reject"
- Friends → "Friends ✅"

---

### 2. Friends List

```ts
// Get all friends of currentUser
const friendships = await prisma.friendship.findMany({
  where: {
    OR: [
      { userAId: currentUserId },
      { userBId: currentUserId },
    ]
  },
  include: { userA: true, userB: true }
})

// Extract the other user from each friendship
const friends = friendships.map(f =>
  f.userAId === currentUserId ? f.userB : f.userA
)
```

---

### 3. Matches

#### 3a. Creating a Match

**Route:** `POST /api/matches`

**Form fields:**

| Field | Type | Notes |
|---|---|---|
| Title | Text | e.g. "Sunday Kickabout" |
| Location | Text | Free text |
| Format | Select | 5, 7, or 11 (stored as int) |
| Price per head | Number | Decimal, informational |
| Start time | Date + time | 30-min granularity |
| End time | Date + time | 30-min granularity, after start |
| Confirm by | Time (optional) | Defaults to startTime − 3hrs |

**30-min time slot generation:**
```ts
export const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})
```

**On create:**
```ts
const confirmBy      = input.confirmBy ?? new Date(startTime.getTime() - 3 * 60 * 60 * 1000)
const ratingWindowEnd = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)

await prisma.match.create({
  data: { ...input, creatorId, confirmBy, ratingWindowEnd, status: 'UPCOMING' }
})
```

Creator is automatically added as `CONFIRMED` in `MatchPlayer`.

#### 3b. Match Feed (Friends' Matches)

Friends' upcoming matches, closest first, that the current user has not opted out of:

```ts
const friendIds = /* from friends list query above */

const matches = await prisma.match.findMany({
  where: {
    creatorId: { in: friendIds },
    status:    'UPCOMING',
    startTime: { gte: new Date() },
    players: {
      none: {
        userId:   currentUserId,
        response: 'OPTED_OUT'
      }
    }
  },
  orderBy: { startTime: 'asc' },
  include: { creator: true, players: { include: { user: true } } }
})
```

#### 3c. Join / Opt Out

**Server-side enforcement on every action:**
```ts
const match = await prisma.match.findUnique({ where: { id: matchId } })
const now   = new Date()

if (now >= match.confirmBy) {
  return { error: 'Confirm window has closed for this match' }
}
if (match.status !== 'UPCOMING') {
  return { error: 'Match is no longer open' }
}
```

Upsert `MatchPlayer`:
```ts
await prisma.matchPlayer.upsert({
  where:  { matchId_userId: { matchId, userId: currentUserId } },
  create: { matchId, userId: currentUserId, response: action }, // 'CONFIRMED' | 'OPTED_OUT'
  update: { response: action }
})
```

#### 3d. Cancel a Match

Only the creator can cancel. No restriction on timing (can cancel even after confirm-by).

```ts
// Verify creator
if (match.creatorId !== currentUserId) return { error: 'Not authorised' }

await prisma.match.update({
  where: { id: matchId },
  data:  { status: 'CANCELLED' }
})
```

---

### 4. P2P Ratings

**Window:** opens at `match.endTime`, closes at `match.ratingWindowEnd` (endTime + 24hrs).

**Who rates:** every `CONFIRMED` player rates every other `CONFIRMED` player. Not themselves.

**Visibility:** fully transparent — on your profile you see `"John gave you 7, Sarah gave you 8"`.

**Default for non-voters:** if a player does not submit a rating for another player before the window closes, their missing vote is filled with `ceil(avg of existing ratings for that player)`. This is computed at read time, not written to DB, unless you want to materialise it in a background job.

```ts
// Computing effective rating for a player in a match
async function getEffectiveRatings(matchId: string, ratedId: string) {
  const confirmedPlayers = await prisma.matchPlayer.findMany({
    where: { matchId, response: 'CONFIRMED', userId: { not: ratedId } }
  })
  const submitted = await prisma.rating.findMany({
    where: { matchId, ratedId }
  })

  const submittedIds = new Set(submitted.map(r => r.raterId))
  const submittedScores = submitted.map(r => r.score)
  const avg = submittedScores.length
    ? submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length
    : null

  const defaultScore = avg ? Math.ceil(avg) : null

  // Build full rating list including defaulted scores
  return confirmedPlayers.map(p => ({
    raterId: p.userId,
    score:   submittedIds.has(p.userId)
               ? submitted.find(r => r.raterId === p.userId)!.score
               : defaultScore,
    isDefault: !submittedIds.has(p.userId)
  }))
}
```

**Submitting ratings:**
```ts
// Validate window
if (now < match.endTime)          return { error: 'Match not finished yet' }
if (now > match.ratingWindowEnd)  return { error: 'Rating window has closed' }

// Validate rater is confirmed in match
const player = await prisma.matchPlayer.findUnique({
  where: { matchId_userId: { matchId, userId: raterId } }
})
if (!player || player.response !== 'CONFIRMED') return { error: 'Not a confirmed player' }

// Validate score range
if (score < 1 || score > 10) return { error: 'Score must be between 1 and 10' }

// Upsert (allow updating before window closes)
await prisma.rating.upsert({
  where:  { matchId_raterId_ratedId: { matchId, raterId, ratedId } },
  create: { matchId, raterId, ratedId, score },
  update: { score }
})
```

---

### 5. Match Photos

**Who can upload:** any `CONFIRMED` player in the match.

**Storage path:** `match-photos/{matchId}/{timestamp}-{filename}`

**Supabase RLS on storage:**
```sql
-- Read: any authenticated user
CREATE POLICY "Authenticated read"
ON storage.objects FOR SELECT
USING (bucket_id = 'match-photos' AND auth.role() = 'authenticated');

-- Upload: only confirmed players of that match
-- Path format: match-photos/{matchId}/...
CREATE POLICY "Confirmed players upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'match-photos' AND
  EXISTS (
    SELECT 1 FROM match_players
    WHERE match_id = (storage.foldername(name))[1]   -- extract matchId from path
    AND user_id    = auth.uid()
    AND response   = 'CONFIRMED'
  )
);
```

**Upload flow:**
```ts
import imageCompression from 'browser-image-compression'

// 1. Compress client-side before upload
const compressed = await imageCompression(file, {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1280
})

// 2. Upload to Supabase Storage
const path = `${matchId}/${Date.now()}-${file.name}`
const { data, error } = await supabase.storage
  .from('match-photos')
  .upload(path, compressed)

// 3. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('match-photos')
  .getPublicUrl(data.path)

// 4. Store URL in DB
await prisma.matchPhoto.create({
  data: { matchId, uploadedById: currentUserId, url: publicUrl }
})
```

---

### 6. Admin Stats (Match Creator)

**Route:** `/matches/[id]/stats` — creator only.

**Available:** after `match.endTime`.

**Fields per confirmed player:**

| Field | Type |
|---|---|
| Goals | Int |
| Assists | Int |
| Key Passes | Int |
| Shots Taken | Int |
| Shots on Target | Int |
| Fouls | Int |
| Saves | Int |
| Yellow Card | Boolean |
| Red Card | Boolean |

**Edit window:** creator can add or update stats from `endTime` up to `endTime + 48hrs`. After that, stats are locked.

```ts
const now         = new Date()
const editWindowEnd = new Date(match.endTime.getTime() + 48 * 60 * 60 * 1000)

// Auth check
if (match.creatorId !== currentUserId) return { error: 'Not authorised' }
if (now < match.endTime)               return { error: 'Match not finished yet' }
if (now > editWindowEnd)               return { error: 'Stats editing window has closed (48hrs after match)' }

// Upsert stats per player
await prisma.matchStat.upsert({
  where:  { matchId_userId: { matchId, userId } },
  create: { matchId, userId, ...stats },
  update: { ...stats }
})
```

---

## Pages / Routes

| Route | Who | Description |
|---|---|---|
| `/` | All | Match feed — friends' upcoming matches, soonest first |
| `/matches/new` | Any user | Create a match |
| `/matches/[id]` | All | Match detail: info, players, photos, stats, ratings |
| `/matches/[id]/rate` | Confirmed players | Submit P2P ratings (within window) |
| `/matches/[id]/stats` | Creator only | Add/edit player stats |
| `/matches/[id]/photos` | Confirmed players | Upload photos |
| `/friends` | All | Friends list + incoming requests |
| `/friends/search` | All | Search users, send requests |
| `/profile` | All | Own profile: stats history, ratings received |
| `/profile/[id]` | All | Other player's profile |

---

## Profile Page — Ratings Display

On your own profile you see the full breakdown per match:

```
Match: Sunday Kickabout — 14 Apr
  John gave you    7
  Sarah gave you   8
  Mike gave you    6  (default — did not vote)
  Average:         7
```

On someone else's profile you see the same — ratings are fully public.

---

## Key Business Rules Summary

| Rule | Detail |
|---|---|
| Join / opt-out deadline | `confirmBy` (default: startTime − 3hrs). Server-enforced. |
| Rating window | Opens at `endTime`, closes at `endTime + 24hrs` |
| Rating default | `ceil(avg of submitted ratings)` for non-voters, computed at read time |
| Friendship row order | `userA.id < userB.id` always, enforced at app layer |
| Photo upload | Confirmed players only |
| Stats entry | Creator only, after `endTime` |
| Match cancellation | Creator only, any time |
| Match visibility | Only matches created by friends |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=       # for verifying webhook signatures

# Prisma / DB
DATABASE_URL=               # Supabase Postgres connection string
```

---

## Getting Started

```bash
# 1. Scaffold
npx create-next-app@latest football-friends --typescript --tailwind --app
cd football-friends

# 2. Dependencies
npm install @clerk/nextjs @supabase/supabase-js @prisma/client prisma
npm install browser-image-compression
npm install svix                        # for Clerk webhook verification

# 3. Prisma setup
npx prisma init
# paste schema into prisma/schema.prisma
# set DATABASE_URL in .env to Supabase Postgres URL
npx prisma db push

# 4. Supabase Storage
# Create bucket 'match-photos' (public) in Supabase dashboard
# Add RLS policies from spec above

# 5. Clerk
# Create app at clerk.com
# Enable Google provider
# Add webhook endpoint → /api/webhooks/clerk
# Copy keys to .env

# 6. Vercel
# Connect GitHub repo at vercel.com
# Add all env vars in Vercel dashboard
# Every push to main auto-deploys
```

---

## Build Order (Recommended)

Build in this sequence to always have a working app at each step:

```
1. Auth — Google login, webhook, user in DB
2. Friends — search, send/accept requests, friends list
3. Match creation — form, 30-min slots, DB write
4. Match feed — friends' upcoming matches
5. Join / opt-out — with server-side confirm-by enforcement
6. Match detail page — players, status
7. Match cancellation
8. Photo upload — compression, storage, gallery
9. Stats entry — creator UI, after endTime
10. P2P ratings — submission UI, window enforcement
11. Profile pages — ratings breakdown, stats history
```

---

## Future (v2)

- [ ] Android app with FCM inline notification actions
- [ ] Web push notifications
- [ ] Team assignment (Team A vs Team B) + win/loss tracking
- [ ] WhatsApp share link for match summary
- [ ] Season / monthly leaderboards
- [ ] Player of the Month (avg rating)
- [ ] RSVP reminder (email day before)
