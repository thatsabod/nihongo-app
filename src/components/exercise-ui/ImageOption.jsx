import AnswerOption from './AnswerOption.jsx'

// A 2x2 image-choice card: a big emoji "image" with a label underneath.
// Reuses AnswerOption's correct/wrong/reveal-correct state styling.
export default function ImageOption({ emoji, label, state, disabled, onClick }) {
  return (
    <AnswerOption state={state} disabled={disabled} onClick={onClick} className="image-option">
      <span className="image-option-emoji">{emoji}</span>
      <span className="image-option-label">{label}</span>
    </AnswerOption>
  )
}
