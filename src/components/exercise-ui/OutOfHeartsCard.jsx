import AppIcon from '../AppIcon.jsx'
import ExerciseContainer from './ExerciseContainer.jsx'
import ActionButton from './ActionButton.jsx'
import { useHearts } from '../../hearts-context.jsx'

const REFILL_COST = 250

// Shown instead of the exercise when the battery (hearts) hits zero —
// acts as the "result screen" for running out of battery.
// `bare` skips the ExerciseContainer wrapper for inline (non-overlay) sections.
export default function OutOfHeartsCard({ lang, onClose, bare = false }) {
  const isAr = lang === 'ar'
  const heartsApi = useHearts()
  const gems = heartsApi?.gems || 0
  const canRefill = gems >= REFILL_COST

  const content = (
    <div className="grammar-finish out-of-hearts">
      <span className="finish-icon"><AppIcon name="life" size={54} className="life-indicator" /></span>
      <strong>0/{heartsApi?.maxHearts ?? 10}</strong>
      <p>
        {isAr
          ? 'نفذت بطاريتك! انتظر قليلاً ليُعاد شحنها تلقائياً (قلب كل دقيقة) أو أعد الشحن فوراً بالجواهر.'
          : 'You ran out of battery! Wait a bit for it to refill automatically (1 heart per minute) or refill instantly with gems.'}
      </p>
      {canRefill && (
        <ActionButton onClick={() => heartsApi?.refillWithGems?.()}>
          {isAr ? `إعادة الشحن بـ ${REFILL_COST} جوهرة` : `Refill with ${REFILL_COST} gems`}
        </ActionButton>
      )}
      {onClose && (
        <ActionButton variant="secondary" onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</ActionButton>
      )}
    </div>
  )

  if (bare) return content
  return <ExerciseContainer>{content}</ExerciseContainer>
}
