import { useState } from 'react'
import ConversationRow from './ConversationRow.jsx'
import { IconBack, IconSearch } from './CommunityIcons.jsx'

// Dedicated DM inbox (Instagram-style). Reuses live conversations derived from
// the Firestore messages in CommunityHub.
export default function DMInboxScreen({ lang, conversations, onOpenConversation, onBack }) {
  const isAr = lang === 'ar'
  const [q, setQ] = useState('')
  const search = q.trim().toLowerCase()
  const list = search
    ? conversations.filter((c) => `${c.counterpartName || ''} ${c.counterpartHandle || ''}`.toLowerCase().includes(search))
    : conversations

  return (
    <section className="cm-screen">
      <header className="cm-screen-head">
        <button className="cm-icon-btn" onClick={onBack} aria-label={isAr ? 'رجوع' : 'Back'}><IconBack size={22} /></button>
        <h1>{isAr ? 'الرسائل' : 'Messages'}</h1>
        <span className="cm-screen-head-spacer" />
      </header>
      <label className="cm-search cm-screen-search">
        <IconSearch size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? 'بحث' : 'Search'} dir="auto" />
      </label>
      <div className="cm-conv-list">
        {list.length ? list.map((c) => (
          <ConversationRow key={c.counterpartId} conversation={c} lang={lang} onClick={() => onOpenConversation(c)} />
        )) : (
          <p className="cm-empty">{isAr ? 'لا توجد محادثات بعد.' : 'No conversations yet.'}</p>
        )}
      </div>
    </section>
  )
}
