import { ActionButton } from './exercise-ui/index.jsx'

export default function LessonProgressCard({ title, current, total, xpReward, lang, onContinue, style }) {
  const isAr = lang === 'ar'
  return (
    <div className="lesson-progress-card" style={style}>
      <p className="lesson-progress-title">{title}</p>
      <p className="lesson-progress-sub">
        {isAr ? `الدرس ${current} من ${total}` : `Lesson ${current} of ${total}`}
      </p>
      <ActionButton onClick={onContinue}>
        {isAr ? `متابعة +${xpReward} XP` : `CONTINUE +${xpReward} XP`}
      </ActionButton>
    </div>
  )
}
