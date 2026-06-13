// One chat message. `mine` aligns to the end side; the other user's grouped
// messages show an avatar on the first bubble of the group.
function Avatar({ name, url }) {
  if (url) return <img className="cm-chat-avatar" src={url} alt="" />
  const initial = (name || 'N').replace('@', '').slice(0, 1).toUpperCase()
  return <span className="cm-chat-avatar cm-avatar-fallback" aria-hidden="true">{initial}</span>
}

export default function MessageBubble({ message, mine, showAvatar, counterpartName, counterpartAvatar, time }) {
  return (
    <div className={`cm-msg-row ${mine ? 'mine' : 'theirs'}`}>
      {!mine && (showAvatar
        ? <Avatar name={counterpartName} url={counterpartAvatar} />
        : <span className="cm-chat-avatar-spacer" aria-hidden="true" />)}
      <div className={`cm-bubble ${mine ? 'mine' : 'theirs'}`}>
        <p dir="auto">{message.body}</p>
        {time && <small className="cm-bubble-time">{time}</small>}
      </div>
    </div>
  )
}
