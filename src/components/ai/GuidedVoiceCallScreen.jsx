import { useEffect, useRef, useState } from 'react'
import AppIcon from '../AppIcon.jsx'
import { requestSensei } from '../../ai/senseiClient.ts'
import { buildCallPrompt, speakMixed, stopSpeaking } from '../../ai/senseiCall.ts'
import { generateCallReport } from '../../ai/callReport.js'
import { saveCallSession, pushCallMistakesToReview } from '../../ai/callSessions.js'
import ConversationReviewScreen from './ConversationReviewScreen.jsx'
import CallingAbdoolScreen from './CallingAbdoolScreen.jsx'
import CallRatingScreen from './CallRatingScreen.jsx'
import CallRewardScreen from './CallRewardScreen.jsx'

// Guided Voice Practice — the cheap, controlled, turn-based voice mode (default).
// No streaming mic: Abdool speaks (mic OFF) → "tap to speak" → record → tap to
// stop → transcribe (Web Speech) → text reply (requestSensei) → speak (TTS) →
// repeat. Reuses the existing free stack — no new paid API, no WebRTC.
//
// status: speaking (Abdool talks, mic off) | ready (your turn) | listening
//         (recording) | thinking (transcribe + AI). phase: connecting | active | report.
export default function GuidedVoiceCallScreen({ ctx, lang, onClose, onAdvanced, onReward }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const [phase, setPhase] = useState('connecting')
  const [status, setStatus] = useState('speaking')
  const [turns, setTurns] = useState([])
  const [showTranscript, setShowTranscript] = useState(false)
  const [micLang, setMicLang] = useState('ja')
  const [error, setError] = useState('')
  const [reportStatus, setReportStatus] = useState('idle')
  const [report, setReport] = useState(null)
  const [difficulty, setDifficulty] = useState(null)

  const recognitionRef = useRef(null)
  const mountedRef = useRef(true)
  const startedAtRef = useRef(0)
  const savedMistakesRef = useRef(false)
  const savedSessionRef = useRef(false)
  const statsRef = useRef(null)
  const turnsRef = useRef([])
  const transcriptRef = useRef(null)
  useEffect(() => { turnsRef.current = turns }, [turns])
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, status])

  const speakAbdool = (text) => {
    setTurns((prev) => [...prev, { role: 'sensei', text }])
    setStatus('speaking')
    speakMixed(text, { onEnd: () => { if (mountedRef.current) setStatus('ready') } })
  }

  const beginSession = () => {
    setPhase('active')
    startedAtRef.current = Date.now()
    speakAbdool(isAr
      ? 'مرحباً! أنا عبدول سينسيه. خلّينا نتدرّب محادثة قصيرة. كيف حالك اليوم؟'
      : 'Hi! I am Abdoul Sensei. Let’s practice a short conversation. How are you today?')
  }

  const handleStudent = async (text) => {
    setError('')
    const history = [...turnsRef.current, { role: 'student', text }]
    setTurns(history)
    setStatus('thinking')
    let res
    try {
      res = await requestSensei({ feature: 'speakingPrompts', context: ctx, prompt: buildCallPrompt(ctx, history) })
    } catch {
      res = { status: 'error', message: t('حدث خطأ. حاول مجدداً.', 'Something went wrong.') }
    }
    if (!mountedRef.current) return
    if (res.status === 'ok' && res.content) {
      speakAbdool(res.content)
    } else {
      setError(res.message || t('تعذّر الرد الآن.', 'Could not reply right now.'))
      setStatus('ready')
    }
  }

  const startListening = () => {
    if (status !== 'ready') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError(t('متصفحك لا يدعم التعرّف على الصوت. جرّب متصفحاً آخر.', 'Your browser has no speech recognition.'))
      return
    }
    stopSpeaking()
    setError('')
    const rec = new SR()
    recognitionRef.current = rec
    rec.lang = micLang === 'ja' ? 'ja-JP' : 'ar-SA'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart = () => mountedRef.current && setStatus('listening')
    rec.onresult = (e) => {
      const tr = e.results?.[0]?.[0]?.transcript || ''
      if (tr) handleStudent(tr)
    }
    rec.onerror = () => {
      if (!mountedRef.current) return
      setStatus('ready')
      setError(t('ما سمعتك جيداً — حاول مرة أخرى.', 'Didn’t catch that — try again.'))
    }
    rec.onend = () => { if (mountedRef.current) setStatus((s) => (s === 'listening' ? 'ready' : s)) }
    rec.start()
  }

  const stopListening = () => recognitionRef.current?.stop?.()

  const countWords = (convo) => convo
    .filter((x) => x.role === 'student')
    .reduce((n, x) => {
      const s = String(x.text || '')
      const words = (s.match(/[A-Za-z؀-ۿ]+/g) || []).length
      const cjk = (s.match(/[぀-ヿ㐀-鿿]/g) || []).length
      return n + words + cjk
    }, 0)

  const endCall = () => {
    stopSpeaking()
    recognitionRef.current?.abort?.()
    const convo = turnsRef.current.filter((x) => x && x.text)
    if (convo.length < 2) { onClose(); return }
    const endedAt = Date.now()
    const durationSeconds = Math.round((endedAt - startedAtRef.current) / 1000)
    const wordsUsed = countWords(convo)
    const studentTurns = convo.filter((x) => x.role === 'student').length
    const xpEarned = Math.max(5, Math.min(60, studentTurns * 8 + Math.floor(wordsUsed / 4)))
    statsRef.current = { convo, durationSeconds, wordsUsed, xpEarned, startedAt: startedAtRef.current, endedAt }
    setPhase('report')
    setReportStatus('loading')
    generateCallReport(convo, ctx).then((r) => {
      if (!mountedRef.current) return
      setReport(r.report || null)
      setReportStatus(r.status === 'ok' ? 'ok' : r.status || 'error')
      // Push mistakes into Smart Review as soon as the report is ready (learning
      // happens even if the learner closes before claiming the reward).
      if (r.status === 'ok' && r.report && !savedMistakesRef.current) {
        savedMistakesRef.current = true
        try { pushCallMistakesToReview(r.report) } catch { /* best-effort */ }
      }
    })
  }

  // Persist the full session (with rating + XP) once, credit XP, then exit.
  const finalize = () => {
    const s = statsRef.current
    if (s && !savedSessionRef.current) {
      savedSessionRef.current = true
      try {
        saveCallSession({
          mode: 'guidedVoicePractice',
          scenario: null,
          durationSeconds: s.durationSeconds,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          turns: s.convo,
          report,
          difficultyRating: difficulty,
          xpEarned: s.xpEarned,
          wordsUsed: s.wordsUsed,
        })
      } catch { /* best-effort */ }
      if (s.xpEarned > 0) onReward?.(s.xpEarned)
    }
    onClose()
  }

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; stopSpeaking(); recognitionRef.current?.abort?.() }
  }, [])

  // Brief connecting screen, then Abdool greets first.
  useEffect(() => {
    if (phase !== 'connecting') return undefined
    const id = setTimeout(() => { if (mountedRef.current) beginSession() }, 1300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (phase === 'connecting') {
    return <CallingAbdoolScreen lang={lang} onCancel={onClose} onAdvanced={onAdvanced} />
  }

  if (phase === 'report') {
    return (
      <ConversationReviewScreen
        lang={lang}
        turns={statsRef.current?.convo || turnsRef.current}
        report={report}
        status={reportStatus}
        onContinue={() => setPhase('rating')}
        onRetry={() => {
          const convo = turnsRef.current.filter((x) => x && x.text)
          setReportStatus('loading')
          generateCallReport(convo, ctx).then((r) => {
            if (!mountedRef.current) return
            setReport(r.report || null)
            setReportStatus(r.status === 'ok' ? 'ok' : r.status || 'error')
          })
        }}
      />
    )
  }
  if (phase === 'rating') {
    return <CallRatingScreen lang={lang} onContinue={(r) => { setDifficulty(r); setPhase('reward') }} />
  }
  if (phase === 'reward') {
    const s = statsRef.current || {}
    return <CallRewardScreen lang={lang} xp={s.xpEarned || 0} wordsUsed={s.wordsUsed || 0} durationSeconds={s.durationSeconds || 0} onClaim={finalize} />
  }

  const studentTurns = turns.filter((x) => x.role === 'student').length
  const micDisabled = status === 'speaking' || status === 'thinking'
  const statusLabel = {
    speaking: t('عبدول يتحدث…', 'Abdoul is speaking…'),
    ready: t('دورك الآن', 'Your turn'),
    listening: t('جاري الاستماع…', 'Listening…'),
    thinking: t('عبدول يفكر…', 'Abdoul is thinking…'),
  }[status]
  const micLabel = {
    speaking: t('عبدول يتحدث…', 'Abdoul is speaking…'),
    ready: t('اضغط للتحدث', 'Tap to speak'),
    listening: t('اضغط للإيقاف', 'Tap to stop'),
    thinking: t('عبدول يفكر…', 'Abdoul is thinking…'),
  }[status]

  return (
    <div className="gv-call" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="gv-top">
        <button className="gv-top-btn" onClick={onClose} aria-label={t('إغلاق', 'Close')}>
          <AppIcon name="wrong" size={20} />
        </button>
        <span className="gv-badge">{t('تدريب موجّه', 'Guided practice')}</span>
        <span className="gv-count" aria-label={t('عدد الجمل', 'Exchanges')}>🗣️ {studentTurns}</span>
      </header>

      <div className="gv-stage">
        <div className={`gv-avatar ${status}`} aria-hidden="true"><span>先生</span></div>
        <p className="gv-status">{statusLabel}</p>
        {error && <p className="gv-error">{error}</p>}
      </div>

      {showTranscript && (
        <div className="gv-transcript" ref={transcriptRef}>
          {turns.map((turn, i) => (
            <div key={i} className={`gv-bubble ${turn.role}`}>{turn.text}</div>
          ))}
        </div>
      )}

      <footer className="gv-controls">
        <div className="gv-controls-row">
          <button
            type="button"
            className={`gv-ctrl ${micLang === 'ja' ? 'on' : ''}`}
            onClick={() => setMicLang((m) => (m === 'ar' ? 'ja' : 'ar'))}
            title={t('لغة الميكروفون', 'Mic language')}
          >
            {micLang === 'ja' ? '日' : 'ع'}
          </button>
          <button
            type="button"
            className={`gv-ctrl ${showTranscript ? 'on' : ''}`}
            onClick={() => setShowTranscript((v) => !v)}
            title={t('النص', 'Transcript')}
          >
            <AppIcon name="messages" size={20} />
          </button>
        </div>

        <button
          type="button"
          className={`gv-mic ${status}`}
          disabled={micDisabled}
          onClick={status === 'listening' ? stopListening : startListening}
        >
          <span className="gv-mic-icon" aria-hidden="true">🎙️</span>
          <span className="gv-mic-label">{micLabel}</span>
        </button>

        <button type="button" className="gv-end" onClick={endCall} aria-label={t('إنهاء المكالمة', 'End call')}>
          <AppIcon name="wrong" size={24} />
        </button>
      </footer>
    </div>
  )
}
