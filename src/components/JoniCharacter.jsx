import { ANIMATION_CHARACTERS } from '../constants/animationCharacters.js'
import { CHARACTER_META, isCharacterName } from '../constants/characterNames.js'
import styles from './JoniCharacter.module.css'

// Base Joni component: <JoniCharacter name="joni_happy" size={120} showLabel />
export default function JoniCharacter({
  name,
  size = 120,
  showLabel = false,
  showLabelEn = false,
  animate = false,
  className = '',
  style = {},
}) {
  if (!isCharacterName(name)) return null

  const src = ANIMATION_CHARACTERS[name]
  const meta = CHARACTER_META[name]
  const wrapperClass = [styles.wrapper, animate ? styles.animate : '', className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass}>
      <img
        src={src}
        alt={meta.labelEn}
        className={styles.image}
        style={{ width: size, height: size, ...style }}
      />
      {showLabel && <span className={styles.label}>{meta.labelAr}</span>}
      {showLabelEn && <span className={styles.labelEn}>{meta.labelEn}</span>}
    </div>
  )
}
