import { useState } from 'react'
import AppIcon from '../AppIcon.jsx'
import { useHearts } from '../../hearts-context.jsx'
import ExerciseSettingsSheet from '../exercise/ExerciseSettingsSheet.jsx'

// Sticky header used at the top of every exercise overlay: a close button,
// a progress bar, an optional trailing counter/label, and a settings gear that
// opens the exercise settings bottom sheet. `onEndSession` (falls back to
// onClose) is the safe session-exit used by the sheet's "End Session" action.
// Mirrors the markup GrammarExercises originally used for `.grammar-ex-header`.
export default function ProgressHeader({ onClose, closeLabel = '', progress = 0, counter, children, lang = 'ar', onEndSession }) {
  const heartsApi = useHearts()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="grammar-ex-header">
      <button className="icon-btn" onClick={onClose}>
        <AppIcon name="wrong" label={closeLabel} size={26} />
      </button>
      <div className="ex-progress-bar">
        <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      {heartsApi && (
        <span className="ex-hearts">
          <AppIcon name="life" size={20} className="life-indicator" />
          {heartsApi.hearts}
        </span>
      )}
      {counter != null && <span>{counter}</span>}
      {children}
      <button
        className="icon-btn ex-settings-gear"
        onClick={() => setSettingsOpen(true)}
        aria-label={lang === 'ar' ? 'الإعدادات' : 'Settings'}
      >
        <AppIcon name="settings" size={24} />
      </button>
      {settingsOpen && (
        <ExerciseSettingsSheet
          lang={lang}
          onClose={() => setSettingsOpen(false)}
          onEndSession={onEndSession || onClose}
        />
      )}
    </div>
  )
}
