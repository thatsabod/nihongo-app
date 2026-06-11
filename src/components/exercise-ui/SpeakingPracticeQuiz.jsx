import { useEffect, useRef, useState } from 'react'
import { speakJapanese, playCorrect, playWrong } from '../../sounds.js'
import RuaaMascot from '../RuaaMascot.jsx'
import IconCircle from '../IconCircle.jsx'
import { ExercisePane } from './ExerciseContainer.jsx'
import QuestionCard, { SentenceDisplay } from './QuestionCard.jsx'
import ActionButton from './ActionButton.jsx'

const PASS_THRESHOLD = 0.6

function normalize(value) {
  return String(value || '').replace(/[\s。、！？「」『』.,!?]/g, '').toLowerCase()
}

// Levenshtein-based similarity in [0, 1].
function similarity(a, b) {
  const x = normalize(a)
  const y = normalize(b)
  if (!x || !y) return 0
  const m = x.length
  const n = y.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = x[i - 1] === y[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return Math.max(0, 1 - dp[m][n] / Math.max(m, n))
}

// Reusable "Repeat after Joni" speaking exercise. Plays the target sentence,
// records the user's voice via the Web Speech API, and scores pronunciation
// by comparing the recognized transcript to the target text.
export default function SpeakingPracticeQuiz({
  sentence,
  reading,
  speakText,
  lang = 'en',
  onAnswer,
  onSkip,
}) {
  const [state, setState] = useState('idle') // idle | recording | processing | passed | failed
  const [scores, setScores] = useState(null)
  const [error, setError] = useState(null)
  const isAr = lang === 'ar'
  const target = speakText || sentence
  const recognitionRef = useRef(null)

  useEffect(() => {
    speakJapanese(target)
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playSentence = () => speakJapanese(target)

  const startRecording = () => {
    if (state === 'recording' || state === 'processing' || state === 'passed') return
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionImpl) {
      setError(isAr ? 'التعرف على الصوت غير مدعوم على هذا الجهاز' : 'Speech recognition is not supported on this device')
      return
    }
    setError(null)
    setScores(null)

    const recognition = new SpeechRecognitionImpl()
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setState('recording')

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      setState('processing')
      const accuracy = similarity(transcript, target)
      const pronunciation = Math.round(accuracy * 100)
      const passed = accuracy >= PASS_THRESHOLD
      setTimeout(() => {
        setScores({ pronunciation, accuracy: pronunciation })
        setState(passed ? 'passed' : 'failed')
        if (passed) playCorrect()
        else playWrong()
        setTimeout(() => onAnswer(passed, { pronunciation, accuracy: pronunciation }), 1200)
      }, 500)
    }

    recognition.onerror = () => {
      setState('failed')
      setScores({ pronunciation: 0, accuracy: 0 })
      playWrong()
    }

    recognition.onend = () => {
      setState((current) => (current === 'recording' ? 'idle' : current))
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const retry = () => {
    setState('idle')
    setScores(null)
    setError(null)
  }

  const skip = () => {
    if (onSkip) onSkip()
    else onAnswer(false, { pronunciation: 0, accuracy: 0 })
  }

  const mascotMode = state === 'passed'
    ? 'cheer'
    : state === 'failed'
      ? 'skeptical'
      : state === 'recording'
        ? 'wave'
        : 'thinking'

  const micLabel = {
    idle: isAr ? 'اضغط للتسجيل' : 'Tap to record',
    recording: isAr ? 'جارٍ الاستماع...' : 'Listening...',
    processing: isAr ? 'جارٍ المعالجة...' : 'Processing...',
    passed: isAr ? 'أحسنت!' : 'Well done!',
    failed: isAr ? 'حاول مرة أخرى' : 'Try again',
  }[state]

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} />
      <QuestionCard prompt={isAr ? 'كرر بعد جوني' : 'Repeat after Joni'} />

      <SentenceDisplay dir="ltr" onClick={playSentence}>
        <span className="speaking-sentence">
          {reading && <small className="speaking-reading">{reading}</small>}
          <span>{sentence}</span>
        </span>
      </SentenceDisplay>

      <button
        type="button"
        className={`speaking-mic-btn ${state}`}
        onClick={startRecording}
        disabled={state === 'recording' || state === 'processing' || state === 'passed'}
      >
        <IconCircle name="speaking" size={48} />
      </button>
      <p className="ex-hint speaking-mic-label">{micLabel}</p>

      {scores && (
        <div className={`speaking-score ${state}`}>
          <span>{isAr ? 'النطق' : 'Pronunciation'}: {scores.pronunciation}%</span>
          <span>{isAr ? 'الدقة' : 'Accuracy'}: {scores.accuracy}%</span>
        </div>
      )}

      {error && <p className="iex-result wrong">{error}</p>}

      {state === 'failed' && (
        <ActionButton variant="secondary" onClick={retry}>
          {isAr ? 'أعد المحاولة' : 'Try again'}
        </ActionButton>
      )}

      {state !== 'passed' && (
        <button type="button" className="muted-link" onClick={skip}>
          {isAr ? 'لا أستطيع التحدث الآن' : "Can't speak now"}
        </button>
      )}
    </ExercisePane>
  )
}
