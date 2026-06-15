import { useMemo, useState } from 'react'
import { buildSenseiContext } from '../../ai/senseiContext.ts'
import AbdoolSenseiHome from './AbdoolSenseiHome.jsx'
import GuidedVoiceCallScreen from './GuidedVoiceCallScreen.jsx'
import SenseiCallScreen from './SenseiCallScreen.jsx'

// Abdool Sensei entry. Thin router between the clean chat home, the default
// Guided Voice Practice (cheap turn-based), and the advanced Live Call (realtime
// WebRTC). The grounded context (buildSenseiContext) is built once and shared.
export default function AiSenseiPanel({ lang, level, currentLessonId, currentLessonTitleAr, completedLessonIds = [], onClose, onReward, initialCall = null }) {
  const ctx = useMemo(
    () => buildSenseiContext(level, { currentLessonId, currentLessonTitleAr, completedLessonIds }),
    [level, currentLessonId, currentLessonTitleAr, completedLessonIds],
  )
  const [call, setCall] = useState(initialCall) // null | 'guided' | 'realtime'

  if (call === 'realtime') {
    return <SenseiCallScreen ctx={ctx} lang={lang} onClose={() => setCall(null)} />
  }
  if (call === 'guided') {
    return (
      <GuidedVoiceCallScreen
        ctx={ctx}
        lang={lang}
        onClose={() => setCall(null)}
        onAdvanced={() => setCall('realtime')}
        onReward={onReward}
      />
    )
  }

  return <AbdoolSenseiHome ctx={ctx} lang={lang} onClose={onClose} onStartVoice={() => setCall('guided')} />
}
