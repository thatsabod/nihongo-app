// One conversation row in the DM inbox (Instagram-style, compact).
function Avatar({ name, url }) {
  if (url) return <img className="cm-avatar" src={url} alt="" />
  const initial = (name || 'N').replace('@', '').slice(0, 1).toUpperCase()
  return <span className="cm-avatar cm-avatar-fallback" aria-hidden="true">{initial}</span>
}

export default function ConversationRow({ conversation, lang, onClick }) {
  const isAr = lang === 'ar'
  const c = conversation
  const preview = c.lastIsMine ? `${isAr ? 'أنت: ' : 'You: '}${c.lastBody || ''}` : (c.lastBody || '')
  const status = c.lastIsMine
    ? (c.lastRead ? (isAr ? 'تمت القراءة' : 'Seen') : (isAr ? 'تم الإرسال' : 'Sent'))
    : ''
  return (
    <button className={`cm-conv ${c.unread > 0 ? 'unread' : ''}`} onClick={onClick}>
      <Avatar name={c.counterpartName || c.counterpartHandle} url={c.avatarUrl} />
      <span className="cm-conv-main">
        <span className="cm-conv-top">
          <strong className="cm-conv-name">{c.counterpartName || (c.counterpartHandle || '').replace('@', '')}</strong>
          {c.time && <span className="cm-conv-time">{c.time}</span>}
        </span>
        <span className="cm-conv-bottom">
          <span className="cm-conv-preview" dir="auto">{preview}</span>
          {status && <span className="cm-conv-status">· {status}</span>}
          {c.unread > 0 && <span className="cm-conv-dot" aria-hidden="true" />}
        </span>
      </span>
    </button>
  )
}
