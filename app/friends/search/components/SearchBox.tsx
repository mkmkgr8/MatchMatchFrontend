'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { sendFriendRequest, respondToRequest } from '@/app/actions/friends'

type SearchUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  status: 'none' | 'sent' | 'received' | 'friends'
  requestId: string | null
}

export default function SearchBox() {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<SearchUser[]>([])
  const [searching, setSearching]   = useState(false)
  const [actionId, setActionId]     = useState<string | null>(null)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function doSearch(q: string) {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res  = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.users ?? [])
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  async function handleSend(userId: string) {
    setActionId(userId)
    await sendFriendRequest(userId)
    await doSearch(query)
    setActionId(null)
  }

  async function handleRespond(requestId: string, action: 'ACCEPTED' | 'REJECTED', userId: string) {
    setActionId(userId + action)
    await respondToRequest(requestId, action)
    await doSearch(query)
    setActionId(null)
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name, username, or email…"
        autoFocus
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />

      {searching && (
        <p className="text-sm text-gray-400 text-center mt-6">Searching…</p>
      )}

      {!searching && query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-gray-400 text-center mt-6">No users found.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map(user => (
            <li
              key={user.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.displayName}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm">{user.displayName}</p>
                  <p className="text-gray-400 text-xs">@{user.username}</p>
                </div>
              </div>

              <div className="shrink-0">
                {user.status === 'friends' && (
                  <span className="text-sm text-brand-600 font-medium">Friends ✓</span>
                )}

                {user.status === 'sent' && (
                  <span className="text-sm text-gray-400">Pending</span>
                )}

                {user.status === 'received' && user.requestId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(user.requestId!, 'ACCEPTED', user.id)}
                      disabled={actionId !== null}
                      className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {actionId === user.id + 'ACCEPTED' ? '…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleRespond(user.requestId!, 'REJECTED', user.id)}
                      disabled={actionId !== null}
                      className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {actionId === user.id + 'REJECTED' ? '…' : 'Reject'}
                    </button>
                  </div>
                )}

                {user.status === 'none' && (
                  <button
                    onClick={() => handleSend(user.id)}
                    disabled={actionId !== null}
                    className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {actionId === user.id ? '…' : 'Add Friend'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
