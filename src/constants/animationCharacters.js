import { CharacterName } from './characterNames.js'

import joniHappy from '../assets/character/joni_happy.png'
import joniSurprised from '../assets/character/joni_surprised.png'
import joniPlayful from '../assets/character/joni_playful.png'
import joniSleepy from '../assets/character/joni_sleepy.png'
import joniAngry from '../assets/character/joni_angry.png'
import joniScared from '../assets/character/joni_scared.png'

// Lookup table keyed by CharacterName, for declarative `<JoniCharacter name=.../>` use.
export const ANIMATION_CHARACTERS = {
  [CharacterName.Happy]: joniHappy,
  [CharacterName.Surprised]: joniSurprised,
  [CharacterName.Playful]: joniPlayful,
  [CharacterName.Sleepy]: joniSleepy,
  [CharacterName.Angry]: joniAngry,
  [CharacterName.Scared]: joniScared,
}

// Flat shorthand for direct <img src={character.happy} /> use.
export const character = {
  happy: joniHappy,
  surprised: joniSurprised,
  playful: joniPlayful,
  sleepy: joniSleepy,
  angry: joniAngry,
  scared: joniScared,
}
