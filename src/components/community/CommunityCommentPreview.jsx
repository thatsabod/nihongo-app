// Shows 1–2 comments under a post, then a "view all comments" affordance.
export default function CommunityCommentPreview({ comments = [], totalCount, onViewAll, onOpenProfile, lang }) {
  const isAr = lang === 'ar'
  const shown = comments.slice(0, 2)
  if (!shown.length && !totalCount) return null
  const remaining = (totalCount ?? comments.length)
  return (
    <div className="cm-comments">
      {shown.map((c) => (
        <p key={c.id} className="cm-comment">
          <button className="cm-comment-author" onClick={() => onOpenProfile?.(c)}>{c.authorHandle}</button>
          <span dir="auto">{c.body}</span>
        </p>
      ))}
      {remaining > shown.length && (
        <button className="cm-view-all" onClick={onViewAll}>
          {isAr ? `عرض كل التعليقات (${remaining})` : `View all ${remaining} comments`}
        </button>
      )}
    </div>
  )
}
