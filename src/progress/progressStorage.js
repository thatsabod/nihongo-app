// Storage for the new learning-progress data (SRS + mistake log).
// Kept in its own localStorage key, separate from the existing
// `nihongo-guest-state` blob, so the new models are purely additive
// and never collide with the current save/load logic in App.jsx.

import { recordAnswer, scheduleNext, createSrsRecord } from './srsModel.js'
import { recordMistake } from './mistakeLog.js'

const STORAGE_KEY = 'nihongo-learning-progress'

// Fired after every write so App.jsx can debounce-sync the store to the cloud
// without lifting all progress state into React.
export const PROGRESS_CHANGED_EVENT = 'nihongo-progress-changed'

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

export function writeProgressState(state, { silent = false } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  // `silent` is used when hydrating from the cloud on login, so we don't echo
  // a freshly-loaded state straight back up to the server.
  if (!silent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROGRESS_CHANGED_EVENT))
  }
}

// Pick the more-recently-touched of two records (timestamp field varies by type).
function pickNewer(a, b, tsField) {
  if (!a) return b
  if (!b) return a
  return (b[tsField] || 0) >= (a[tsField] || 0) ? b : a
}

function mergeLessonRecord(a, b) {
  if (!a) return b
  if (!b) return a
  const newerStats = pickNewer(a, b, 'lastPracticedAt') || {}
  return {
    ...a,
    ...b,
    attempts: Math.max(a.attempts || 0, b.attempts || 0, newerStats.attempts || 0),
    correct: Math.max(a.correct || 0, b.correct || 0, newerStats.correct || 0),
    lastPracticedAt: Math.max(a.lastPracticedAt || 0, b.lastPracticedAt || 0),
    sections: {
      ...(a.sections || {}),
      ...(b.sections || {}),
    },
  }
}

// Merge two progress states: union of keys, latest-write-wins per key. Used to
// reconcile a device's local store with the account's cloud copy at login so
// neither side loses data (e.g. a guest who practised, then signed in).
export function mergeProgressState(a = emptyState(), b = emptyState()) {
  const out = emptyState()
  const buckets = [
    ['srs', 'lastReviewedAt'],
    ['mistakes', 'lastWrongAt'],
  ]
  for (const [bucket, ts] of buckets) {
    const keys = new Set([...Object.keys(a[bucket] || {}), ...Object.keys(b[bucket] || {})])
    for (const key of keys) {
      out[bucket][key] = pickNewer(a[bucket]?.[key], b[bucket]?.[key], ts)
    }
  }
  const lessonKeys = new Set([...Object.keys(a.lessons || {}), ...Object.keys(b.lessons || {})])
  for (const key of lessonKeys) {
    out.lessons[key] = mergeLessonRecord(a.lessons?.[key], b.lessons?.[key])
  }
  // Carry the review-streak (keep the most recent by lastDate) so it survives
  // login-merge instead of being silently dropped.
  const ra = a.reviewStreak
  const rb = b.reviewStreak
  if (ra || rb) {
    out.reviewStreak = !ra ? rb : !rb ? ra : (String(rb.lastDate) >= String(ra.lastDate) ? rb : ra)
  }
  // Seen-achievements is append-only, so union both sides (never drop one
  // device's history). Left absent when neither side ever initialised it, which
  // preserves the "first run → seed silently" signal in App.jsx.
  const sa = a.seenAchievements
  const sb = b.seenAchievements
  if (sa || sb) {
    out.seenAchievements = Array.from(new Set([...(sa || []), ...(sb || [])]))
  }
  return out
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
  const lessonId2 = String(lessonId)
  const prev = state.lessons?.[lessonId2] || { attempts: 0, correct: 0, lastPracticedAt: 0 }
  const next = {
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId2]: {
        ...prev,
        attempts: prev.attempts + 1,
        correct: prev.correct + (wasCorrect ? 1 : 0),
        lastPracticedAt: now,
      },
    },
  }
  writeProgressState(next)
  return next
}

// `quality` (optional, 0–5 SM-2 grade) lets confidence-graded answers
// (Forgot/Hard/Easy in Smart Review) schedule with their real grade instead of
// the boolean 4/2 collapse. When omitted, behaviour is unchanged for every
// existing auto-graded caller. `wasCorrect` still drives the mistake log.
export function trackAnswer(state, { itemId, itemType, wasCorrect, quality, lessonId, exerciseType, questionAr }, now = Date.now()) {
  const srsKey = `${itemType}:${itemId}`
  const nextRecord = quality == null
    ? recordAnswer(state.srs[srsKey], itemId, itemType, wasCorrect, now)
    : scheduleNext(state.srs[srsKey] || createSrsRecord(itemId, itemType), quality, now)
  const nextSrs = { ...state.srs, [srsKey]: nextRecord }
  const nextMistakes = wasCorrect
    ? state.mistakes
    : recordMistake(state.mistakes, { itemId, itemType, lessonId, exerciseType, questionAr }, now)

  const next = { ...state, srs: nextSrs, mistakes: nextMistakes }
  writeProgressState(next)
  return next
}

// Phase D — record a freeform speaking correction captured from a live Call
// Sensei session. Unlike trackAnswer (which schedules a lesson item), this
// stores the full {you,better,why} payload on the mistake record and seeds an
// SRS entry due immediately, so the correction surfaces in the next Smart
// Review and then follows normal SM-2 once the learner grades it.
export function recordSpeakingMistake(state, { itemId, data, questionAr }, now = Date.now()) {
  const srsKey = `speaking:${itemId}`
  const existing = state.srs[srsKey]
  const srsRecord = existing
    ? { ...existing, nextReviewAt: Math.min(existing.nextReviewAt || now, now) }
    : { ...createSrsRecord(itemId, 'speaking'), nextReviewAt: now }
  const next = {
    ...state,
    srs: { ...state.srs, [srsKey]: srsRecord },
    mistakes: recordMistake(state.mistakes, { itemId, itemType: 'speaking', exerciseType: 'speaking', questionAr, data }, now),
  }
  writeProgressState(next)
  return next
}

// Achievement-unlock moment (Phase 5). We persist the set of achievement ids
// the learner has already been shown so the "unlocked!" toast fires exactly
// once per achievement and never re-fires on reload/cross-device. A returning
// learner whose field is still undefined gets seeded silently (see App.jsx) so
// pre-existing unlocks don't all toast at once.
export function getSeenAchievements(state) {
  return state.seenAchievements // undefined === never initialised
}

export function markAchievementsSeen(state, ids) {
  const next = { ...state, seenAchievements: Array.from(new Set(ids || [])) }
  writeProgressState(next)
  return next
}
