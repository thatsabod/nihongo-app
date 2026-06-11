// Full-screen overlay wrapper used by every exercise/quiz screen.
// Mirrors the markup that GrammarExercises originally used for `.grammar-ex-wrap`.
export default function ExerciseContainer({ className = '', children }) {
  return <div className={['grammar-ex-wrap', className].filter(Boolean).join(' ')}>{children}</div>
}

// Centered content column for a single exercise (`.grammar-ex`).
export function ExercisePane({ className = '', children }) {
  return <div className={['grammar-ex', className].filter(Boolean).join(' ')}>{children}</div>
}
