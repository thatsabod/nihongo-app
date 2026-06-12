import LessonProgressRing from './LessonProgressRing.jsx'
import AppIcon from './AppIcon.jsx'

// Circular lesson map node with a segmented progress ring and lesson number.
// `state` drives the visual treatment: locked nodes show a lock icon, done
// nodes show a checkmark, and the current (next-up) node gets a pulsing glow.
// Completed nodes also show a mastery indicator (5 pips, or a star once fully
// mastered) so the path conveys depth of recall, not just completion.
export default function LessonNode({ lessonNumber, state, completed, total, index, style, label, onClick, masteryLevel = null, masteryStatus = null }) {
  const showMastery = state === 'done' && masteryLevel != null
  return (
    <button
      disabled={state === 'locked'}
      className={`lesson-node map-node ${state} step-${index % 12} ${masteryStatus ? `mastery-${masteryStatus}` : ''}`}
      style={style}
      aria-label={label}
      onClick={onClick}
    >
      <LessonProgressRing completed={completed} total={total} />
      <span className="lesson-number">
        {state === 'locked' ? (
          <AppIcon name="locked" size={26} />
        ) : state === 'done' ? (
          <AppIcon name="correct" size={30} />
        ) : (
          lessonNumber
        )}
      </span>
      {showMastery && (
        masteryStatus === 'mastered' ? (
          <span className="node-mastery-star" aria-hidden="true">
            <AppIcon name="star" size={16} />
          </span>
        ) : (
          <span className="node-mastery-pips" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={i < masteryLevel ? 'on' : ''} />
            ))}
          </span>
        )
      )}
    </button>
  )
}
