import { useEffect, useMemo, useState } from 'react'
import { readProgressState, PROGRESS_CHANGED_EVENT } from '../../progress/progressStorage.js'
import { getSkillRetention, RETENTION_SKILLS } from '../../progress/skillStats.js'

// Per-skill memory-strength panel (vocab / grammar / kanji). Self-contained:
// reads the SRS store itself and live-refreshes on PROGRESS_CHANGED_EVENT, so it
// needs no props from App.jsx beyond language/labels. Hidden entirely until the
// learner has reviewed at least one item, to keep a fresh account calm.
const LABEL_KEYS = { vocab: 'skillVocab', grammar: 'skillGrammar', kanji: 'skillKanji' }

export default function RetentionPanel({ lang, t }) {
  const isAr = lang === 'ar'
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, bump)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, bump)
  }, [])

  const skills = useMemo(() => getSkillRetention(readProgressState()), [tick])
  const grandTotal = RETENTION_SKILLS.reduce((sum, key) => sum + skills[key].total, 0)
  if (grandTotal === 0) return null

  return (
    <section className="retention-panel">
      <h2 className="section-title">{isAr ? 'قوة الحفظ' : 'Memory strength'}</h2>
      <div className="retention-row">
        {RETENTION_SKILLS.map((skill) => {
          const b = skills[skill]
          const pct = b.strengthPct
          return (
            <div key={skill} className="retention-card">
              <span className="retention-skill">{t[LABEL_KEYS[skill]]}</span>
              <span className="retention-pct">{b.total ? `${pct}%` : '—'}</span>
              <span className="retention-bar"><i className={pct >= 80 ? 'strong' : ''} style={{ width: `${pct}%` }} /></span>
              <span className="retention-sub">
                {b.total} {isAr ? 'عنصر' : 'items'}
                {b.due > 0 ? ` · ${b.due} ${isAr ? 'مستحق' : 'due'}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
