import { useEffect, useState } from 'react'
import AppIcon from './AppIcon.jsx'
import { speakJapanese } from '../sounds.js'
import { getStoryState, saveStoryState, storyPercent } from '../progress/storyProgress.js'
import { buildStoryQuestions } from '../utils/storyQuestions.js'
import { collectStoryVocab, readStoryVocab } from '../progress/storyVocab.js'
import StoryQuestion from './StoryQuestion.jsx'

// Club → Stories — engaging, scene-based reading. Library (rich cards + states)
// → pre-story modal → scene-by-scene player (progressive reveal + audio) →
// completion (XP). Built on the existing lesson reading passages.
// (Interactive question variety + gamification chest + world map = next phase.)
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで', 'よ', 'ね', 'か']
const STORY_XP = 20

const wordsCount = (s) => s.sentences.reduce((n, x) => n + (x.romaji ? x.romaji.split(/\s+/).filter(Boolean).length : Math.ceil((x.jp || '').length / 2)), 0)
const grammarCount = (s) => { const text = s.sentences.map((x) => x.jp).join(''); return PARTICLES.filter((p) => text.includes(p)).length }
const durationMin = (s) => Math.max(1, Math.round((s.sentences.length * 8) / 60))

// Interleave dialogue + questions into a single timeline: a question appears
// after every 2 scenes (never >2 bubbles before an interaction), leftovers near
// the end. This is the "live story" structure — questions DURING, not after.
function buildSteps(sentences, questions) {
  const steps = []
  let qi = 0
  sentences.forEach((s, i) => {
    steps.push({ type: 'scene', sentence: s })
    const isLast = i === sentences.length - 1
    if (!isLast && (i + 1) % 2 === 0 && qi < questions.length) {
      steps.push({ type: 'question', q: questions[qi++] })
    }
  })
  while (qi < questions.length) steps.push({ type: 'question', q: questions[qi++] })
  return steps
}

const scenesUpTo = (steps, idx) => steps.slice(0, idx + 1).filter((s) => s.type === 'scene').length

