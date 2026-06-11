// Canonical identifiers for every Joni expression, plus the
// Arabic/English labels and accent color used to present each one.
export const CharacterName = {
  Happy: 'joni_happy',
  Surprised: 'joni_surprised',
  Playful: 'joni_playful',
  Sleepy: 'joni_sleepy',
  Angry: 'joni_angry',
  Scared: 'joni_scared',
}

export const CHARACTER_META = {
  [CharacterName.Happy]: { labelAr: 'سعيد', labelEn: 'Happy', accentColor: '#F4C542' },
  [CharacterName.Surprised]: { labelAr: 'مستغرب', labelEn: 'Surprised', accentColor: '#7B9FD4' },
  [CharacterName.Playful]: { labelAr: 'مرح', labelEn: 'Playful', accentColor: '#F4A542' },
  [CharacterName.Sleepy]: { labelAr: 'ناسس', labelEn: 'Sleepy', accentColor: '#9B8DC4' },
  [CharacterName.Angry]: { labelAr: 'غاضب', labelEn: 'Angry', accentColor: '#E05C4B' },
  [CharacterName.Scared]: { labelAr: 'خائف', labelEn: 'Scared', accentColor: '#6BBFAD' },
}

export function isCharacterName(name) {
  return Object.prototype.hasOwnProperty.call(CHARACTER_META, name)
}
