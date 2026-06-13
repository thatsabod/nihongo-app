import { useEffect, useRef, useState } from 'react'
import AppIcon from './AppIcon.jsx'

// Compact JLPT level selector for the top bar — replaces the large home level
// card + the N5/N4/N3 strip. Lists every level: unlocked ones switch directly,
// the next-locked one launches its entrance exam, future (comingSoon) levels are
// disabled. One tap, closes on outside-click / Escape / selection.
export default function LevelSelector({ levels, currentLevel, unlockedLevels, levelOrder, levelExams, lang, onSelectLevel, onStartEntranceExam }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isAr = lang === 'ar'

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const highestUnlockedIdx = Math.max(...unlockedLevels.map((id) => levelOrder.indexOf(id)))

  const choose = (level, unlocked, isNextLocked) => {
    if (level.comingSoon) return
    if (unlocked) onSelectLevel(level.id)
    else if (isNextLocked) onStartEntranceExam(level.id)
    setOpen(false)
  }

  return (
    <div className={`level-selector ${open ? 'open' : ''}`} ref={ref}>
      <button
        className="level-selector-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={isAr ? 'اختيار المستوى' : 'Select level'}
      >
        <strong>{currentLevel}</strong>
        <span className="level-selector-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="level-selector-menu" role="listbox">
          {levels.map((level) => {
            const unlocked = unlockedLevels.includes(level.id)
            const isNextLocked = !unlocked && levelOrder.indexOf(level.id) === highestUnlockedIdx + 1
            const comingSoon = level.comingSoon
            const selectable = !comingSoon && (unlocked || isNextLocked)
            const isCurrent = currentLevel === level.id
            return (
              <li key={level.id} role="option" aria-selected={isCurrent}>
                <button
                  className={`level-option ${isCurrent ? 'active' : ''} ${!selectable ? 'disabled' : ''}`}
                  disabled={!selectable}
                  onClick={() => choose(level, unlocked, isNextLocked)}
                >
                  <span className="level-option-id">{level.id}</span>
                  <span className="level-option-name">{level[lang]}</span>
                  {isCurrent && <span className="level-option-mark"><AppIcon name="correct" size={14} /></span>}
                  {!isCurrent && !unlocked && !comingSoon && <span className="level-option-mark"><AppIcon name="locked" size={14} /></span>}
                  {comingSoon && <span className="level-option-soon">{isAr ? 'قريباً' : 'Soon'}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
