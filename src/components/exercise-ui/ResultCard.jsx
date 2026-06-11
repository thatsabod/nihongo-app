import AppIcon from '../AppIcon.jsx'
import ExerciseContainer from './ExerciseContainer.jsx'

// Final "you finished the exercise" screen. Mirrors `.grammar-finish` as
// originally defined for GrammarExercises.
export default function ResultCard({ icon, score, total, message, children }) {
  return (
    <ExerciseContainer>
      <div className="grammar-finish">
        <span className="finish-icon"><AppIcon name={icon} size={54} /></span>
        {score != null && total != null && <strong>{score}/{total}</strong>}
        <p>{message}</p>
        {children}
      </div>
    </ExerciseContainer>
  )
}
