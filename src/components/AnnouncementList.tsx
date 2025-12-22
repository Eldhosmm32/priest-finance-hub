type Announcement = {
  id: string
  title: string
  body: string
  created_at?: string
}

type Props = {
  items: Announcement[]
}

export default function AnnouncementList({ items }: Props) {
  if (!items.length) {
    return <p className="text-sm text-gray-500">No announcements.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <article key={a.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800">{a.title}</h3>
          {a.created_at && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(a.created_at).toLocaleDateString()}
            </p>
          )}
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{a.body}</p>
        </article>
      ))}
    </div>
  )
}
