export default function MatchLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="h-6 w-20 bg-muted rounded-md" />
      </div>
      <div className="h-28 bg-muted rounded-xl" />
      <div className="flex gap-2">
        <div className="h-9 w-24 bg-muted rounded-md" />
        <div className="h-9 w-24 bg-muted rounded-md" />
      </div>
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  )
}
