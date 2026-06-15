// Celebratory-but-mature reward screen after a guided voice session.
export default function CallRewardScreen({ lang, xp = 0, wordsUsed = 0, durationSeconds = 0, onClaim }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const mins = Math.floor((durationSeconds || 0) / 60)
  const secs = (durationSeconds || 0) % 60
  const time = `${mins}:${String(secs).padStart(2, '0')}`
  return (
    <div className="reward-screen" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="reward-body">
        <div className="reward-orb" aria-hidden="true"><span>先生</span></div>
        <h1 className="reward-title">{t('أحسنت!', 'Well done!')}</h1>
        <p className="reward-sub">{t('تدريب رائع — استمر هكذا 🌸', 'Great practice — keep it up 🌸')}</p>
        <div className="reward-cards">
          <div className="reward-card xp">
            <span className="reward-card-label">{t('مجموع XP', 'Total XP')}</span>
            <span className="reward-card-val">⚡ {xp}</span>
          </div>
          <div className="reward-card words">
            <span className="reward-card-label">{t('كلمات استخدمتها', 'Words used')}</span>
            <span className="reward-card-val">🅰 {wordsUsed}</span>
          </div>
          <div className="reward-card time">
            <span className="reward-card-label">{t('الوقت', 'Time')}</span>
            <span className="reward-card-val">⏱ {time}</span>
          </div>
        </div>
      </div>
      <button className="btn btn-primary reward-claim" onClick={onClaim}>
        {t('استلام XP', 'Claim XP')}
      </button>
    </div>
  )
}
