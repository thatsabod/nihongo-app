import AppIcon from '../components/AppIcon.jsx'
import { ActionButton } from '../components/exercise-ui/index.jsx'

const text = {
  ar: {
    exitTitle: (level) => `اختبار نهاية المستوى ${level}`,
    entranceTitle: (level) => `اختبار الدخول إلى ${level}`,
    sections: 'أقسام الاختبار',
    minutes: 'دقيقة',
    questionsCount: 'سؤال',
    totalScore: 'الدرجة الكلية',
    passScore: 'درجة النجاح',
    start: 'ابدأ الاختبار',
    back: 'رجوع',
    comingSoonTitle: 'هذا الاختبار غير متاح بعد',
    comingSoonText: 'لم يتم إضافة محتوى هذا المستوى بعد. سنفعّل هذا الاختبار قريبا.',
  },
  en: {
    exitTitle: (level) => `${level} Final Exam`,
    entranceTitle: (level) => `${level} Placement Exam`,
    sections: 'Exam sections',
    minutes: 'min',
    questionsCount: 'questions',
    totalScore: 'Total score',
    passScore: 'Passing score',
    start: 'Start exam',
    back: 'Back',
    comingSoonTitle: 'This exam is not ready yet',
    comingSoonText: 'Lesson content for this level hasn\'t been added yet. This exam will be enabled soon.',
  },
}

export default function ExamIntro({ examState, lang, onStart, onBack }) {
  const t = text[lang] || text.en
  const { levelId, examType, exam } = examState

  if (!exam) {
    return (
      <main className="quiz-screen exam-screen">
        <header className="quiz-head">
          <button className="icon-btn" onClick={onBack}><AppIcon name="wrong" label="Close" size={26} /></button>
        </header>
        <section className="quiz-body exam-section-intro">
          <h1>{t.comingSoonTitle}</h1>
          <p>{t.comingSoonText}</p>
          <ActionButton variant="secondary" onClick={onBack}>{t.back}</ActionButton>
        </section>
      </main>
    )
  }

  const title = examType === 'exit' ? t.exitTitle(levelId) : t.entranceTitle(levelId)

  return (
    <main className="quiz-screen exam-screen">
      <header className="quiz-head">
        <button className="icon-btn" onClick={onBack}><AppIcon name="wrong" label="Close" size={26} /></button>
      </header>
      <section className="quiz-body exam-section-intro">
        <h1>{title}</h1>
        <h3>{t.sections}</h3>
        <div className="exam-section-list">
          {exam.sections.map((section) => (
            <div key={section.key} className="exam-section-row">
              <strong>{section.label[lang] || section.label.en}</strong>
              <span>{section.questions.length} {t.questionsCount} · {section.minutes} {t.minutes}</span>
            </div>
          ))}
        </div>
        <div className="exam-score-info">
          <div><strong>{exam.totalScore}</strong><span>{t.totalScore}</span></div>
          <div><strong>{exam.passScore}</strong><span>{t.passScore}</span></div>
        </div>
        <ActionButton onClick={onStart}>{t.start}</ActionButton>
      </section>
    </main>
  )
}
