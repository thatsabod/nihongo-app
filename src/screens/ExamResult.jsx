import { useEffect, useState } from 'react'
import AppIcon from '../components/AppIcon.jsx'
import { ActionButton } from '../components/exercise-ui/index.jsx'

const text = {
  ar: {
    exitTitle: (level) => `نتيجة اختبار نهاية المستوى ${level}`,
    entranceTitle: (level) => `نتيجة اختبار الدخول إلى ${level}`,
    passed: 'مبروك! لقد نجحت',
    failed: 'لم تحقق درجة النجاح بعد',
    unlocked: (level) => `تم فتح المستوى ${level}!`,
    finalLevel: 'هذا آخر مستوى. أحسنت!',
    retry: 'حاول مرة أخرى لاحقا',
    home: 'الرجوع للرئيسية',
    total: 'الدرجة الكلية',
  },
  en: {
    exitTitle: (level) => `${level} Final Exam Result`,
    entranceTitle: (level) => `${level} Placement Exam Result`,
    passed: 'Congratulations, you passed!',
    failed: 'You haven\'t reached the passing score yet',
    unlocked: (level) => `${level} is now unlocked!`,
    finalLevel: 'This is the final level. Great work!',
    retry: 'Try again later',
    home: 'Back home',
    total: 'Total score',
  },
}

export default function ExamResult({ examState, lang, nextLevelId, onHome }) {
  const [ready, setReady] = useState(false)
  const t = text[lang] || text.en
  const { levelId, examType, exam, sectionScores, totalScore, passed } = examState

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(timer)
  }, [])

  const title = examType === 'exit' ? t.exitTitle(levelId) : t.entranceTitle(levelId)
  const percent = exam.totalScore ? Math.round((totalScore / exam.totalScore) * 100) : 0

  return (
    <main className={`result-screen ${ready ? 'ready' : ''}`}>
      <section className="result-card">
        <span className="finish-icon"><AppIcon name={passed ? 'star' : 'goal'} size={54} /></span>
        <div className="score-ring" style={{ '--value': `${percent}%` }}>
          <strong>{totalScore}/{exam.totalScore}</strong>
          <span>{percent}%</span>
        </div>
        <p className="eyebrow">{title}</p>
        <h1>{passed ? t.passed : t.failed}</h1>
        <div className="result-stats">
          {exam.sections.map((section, index) => (
            <div key={section.key}>
              <strong>{sectionScores[index]}</strong>
              <span>{section.label[lang] || section.label.en}</span>
            </div>
          ))}
        </div>
        {passed && (
          examType === 'exit' && !nextLevelId
            ? <p>{t.finalLevel}</p>
            : <p>{t.unlocked(examType === 'exit' ? nextLevelId : levelId)}</p>
        )}
        {!passed && <p>{t.retry}</p>}
        <ActionButton onClick={onHome}>{t.home}</ActionButton>
      </section>
    </main>
  )
}
