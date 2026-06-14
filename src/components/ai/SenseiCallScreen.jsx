import { useEffect, useRef, useState } from 'react'
import AppIcon from '../AppIcon.jsx'
import { auth } from '../../firebase.js'
import { requestSensei } from '../../ai/senseiClient.ts'
import { buildCallPrompt, speakMixed, stopSpeaking } from '../../ai/senseiCall.ts'
import CallModePicker from './CallModePicker.jsx'
import CallReportScreen from './CallReportScreen.jsx'
import { modePromptSnippet } from '../../ai/callModes.js'
import { canStartCall, addCallSeconds, callMinutesRemaining, quotaMessage } from '../../ai/callQuota.js'
import { generateCallReport } from '../../ai/callReport.js'
import { saveCallSession, fetchRecentCallSessions, buildCallMemory, pushCallMistakesToReview } from '../../ai/callSessions.js'

// Full-screen "call" with Abdoul Sensei: speak (or type) → he answers out
// loud. Each turn is one regular Sensei request, so the daily quota and the
// secure cloud path apply unchanged.
export default function SenseiCallScreen({ ctx, lang, onClose }) {
  const isAr = lang === 'ar'
  const [turns, setTurns] = useState([]) // { role: 'student'|'sensei', text }
  const [status, setStatus] = useState('idle') // idle | listening | thinking | speaking
  const [mode, setMode] = useState('setup') // setup | realtime | fallback (call phase)
  const [micLang, setMicLang] = useState('ar') // 'ar' | 'ja'
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  // Phase B — conversation mode + role-play scenario.
  const [callMode, setCallMode] = useState('free')
  const [scenario, setScenario] = useState('restaurant')
  // Phase A — call controls.
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [showTranscript, setShowTranscript] = useState(true)
  const [callSeconds, setCallSeconds] = useState(0)
  // Phase C — post-call report.
  const [reportStatus, setReportStatus] = useState('idle') // idle | loading | ok | empty | error | disabled
  const [report, setReport] = useState(null)
  const reportConvoRef = useRef([])
  // Phase D — cross-call memory + one-time persistence per call.
  const [callMemory, setCallMemory] = useState('')
  const savedRef = useRef(false)
  const endedSecondsRef = useRef(0)
  const recognitionRef = useRef(null)
  const peerRef = useRef(null)
  const dataChannelRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const transcriptRef = useRef(null)
  const mountedRef = useRef(true)
  const callTimerRef = useRef(null)
  const callSecondsRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanupRealtime()
      stopSpeaking()
      recognitionRef.current?.abort?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, status])

  // Phase D — load recent call sessions once so Sensei can remember past
  // topics/mistakes (shown on the setup screen + injected into the live prompt).
  useEffect(() => {
    let alive = true
    if (auth.currentUser) {
      fetchRecentCallSessions(3).then((sessions) => {
        if (alive) setCallMemory(buildCallMemory(sessions))
      })
    }
    return () => { alive = false }
  }, [])

  const stopCallTimer = () => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (callSecondsRef.current > 0) {
      addCallSeconds(callSecondsRef.current) // bank used minutes against the daily quota
      callSecondsRef.current = 0
    }
  }

  const startCallTimer = () => {
    if (callTimerRef.current) return
    callTimerRef.current = setInterval(() => {
      callSecondsRef.current += 1
      if (mountedRef.current) setCallSeconds(callSecondsRef.current)
    }, 1000)
  }

  const cleanupRealtime = () => {
    stopCallTimer()
    dataChannelRef.current?.close?.()
    peerRef.current?.close?.()
    localStreamRef.current?.getTracks?.().forEach((track) => track.stop())
    dataChannelRef.current = null
    peerRef.current = null
    localStreamRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
  }

  const toggleMute = () => {
    const next = !muted
    localStreamRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = !next })
    setMuted(next)
  }

  const toggleSpeaker = () => {
    const next = !speakerOn
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !next
    setSpeakerOn(next)
  }

  const formatDuration = (total) => {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Phase D — save the finished call once, and push its mistakes into review.
  // Best-effort and fire-and-forget; never blocks or breaks the report UI.
  const persistAndLearn = (convo, rep) => {
    if (savedRef.current || !auth.currentUser) return
    savedRef.current = true
    try {
      saveCallSession({ mode: callMode, scenario, durationSeconds: endedSecondsRef.current, turns: convo, report: rep })
      pushCallMistakesToReview(rep)
    } catch (err) {
      console.warn('persistAndLearn failed:', err?.message || err)
    }
  }

  const runReport = (convo) => {
    setReportStatus('loading')
    generateCallReport(convo, ctx).then((res) => {
      if (!mountedRef.current) return
      setReport(res.report || null)
      setReportStatus(res.status === 'ok' ? 'ok' : res.status || 'error')
      if (res.status === 'ok' && res.report) persistAndLearn(convo, res.report)
    })
  }

  // End the live call and show a study report (Phase C). Very short calls skip
  // straight back to setup — nothing useful to summarize.
  const endCallWithReport = () => {
    const convo = turns.filter((turn) => turn && turn.text)
    endedSecondsRef.current = callSecondsRef.current // capture before cleanup banks + resets it
    cleanupRealtime()
    stopSpeaking()
    setStatus('idle')
    if (convo.length < 2) {
      setMode('setup')
      return
    }
    reportConvoRef.current = convo
    runReport(convo)
  }

  const finishReport = () => {
    setReportStatus('idle')
    setReport(null)
    setTurns([])
    setMode('setup')
    onClose()
  }

  const startFallbackCall = () => {
    cleanupRealtime()
    setMode('fallback')
    const greeting = isAr
      ? 'مرحبًا! أنا عبدول سينسيه. اسألني بالعربية أو جرّب جملة باليابانية، وأنا أسمعك.'
      : 'Hello! I am Abdoul Sensei. Ask me in Arabic or try a Japanese sentence — I am listening.'
    setTurns([{ role: 'sensei', text: greeting }])
    setStatus('speaking')
    speakMixed(greeting, { onEnd: () => mountedRef.current && setStatus('idle') })
  }

  const encodeContext = (value) => {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(value || {}))))
    } catch {
      return ''
    }
  }

  const realtimeCallEndpoint = () => {
    const projectId = auth.app?.options?.projectId || 'my-japanese-ar'
    return `https://us-central1-${projectId}.cloudfunctions.net/createSenseiRealtimeCall`
  }

  const handleRealtimeEvent = (event) => {
    if (!mountedRef.current) return
    let data = null
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }

    if (data.type === 'input_audio_buffer.speech_started') {
      setStatus('listening')
      return
    }
    if (data.type === 'input_audio_buffer.speech_stopped') {
      setStatus('thinking')
      return
    }
    if (data.type === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
      setTurns((items) => [...items, { role: 'student', text: data.transcript }])
      return
    }
    if (data.type === 'response.output_audio_transcript.delta') {
      setStatus('speaking')
      return
    }
    if (data.type === 'response.output_audio_transcript.done' && data.transcript) {
      setTurns((items) => [...items, { role: 'sensei', text: data.transcript }])
      return
    }
    if (data.type === 'response.done') {
      setStatus('idle')
    }
  }

  const startRealtimeCall = async () => {
    if (!canStartCall()) {
      setError(quotaMessage(isAr)) // Phase E — daily realtime minutes used up
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError(isAr ? 'هذا الجهاز لا يدعم المكالمة اللايف. راح نفتح وضع المكالمة العادي.' : 'This device does not support live calls. Opening fallback mode.')
      startFallbackCall()
      return
    }

    cleanupRealtime()
    stopSpeaking()
    callSecondsRef.current = 0
    setCallSeconds(0)
    savedRef.current = false // Phase D — allow this new call to persist once
    setMode('realtime')
    setStatus('thinking')
    setError('')
    setTurns([])

    try {
      if (!auth.currentUser) throw new Error('not-signed-in')
      const idToken = await auth.currentUser.getIdToken()

      const peer = new RTCPeerConnection()
      peerRef.current = peer

      peer.ontrack = (event) => {
        if (!remoteAudioRef.current) return
        remoteAudioRef.current.srcObject = event.streams[0]
        remoteAudioRef.current.play?.().catch(() => {})
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      localStreamRef.current = stream
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))

      const dataChannel = peer.createDataChannel('oai-events')
      dataChannelRef.current = dataChannel
      dataChannel.onopen = () => {
        if (!mountedRef.current) return
        setStatus('idle')
        startCallTimer() // Phase A/E — duration display + quota accounting
        dataChannel.send(JSON.stringify({
          type: 'response.create',
          response: {
            instructions: isAr
              ? 'ابدأ بتحية قصيرة جداً: مرحباً، أنا عبدول سينسيه. اسأل الطالب ماذا يريد أن يتدرب اليوم.'
              : 'Start with a very short greeting and ask what the learner wants to practice today.',
          },
        }))
      }
      dataChannel.onmessage = handleRealtimeEvent
      dataChannel.onerror = () => setError(isAr ? 'حدث خطأ بقناة المكالمة.' : 'Live call channel error.')

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      const sdpResponse = await fetch(realtimeCallEndpoint(), {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/sdp',
          'X-Sensei-Context': encodeContext({ ...ctx, modePrompt: modePromptSnippet(callMode, scenario), recentCallMemory: callMemory }),
        },
      })

      if (!sdpResponse.ok) {
        const details = await sdpResponse.text().catch(() => '')
        throw new Error(details || `realtime-sdp-${sdpResponse.status}`)
      }

      await peer.setRemoteDescription({
        type: 'answer',
        sdp: await sdpResponse.text(),
      })
    } catch (err) {
      console.error('Realtime Sensei call failed:', err)
      const message = isAr
        ? 'تعذر تشغيل المكالمة اللايف حالياً. تأكد أن functions منشورة وأن OPENAI_API_KEY مضبوط. تقدر تستخدم الوضع العادي مؤقتاً.'
        : 'Live call could not start. Make sure functions are deployed and OPENAI_API_KEY is configured. You can use fallback mode for now.'
      setError(message)
      cleanupRealtime()
      setMode('setup')
      setStatus('idle')
    }
  }

  const askSensei = async (text) => {
    const message = text.trim()
    if (!message || status === 'thinking') return
    stopSpeaking()
    setError('')
    const history = [...turns, { role: 'student', text: message }]
    setTurns(history)
    setStatus('thinking')

    const prompt = buildCallPrompt(ctx, history)
    const res = await requestSensei({ feature: 'speakingPrompts', context: ctx, prompt })
    if (!mountedRef.current) return

    if (res.status === 'ok' && res.content) {
      setTurns((t) => [...t, { role: 'sensei', text: res.content }])
      setStatus('speaking')
      speakMixed(res.content, { onEnd: () => mountedRef.current && setStatus('idle') })
    } else {
      setError(res.message)
      setStatus('idle')
    }
  }

  const startListening = () => {
    if (status === 'listening' || status === 'thinking') return
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionImpl) {
      setError(isAr ? 'متصفحك لا يدعم التعرف على الصوت — اكتب رسالتك بدل ذلك.' : 'Your browser has no speech recognition — type instead.')
      return
    }
    stopSpeaking()
    const recognition = new SpeechRecognitionImpl()
    recognitionRef.current = recognition
    recognition.lang = micLang === 'ja' ? 'ja-JP' : 'ar-SA'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => mountedRef.current && setStatus('listening')
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      if (transcript) askSensei(transcript)
    }
    recognition.onerror = () => {
      if (!mountedRef.current) return
      setStatus('idle')
      setError(isAr ? 'لم أسمعك جيدًا — حاول مجددًا أو اكتب رسالتك.' : "I couldn't hear you — try again or type.")
    }
    recognition.onend = () => {
      if (mountedRef.current) setStatus((s) => (s === 'listening' ? 'idle' : s))
    }
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop?.()
  }

  const submitTyped = (event) => {
    event.preventDefault()
    const value = typed
    setTyped('')
    askSensei(value)
  }

  const statusLabel = {
    idle: mode === 'realtime'
      ? (isAr ? 'المكالمة اللايف شغالة — تكلم طبيعي' : 'Live call is on — speak naturally')
      : (isAr ? 'جاهز — اضغط الميكروفون وتكلم' : 'Ready — tap the mic and speak'),
    listening: isAr ? 'يستمع إليك… 🎙️' : 'Listening… 🎙️',
    thinking: isAr ? 'سينسيه يفكر…' : 'Sensei is thinking…',
    speaking: isAr ? 'سينسيه يتحدث… 🔊' : 'Sensei is speaking… 🔊',
  }[status]

  if (reportStatus !== 'idle') {
    return (
      <CallReportScreen
        report={report}
        status={reportStatus}
        lang={lang}
        onClose={finishReport}
        onRetry={() => runReport(reportConvoRef.current)}
      />
    )
  }

  return (
    <div className="sensei-call" dir={isAr ? 'rtl' : 'ltr'}>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <header className="sensei-call-head">
        <div className={`sensei-call-avatar ${status}`}>
          <span>先生</span>
        </div>
        <div className="sensei-call-id">
          <strong>{isAr ? 'عبدول سينسيه' : 'Abdoul Sensei'}</strong>
          <small>{statusLabel}</small>
        </div>
        <button className="sensei-call-end" onClick={onClose} aria-label={isAr ? 'إنهاء المكالمة' : 'End call'}>
          <AppIcon name="wrong" size={20} />
        </button>
      </header>

      {mode === 'setup' && (
        <section className="sensei-live-start">
          <div className="sensei-live-orb">
            <span>先生</span>
          </div>
          <h1>{isAr ? 'مكالمة لايف مع عبدول سينسيه' : 'Live call with Abdoul Sensei'}</h1>
          <p>
            {isAr
              ? 'تكلم طبيعي بالعربي أو الياباني. عبدول يسمعك ويرد عليك صوتياً مثل مكالمة ChatGPT.'
              : 'Speak naturally in Arabic or Japanese. Abdoul listens and answers by voice like a ChatGPT call.'}
          </p>
          {callMemory && (
            <div className="sensei-call-memory">
              <span className="sensei-call-memory-title">{isAr ? '🧠 يتذكّر سينسيه من مكالماتك السابقة' : '🧠 Sensei remembers from your past calls'}</span>
              <p>{callMemory}</p>
            </div>
          )}
          <CallModePicker
            lang={lang}
            mode={callMode}
            scenario={scenario}
            onSelectMode={setCallMode}
            onSelectScenario={setScenario}
          />
          <button className="sensei-live-primary" onClick={startRealtimeCall}>
            {isAr ? 'ابدأ المكالمة اللايف' : 'Start live call'}
          </button>
          <button className="sensei-live-secondary" onClick={startFallbackCall}>
            {isAr ? 'استخدم الوضع العادي' : 'Use fallback mode'}
          </button>
          <p className="sensei-call-quota">
            {isAr
              ? `المتبقي اليوم: ${Math.ceil(callMinutesRemaining())} دقيقة`
              : `${Math.ceil(callMinutesRemaining())} min left today`}
          </p>
          {error && <div className="sensei-call-error">{error}</div>}
        </section>
      )}

      {mode !== 'setup' && showTranscript && <div className="sensei-call-transcript" ref={transcriptRef}>
        {turns.map((turn, i) => (
          <div key={i} className={`sensei-call-bubble ${turn.role}`}>
            {turn.text}
          </div>
        ))}
        {status === 'thinking' && <div className="sensei-call-bubble sensei typing">…</div>}
        {error && <div className="sensei-call-error">{error}</div>}
      </div>}

      {mode === 'fallback' && <footer className="sensei-call-controls">
        <button
          type="button"
          className={`sensei-mic-lang ${micLang === 'ja' ? 'ja' : ''}`}
          onClick={() => setMicLang((m) => (m === 'ar' ? 'ja' : 'ar'))}
          title={isAr ? 'لغة الميكروفون' : 'Mic language'}
        >
          {micLang === 'ja' ? '日' : 'ع'}
        </button>

        <button
          type="button"
          className={`sensei-mic-btn ${status === 'listening' ? 'live' : ''}`}
          onClick={status === 'listening' ? stopListening : startListening}
          disabled={status === 'thinking'}
          aria-label={isAr ? 'تحدث' : 'Speak'}
        >
          🎙️
        </button>

        <form className="sensei-call-typebar" onSubmit={submitTyped}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={isAr ? 'أو اكتب هنا…' : 'or type here…'}
            disabled={status === 'thinking'}
          />
          <button type="submit" className="btn btn-primary" disabled={!typed.trim() || status === 'thinking'}>
            {isAr ? 'أرسل' : 'Send'}
          </button>
        </form>
      </footer>}

      {mode === 'realtime' && <footer className="sensei-call-controls sensei-live-controls">
        <span className="sensei-call-duration" aria-label={isAr ? 'مدة المكالمة' : 'Call duration'}>{formatDuration(callSeconds)}</span>
        <div className="sensei-call-btnrow">
          <button
            type="button"
            className={`sensei-ctrl-btn ${muted ? 'off' : ''}`}
            onClick={toggleMute}
            aria-pressed={muted}
            title={isAr ? (muted ? 'إلغاء الكتم' : 'كتم الميكروفون') : (muted ? 'Unmute' : 'Mute')}
          >
            {muted ? '🔇' : '🎙️'}
          </button>
          <button
            type="button"
            className={`sensei-ctrl-btn ${speakerOn ? '' : 'off'}`}
            onClick={toggleSpeaker}
            aria-pressed={speakerOn}
            title={isAr ? (speakerOn ? 'كتم الصوت' : 'تشغيل الصوت') : (speakerOn ? 'Speaker off' : 'Speaker on')}
          >
            {speakerOn ? '🔊' : '🔈'}
          </button>
          <button
            type="button"
            className={`sensei-ctrl-btn ${showTranscript ? 'active' : ''}`}
            onClick={() => setShowTranscript((v) => !v)}
            aria-pressed={showTranscript}
            title={isAr ? 'النص' : 'Transcript'}
          >
            <AppIcon name="messages" size={20} />
          </button>
          <button
            type="button"
            className="sensei-ctrl-btn sensei-ctrl-end"
            onClick={endCallWithReport}
            title={isAr ? 'إنهاء' : 'End'}
          >
            <AppIcon name="wrong" size={20} />
          </button>
        </div>
      </footer>}
    </div>
  )
}
