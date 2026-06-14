import { useEffect, useState } from 'react'
import { getExerciseSettings, setExerciseSettings, EXERCISE_SETTINGS_EVENT } from '../utils/exerciseSettings.js'

// Live subscription to the exercise display settings. Any component can read
// the current settings and update them; all consumers re-render together via
// the EXERCISE_SETTINGS_EVENT (and `storage` for cross-tab sync).
export function useExerciseSettings() {
  const [settings, setSettings] = useState(getExerciseSettings)

  useEffect(() => {
    const sync = () => setSettings(getExerciseSettings())
    window.addEventListener(EXERCISE_SETTINGS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EXERCISE_SETTINGS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return {
    settings,
    setShowPronunciation: (value) => setExerciseSettings({ showPronunciation: !!value }),
    setPronunciationMode: (mode) =>
      setExerciseSettings({ pronunciationMode: mode === 'romanized' ? 'romanized' : 'japanese' }),
  }
}

export default useExerciseSettings
