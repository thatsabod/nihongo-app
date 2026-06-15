import { useState } from 'react'
import AppIcon from './AppIcon.jsx'
import { speakJapanese } from '../sounds.js'

// Club → Stories: level-based reading library built from the existing lesson
// reading passages. Tap a story to read it; tap any line to hear it.
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export default function ClubStoriesScreen({ lang, storiesByLevel = {}, onClose }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const firstWithStories = LEVELS.find((l) => (storiesByLevel[l] || []).length) || 'N5'
  const [level, setLevel] = useState(firstWithStories)
  const [story, setStory] = useState(null)
  const list = storiesByLevel[level] || []

  if (story) {
    return (
      <div className="stories-screen" dir={isAr ? 'rtl' : 'ltr'}>
        <header className="stories-head">
          <button className="icon-btn" onClick={() => setStory(null)} aria-label={t('رجوع', 'Back')}>
            <AppIcon name="back" size={22} />
          </button>
          <h1>{story.titleAr || story.title}</h1>
        </header>
        <div className="stories-reader">
          {story.sentences.map((s, i) => (
            <button key={i} type="button" className="story-line" dir="ltr" onClick={() => speakJapanese(s.jp)}>
              <span className="story-jp">{s.jp} <AppIcon name="sound" size={15} /></span>
              {s.romaji && <span className="story-romaji">{s.romaji}</span>}
              {s.ar && <span className="story-ar" dir="rtl">{s.ar}</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="stories-screen" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="stories-head">
        <button className="icon-btn" onClick={onClose} aria-label={t('رجوع', 'Back')}>
          <AppIcon name="back" size={22} />
        </button>
        <h1>{t('القصص', 'Stories')}</h1>
      </header>

      <div className="stories-levels">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className={`stories-level ${level === l ? 'active' : ''}`}
            disabled={!(storiesByLevel[l] || []).length}
            onClick={() => setLevel(l)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="stories-list">
        {list.length ? (
          list.map((st) => (
            <button key={st.id} type="button" className="story-card" onClick={() => setStory(st)}>
              <span className="story-card-icon" aria-hidden="true">📖</span>
              <span className="story-card-text">
                <strong>{st.titleAr || st.title}</strong>
                <small>{st.sentences.length} {t('جُمل', 'sentences')}</small>
              </span>
              <AppIcon name="next" size={18} />
            </button>
          ))
        ) : (
          <p className="stories-empty">{t('لا توجد قصص لهذا المستوى بعد.', 'No stories for this level yet.')}</p>
        )}
      </div>
    </div>
  )
}
