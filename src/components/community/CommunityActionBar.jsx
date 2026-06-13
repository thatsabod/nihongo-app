import { IconHeart, IconComment, IconBookmark, IconShare, IconTranslate, IconPencil } from './CommunityIcons.jsx'

// Thumb-friendly interaction row for a post: like / comment / save / share /
// translate, plus an optional "correct" action for correction posts.
export default function CommunityActionBar({
  lang, liked, likesCount, commentsCount, saved,
  onLike, onComment, onSave, onShare, onTranslate,
  showCorrect, onCorrect,
}) {
  const isAr = lang === 'ar'
  return (
    <div className="cm-actionbar">
      <button className={`cm-action ${liked ? 'liked' : ''}`} onClick={onLike} aria-pressed={liked} aria-label={isAr ? 'إعجاب' : 'Like'}>
        <IconHeart size={20} filled={liked} />
        {likesCount > 0 && <span>{likesCount}</span>}
      </button>
      <button className="cm-action" onClick={onComment} aria-label={isAr ? 'تعليق' : 'Comment'}>
        <IconComment size={20} />
        {commentsCount > 0 && <span>{commentsCount}</span>}
      </button>
      <span className="cm-action-spacer" />
      {showCorrect && (
        <button className="cm-action cm-action-correct" onClick={onCorrect} aria-label={isAr ? 'صحّح الجملة' : 'Correct sentence'}>
          <IconPencil size={20} />
          <span className="cm-action-label">{isAr ? 'صحّح' : 'Correct'}</span>
        </button>
      )}
      <button className="cm-action" onClick={onTranslate} aria-label={isAr ? 'ترجمة' : 'Translate'}>
        <IconTranslate size={20} />
      </button>
      <button className={`cm-action ${saved ? 'saved' : ''}`} onClick={onSave} aria-pressed={saved} aria-label={isAr ? 'حفظ' : 'Save'}>
        <IconBookmark size={20} filled={saved} />
      </button>
      <button className="cm-action" onClick={onShare} aria-label={isAr ? 'مشاركة' : 'Share'}>
        <IconShare size={20} />
      </button>
    </div>
  )
}
