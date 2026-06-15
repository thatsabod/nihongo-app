import AppIcon from '../AppIcon.jsx'

// Brief "connecting" screen before the guided voice session starts. Also offers
// the advanced live (realtime WebRTC) call as an opt-in.
export default function CallingAbdoolScreen({ lang, onCancel, onAdvanced }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  return (
    <div className="cg-call" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="cg-center">
        <div className="cg-avatar-wrap">
          <span className="cg-ring" aria-hidden="true" />
          <span className="cg-ring cg-ring-2" aria-hidden="true" />
          <div className="cg-avatar" aria-hidden="true"><span>先生</span></div>
        </div>
        <h1 className="cg-name">{t('جاري الاتصال بعبدول سينسيه…', 'Calling Abdoul Sensei…')}</h1>
        {onAdvanced && (
          <button type="button" className="cg-advanced" onClick={onAdvanced}>
            {t('مكالمة مباشرة (متقدم)', 'Live call (advanced)')}
          </button>
        )}
      </div>
      <button type="button" className="cg-end" onClick={onCancel} aria-label={t('إنهاء', 'End')}>
        <AppIcon name="wrong" size={26} />
      </button>
    </div>
  )
}
