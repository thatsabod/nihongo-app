import './LessonProgressBadge.css'

export type LessonProgressBadgeProps = {
  totalSections?: number
  completedSections: number
  size?: number
  animated?: boolean
  onClick?: () => void
}

const VIEW_BOX = 100
const CENTER = VIEW_BOX / 2
const RADIUS = 42
const STROKE_WIDTH = 9
const GAP_DEG = 18

function polarToCartesian(angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: CENTER + RADIUS * Math.cos(angleRad),
    y: CENTER + RADIUS * Math.sin(angleRad),
  }
}

function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

export default function LessonProgressBadge({
  totalSections = 5,
  completedSections,
  size = 140,
  animated = true,
  onClick,
}: LessonProgressBadgeProps) {
  const total = Math.max(1, totalSections)
  const completed = Math.min(Math.max(completedSections, 0), total)
  const segmentSweep = 360 / total - GAP_DEG
  const isComplete = completed >= total
  const activeIndex = !isComplete && completed > 0 ? completed - 1 : -1

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      className="lesson-progress-badge"
      style={{ width: size, height: size }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      aria-label={`${completed}/${total}`}
    >
      <svg className="lesson-progress-badge__svg" viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
        {Array.from({ length: total }, (_, i) => {
          const start = i * (360 / total) + GAP_DEG / 2
          const end = start + segmentSweep
          const filled = i < completed
          const isActive = animated && i === activeIndex
          return (
            <path
              key={i}
              d={describeArc(start, end)}
              className={`lesson-progress-badge__segment ${filled ? 'is-filled' : ''} ${isActive ? 'is-active' : ''}`}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      <div className={`lesson-progress-badge__center ${animated && isComplete ? 'is-complete' : ''}`}>
        <svg className="lesson-progress-badge__star" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 1.5l2.95 6.18 6.8.92-4.93 4.7 1.27 6.76L12 16.9l-6.09 3.16 1.27-6.76-4.93-4.7 6.8-.92z" />
        </svg>
      </div>
    </Wrapper>
  )
}
