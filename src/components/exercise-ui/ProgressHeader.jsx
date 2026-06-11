import AppIcon from '../AppIcon.jsx'

// Sticky header used at the top of every exercise overlay: a close button,
// a progress bar, and an optional trailing counter/label.
// Mirrors the markup GrammarExercises originally used for `.grammar-ex-header`.
export default function ProgressHeader({ onClose, closeLabel = '', progress = 0, counter, children }) {
  return (
    <div className="grammar-ex-header">
      <button className="icon-btn" onClick={onClose}>
        <AppIcon name="wrong" label={closeLabel} size={26} />
      </button>
      <div className="ex-progress-bar">
        <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      {counter != null && <span>{counter}</span>}
      {children}
    </div>
  )
}
