import { useEffect, useRef, useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import AppIcon from '../AppIcon.jsx'
import { requestSensei } from '../../ai/senseiClient.ts'
import { buildCallPrompt, speakMixed, stopSpeaking } from '../../ai/senseiCall.ts'

// Full-screen "call" with Abdoul Sensei: speak (or type) → he answers out
// loud. Each turn is one regular Sensei request, so the daily quota and the
// secure cloud path apply unchanged.
export default function SenseiCallScreen({ ctx, lang, onClose }) {
  const isAr = lang === 'ar'
  const [turns, setTurns] = useState([]) // { role: 'student'|'sensei', text }
  const [status, setStatus] = useState('idle') // idle | listening | thinking | speaking
  const [mode, setMode] = useState('setup') // setup | realtime | fallback
  const [micLang, setMicLang] = useState('ar') // 'ar' | 'ja'
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const peerRef = useRef(null)
  const dataChannelRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const transcriptRef = useRef(null)
  const mountedRef = useRef(true)

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

  const cleanupRealtime = () => {
    dataChannelRef.current?.close?.()
    peerRef.current?.close?.()
    localStreamRef.current?.getTracks?.().forEach((track) => track.stop())
    dataChannelRef.current = null
    peerRef.current = null
    localStreamRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
  }

  const startFallbackCall = () => {
    cleanupRealtime()
    setMode('fallback')
    setError('')
    const greeting = isAr
      ? 'مرحبًا! أنا عبدول سينسيه. اسألني بالعربية أو جرّب جملة باليابانية، وأنا أسمعك.'
      : 'Hello! I am Abdoul Sensei. Ask me in Arabic or try a Japanese sentence — I am listening.'
    setTurns([{ role: 'sensei', text: greeting }])
    setStatus('speaking')
    speakMixed(greeting, { onEnd: () => mountedRef.current && setStatus('idle') })
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
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError(isAr ? 'هذا الجهاز لا يدعم المكالمة اللايف. راح نفتح وضع المكالمة العادي.' : 'This device does not support live calls. Opening fallback mode.')
      startFallbackCall()
      return
    }

    cleanupRealtime()
    stopSpeaking()
    setMode('realtime')
    setStatus('thinking')
    setError('')
    setTurns([])

    try {
      const createSecret = httpsCallable(getFunctions(), 'createSenseiRealtimeSecret')
      const tokenResult = await createSecret({ context: ctx })
      const ephemeralKey = tokenResult.data?.value
      if (!ephemeralKey) throw new Error('missing-realtime-token')

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

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
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
        ? 'تعذر تشغيل المكالمة اللايف حالياً. راح أرجعك لوضع المكالمة العادي إلى أن ننشر إعدادات OpenAI.'
        : 'Live call could not start. Falling back to regular voice mode until OpenAI settings are deployed.'
      setError(message)
      startFallbackCall()
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
          <button className="sensei-live-primary" onClick={startRealtimeCall}>
            {isAr ? 'ابدأ المكالمة اللايف' : 'Start live call'}
          </button>
          <button className="sensei-live-secondary" onClick={startFallbackCall}>
            {isAr ? 'استخدم الوضع العادي' : 'Use fallback mode'}
          </button>
          {error && <div className="sensei-call-error">{error}</div>}
        </section>
      )}

      {mode !== 'setup' && <div className="sensei-call-transcript" ref={transcriptRef}>
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
        <button
          type="button"
          className="sensei-call-end sensei-live-end"
          onClick={() => {
            cleanupRealtime()
            setMode('setup')
            setStatus('idle')
          }}
        >
          {isAr ? 'إنهاء المكالمة' : 'End call'}
        </button>
      </footer>}
    </div>
  )
}
