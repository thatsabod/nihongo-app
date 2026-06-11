import JoniCharacter from './JoniCharacter.jsx'
import { CharacterName, CHARACTER_META } from '../constants/characterNames.js'
import { ANIMATION_CHARACTERS, character } from '../constants/animationCharacters.js'

export { JoniCharacter, CharacterName, CHARACTER_META, ANIMATION_CHARACTERS, character }

function makeJoni(name) {
  return function NamedJoniCharacter(props) {
    return <JoniCharacter name={name} {...props} />
  }
}

// Pattern 3 — self-documenting named components, e.g. <JoniHappy size={100} showLabel />
export const JoniHappy = makeJoni(CharacterName.Happy)
export const JoniSurprised = makeJoni(CharacterName.Surprised)
export const JoniPlayful = makeJoni(CharacterName.Playful)
export const JoniSleepy = makeJoni(CharacterName.Sleepy)
export const JoniAngry = makeJoni(CharacterName.Angry)
export const JoniScared = makeJoni(CharacterName.Scared)
