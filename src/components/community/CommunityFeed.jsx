import CommunityPostCard from './CommunityPostCard.jsx'

// Vertical timeline. Builds each card's per-post props from the shared state
// sets/handlers passed by the container, so CommunityHub stays the single owner
// of interaction logic.
export default function CommunityFeed({
  posts, lang, currentUserId,
  expandedId, onToggleComments,
  likedIds, savedIds, onLike, onSave, onShare, onTranslate,
  onOpenProfile, onJoinRoom,
  menuOpenId, onToggleMenu, onEditPost, onDeletePost, onReportPost,
  renderThread, emptyLabel,
}) {
  if (!posts.length) {
    return <p className="cm-empty">{emptyLabel}</p>
  }
  return (
    <div className="cm-feed">
      {posts.map((post) => {
        const isQuestion = post.source === 'question'
        return (
          <CommunityPostCard
            key={post.id}
            post={post}
            lang={lang}
            expanded={expandedId === post.id}
            onToggleComments={() => onToggleComments(post.id)}
            liked={likedIds.has(post.id) || post.liked}
            saved={savedIds.has(post.id) || post.saved}
            onLike={() => onLike(post)}
            onSave={() => onSave(post)}
            onShare={() => onShare(post)}
            onTranslate={onTranslate}
            onOpenProfile={() => onOpenProfile(post)}
            onJoinRoom={onJoinRoom}
            menu={{
              visible: isQuestion,
              open: menuOpenId === post.id,
              onToggle: () => onToggleMenu(post.id),
              canModerate: isQuestion && post.raw?.userId === currentUserId,
              onEdit: () => onEditPost(post),
              onDelete: () => onDeletePost(post),
              onReport: () => onReportPost(post),
            }}
            renderThread={isQuestion ? renderThread : undefined}
          />
        )
      })}
    </div>
  )
}