export default function ClubStoriesScreen({ lang, storiesByLevel = {}, onClose, onComplete }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const firstWithStories = LEVELS.find((l) => (storiesByLevel[l] || []).length) || 'N5'
  const [level, setLevel] = useState(firstWithStories)
  const [modalStory, setModalStory] = useState(null) // pre-story modal
  const [play, setPlay] = useState(null) // { story, revealed }
  const [finished, setFinished] = useState(null) // completed story summary
  const [chestOpen, setChestOpen] = useState(false) // completion chest reveal
  const [showVocab, setShowVocab] = useState(false) // vocabulary collection view
  const list = storiesByLevel[level] || []

  // Auto-play the line whenever the current step is a (new) scene.
  useEffect(() => {
    if (!play) return
    const cur = play.steps[play.stepIndex]
    if (cur?.type === 'scene') speakJapanese(cur.sentence.jp)
  }, [play?.stepIndex, play?.story?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const openStory = (story) => {
    setModalStory(null)
    collectStoryVocab(story.vocab) // auto-add story words to the vocab book
    const questions = buildStoryQuestions(story)
    const steps = buildSteps(story.sentences, questions)
    const totalQ = steps.filter((s) => s.type === 'question').length
    // Resume to the saved scene (start fresh if completed).
    const savedScenes = Math.min(getStoryState(story.id).sceneIndex || 0, story.sentences.length)
    let resume = 0
    if (savedScenes > 0 && savedScenes < story.sentences.length) {
      let sc = 0
      for (let i = 0; i < steps.length; i += 1) { if (steps[i].type === 'scene') { sc += 1; if (sc >= savedScenes) { resume = i; break } } }
    }
    setPlay({ story, steps, stepIndex: resume, correct: 0, totalQ, combo: 0, bestCombo: 0 })
  }

  const finishStory = (correct, totalQ, bestCombo = 0) => {
    const story = play.story
    const accuracy = totalQ ? Math.round((correct / totalQ) * 100) : 100
    const stars = totalQ ? (accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1) : 3
    const xp = STORY_XP + correct * 5 + (bestCombo >= 3 ? 5 : 0)
    saveStoryState(story.id, { completed: true, sceneIndex: story.sentences.length, plays: getStoryState(story.id).plays + 1, accuracy })
    onComplete?.(xp)
    setChestOpen(false)
    setFinished({ story, accuracy, stars, xp, correct, totalQ, bestCombo })
    setPlay(null)
  }

  // Advance past a scene step (footer Continue).
  const advance = () => {
    if (!play) return
    if (play.stepIndex >= play.steps.length - 1) { finishStory(play.correct, play.totalQ, play.bestCombo); return }
    const nextIndex = play.stepIndex + 1
    saveStoryState(play.story.id, { sceneIndex: scenesUpTo(play.steps, nextIndex) })
    setPlay({ ...play, stepIndex: nextIndex })
  }

  // Advance past a question step (from the question's Continue).
  const onQuestionNext = (isCorrect) => {
    const correct = play.correct + (isCorrect ? 1 : 0)
    const combo = isCorrect ? play.combo + 1 : 0
    const bestCombo = Math.max(play.bestCombo, combo)
    if (play.stepIndex >= play.steps.length - 1) { finishStory(correct, play.totalQ, bestCombo); return }
    setPlay({ ...play, stepIndex: play.stepIndex + 1, correct, combo, bestCombo })
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (finished) {
    const fs = finished.story
    return (
      <div className="stories-screen" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="story-done">
          {!chestOpen ? (
            <>
              <button type="button" className="story-chest" onClick={() => setChestOpen(true)} aria-label={t('افتح الصندوق', 'Open chest')}>🎁</button>
              <h1>{t('أكملت القصة!', 'Story complete!')}</h1>
              <p>{t('اضغط لفتح صندوق المكافأة', 'Tap to open your reward chest')}</p>
            </>
          ) : (
            <>
              <div className="story-done-burst" aria-hidden="true">🎉</div>
              <h1>{t('أحسنت!', 'Well done!')}</h1>
              <p>{fs.titleAr || fs.title}</p>
              <div className="story-done-stars" aria-hidden="true">
                {[1, 2, 3].map((s) => <span key={s} className={s <= finished.stars ? 'on' : ''}>★</span>)}
              </div>
              <div className="story-done-stats">
                <div className="story-done-stat xp"><span>{t('نقاط الخبرة', 'XP')}</span><strong>⚡ {finished.xp}</strong></div>
                <div className="story-done-stat"><span>{t('الدقة', 'Accuracy')}</span><strong>{finished.accuracy}%</strong></div>
                {finished.bestCombo >= 2
                  ? <div className="story-done-stat"><span>{t('أفضل تتابع', 'Best streak')}</span><strong>🔥 {finished.bestCombo}</strong></div>
                  : <div className="story-done-stat"><span>{t('كلمات', 'Words')}</span><strong>{wordsCount(fs)}</strong></div>}
              </div>
              <button className="btn btn-primary story-done-btn" onClick={() => { setFinished(null); openStory(fs) }}>{t('إعادة', 'Replay')}</button>
              <button className="story-done-back" onClick={() => setFinished(null)}>{t('رجوع للمكتبة', 'Back to library')}</button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Vocabulary collection ───────────────────────────────────────────────────
  if (showVocab) {
    const words = readStoryVocab().slice().reverse()
    return (
      <div className="stories-screen" dir={isAr ? 'rtl' : 'ltr'}>
        <header className="stories-head">
          <button className="icon-btn" onClick={() => setShowVocab(false)} aria-label={t('رجوع', 'Back')}>
            <AppIcon name="back" size={22} />
          </button>
          <h1>{t('كلماتي', 'My words')}</h1>
        </header>
        <div className="vocabbook-list">
          {words.length ? words.map((w) => (
            <button key={w.key} type="button" className="vocabbook-card" dir="ltr" onClick={() => speakJapanese(w.reading || w.jp)}>
              <span className="vocabbook-jp">{w.jp} <AppIcon name="sound" size={14} /></span>
              {w.reading && w.reading !== w.jp && <span className="vocabbook-reading">{w.reading}</span>}
              <span className="vocabbook-meaning" dir="rtl">{w.meaning}</span>
            </button>
          )) : (
            <p className="stories-empty">{t('ستظهر كلمات القصص التي تقرأها هنا.', 'Words from stories you read will appear here.')}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Live story player (dialogue + interleaved questions) ────────────────────
  if (play) {
    const steps = play.steps
    const current = steps[play.stepIndex]
    const bubbles = steps.slice(0, play.stepIndex + 1).filter((s) => s.type === 'scene').map((s) => s.sentence)
    const inQuestion = current?.type === 'question'
    const isLastStep = play.stepIndex >= steps.length - 1
    const progress = Math.round(((play.stepIndex + 1) / steps.length) * 100)
    return (
      <div className="stories-screen story-player" dir={isAr ? 'rtl' : 'ltr'}>
        <header className="stories-head">
          <button className="icon-btn" onClick={() => setPlay(null)} aria-label={t('إغلاق', 'Close')}>
            <AppIcon name="wrong" size={22} />
          </button>
          <div className="story-progress-bar"><span style={{ width: `${progress}%` }} /></div>
          {play.combo >= 2 && <span className="story-combo">🔥 {play.combo}</span>}
        </header>
        <div className="story-scene">
          {bubbles.map((s, i) => (
            <div key={i} className={`story-bubble ${!inQuestion && i === bubbles.length - 1 ? 'is-new' : ''}`}>
              <span className="story-bubble-avatar" aria-hidden="true">先生</span>
              <button type="button" className="story-bubble-body" dir="ltr" onClick={() => speakJapanese(s.jp)}>
                <span className="story-bubble-jp">{s.jp} <AppIcon name="sound" size={14} /></span>
                {s.romaji && <span className="story-bubble-romaji">{s.romaji}</span>}
                {s.ar && <span className="story-bubble-ar" dir="rtl">{s.ar}</span>}
              </button>
            </div>
          ))}
          {inQuestion && <StoryQuestion key={play.stepIndex} q={current.q} lang={lang} onNext={onQuestionNext} />}
        </div>
        {!inQuestion && (
          <footer className="story-player-foot">
            <button className="btn btn-primary story-continue" onClick={advance}>
              {isLastStep ? t('إنهاء القصة', 'Finish story') : t('متابعة', 'Continue')}
            </button>
          </footer>
        )}
      </div>
    )
  }

  // ── Library ────────────────────────────────────────────────────────────────
  return (
    <div className="stories-screen" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="stories-head">
        <button className="icon-btn" onClick={onClose} aria-label={t('رجوع', 'Back')}>
          <AppIcon name="back" size={22} />
        </button>
        <h1>{t('القصص', 'Stories')}</h1>
        <button className="icon-btn stories-vocab-btn" onClick={() => setShowVocab(true)} aria-label={t('كلماتي', 'My words')} title={t('كلماتي', 'My words')}>
          <AppIcon name="vocabulary" size={22} />
        </button>
      </header>

      <div className="stories-levels">
        {LEVELS.map((l) => (
          <button key={l} type="button" className={`stories-level ${level === l ? 'active' : ''}`} disabled={!(storiesByLevel[l] || []).length} onClick={() => setLevel(l)}>{l}</button>
        ))}
      </div>

      <div className="stories-grid">
        {list.length ? list.map((st) => {
          const state = getStoryState(st.id)
          const pct = storyPercent(state, st.sentences.length)
          return (
            <button key={st.id} type="button" className={`story-tile ${state.completed ? 'done' : ''}`} onClick={() => setModalStory(st)}>
              <span className={`story-tile-thumb lvl-${level}`} aria-hidden="true">{state.completed ? '✓' : '📖'}</span>
              <span className="story-tile-meta">
                <strong dir="auto">{st.titleAr || st.title}</strong>
                <span className="story-tile-sub">
                  <span className={`story-badge lvl-${level}`}>{level}</span>
                  <span>⚡ {STORY_XP}</span>
                  <span>· {durationMin(st)} {t('د', 'min')}</span>
                </span>
              </span>
              <span className="story-ring" style={{ '--pct': pct }} aria-hidden="true"><span>{state.completed ? '100%' : `${pct}%`}</span></span>
            </button>
          )
        }) : (
          <p className="stories-empty">{t('لا توجد قصص لهذا المستوى بعد.', 'No stories for this level yet.')}</p>
        )}
      </div>

      {modalStory && (() => {
        const state = getStoryState(modalStory.id)
        const pct = storyPercent(state, modalStory.sentences.length)
        const cta = state.completed ? t('مراجعة', 'Review') : pct > 0 ? t('متابعة', 'Continue') : t('ابدأ القصة', 'Start story')
        return (
          <div className="story-modal" dir={isAr ? 'rtl' : 'ltr'}>
            <button className="story-modal-backdrop" aria-label={t('إغلاق', 'Close')} onClick={() => setModalStory(null)} />
            <div className="story-modal-card" role="dialog" aria-modal="true">
              <span className={`story-modal-thumb lvl-${level}`} aria-hidden="true">{state.completed ? '✓' : '📖'}</span>
              <h2 dir="auto">{modalStory.titleAr || modalStory.title}</h2>
              <div className="story-modal-chips">
                <span className={`story-badge lvl-${level}`}>{level}</span>
                <span>⏱ {durationMin(modalStory)} {t('دقيقة', 'min')}</span>
                <span>⚡ {STORY_XP} XP</span>
              </div>
              <div className="story-modal-stats">
                <div><span>{t('كلمات', 'Words')}</span><strong>{wordsCount(modalStory)}</strong></div>
                <div><span>{t('قواعد', 'Grammar')}</span><strong>{grammarCount(modalStory)}</strong></div>
                <div><span>{t('الإكمال', 'Complete')}</span><strong>{pct}%</strong></div>
              </div>
              <button className="btn btn-primary story-modal-cta" onClick={() => openStory(modalStory)}>{cta}</button>
              <button className="story-modal-close" onClick={() => setModalStory(null)}>{t('إغلاق', 'Close')}</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
