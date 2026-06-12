import { useMemo } from 'react'
import AppIcon from '../AppIcon.jsx'
import { readProgressState } from '../../progress/progressStorage.js'
import { getWeakItems } from '../../progress/mistakeLog.js'

const DAILY_GOAL = 15

// Calm dashboard widget — information hierarchy over completeness:
//   P1 (always): Continue Learning, Daily Goal
//   P2 (only when relevant): Reviews Due, Weak Areas
// Streak/XP live in the global topbar; deeper stats live behind
// "View Progress" (profile). Nothing here repeats them.
export default function TodayWidget({ lang, t, recommendedLesson, onContinue, onReview }) {
  const { reviewDueCount, weakGrammar, weakVocab, practicedToday } = useMemo(() => {
    const state = readProgressState()
    const now = Date.now()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const todayStart = startOfToday.getTime()

    const srsValues = Object.values(state.srs || {})
    const reviewDueCount = srsValues.filter((record) => record.nextReviewAt <= now).length
    const practicedToday = srsValues.filter((record) => (record.lastReviewedAt || 0) >= todayStart).length

    const weak = getWeakItems(state.mistakes)
    const weakGrammar = weak.filter((r) => r.itemType === 'grammar').length
    const weakVocab = weak.filter((r) => r.itemType === 'vocab').length
    return { reviewDueCount, weakGrammar, weakVocab, practicedToday }
  }, [])

  const weakTotal = weakGrammar + weakVocab
  const goalPct = Math.min(100, Math.round((practicedToday / DAILY_GOAL) * 100))
  const goalMet = practicedToday >= DAILY_GOAL

  return (
    <div className="today-widget">
      {/* P1 — the one primary action */}
      {recommendedLesson && (
        <div className="today-recommend">
          <div className="today-recommend-copy">
            <p className="eyebrow">{t.recommendedLesson}</p>
            <h3>{t.lesson} {recommendedLesson.displayLessonNumber}</h3>
          </div>
          <button className="today-continue-btn" onClick={onContinue}>
            {t.continueCta}
            <AppIcon name="next" size={18} />
          </button>
        </div>
      )}

      {/* P1 — daily goal */}
      <div className="today-goal">
        <div className="today-goal-head">
          <span className="today-goal-label">{t.dailyGoal}</span>
          <span className="today-goal-count">{Math.min(practicedToday, DAILY_GOAL)}/{DAILY_GOAL}</span>
        </div>
        <div className="today-goal-bar">
          <span style={{ width: `${goalPct}%` }} className={goalMet ? 'met' : ''} />
        </div>
        {goalMet && <p className="today-goal-done">{t.goalReached}</p>}
      </div>

      {/* P2 — only when there is actually something to review */}
      {(reviewDueCount > 0 || weakTotal > 0) && onReview && (
        <button className="today-review-cta" onClick={onReview}>
          <AppIcon name="quiz" size={20} />
          <span>{reviewDueCount > 0 ? `${reviewDueCount} ${t.reviewsDue}` : t.reviewWidgetCta}</span>
          <strong>{t.startReview}</strong>
        </button>
      )}

      {/* P2 — only when weak areas exist */}
      {weakTotal > 0 && (
        <div className="today-weak-row">
          <div className={`today-weak-card ${weakGrammar > 0 ? 'has-weak' : ''}`}>
            <span className="today-weak-num">{weakGrammar}</span>
            <span className="today-weak-label">{t.weakGrammar}</span>
          </div>
          <div className={`today-weak-card ${weakVocab > 0 ? 'has-weak' : ''}`}>
            <span className="today-weak-num">{weakVocab}</span>
            <span className="today-weak-label">{t.weakVocab}</span>
          </div>
        </div>
      )}
    </div>
  )
}
