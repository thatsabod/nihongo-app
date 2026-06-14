import { useEffect } from 'react'
import useExerciseSettings from '../../hooks/useExerciseSettings.js'

// Duolingo-style in-exercise settings bottom sheet. Slides up over the dimmed
// exercise; controls pronunciation visibility + Romanized/Japanese mode, with a
// Done (close) and End Session (safe exit) action. Backdrop / Escape close it.
export default function ExerciseSettingsSheet({ lang = 'ar', onClose, onEndSession }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const { settings, setShowPronunciation, setPronunciationMode } = useExerciseSettings()
  const showPron = settings.showPronunciation

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ex-sheet-root" dir={isAr ? 'rtl' : 'ltr'}>
      <button className="ex-sheet-backdrop" aria-label={t('إغلاق', 'Close')} onClick={onClose} />
      <div className="ex-sheet" role="dialog" aria-modal="true" aria-label={t('الإعدادات', 'Settings')}>
        <span className="ex-sheet-handle" aria-hidden="true" />
        <h2 className="ex-sheet-title">{t('الإعدادات', 'Settings')}</h2>

        <div className="ex-sheet-card">
          <div className="ex-sheet-row">
            <span className="ex-sheet-label">{t('إظهار النطق', 'Show pronunciation')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={showPron}
              aria-label={t('إظهار النطق', 'Show pronunciation')}
              className={`ex-toggle ${showPron ? 'on' : ''}`}
              onClick={() => setShowPronunciation(!showPron)}
            >
              <span className="ex-toggle-knob" />
            </button>
          </div>

          <div className={`ex-sheet-options ${showPron ? '' : 'is-disabled'}`}>
            <button
              type="button"
              className={`ex-pron-option ${settings.pronunciationMode === 'romanized' ? 'active' : ''}`}
              aria-pressed={settings.pronunciationMode === 'romanized'}
              disabled={!showPron}
              onClick={() => setPronunciationMode('romanized')}
            >
              <span className="ex-pron-furi" dir="ltr">ni&nbsp;&nbsp;hon&nbsp;&nbsp;go</span>
              <span className="ex-pron-word" lang="ja">日本語</span>
              <span className="ex-pron-name">{t('روماجي', 'Romanized')}</span>
            </button>
            <button
              type="button"
              className={`ex-pron-option ${settings.pronunciationMode === 'japanese' ? 'active' : ''}`}
              aria-pressed={settings.pronunciationMode === 'japanese'}
              disabled={!showPron}
              onClick={() => setPronunciationMode('japanese')}
            >
              <span className="ex-pron-furi" dir="ltr" lang="ja">に&nbsp;ほん&nbsp;ご</span>
              <span className="ex-pron-word" lang="ja">日本語</span>
              <span className="ex-pron-name">{t('ياباني', 'Japanese')}</span>
            </button>
          </div>
        </div>

        <button className="btn btn-primary ex-sheet-done" onClick={onClose}>
          {t('تم', 'Done')}
        </button>
        <button
          className="ex-sheet-end"
          onClick={() => { onClose?.(); onEndSession?.() }}
        >
          {t('إنهاء الجلسة', 'End Session')}
        </button>
      </div>
    </div>
  )
}
