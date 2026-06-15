import { useEffect, useRef, useState } from 'react'
import AppIcon from '../AppIcon.jsx'
import { requestSensei, senseiMode } from '../../ai/senseiClient.ts'
import { buildPrompt, SENSEI_FEATURES } from '../../ai/promptTemplates.ts'
import { lookupGrammar } from '../../content/stores.ts'

// Clean, chat-first Abdool Sensei home (replaces the old dashboard of cards).
// Two ways in: type to chat, or tap the call button for voice practice. The
// old feature cards become quick-suggestion chips inside the chat.
const SUGGESTIONS = [
  { id: 'explainGrammar', ar: 'اشرح قاعدة', en: 'Explain a rule' },
  { id: 'quizWeakPoints', ar: 'اختبرني في نقاط ضعفي', en: 'Quiz my weak points' },
  { id: 'simplerExamples', ar: 'أعطني أمثلة أبسط', en: 'Simpler examples' },
  { id: 'speakingPrompts', ar: 'تدرّب محادثة قصيرة', en: 'Practice a short chat' },
]

function buildChatPrompt(ctx, history, isAr) {
  const weak = []
  if (ctx?.weakGrammar?.length) weak.push(`قواعد ضعيفة: ${ctx.weakGrammar.slice(0, 3).map((w) => w.label).join('، ')}`)
  if (ctx?.weakVocabulary?.length) weak.push(`مفردات ضعيفة: ${ctx.weakVocabulary.slice(0, 4).map((w) => w.label).join('، ')}`)
  const system = [
    'أنت «عبدول سينسيه»، معلّم ياباني ودود لمتحدّثي العربية داخل تطبيق تعلّم.',
    `مستوى الطالب: ${ctx?.level || 'N5'}.`,
    ctx?.currentLessonTitleAr ? `درسه الحالي: ${ctx.currentLessonTitleAr}.` : '',
    weak.length ? `وضع الطالب: ${weak.join(' | ')}.` : '',
    'اشرح بالعربية البسيطة، واستخدم اليابانية مع القراءة عند الحاجة. اجعل ردودك مختصرة وواضحة وشجّع الطالب.',
  ].filter(Boolean).join('\n')
  const transcript = history.map((m) => `${m.role === 'student' ? 'الطالب' : 'سينسيه'}: ${m.text}`).join('\n')
  const user = `${transcript}\n\nردّ على آخر رسالة من الطالب${isAr ? '' : ' (in Arabic + Japanese where useful)'}.`
  return { system, user }
}

export default function AbdoolSenseiHome({ ctx, lang, onClose, onStartVoice }) {
  const isAr = lang === 'ar'
  const t = (ar, en) => (isAr ? ar : en)
  const mode = senseiMode()
  const aiOff = mode === 'off'
  const [messages, setMessages] = useState([]) // { role: 'student'|'sensei', text }
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const ask = async (studentText, makePrompt, featureId) => {
    const text = String(studentText || '').trim()
    if (!text || busy) return
    const history = [...messages, { role: 'student', text }]
    setMessages(history)
    setInput('')
    setBusy(true)
    let res
    try {
      res = await requestSensei({ feature: featureId, context: ctx, prompt: makePrompt(history) })
    } catch {
      res = { status: 'error', message: t('حدث خطأ. حاول مجدداً.', 'Something went wrong.') }
    }
    setBusy(false)
    const reply = res?.status === 'ok' && res.content
      ? res.content
      : (res?.message || t('تعذّر الرد الآن.', 'Could not reply right now.'))
    setMessages((h) => [...h, { role: 'sensei', text: reply }])
  }

  const send = () => ask(input, (h) => buildChatPrompt(ctx, h, isAr), 'explainGrammar')

  const runSuggestion = (sug) => {
    const feature = SENSEI_FEATURES.find((f) => f.id === sug.id)
    if (!feature) { ask(isAr ? sug.ar : sug.en, (h) => buildChatPrompt(ctx, h, isAr), 'explainGrammar'); return }
    let params
    if (feature.requiresGrammar) {
      const firstWeak = ctx?.weakGrammar?.[0]
      const g = firstWeak ? lookupGrammar(ctx.level, firstWeak.itemId) : undefined
      params = g ? { grammar: g } : undefined
    }
    ask(isAr ? sug.ar : sug.en, () => buildPrompt(feature.id, ctx, params), feature.id)
  }

  const empty = messages.length === 0

  return (
    <div className="abdool-home" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="abdool-head">
        <button className="icon-btn" onClick={onClose} aria-label={t('رجوع', 'Back')}>
          <AppIcon name="back" size={22} />
        </button>
        <div className="abdool-head-id">
          <span className="abdool-head-avatar" aria-hidden="true">先生</span>
          <div>
            <strong>{t('عبدول سينسيه', 'Abdoul Sensei')}</strong>
            <small>{t('مساعد التعلّم', 'Learning assistant')}</small>
          </div>
        </div>
      </header>

      <div className="abdool-chat" ref={scrollRef}>
        {empty ? (
          <div className="abdool-empty">
            <div className="abdool-empty-orb" aria-hidden="true"><span>先生</span></div>
            <h2>{t('مرحباً! أنا عبدول سينسيه', 'Hi! I’m Abdoul Sensei')}</h2>
            <p>{t('اسألني عن أي قاعدة أو كلمة، أو ابدأ تدريب محادثة صوتية.', 'Ask me about any grammar or word, or start a voice practice.')}</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`abdool-msg ${m.role}`}>{m.text}</div>
          ))
        )}
        {busy && <div className="abdool-msg sensei abdool-typing">…</div>}
      </div>

      {!aiOff && (
        <div className="abdool-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s.id} type="button" className="abdool-suggestion" disabled={busy} onClick={() => runSuggestion(s)}>
              {isAr ? s.ar : s.en}
            </button>
          ))}
        </div>
      )}

      {aiOff ? (
        <div className="abdool-signin-note">
          <AppIcon name="hint" size={16} />
          <span>{t('سجّل الدخول بحسابك لاستخدام عبدول سينسيه.', 'Sign in to use Abdoul Sensei.')}</span>
        </div>
      ) : (
        <form className="abdool-composer" onSubmit={(e) => { e.preventDefault(); send() }}>
          <button
            type="button"
            className="abdool-voice-btn"
            onClick={onStartVoice}
            aria-label={t('مكالمة صوتية', 'Voice call')}
            title={t('مكالمة صوتية', 'Voice call')}
          >
            <span aria-hidden="true">📞</span>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('اكتب رسالتك…', 'Type your message…')}
            disabled={busy}
          />
          <button type="submit" className="abdool-send-btn" disabled={!input.trim() || busy} aria-label={t('إرسال', 'Send')}>
            <AppIcon name="next" size={20} />
          </button>
        </form>
      )}
    </div>
  )
}
