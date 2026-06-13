import { useState } from 'react'
import CommunityActionBar from './CommunityActionBar.jsx'
import CommunityCommentPreview from './CommunityCommentPreview.jsx'
import VoiceRoomCard from './VoiceRoomCard.jsx'
import DailyChallengeCard from './DailyChallengeCard.jsx'

const TEXT_LIMIT = 180

function Avatar({ user }) {
  if (user?.avatarUrl) return <img className="cm-avatar" src={user.avatarUrl} alt="" />
  const initial = (user?.name || user?.handle || 'N').replace('@', '').slice(0, 1).toUpperCase()
  return <span className="cm-avatar cm-avatar-fallback" aria-hidden="true">{initial}</span>
}

// One feed post. Presentation only — the rich reply thread (compose, edit,
// delete, report) is supplied by the container via `renderThread(post)` so no
// backend logic is duplicated here. Mock post types render their own sub-card.
export default function CommunityPostCard({
  post, lang, expanded, onToggleComments,
  liked, saved, onLike, onSave, onShare, onTranslate,
  onOpenProfile, onJoinRoom,
  menu, renderThread,
}) {
  const isAr = lang === 'ar'
  const [showMore, setShowMore] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  const u = post.user || {}
  const time = isAr ? post.timeAr : post.timeEn
  const longText = (post.contentAr || '').length > TEXT_LIMIT
  const bodyText = longText && !showMore ? `${post.contentAr.slice(0, TEXT_LIMIT)}…` : post.contentAr

  const handleTranslate = () => {
    if (post.translationAr) setShowTranslation((v) => !v)
    else onTranslate?.(post)
  }

  return (
    <article className={`cm-post ${post.type === 'teacher' ? 'cm-post-teacher' : ''}`}>
      <header className="cm-post-head">
        <button className="cm-post-author" onClick={() => onOpenProfile?.(post)}>
          <Avatar user={u} />
          <span className="cm-post-author-meta">
            <strong>
              {u.name || u.handle}
              {u.isTeacher && <span className="cm-teacher-badge">{isAr ? 'معلّم' : 'Teacher'}</span>}
            </strong>
            <span className="cm-post-submeta">
              {u.level && <span className="cm-level-chip">{u.level}</span>}
              {u.nativeLang && u.learningLang && (
                <span className="cm-lang-exchange" dir="ltr">{u.nativeLang} ⇄ {u.learningLang}</span>
              )}
              {time && <span className="cm-post-time">· {time}</span>}
            </span>
          </span>
        </button>
        {menu?.visible && (
          <span className="cm-menu-wrap">
            <button className="cm-menu-btn" onClick={menu.onToggle} aria-label={isAr ? 'خيارات' : 'Options'}>⋯</button>
            {menu.open && (
              <span className="cm-menu">
                {menu.canModerate && <button onClick={menu.onEdit}>{isAr ? 'تعديل' : 'Edit'}</button>}
                {menu.canModerate && <button onClick={menu.onDelete}>{isAr ? 'حذف' : 'Delete'}</button>}
                <button onClick={menu.onReport}>{isAr ? 'إبلاغ' : 'Report'}</button>
              </span>
            )}
          </span>
        )}
      </header>

      {post.contentAr && (
        <div className="cm-post-body">
          <p dir="auto">{bodyText}</p>
          {longText && (
            <button className="cm-show-more" onClick={() => setShowMore((v) => !v)}>
              {showMore ? (isAr ? 'عرض أقل' : 'Show less') : (isAr ? 'عرض المزيد' : 'Show more')}
            </button>
          )}
        </div>
      )}

      {post.contentJa && (
        <p className="cm-post-jp" dir="ltr">{post.contentJa}</p>
      )}
      {post.romaji && <p className="cm-post-romaji" dir="ltr">{post.romaji}</p>}
      {showTranslation && post.translationAr && (
        <p className="cm-post-translation" dir="auto">{post.translationAr}</p>
      )}

      {post.type === 'voiceRoom' && <VoiceRoomCard room={post.voiceRoom} lang={lang} onJoin={onJoinRoom} />}
      {post.type === 'challenge' && <DailyChallengeCard challenge={post.challenge} lang={lang} />}

      {post.tags?.length > 0 && (
        <div className="cm-tags">
          {post.tags.map((tag) => <span key={tag} className="cm-tag">{tag}</span>)}
        </div>
      )}

      <CommunityActionBar
        lang={lang}
        liked={liked}
        likesCount={post.likesCount}
        commentsCount={post.commentsCount}
        saved={saved}
        onLike={onLike}
        onComment={onToggleComments}
        onSave={onSave}
        onShare={onShare}
        onTranslate={handleTranslate}
        showCorrect={post.type === 'correction'}
        onCorrect={onToggleComments}
      />

      {!expanded && (
        <CommunityCommentPreview
          comments={post.commentsPreview}
          totalCount={post.commentsCount}
          onViewAll={onToggleComments}
          onOpenProfile={onOpenProfile}
          lang={lang}
        />
      )}

      {expanded && renderThread?.(post)}
    </article>
  )
}
