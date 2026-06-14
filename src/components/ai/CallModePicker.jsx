import { CALL_MODES, getCallMode } from '../../ai/callModes.js'

// Compact mode chooser shown on the call setup screen. Selecting Role Play
// reveals its scenario sub-picker. Controlled by the parent (SenseiCallScreen).
export default function CallModePicker({ lang, mode, scenario, onSelectMode, onSelectScenario }) {
  const isAr = lang === 'ar'
  const active = getCallMode(mode)
  return (
    <div className="call-mode-picker">
      <p className="call-mode-label">{isAr ? 'اختر نوع المكالمة' : 'Choose a call mode'}</p>
      <div className="call-mode-grid">
        {CALL_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`call-mode-chip ${mode === m.id ? 'active' : ''}`}
            aria-pressed={mode === m.id}
            onClick={() => onSelectMode(m.id)}
          >
            <span className="call-mode-icon" aria-hidden="true">{m.icon}</span>
            <span>{isAr ? m.ar : m.en}</span>
          </button>
        ))}
      </div>
      {active.id === 'roleplay' && (
        <div className="call-scenario-row">
          {active.scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`call-scenario-chip ${scenario === s.id ? 'active' : ''}`}
              aria-pressed={scenario === s.id}
              onClick={() => onSelectScenario(s.id)}
            >
              {isAr ? s.ar : s.en}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
