import { useEffect, useState } from 'react'

const text = {
  ar: {
    perfect: 'نتيجة ممتازة',
    good: 'شغل جيد',
    practice: 'تحتاج تمرين أكثر',
    result: 'نتيجة الاختبار',
    correct: 'صحيح',
    wrong: 'خطأ',
    home: 'الرجوع للرئيسية',
    retry: 'إعادة الاختبار',
  },
  en: {
    perfect: 'Perfect result',
    good: 'Good work',
    practice: 'Keep practicing',
    result: 'Quiz result',
    correct: 'Correct',
    wrong: 'Wrong',
    home: 'Back home',
    retry: 'Try again',
  },
}

export default function Result({ score, total, xpEarned, lang, onHome, onRetry }) {
  const [ready, setReady] = useState(false)
  const t = text[lang] || text.en
  const safeTotal = Math.max(total, 0)
  const safeScore = Math.min(Math.max(score, 0), safeTotal)
  const percent = safeTotal ? Math.round((safeScore / safeTotal) * 100) : 0
  const title = percent === 100 ? t.perfect : percent >= 70 ? t.good : t.practice

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className={`result-screen ${ready ? 'ready' : ''}`}>
      <section className="result-card">
        <div className="score-ring" style={{ '--value': `${percent}%` }}>
          <strong>{safeScore}/{safeTotal}</strong>
          <span>{percent}%</span>
        </div>
        <p className="eyebrow">{t.result}</p>
        <h1>{title}</h1>
        <div className="result-stats">
          <div><strong>{safeScore}</strong><span>{t.correct}</span></div>
          <div><strong>{Math.max(safeTotal - safeScore, 0)}</strong><span>{t.wrong}</span></div>
          <div><strong>+{xpEarned}</strong><span>XP</span></div>
        </div>
        <button className="btn btn-primary" onClick={onHome}>{t.home}</button>
        <button className="btn btn-secondary" onClick={onRetry}>{t.retry}</button>
      </section>
    </main>
  )
}
