import AppIcon from './AppIcon.jsx'
import { ActionButton } from './exercise-ui/index.jsx'

// Floating preview shown before entering a lesson: title, progress,
// estimated duration and a Start/Continue/Review call to action.
export default function LessonPreviewModal({ lesson, lang, completed, total, onStart, onClose }) {
  const isAr = lang === 'ar'
  const title = lesson.title?.[lang] || lesson.title

  const itemCount = (lesson.vocab?.length || 0) + (lesson.grammar?.length || 0) + (lesson.exercises?.length || 0)
  const low = Math.max(8, Math.round(itemCount / 6) * 2)
  const high = low + 5

  const xp = total * 10

  const statusLabel = completed === 0
    ? (isAr ? 'ابدأ الدرس' : 'Start Lesson')
    : completed >= total
      ? (isAr ? 'مراجعة الدرس' : 'Review Lesson')
      : (isAr ? 'متابعة الدرس' : 'Continue Lesson')

  return (
    <div className="profile-modal lesson-preview-modal">
      <button className="modal-backdrop" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} />
      <div className="lesson-preview-card">
        <button className="modal-close" onClick={onClose}>
          <AppIcon name="wrong" size={20} />
        </button>
        <span className="lesson-preview-badge">
          <AppIcon name="star" size={28} />
        </span>
        <h3>{title}</h3>
        <p className="lesson-preview-sub">
          {isAr ? `${completed}/${total} مكتمل` : `${completed}/${total} completed`}
        </p>
        <div className="lesson-preview-progress">
          <span style={{ width: `${(completed / total) * 100}%` }} />
        </div>
        <p className="lesson-preview-duration">
          {isAr ? `الوقت المقدّر: ${low}-${high} دقيقة` : `Estimated time: ${low}-${high} minutes`}
        </p>
        <ActionButton onClick={onStart}>{statusLabel} +{xp} XP</ActionButton>
      </div>
    </div>
  )
}
