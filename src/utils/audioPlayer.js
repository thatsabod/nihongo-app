let sharedCtx = null
let unlocked = false
let currentAudio = null
let currentSrc = ''
let currentUtterance = null
let playingKind = ''
let lastError = null

const AUDIO_EVENT = 'nihongo-audio-state'

const SINGLE_KANA_TTS = {
  'あ': 'あ',
  'い': 'い',
  'う': 'う',
  'え': 'え',
  'お': 'お',
  'ア': 'ア',
  'イ': 'イ',
  'ウ': 'ウ',
  'エ': 'エ',
  'オ': 'オ',
}

const preferredVoiceHints = [
  'nanami',
  'kyoko',
  'otoya',
  'haruka',
  'ichiro',
  'google 日本語',
  'google japanese',
  'microsoft',
  'japanese',
  '日本',
]

let cachedVoices = []
let voicesRequested = false

function emit(state) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUDIO_EVENT, { detail: getAudioState(state) }))
}

function setError(error) {
  lastError = error
  if (import.meta?.env?.DEV && error) {
    console.warn('[audioPlayer]', error)
  }
}

function normalizeText(text) {
  const value = String(text || '').trim()
  return SINGLE_KANA_TTS[value] || value
}

function googleTtsUrl(text, lang = 'ja') {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`
}

function rankVoice(voice) {
  const name = `${voice.name} ${voice.lang}`.toLowerCase()
  const hintIndex = preferredVoiceHints.findIndex((hint) => name.includes(hint))
  return hintIndex === -1 ? 100 : hintIndex
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '')
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!sharedCtx) sharedCtx = new Ctor()
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch?.((error) => setError(error))
  }
  return sharedCtx
}

export function getJapaneseVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices()
  const japanese = voices
    .filter((voice) => voice.lang?.toLowerCase().startsWith('ja'))
    .sort((a, b) => rankVoice(a) - rankVoice(b) || a.name.localeCompare(b.name))

  if (japanese.length) cachedVoices = japanese

  if (!voicesRequested) {
    voicesRequested = true
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang?.toLowerCase().startsWith('ja'))
        .sort((a, b) => rankVoice(a) - rankVoice(b) || a.name.localeCompare(b.name))
    }
  }

  return cachedVoices
}

export function unlockAudio() {
  unlocked = true
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume().catch?.((error) => setError(error))

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance('あ')
      utterance.lang = 'ja-JP'
      utterance.volume = 0.01
      utterance.rate = 0.7
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      setError(error)
    }
  }
  emit({ status: 'unlocked' })
}

export function stopAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio.src = ''
    } catch (error) {
      setError(error)
    }
  }
  currentAudio = null
  currentSrc = ''

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch (error) {
      setError(error)
    }
  }
  currentUtterance = null
  playingKind = ''
  emit({ status: 'idle' })
}

export function isPlaying(src) {
  return Boolean(playingKind && (!src || src === currentSrc))
}

export function getAudioState(extra = {}) {
  return {
    unlocked,
    playing: Boolean(playingKind),
    kind: playingKind,
    src: currentSrc,
    error: lastError,
    ...extra,
  }
}

function safePlayElement(audio) {
  const result = audio.play()
  if (result && typeof result.catch === 'function') {
    return result
  }
  return Promise.resolve()
}

function speakWithWebSpeech(text, options = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  const speechText = normalizeText(text)
  if (!speechText) return false

  stopAudio()
  const voices = getJapaneseVoices()
  const voiceIndex = options.voiceIndex ?? 0
  const utterance = new SpeechSynthesisUtterance(speechText)
  const voice = voices.length ? voices[Math.abs(voiceIndex) % voices.length] : null

  utterance.lang = options.lang || 'ja-JP'
  if (voice && utterance.lang.toLowerCase().startsWith('ja')) utterance.voice = voice
  utterance.rate = options.rate ?? 0.68
  utterance.pitch = options.pitch ?? 0.96
  utterance.volume = options.volume ?? 1
  utterance.onstart = () => {
    playingKind = 'tts'
    currentSrc = ''
    currentUtterance = utterance
    options.onStart?.({ fallback: true })
    emit({ status: 'playing', fallback: true })
  }
  utterance.onend = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null
      playingKind = ''
      options.onEnd?.({ fallback: true })
      emit({ status: 'idle', fallback: true })
    }
  }
  utterance.onerror = (event) => {
    setError(event.error || event)
    if (currentUtterance === utterance) {
      currentUtterance = null
      playingKind = ''
    }
    options.onError?.(event)
    emit({ status: 'error', fallback: true })
  }

  try {
    window.speechSynthesis.speak(utterance)
    return true
  } catch (error) {
    setError(error)
    options.onError?.(error)
    return false
  }
}

async function playFileAudio(src, options = {}) {
  if (typeof Audio === 'undefined' || !src) return false
  stopAudio()
  emit({ status: 'loading', src })
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.volume = options.volume ?? 1
  audio.crossOrigin = options.crossOrigin || 'anonymous'
  currentAudio = audio
  currentSrc = src

  audio.onplaying = () => {
    playingKind = 'file'
    options.onStart?.({ fallback: false })
    emit({ status: 'playing', src })
  }
  audio.onended = () => {
    if (currentAudio === audio) {
      currentAudio = null
      currentSrc = ''
      playingKind = ''
      options.onEnd?.({ fallback: false })
      emit({ status: 'idle' })
    }
  }
  audio.onerror = () => {
    const error = new Error(`Audio failed: ${src}`)
    setError(error)
    options.onError?.(error)
    if (currentAudio === audio) {
      currentAudio = null
      currentSrc = ''
      playingKind = ''
    }
    emit({ status: 'error', src })
  }

  try {
    await safePlayElement(audio)
    return true
  } catch (error) {
    setError(error)
    options.onError?.(error)
    if (currentAudio === audio) {
      currentAudio = null
      currentSrc = ''
      playingKind = ''
    }
    emit({ status: 'error', src })
    return false
  }
}

async function playRemoteTts(text, options = {}) {
  const speechText = normalizeText(text)
  if (!speechText || isIos()) return false
  return playFileAudio(googleTtsUrl(speechText, options.lang?.startsWith('ja') ? 'ja' : options.lang || 'ja'), options)
}

export async function playAudio(options = {}) {
  const {
    src,
    fallbackText,
    lang = 'ja-JP',
    preferRemote = false,
  } = options

  setError(null)
  if (!unlocked) unlocked = true

  if (src) {
    const filePlayed = await playFileAudio(src, options)
    if (filePlayed) return { ok: true, fallback: false }
  }

  const text = normalizeText(fallbackText)
  if (!text) {
    const error = new Error('No audio src or fallback text provided')
    setError(error)
    options.onError?.(error)
    emit({ status: 'error' })
    return { ok: false, fallback: false, error }
  }

  if (preferRemote) {
    const remotePlayed = await playRemoteTts(text, { ...options, lang })
    if (remotePlayed) return { ok: true, fallback: true }
  }

  if (speakWithWebSpeech(text, { ...options, lang })) return { ok: true, fallback: true }

  const remotePlayed = await playRemoteTts(text, { ...options, lang })
  if (remotePlayed) return { ok: true, fallback: true }

  const error = new Error('Audio playback and TTS fallback failed')
  setError(error)
  options.onError?.(error)
  emit({ status: 'error' })
  return { ok: false, fallback: false, error }
}

export function playTone({ freq, start = 0, duration = 0.16, type = 'sine', peakGain = 0.16 }) {
  const ctx = getAudioContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime + start)
  gain.gain.setValueAtTime(0, ctx.currentTime + start)
  gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
  oscillator.start(ctx.currentTime + start)
  oscillator.stop(ctx.currentTime + start + duration)
}

export { AUDIO_EVENT }
