import { IconBack } from './CommunityIcons.jsx'

const OPTIONS = [
  { key: 'comments', ar: 'إشعارات التعليقات', en: 'Comment notifications' },
  { key: 'likes', ar: 'إشعارات الإعجابات', en: 'Like notifications' },
  { key: 'follows', ar: 'إشعارات المتابعة', en: 'Follow notifications' },
  { key: 'corrections', ar: 'إشعارات التصحيحات', en: 'Correction notifications' },
  { key: 'voice', ar: 'إشعارات الغرف الصوتية', en: 'Voice-room notifications' },
]

// Simple notification preferences (persisted locally). Toggle switches.
export default function NotificationSettingsScreen({ lang, settings, onToggle, onBack, extra = null }) {
  const isAr = lang === 'ar'
  return (
    <section className="cm-screen">
      <header className="cm-screen-head">
        <button className="cm-icon-btn" onClick={onBack} aria-label={isAr ? 'رجوع' : 'Back'}><IconBack size={22} /></button>
        <h1>{isAr ? 'إعدادات الإشعارات' : 'Notification settings'}</h1>
        <span className="cm-screen-head-spacer" />
      </header>
      {extra && <div className="cm-settings-extra">{extra}</div>}
      <div className="cm-settings-list">
        {OPTIONS.map((opt) => {
          const on = settings[opt.key] !== false
          return (
            <div key={opt.key} className="cm-setting-row">
              <span>{isAr ? opt.ar : opt.en}</span>
              <button
                className={`cm-switch ${on ? 'on' : ''}`}
                role="switch"
                aria-checked={on}
                onClick={() => onToggle(opt.key)}
              >
                <span className="cm-switch-knob" />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
