'use client'

import { useState } from 'react'
import Image from 'next/image'
import { respondToRequest } from '@/app/actions/friends'

type Sender = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
}

type Request = {
  id: string
  sender: Sender
}

export default function IncomingRequests({ requests }: { requests: Request[] }) {
  const [pending, setPending] = useState<string | null>(null)

  async function handle(requestId: string, action: 'ACCEPTED' | 'REJECTED') {
    setPending(requestId + action)
    await respondToRequest(requestId, action)
    setPending(null)
  }

  return (
    <ul className="space-y-3">
      {requests.map(req => (
        <li
          key={req.id}
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {req.sender.avatarUrl ? (
              <Image
                src={req.sender.avatarUrl}
                alt={req.sender.displayName}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                {req.sender.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm">{req.sender.displayName}</p>
              <p className="text-gray-400 text-xs">@{req.sender.username}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handle(req.id, 'ACCEPTED')}
              disabled={pending !== null}
              className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {pending === req.id + 'ACCEPTED' ? '…' : 'Accept'}
            </button>
            <button
              onClick={() => handle(req.id, 'REJECTED')}
              disabled={pending !== null}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {pending === req.id + 'REJECTED' ? '…' : 'Reject'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
