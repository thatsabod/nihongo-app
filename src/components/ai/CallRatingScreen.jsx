import { useState } from 'react'

// Post-call difficulty rating ("شلون كانت المكالمة؟"). Continue is disabled
// until an option is picked; the choice is saved with the session and used to
// nudge future difficulty.
export default function CallRatingScreen({ lang, onContinue }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const [sel, setSel] = useState(null)
  const options = [
    { id: 'easy', ar: 'سهلة جداً', en: 'Too easy' },
    { id: 'right', ar: 'مناسبة', en: 'Just right' },
    { id: 'hard', ar: 'صعبة جداً', en: 'Too hard' },
  ]
  return (
    <div className="callrate-screen" dir={isAr ? 'rtl' : 'ltr'}>
      <h1 className="callrate-title">{t('شلون كانت المكالمة؟', 'How was the call?')}</h1>
      <div className="callrate-options">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`callrate-option ${sel === o.id ? 'active' : ''}`}
            aria-pressed={sel === o.id}
            onClick={() => setSel(o.id)}
          >
            {isAr ? o.ar : o.en}
          </button>
        ))}
      </div>
      <button className="btn btn-primary callrate-continue" disabled={!sel} onClick={() => sel && onContinue(sel)}>
        {t('متابعة', 'Continue')}
      </button>
    </div>
  )
}
