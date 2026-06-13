import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import ChatComposer from './ChatComposer.jsx'
import { IconBack } from './CommunityIcons.jsx'

function HeadAvatar({ name, url }) {
  if (url) return <img className="cm-chat-head-avatar" src={url} alt="" />
  const initial = (name || 'N').replace('@', '').slice(0, 1).toUpperCase()
  return <span className="cm-chat-head-avatar cm-avatar-fallback" aria-hidden="true">{initial}</span>
}

// Focused 1:1 chat. No dashboard/XP/streak — header + messages + composer only.
export default function DMChatScreen({ lang, profile, messages, currentUserId, draft, onDraftChange, onSend, onBack, timeFor }) {
  const isAr = lang === 'ar'
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  const name = profile?.userName || profile?.userHandle || (isAr ? 'محادثة' : 'Chat')
  const avatar = profile?.userAvatar
  const sub = [profile?.level, profile?.nativeLang && profile?.learningLang ? `${profile.nativeLang} ⇄ ${profile.learningLang}` : null]
    .filter(Boolean).join(' · ')

  return (
    <section className="cm-screen cm-chat">
      <header className="cm-screen-head cm-chat-head">
        <button className="cm-icon-btn" onClick={onBack} aria-label={isAr ? 'رجوع' : 'Back'}><IconBack size={22} /></button>
        <HeadAvatar name={name} url={avatar} />
        <div className="cm-chat-head-meta">
          <strong>{name}</strong>
          {sub && <span>{sub}</span>}
        </div>
      </header>

      <div className="cm-chat-thread">
        {messages.length ? messages.map((m, i) => {
          const mine = m.fromId === currentUserId
          const prev = messages[i - 1]
          const showAvatar = !mine && (!prev || prev.fromId !== m.fromId)
          return (
            <MessageBubble
              key={m.id || i}
              message={m}
              mine={mine}
              showAvatar={showAvatar}
              counterpartName={name}
              counterpartAvatar={avatar}
              time={timeFor?.(m)}
            />
          )
        }) : (
          <p className="cm-empty">{isAr ? 'ابدأ المحادثة بأول رسالة.' : 'Say hello to start the conversation.'}</p>
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer value={draft} onChange={onDraftChange} onSend={onSend} lang={lang} />
    </section>
  )
}
