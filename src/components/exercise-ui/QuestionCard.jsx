// Standard question header: bold prompt line + optional muted hint line.
// Mirrors `.ex-prompt` / `.ex-hint` as used across all exercise types.
export default function QuestionCard({ prompt, hint, children }) {
  return (
    <>
      <p className="ex-prompt">{prompt}</p>
      {hint && <p className="ex-hint">{hint}</p>}
      {children}
    </>
  )
}

// Tappable "speak this" display (the sentence/character/word focus button
// with a speaker icon). Mirrors `.sentence-display`.
export function SentenceDisplay({ onClick, className = '', children, hint = '🔊' }) {
  return (
    <button className={['sentence-display', className].filter(Boolean).join(' ')} dir="ltr" onClick={onClick}>
      {children}
      <small>{hint}</small>
    </button>
  )
}
