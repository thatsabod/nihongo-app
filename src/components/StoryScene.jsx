// Visual-conversation building blocks for the story player. A story sentence is
// classified into NARRATION (centered, narrator icon, softer card) or DIALOGUE
// (character avatar + name + chat bubble). Speakers are inferred from the text
// (no per-line metadata needed): the subject before/after a 「…」 quote. Each
// piece has its own audio button, furigana, and tap-to-reveal Arabic.
import { useState } from 'react'
import AppIcon from './AppIcon.jsx'
import JapaneseText from './JapaneseText.jsx'
import { speakJapanese } from '../sounds.js'

const AVATARS = ['👧', '👦', '🧑', '👩', '👨', '🧒', '👩‍🦰', '🧑‍🦱', '👱‍♀️', '👱', '🧑‍🦰', '👨‍🦱']
const honorific = /(さん|くん|ちゃん|せんせい|先生|様|さま)$/

function hashName(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

// Deterministic, consistent avatar per character name.
export function avatarFor(name) {
  if (!name) return '🗣️'
  if (/先生|せんせい/.test(name)) return '🧑‍🏫'
  if (/学生|がくせい/.test(name)) return '🧑‍🎓'
  if (/お?母|おかあ|ママ|母さん/.test(name)) return '👩'
  if (/お?父|おとう|パパ|父さん/.test(name)) return '👨'
  const key = name.replace(honorific, '')
  return AVATARS[hashName(key) % AVATARS.length]
}

export function StoryCharacterAvatar({ name }) {
  return <span className="sc-avatar" aria-hidden="true">{avatarFor(name)}</span>
}

// Tap-to-reveal Arabic translation (keeps immersion; collapsed by default).
export function StoryTranslationReveal({ ar, lang = 'ar' }) {
  const [open, setOpen] = useState(false)
  if (!ar) return null
  const t = (a, e) => (lang === 'ar' ? a : e)
  if (open) return <span className="sc-trans" dir="rtl">{ar}</span>
  return (
    <button type="button" className="sc-trans-btn" onClick={() => setOpen(true)}>
      {t('اضغط للترجمة', 'Tap to reveal')}
    </button>
  )
}

function AudioBtn({ text, size = 16 }) {
  return (
    <button type="button" className="sc-audio" onClick={() => speakJapanese(text)} aria-label="audio">
      <AppIcon name="sound" size={size} />
    </button>
  )
}

export function StoryNarrationCard({ jp, romaji, ar, readingMap, showRomaji, lang, isNew }) {
  return (
    <div className={`sc-narration ${isNew ? 'is-new' : ''}`}>
      <AudioBtn text={jp} />
      <div className="sc-narration-body">
        <p className="sc-jp" dir="ltr"><JapaneseText text={jp} readingMap={readingMap} fallback={!!readingMap} /></p>
        {showRomaji && romaji && <p className="sc-romaji" dir="ltr">{romaji}</p>}
        <StoryTranslationReveal ar={ar} lang={lang} />
      </div>
    </div>
  )
}

export function StoryDialogueBubble({ speaker, jp, romaji, ar, readingMap, showRomaji, lang, isNew }) {
  return (
    <div className={`sc-dialogue ${isNew ? 'is-new' : ''}`}>
      <StoryCharacterAvatar name={speaker} />
      <div className="sc-bubble">
        {speaker && <span className="sc-name" dir="auto">{speaker}</span>}
        <p className="sc-jp" dir="ltr">
          <AudioBtn text={jp} size={15} />
          <JapaneseText text={jp} readingMap={readingMap} fallback={!!readingMap} />
        </p>
        {showRomaji && romaji && <p className="sc-romaji" dir="ltr">{romaji}</p>}
        <StoryTranslationReveal ar={ar} lang={lang} />
      </div>
    </div>
  )
}

// Classify one sentence. Returns { type:'narration' } or
// { type:'dialogue', quote, speaker, frame } where `quote` is the spoken text
// inside 「…」 and `frame` is any non-quote narration around it (if substantial).
export function parseScene(jp, prevSpeaker) {
  const text = String(jp || '')
  const m = text.match(/「([^」]*)」/)
  if (!m) return { type: 'narration' }
  const quote = m[1]
  const before = text.slice(0, m.index)
  const after = text.slice(m.index + m[0].length)
  let speaker = null
  const nb = before.match(/([^\s、。!?！？「]+?)(?:は|が|も)\s*$/)
  if (nb) speaker = nb[1]
  if (!speaker) {
    const na = after.match(/^と\s*([^\s、。]+?)(?:は|が)\s*(?:いいました|言いました|ききました|聞きました|おもいました|思いました|わらいました|笑いました|聞きます)/)
    if (na) speaker = na[1]
  }
  if (!speaker) speaker = prevSpeaker || null
  return { type: 'dialogue', quote, speaker }
}

// Build the displayed scenes for a list of sentences, threading speaker context
// so a bare 「…」 line inherits the previous speaker.
export function buildSceneViews(sentences) {
  let prev = null
  return sentences.map((s) => {
    const p = parseScene(s.jp, prev)
    if (p.type === 'dialogue' && p.speaker) prev = p.speaker
    return { sentence: s, parsed: p }
  })
}
