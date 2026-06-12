// Segmented progress ring drawn around a lesson node. Each segment lights up
// once its corresponding section is completed.
export default function LessonProgressRing({ completed, total }) {
  return (
    <span className="lesson-ring" aria-hidden="true">
      <svg viewBox="0 0 112 112" focusable="false">
        {Array.from({ length: total }, (_, i) => (
          <circle
            key={i}
            className={`lesson-ring-segment segment-${i + 1} ${i < completed ? 'filled' : ''}`}
            cx="56"
            cy="56"
            r="43"
          />
        ))}
      </svg>
    </span>
  )
}
