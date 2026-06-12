// Phase 8 — achievements model. Pure functions only; the UI renders the result.
//
// Each achievement is measured against a real learner stat with a target, so
// locked achievements can show honest progress (value/target). Arabic copy is
// encouraging but mature — no childish tone, no harsh punishment for misses.

// stats shape: {
//   xp, streak, reviewStreak, totalQuizzes, perfectScores,
//   completedLessons, masteredLessons, masteredVocab, accuracyPct
// }
export const ACHIEVEMENTS = [
  { id: 'first_lesson', icon: 'correct', titleAr: 'أول خطوة', titleEn: 'First step', descAr: 'أكملت أول درس', target: 1, value: (s) => s.completedLessons },
  { id: 'five_lessons', icon: 'quiz', titleAr: 'انطلاقة قوية', titleEn: 'Strong start', descAr: 'أكملت ٥ دروس', target: 5, value: (s) => s.completedLessons },
  { id: 'ten_lessons', icon: 'goal', titleAr: 'عشرة دروس', titleEn: 'Ten lessons', descAr: 'أكملت ١٠ دروس', target: 10, value: (s) => s.completedLessons },
  { id: 'streak_3', icon: 'streak', titleAr: 'انتظام ثلاثة أيام', titleEn: '3-day streak', descAr: 'تعلّمت ٣ أيام متتالية', target: 3, value: (s) => s.streak },
  { id: 'streak_7', icon: 'streak', titleAr: 'أسبوع متواصل', titleEn: '7-day streak', descAr: 'تعلّمت ٧ أيام متتالية', target: 7, value: (s) => s.streak },
  { id: 'streak_30', icon: 'streak', titleAr: 'شهر من الالتزام', titleEn: '30-day streak', descAr: 'تعلّمت ٣٠ يوماً متتالياً', target: 30, value: (s) => s.streak },
  { id: 'review_streak_7', icon: 'next', titleAr: 'مراجع منتظم', titleEn: 'Steady reviewer', descAr: 'راجعت ٧ أيام متتالية', target: 7, value: (s) => s.reviewStreak },
  { id: 'xp_500', icon: 'star', titleAr: '٥٠٠ نقطة خبرة', titleEn: '500 XP', descAr: 'جمعت ٥٠٠ نقطة خبرة', target: 500, value: (s) => s.xp },
  { id: 'xp_2000', icon: 'star', titleAr: '٢٠٠٠ نقطة خبرة', titleEn: '2000 XP', descAr: 'جمعت ٢٠٠٠ نقطة خبرة', target: 2000, value: (s) => s.xp },
  { id: 'mastered_3', icon: 'star', titleAr: 'إتقان ثلاثة دروس', titleEn: '3 lessons mastered', descAr: 'أتقنت ٣ دروس (دقة عالية)', target: 3, value: (s) => s.masteredLessons },
  { id: 'accuracy_90', icon: 'correct', titleAr: 'دقة عالية', titleEn: 'High accuracy', descAr: 'بلغت دقة ٩٠٪ أو أكثر', target: 90, value: (s) => s.accuracyPct },
  { id: 'perfect_quiz', icon: 'star', titleAr: 'درجة كاملة', titleEn: 'Perfect score', descAr: 'حصلت على درجة كاملة في اختبار', target: 1, value: (s) => s.perfectScores },
]

// Evaluate all achievements against the learner's stats.
export function evaluateAchievements(stats) {
  const s = {
    xp: 0, streak: 0, reviewStreak: 0, totalQuizzes: 0, perfectScores: 0,
    completedLessons: 0, masteredLessons: 0, masteredVocab: 0, accuracyPct: 0,
    ...stats,
  }
  return ACHIEVEMENTS.map((a) => {
    const value = a.value(s) || 0
    return {
      ...a,
      value,
      unlocked: value >= a.target,
      progress: Math.max(0, Math.min(1, value / a.target)),
    }
  })
}

export function countUnlocked(evaluated) {
  return evaluated.filter((a) => a.unlocked).length
}
