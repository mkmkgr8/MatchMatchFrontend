export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
      <div className="h-28 bg-muted rounded-xl" />
      <div className="space-y-3">
        <div className="h-5 w-36 bg-muted rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
