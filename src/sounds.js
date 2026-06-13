import {
  getJapaneseVoices,
  playAudio,
  playTone,
  stopAudio,
  unlockAudio,
} from './utils/audioPlayer.js'

export { getJapaneseVoices, playAudio, stopAudio, unlockAudio }

export const playCorrect = () => {
  playTone({ freq: 880, start: 0, duration: 0.18, peakGain: 0.16 })
  playTone({ freq: 1320, start: 0.08, duration: 0.22, peakGain: 0.14 })
}

export const playWrong = () => {
  playTone({ freq: 320, start: 0, duration: 0.16, type: 'triangle', peakGain: 0.14 })
}

export const speakJapanese = (text, options = {}) => {
  const config = typeof options === 'number' ? { rate: options } : options
  return playAudio({
    ...config,
    fallbackText: text,
    lang: 'ja-JP',
    preferRemote: config.remote === true,
  })
}
