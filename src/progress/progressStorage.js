// Storage for the new learning-progress data (SRS + mistake log).
// Kept in its own localStorage key, separate from the existing
// `nihongo-guest-state` blob, so the new models are purely additive
// and never collide with the current save/load logic in App.jsx.

import { recordAnswer } from './srsModel.js'
import { recordMistake } from './mistakeLog.js'

const STORAGE_KEY = 'nihongo-learning-progress'

function emptyState() {
  return { srs: {}, mistakes: {}, lessons: {} }
}

export function readProgressState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved) return emptyState()
    return { ...emptyState(), ...saved }
  } catch {
    return emptyState()
  }
}

export function writeProgressState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Convenience helper: call this from quiz/exercise answer-checking code
// with the item being practiced and whether the answer was correct.
// Updates both the SRS schedule and (on wrong answers) the mistake log,
// then persists the combined state.
// Mark a named lesson section (warmup/vocabulary/grammar/practice/…) as
// engaged. Stored under lessons[lessonId].sections so the guided lesson path
// can show per-section progress (Phase 2 #4 / microlearning chunking).
export function markSectionVisited(state, lessonId, sectionType, now = Date.now()) {
  if (!lessonId || !sectionType) return state
  const lessonId2 = String(lessonId)
  const prev = state.lessons?.[lessonId2] || { attempts: 0, correct: 0, lastPracticedAt: 0 }
  if (prev.sections?.[sectionType]) return state // already marked
  const next = {
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId2]: {
        ...prev,
        sections: { ...(prev.sections || {}), [sectionType]: now },
      },
    },
  }
  writeProgressState(next)
  return next
}

export function getVisitedSections(state, lessonId) {
  return state.lessons?.[String(lessonId)]?.sections || {}
}

// Local calendar day key (not UTC) so streaks reflect the learner's own days.
function dayKey(now) {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Review streak — consecutive days the learner completed a Smart Review
// session. Distinct from the lesson/daily streak. Call once per finished
// review session.
export function recordReviewActivity(state, now = Date.now()) {
  const today = dayKey(now)
  const rs = state.reviewStreak || { count: 0, lastDate: '' }
  if (rs.lastDate === today) return state // already counted today
  const yesterday = dayKey(now - 24 * 60 * 60 * 1000)
  const nextCount = rs.lastDate === yesterday ? rs.count + 1 : 1
  const next = { ...state, reviewStreak: { count: nextCount, lastDate: today } }
  writeProgressState(next)
  return next
}

// Current review streak, or 0 if it lapsed (last review before yesterday).
export function getReviewStreak(state, now = Date.now()) {
  const rs = state.reviewStreak
  if (!rs || !rs.lastDate) return 0
  const today = dayKey(now)
  const yesterday = dayKey(now - 24 * 60 * 60 * 1000)
  return rs.lastDate === today || rs.lastDate === yesterday ? rs.count : 0
}

// Per-lesson accuracy accumulator. Call ONCE per answered question (not once
// per tracked item) so accuracy reflects questions, not grammar/vocab sub-tags.
// Powers the Mastery System: completion ≠ mastery, mastery needs accuracy too.
export function recordLessonStat(state, lessonId, wasCorrect, now = Date.now()) {
  if (!lessonId) return state
  const prev = state.lessons?.[lessonId] || { attempts: 0, correct: 0, lastPracticedAt: 0 }
  const next = {
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (wasCorrect ? 1 : 0),
        lastPracticedAt: now,
      },
    },
  }
  writeProgressState(next)
  return next
}

export function trackAnswer(state, { itemId, itemType, wasCorrect, lessonId, exerciseType, questionAr }, now = Date.now()) {
  const srsKey = `${itemType}:${itemId}`
  const nextSrs = {
    ...state.srs,
    [srsKey]: recordAnswer(state.srs[srsKey], itemId, itemType, wasCorrect, now),
  }
  const nextMistakes = wasCorrect
    ? state.mistakes
    : recordMistake(state.mistakes, { itemId, itemType, lessonId, exerciseType, questionAr }, now)

  const next = { ...state, srs: nextSrs, mistakes: nextMistakes }
  writeProgressState(next)
  return next
}
