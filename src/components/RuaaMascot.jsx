import { useEffect, useRef } from 'react'
import JoniCharacter from './JoniCharacter.jsx'
import { CharacterName } from '../constants/characterNames.js'

// Maps the new `emotion` prop onto a Joni expression.
export const EMOTION_MAP = {
  correct: CharacterName.Happy,
  wrong: CharacterName.Scared,
  thinking: CharacterName.Surprised,
  celebrate: CharacterName.Playful,
  tired: CharacterName.Sleepy,
  angry: CharacterName.Angry,
  neutral: CharacterName.Happy,
}

// Legacy `mode` values used across existing exercise screens, mapped onto
// the same Joni expressions so this stays a drop-in replacement.
const MODE_MAP = {
  cheer: CharacterName.Happy,
  skeptical: CharacterName.Scared,
  calm: CharacterName.Happy,
  thinking: CharacterName.Surprised,
  wave: CharacterName.Playful,
  surprise: CharacterName.Surprised,
}

const RUAA_POSE_MAP = {
  cheer: 'wave',
  skeptical: 'thinking',
  calm: 'smile',
  thinking: 'thinking',
  wave: 'wave',
  surprise: 'surprise',
  correct: 'wave',
  wrong: 'thinking',
}

function RuaaCharacter({ mode = 'calm' }) {
  const pose = RUAA_POSE_MAP[mode] || 'smile'
  return (
    <span className={`ruaa-full-sprite ruaa-character-${pose}`} aria-hidden="true" />
  )
}

export default function RuaaMascot({ emotion, mode = 'calm', visible = true, character = 'joni' }) {
  const ref = useRef(null)
  const key = emotion || mode
  const joniExpression = EMOTION_MAP[emotion] || MODE_MAP[mode] || CharacterName.Happy
  const isRuaa = character === 'ruaa'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('ruaa-anim')
    void el.offsetWidth
    el.classList.add('ruaa-anim')
  }, [key])

  if (!visible) return null

  return (
    <div ref={ref} className={`ruaa-mascot ruaa-${key} ruaa-anim`} aria-label={isRuaa ? 'Ruaa mascot' : 'Joni mascot'}>
      {isRuaa ? (
        <RuaaCharacter mode={key} />
      ) : (
        <JoniCharacter
          name={joniExpression}
          animate
          style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
        />
      )}
      <span className="ruaa-name">Hi, I&apos;m {isRuaa ? 'Ruaa' : 'Joni'}</span>
    </div>
  )
}
