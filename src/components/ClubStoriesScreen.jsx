import { useEffect, useState } from 'react'
import AppIcon from './AppIcon.jsx'
import { speakJapanese } from '../sounds.js'
import { getStoryState, saveStoryState, storyPercent } from '../progress/storyProgress.js'
import { buildStoryQuestions } from '../utils/storyQuestions.js'
import { collectStoryVocab, readStoryVocab } from '../progress/storyVocab.js'
import StoryQuestion from './StoryQuestion.jsx'
import JapaneseText, { buildReadingMap } from './JapaneseText.jsx'
import useExerciseSettings from '../hooks/useExerciseSettings.js'
import ExerciseSettingsSheet from './exercise/ExerciseSettingsSheet.jsx'
import { StoryNarrationCard, StoryDialogueBubble, buildSceneViews, parseScene } from './StoryScene.jsx'

// Club → Stories — engaging, scene-based reading. Library (rich cards + states)
// → pre-story modal → scene-by-scene player (progressive reveal + audio) →
// completion (XP). Built on the existing lesson reading passages.
// (Interactive question variety + gamification chest + world map = next phase.)
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで', 'よ', 'ね', 'か']
const STORY_XP = 20

// Per-story illustration (emoji) for the library cards / featured hero; lesson-
// derived passages fall back to the book glyph.
const STORY_ICONS = {
  'n5s-lost-umbrella': '☔', 'n5s-strange-bento': '🍱', 'n5s-forgotten-homework': '📝',
  'n5s-new-student': '🧑‍🎓', 'n5s-library-secret': '📚', 'n5s-missing-cat': '🐱',
  'n5s-birthday-surprise': '🎂', 'n5s-train-ticket': '🎫', 'n5s-school-festival': '🎏',
  'n5s-small-gift': '🎁',
}
const storyIcon = (st) => STORY_ICONS[st?.id] || st?.icon || '📖'

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
  const [settingsOpen, setSettingsOpen] = useState(false) // pronunciation settings sheet
  const { settings } = useExerciseSettings()
  const list = storiesByLevel[level] || []

  // Auto-play the line whenever the current step is a (new) scene — speak just
  // the spoken quote for dialogue, the whole sentence for narration.
  useEffect(() => {
    if (!play) return
    const cur = play.steps[play.stepIndex]
    if (cur?.type !== 'scene') return
    const parsed = parseScene(cur.sentence.jp)
    speakJapanese(parsed.type === 'dialogue' ? parsed.quote : cur.sentence.jp)
  }, [play?.stepIndex, play?.story?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const openStory = (story) => {
    setModalStory(null)
    collectStoryVocab(story.vocab) // auto-add story words to the vocab book
    // Authored stories carry a hand-written `script` (lines + questions already
    // interleaved); otherwise auto-generate + interleave from the content.
    let steps
    if (Array.isArray(story.script) && story.script.length) {
      steps = story.script.map((s) => (s.type === 'q'
        ? { type: 'question', q: { kind: 'mcq', prompt: s.prompt, options: s.options, answer: s.answer, explain: s.explain } }
        : { type: 'scene', sentence: { jp: s.jp, romaji: s.romaji, ar: s.ar } }))
    } else {
      const questions = buildStoryQuestions(story)
      steps = buildSteps(story.sentences, questions)
    }
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
                  : <div className="story-done-stat"><span>{t('قواعد', 'Grammar')}</span><strong>{grammarCount(fs)}</strong></div>}
              </div>
              {(fs.vocab || []).length > 0 && (
                <div className="story-done-vocab">
                  <h3>{t('كلمات تعلّمتها', 'Words you learned')}</h3>
                  <div className="story-done-vocab-list">
                    {(fs.vocab || []).slice(0, 8).map((v) => (
                      <button key={v.jp} type="button" className="story-done-word" dir="ltr" onClick={() => speakJapanese(v.hiragana || v.jp)}>
                        <span className="story-done-word-jp">{v.jp}</span>
                        <span className="story-done-word-ar" dir="rtl">{v.meaning}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn btn-primary story-done-btn" onClick={() => setFinished(null)}>{t('متابعة', 'Continue')}</button>
              <button className="story-done-back" onClick={() => { setFinished(null); openStory(fs) }}>{t('إعادة القصة', 'Replay story')}</button>
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
    // Pronunciation per global settings: Japanese mode → furigana above kanji
    // (from the story's own vocab); Romanized → full romaji line; OFF → neither.
    const showPron = settings.showPronunciation
    const romajiMode = settings.pronunciationMode === 'romanized'
    // Furigana over kanji (Japanese mode only): prefer the story's authored
    // kanji-run map, fall back to its vocab list.
    const readingMap = showPron && !romajiMode
      ? (play.story.furigana || buildReadingMap(play.story.vocab, 'hiragana'))
      : null
    const sceneViews = buildSceneViews(bubbles)
    return (
      <div className="stories-screen story-player" dir={isAr ? 'rtl' : 'ltr'}>
        <header className="stories-head">
          <button className="icon-btn" onClick={() => setPlay(null)} aria-label={t('إغلاق', 'Close')}>
            <AppIcon name="wrong" size={22} />
          </button>
          <div className="story-progress-bar"><span style={{ width: `${progress}%` }} /></div>
          {play.combo >= 2 && <span className="story-combo">🔥 {play.combo}</span>}
          <button className="icon-btn ex-settings-gear" onClick={() => setSettingsOpen(true)} aria-label={t('الإعدادات', 'Settings')}>
            <AppIcon name="settings" size={22} />
          </button>
        </header>
        <div className="story-scene">
          <div className="sc-titlecard">
            <span className={`sc-cover lvl-${level}`} aria-hidden="true">{storyIcon(play.story)}</span>
            <h2 className="sc-title-ar" dir="auto">{play.story.titleAr || play.story.title}</h2>
          </div>
          {sceneViews.map((v, i) => {
            const isNew = !inQuestion && i === sceneViews.length - 1
            const common = { romaji: v.sentence.romaji, ar: v.sentence.ar, readingMap, showRomaji: showPron && romajiMode, lang, isNew }
            return v.parsed.type === 'dialogue'
              ? <StoryDialogueBubble key={i} speaker={v.parsed.speaker} jp={v.parsed.quote} {...common} />
              : <StoryNarrationCard key={i} jp={v.sentence.jp} {...common} />
          })}
          {inQuestion && <StoryQuestion key={play.stepIndex} q={current.q} lang={lang} readingMap={readingMap} onNext={onQuestionNext} />}
        </div>
        {!inQuestion && (
          <footer className="story-player-foot">
            <button className="btn btn-primary story-continue" onClick={advance}>
              {isLastStep ? t('إنهاء القصة', 'Finish story') : t('متابعة', 'Continue')}
            </button>
          </footer>
        )}
        {settingsOpen && <ExerciseSettingsSheet lang={lang} onClose={() => setSettingsOpen(false)} onEndSession={() => setPlay(null)} />}
      </div>
    )
  }

  // ── Library ────────────────────────────────────────────────────────────────
  // Featured = the story to resume (in-progress), else the next unfinished, else the first.
  const withState = list.map((st) => ({ st, s: getStoryState(st.id) }))
  const featured = list.length
    ? (withState.find((x) => x.s.sceneIndex > 0 && !x.s.completed)
      || withState.find((x) => !x.s.completed)
      || withState[0]).st
    : null
  const cardState = (s, total) => {
    const pct = storyPercent(s, total)
    if (s.completed && (s.accuracy || 0) >= 90) return { cls: 'mastered', pct, badge: '★' }
    if (s.completed) return { cls: 'done', pct, badge: '✓' }
    if (pct > 0) return { cls: 'progress', pct, badge: null }
    return { cls: '', pct, badge: null }
  }

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

      <div className="stories-body">
        {featured && (() => {
          const fs = getStoryState(featured.id)
          const fpct = storyPercent(fs, featured.sentences.length)
          const word = featured.vocab?.[0]?.jp || featured.vocab?.[0]?.hiragana
          const cta = fs.completed ? t('مراجعة', 'Review') : fpct > 0 ? t('متابعة', 'Continue') : t('ابدأ', 'Start')
          return (
            <section className="story-feature">
              <span className={`story-feature-art lvl-${level}`} aria-hidden="true">{storyIcon(featured)}</span>
              <h2 className="story-feature-title" dir="auto">{featured.titleAr || featured.title}</h2>
              <p className="story-feature-sub" dir="auto">
                {word ? t(`راجع كلمات مثل «${word}»`, `Review words like “${word}”`) : t('قصة تفاعلية قصيرة', 'A short interactive story')}
              </p>
              <button className="btn btn-primary story-feature-cta" onClick={() => openStory(featured)}>{cta} +{STORY_XP} XP</button>
            </section>
          )
        })()}

        <h2 className="story-lib-title">{t('مكتبة القصص', 'Your library')}</h2>

        <div className="stories-grid">
          {list.length ? list.map((st) => {
            const cs = cardState(getStoryState(st.id), st.sentences.length)
            return (
              <button key={st.id} type="button" className={`story-card ${cs.cls}`} onClick={() => setModalStory(st)}>
                <span className={`story-card-art lvl-${level}`} aria-hidden="true">
                  <span className="story-card-emoji">{storyIcon(st)}</span>
                  {cs.badge && <span className={`story-card-badge ${cs.cls}`}>{cs.badge}</span>}
                </span>
                <span className="story-card-title" dir="auto">{st.titleAr || st.title}</span>
                {cs.cls === 'progress' && <span className="story-card-bar"><span style={{ width: `${cs.pct}%` }} /></span>}
              </button>
            )
          }) : (
            <p className="stories-empty">{t('لا توجد قصص لهذا المستوى بعد.', 'No stories for this level yet.')}</p>
          )}
        </div>
      </div>

      {modalStory && (() => {
        const state = getStoryState(modalStory.id)
        const pct = storyPercent(state, modalStory.sentences.length)
        const cta = state.completed ? t('مراجعة', 'Review') : pct > 0 ? t('متابعة', 'Continue') : t('ابدأ القصة', 'Start story')
        return (
          <div className="story-modal" dir={isAr ? 'rtl' : 'ltr'}>
            <button className="story-modal-backdrop" aria-label={t('إغلاق', 'Close')} onClick={() => setModalStory(null)} />
            <div className="story-modal-card" role="dialog" aria-modal="true">
              <span className={`story-modal-thumb lvl-${level}`} aria-hidden="true">{storyIcon(modalStory)}</span>
              <h2 dir="auto">{modalStory.titleAr || modalStory.title}</h2>
              <div className="story-modal-chips">
                <span className={`story-badge lvl-${level}`}>{t('المستوى', 'Level')} {level}</span>
                <span>⏱ {durationMin(modalStory)} {t('دقيقة', 'min')}</span>
                <span>⚡ {STORY_XP} XP</span>
              </div>
              <div className="story-modal-stats">
                <div><span>{t('مفردات', 'Vocab')}</span><strong>{(modalStory.vocab || []).length}</strong></div>
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
