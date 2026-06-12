import LessonProgressRing from './LessonProgressRing.jsx'

// Circular lesson map node with a segmented progress ring and lesson number.
export default function LessonNode({ lessonNumber, state, completed, total, index, style, label, onClick }) {
  return (
    <button
      disabled={state === 'locked'}
      className={`lesson-node map-node ${state} step-${index % 12}`}
      style={style}
      aria-label={label}
      onClick={onClick}
    >
      <LessonProgressRing completed={completed} total={total} />
      <span className="lesson-number">{lessonNumber}</span>
    </button>
  )
}
