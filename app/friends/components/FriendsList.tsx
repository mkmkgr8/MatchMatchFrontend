import Image from 'next/image'

type Friend = {
  id: string
  displayName: string
  username: string
  avatarUrl: string | null
}

export default function FriendsList({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-10">
        No friends yet —{' '}
        <a href="/friends/search" className="text-brand-600 hover:underline">
          search for people to add.
        </a>
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {friends.map(friend => (
        <li
          key={friend.id}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
        >
          {friend.avatarUrl ? (
            <Image
              src={friend.avatarUrl}
              alt={friend.displayName}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
              {friend.displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 text-sm">{friend.displayName}</p>
            <p className="text-gray-400 text-xs">@{friend.username}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
