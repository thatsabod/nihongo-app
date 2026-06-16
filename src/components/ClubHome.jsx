// النادي — a simple training menu (not a dashboard). Clean icon + title rows,
// grouped into 3 sections. Every row routes to a real flow via onOpen(key).
function sections(isAr) {
  return [
    {
      title: isAr ? 'المحادثة' : 'Conversation',
      items: [
        { key: 'conversation', emoji: '🎙️', color: 'voice', title: isAr ? 'اتصال' : 'Voice call' },
      ],
    },
    {
      title: isAr ? 'تدريب المهارات' : 'Skill practice',
      items: [
        { key: 'vocab', emoji: '📚', color: 'words', title: isAr ? 'كلمات' : 'Words' },
        { key: 'speaking', emoji: '🎤', color: 'speak', title: isAr ? 'تحدّث' : 'Speak' },
        { key: 'listening', emoji: '🎧', color: 'listen', title: isAr ? 'استماع' : 'Listen' },
      ],
    },
    {
      title: isAr ? 'المجموعات' : 'Collections',
      items: [
        { key: 'mistakes', emoji: '🔁', color: 'mistakes', title: isAr ? 'الأخطاء' : 'Mistakes' },
        { key: 'stories', emoji: '📖', color: 'stories', title: isAr ? 'القصص' : 'Stories' },
      ],
    },
  ]
}

export default function ClubHome({ lang, onOpen }) {
  const isAr = lang === 'ar'
  return (
    <div className="club-list">
      {sections(isAr).map((sec) => (
        <section key={sec.title} className="club-sec">
          <h2 className="club-sec-title">{sec.title}</h2>
          {sec.items.map((it) => (
            <button key={it.key} type="button" className="club-row" onClick={() => onOpen(it.key)}>
              <span className="club-row-title">{it.title}</span>
              <span className={`club-row-icon club-ico-${it.color}`} aria-hidden="true">{it.emoji}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}
