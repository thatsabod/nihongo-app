// Mastery model — derives a lesson's mastery level from recall accuracy and
// section completion. Core principle (Phase 4.D): COMPLETION ≠ MASTERY. A
// student can finish every section (completion) yet still recall poorly
// (low mastery). Mastery requires both coverage and accuracy over time.
//
// Pure functions only — operate on the `lessons` accuracy map written by
// recordLessonStat (`{ [lessonId]: { attempts, correct, lastPracticedAt } }`).

const DAY_MS = 24 * 60 * 60 * 1000

export function getLessonStat(lessons, lessonId) {
  return lessons?.[lessonId] || { attempts: 0, correct: 0, lastPracticedAt: 0 }
}

export function getAccuracy(stat) {
  if (!stat || stat.attempts === 0) return 0
  return stat.correct / stat.attempts
}

// masteryLevel 0–5. Blends completion (40%) and accuracy (60%) so accuracy
// dominates. Below a minimum sample size we cap the level — a single lucky
// answer should not read as "mastered".
export function getMasteryLevel(completionRatio, accuracy, attempts) {
  if (attempts < 3) return Math.min(2, Math.round(completionRatio * 2))
  const blended = completionRatio * 0.4 + accuracy * 0.6
  return Math.max(0, Math.min(5, Math.round(blended * 5)))
}

export function getReviewStatus(masteryLevel, attempts) {
  if (attempts === 0) return 'new'
  if (masteryLevel >= 5) return 'mastered'
  if (masteryLevel >= 3) return 'familiar'
  return 'learning'
}

// Returns a full mastery snapshot for one lesson.
export function getLessonMastery(lessons, lessonId, completed, total, now = Date.now()) {
  const stat = getLessonStat(lessons, String(lessonId))
  const completionRatio = total > 0 ? Math.min(1, completed / total) : 0
  const accuracy = getAccuracy(stat)
  const masteryLevel = getMasteryLevel(completionRatio, accuracy, stat.attempts)
  const status = getReviewStatus(masteryLevel, stat.attempts)
  const needsRefresh = stat.lastPracticedAt > 0 && now - stat.lastPracticedAt > 7 * DAY_MS
  return {
    attempts: stat.attempts,
    accuracy,
    accuracyPct: Math.round(accuracy * 100),
    completionRatio,
    masteryLevel,
    status,
    needsRefresh,
    lastPracticedAt: stat.lastPracticedAt,
  }
}

// Short bilingual label for a review status.
export function masteryStatusLabel(status, isAr) {
  switch (status) {
    case 'mastered': return isAr ? 'متقَن' : 'Mastered'
    case 'familiar': return isAr ? 'مألوف' : 'Familiar'
    case 'learning': return isAr ? 'قيد التعلّم' : 'Learning'
    default: return isAr ? 'جديد' : 'New'
  }
}
