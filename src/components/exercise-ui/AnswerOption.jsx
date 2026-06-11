// Computes the correct/wrong/reveal-correct state class for a single option
// once the user has picked an answer. Shared by every multiple-choice
// exercise (grammar, vocab, characters, quiz, exam).
export function getOptionState(picked, opt, answer) {
  if (picked == null) return ''
  if (picked === opt) return opt === answer ? 'correct' : 'wrong'
  if (opt === answer) return 'reveal-correct'
  return ''
}

// A single multiple-choice answer button.
// `variant="meaning"` (default) renders the `.meaning-btn` style used by
// Grammar/Vocab/Character exercises. `variant="plain"` renders a bare
// state-only button, used by the answer grid in Quiz/Exam.
export default function AnswerOption({
  state = '',
  variant = 'meaning',
  dir,
  disabled,
  onClick,
  className = '',
  children,
}) {
  const base = variant === 'meaning' ? 'meaning-btn' : ''
  const cls = [base, state, className].filter(Boolean).join(' ')
  return (
    <button dir={dir} disabled={disabled} className={cls || undefined} onClick={onClick}>
      {children}
    </button>
  )
}
