// Abdoul Sensei — server-side AI proxy.
//
// The Anthropic API key lives ONLY here, as a Cloud Functions secret
// (`firebase functions:secrets:set ANTHROPIC_API_KEY`). The browser never
// sees it. The client sends the already-grounded prompt (built locally from
// the learner's own data); this function enforces auth + a per-user daily
// quota in Firestore, calls Anthropic, and returns the text.

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const Anthropic = require('@anthropic-ai/sdk')

initializeApp()
const db = getFirestore()
const anthropicKey = defineSecret('ANTHROPIC_API_KEY')
const openaiKey = defineSecret('OPENAI_API_KEY')

const MODEL = 'claude-opus-4-8'
const MAX_TOKENS = 4096
const DAILY_LIMIT = 20
// Prompts are app-generated; anything larger means a malformed/abusive call.
const MAX_PROMPT_CHARS = 8000

function buildRealtimeInstructions(context = {}) {
  const level = String(context.level || 'N5').slice(0, 8)
  const lessonTitle = String(context.currentLessonTitleAr || '').slice(0, 120)
  const weakGrammar = Array.isArray(context.weakGrammar)
    ? context.weakGrammar.slice(0, 4).map((item) => String(item?.label || item).slice(0, 60)).join('، ')
    : ''
  const weakVocabulary = Array.isArray(context.weakVocabulary)
    ? context.weakVocabulary.slice(0, 6).map((item) => String(item?.label || item).slice(0, 60)).join('، ')
    : ''
  const modePrompt = String(context.modePrompt || '').slice(0, 400) // Phase B — chosen call mode
  const recentCallMemory = String(context.recentCallMemory || '').slice(0, 300) // Phase D — memory of past calls

  const L = level.toUpperCase()
  const isBeginner = L === 'N5' || L === 'N4'
  const levelPolicy =
    L === 'N5'
      ? 'الطالب مبتدئ (N5): استخدم يابانية قصيرة جداً وبسيطة وتكلّم ببطء ووضوح، واشرح بالعربية غالباً، وصحّح خطأً واحداً فقط في كل مرة، وكرّر الجملة الصحيحة ببطء.'
      : L === 'N4'
        ? 'الطالب (N4): استخدم يابانية بسيطة مع شرح بالعربية عند الحاجة، وصحّح خطأً أو خطأين كحدّ أقصى.'
        : L === 'N3'
          ? 'الطالب (N3): استخدم يابانية طبيعية أكثر وقلّل العربية إلا عند اللزوم.'
          : 'الطالب متقدّم (N2/N1): تحدّث باليابانية غالباً، واستخدم العربية للضرورة فقط.'
  const lengthRule = isBeginner
    ? 'اجعل ردّك قصيراً جداً: جملة يابانية واحدة قصيرة + (عند الحاجة) سطر عربي قصير لتوضيح المعنى + سؤال واحد قصير. تكلّم ببطء.'
    : 'اجعل ردّك مختصراً وطبيعياً: يابانية أكثر وعربية أقل، وأنهِ بسؤال متابعة قصير.'

  return [
    'أنت «عبدول سينسيه»، معلّم ياباني حقيقي ودود لمتحدّثي العربية، داخل مكالمة صوتية مباشرة.',
    'تكلّم بدفء واختصار كأنها مكالمة حقيقية، وحافظ على استمرار المحادثة. لا تحاضر ولا تعطِ فقرات طويلة.',
    levelPolicy,
    lengthRule,
    'سير كل دور: (1) استمع جيداً. (2) إذا لم تسمع الجملة أو لم تفهمها بوضوح فلا تخمّن إطلاقاً — اطلب الإعادة ببطء: «ما سمعت الجملة بوضوح، ممكن تعيدها ببطء؟» أو أكّد فهمك: «تقصد قلت: … ؟». (3) إذا فهمته، ردّ بشكل طبيعي. (4) إذا أخطأ: صحّح خطأً واحداً بإيجاز، أعطِه الجملة الأفضل، اشرح السبب بالعربية بسطر واحد، ثم اطلب منه إعادة الجملة الصحيحة. (5) اطرح سؤالاً صغيراً واحداً لإكمال المحادثة.',
    'الطالب عربي يتعلّم اليابانية وقد يخلط اليابانية والعربية (واللهجة العراقية) والإنجليزية في كلامه — هذا متوقّع وطبيعي؛ تعامل معه بمرونة ولا تفترض أنه قال يابانية ركيكة حين يتكلّم العربية.',
    'لا تعاقب الطالب على لهجته أو لكنته أبداً، وشجّعه دائماً، واطلب الإعادة عند عدم الوضوح بدل التخمين.',
    'اسأل سؤالاً واحداً فقط في كل مرة وانتظر جواب الطالب. لا تستخدم markdown ولا رموز ولا قوائم.',
    'تجنّب: السيطرة على المحادثة، الردود الطويلة، تغيير الموضوع فجأة، تصحيح كل خطأ صغير، ادّعاء فهم كلام غير واضح، استخدام يابانية متقدّمة مع المبتدئين.',
    `مستوى الطالب الحالي: ${level}.`,
    lessonTitle ? `الدرس الحالي: ${lessonTitle}.` : '',
    weakGrammar ? `نقاط قواعد تحتاج تدريب: ${weakGrammar}.` : '',
    weakVocabulary ? `مفردات تحتاج تدريب: ${weakVocabulary}.` : '',
    recentCallMemory ? `تتذكّر من مكالمات سابقة مع نفس الطالب (راجِع هذه النقاط بإيجاز إذا ناسب):\n${recentCallMemory}` : '',
    modePrompt,
  ].filter(Boolean).join('\n')
}

// Per-level output speech speed — slower for beginners so they can follow.
function outputSpeedForLevel(level) {
  const L = String(level || 'N5').toUpperCase()
  if (L === 'N5' || L === 'N4') return 0.85
  if (L === 'N3') return 0.92
  return 1.0
}

// The full Realtime session object, shared by both entry points so the call
// and the (legacy) ephemeral-secret path stay identical. Tuned for Arabic
// learners of Japanese: semantic VAD (waits for the learner to finish instead
// of cutting off on a fixed silence timer), multilingual input transcription
// (also powers the live "what Sensei heard" transcript), near-field noise
// reduction, and level-based slower speech. Conversation model unchanged.
function buildRealtimeSession(context = {}) {
  return {
    type: 'realtime',
    model: 'gpt-realtime-2',
    instructions: buildRealtimeInstructions(context),
    audio: {
      input: {
        transcription: {
          model: 'gpt-4o-transcribe',
          prompt: 'المتحدّث عربي يتعلّم اليابانية ويخلط بين اليابانية والعربية (واللهجة العراقية) والإنجليزية أحياناً.',
        },
        noise_reduction: { type: 'near_field' },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'low',
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: 'marin',
        speed: outputSpeedForLevel(context.level),
      },
    },
  }
}

function readEncodedContext(value) {
  if (!value) return {}
  try {
    return JSON.parse(Buffer.from(String(value), 'base64').toString('utf8'))
  } catch {
    return {}
  }
}

exports.askSensei = onCall(
  {
    secrets: [anthropicKey],
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
    maxInstances: 5,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'سجّل الدخول لاستخدام عبدول سينسيه.')
    }

    const system = String(request.data?.system || '').slice(0, MAX_PROMPT_CHARS)
    const user = String(request.data?.user || '').slice(0, MAX_PROMPT_CHARS)
    if (!user.trim()) {
      throw new HttpsError('invalid-argument', 'الطلب فارغ.')
    }

    // Per-user daily quota (resets by UTC date). Transactional so parallel
    // requests can't sneak past the limit.
    const today = new Date().toISOString().slice(0, 10)
    const usageRef = db.doc(`senseiUsage/${uid}`)
    let used = 0
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef)
      const data = snap.exists ? snap.data() : {}
      const count = data.date === today ? data.count || 0 : 0
      if (count >= DAILY_LIMIT) {
        throw new HttpsError(
          'resource-exhausted',
          `وصلت إلى الحد اليومي (${DAILY_LIMIT} طلبًا). عُد غدًا لمتابعة التعلّم مع سينسيه 🌸`,
        )
      }
      used = count + 1
      tx.set(usageRef, { date: today, count: used, updatedAt: FieldValue.serverTimestamp() })
    })

    const client = new Anthropic({ apiKey: anthropicKey.value() })
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        system,
        messages: [{ role: 'user', content: user }],
      })
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim()
      return { content: text, remaining: DAILY_LIMIT - used }
    } catch (err) {
      console.error('Anthropic call failed:', err?.status, err?.message)
      if (err instanceof Anthropic.RateLimitError) {
        throw new HttpsError('resource-exhausted', 'الخدمة مشغولة الآن. انتظر دقيقة ثم حاول مجددًا.')
      }
      if (err instanceof Anthropic.AuthenticationError) {
        throw new HttpsError('failed-precondition', 'إعداد الخادم غير مكتمل (مفتاح غير صالح).')
      }
      if (err instanceof Anthropic.APIError && /credit balance/i.test(err.message || '')) {
        throw new HttpsError('failed-precondition', 'رصيد خدمة الذكاء الاصطناعي غير كافٍ.')
      }
      throw new HttpsError('internal', 'حدث خطأ أثناء الاتصال بسينسيه. حاول مرة أخرى.')
    }
  },
)

exports.createSenseiRealtimeSecret = onCall(
  {
    secrets: [openaiKey],
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'سجّل الدخول لاستخدام مكالمة عبدول سينسيه اللايف.')
    }

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey.value()}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': uid,
      },
      body: JSON.stringify({
        session: buildRealtimeSession(request.data?.context || {}),
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      console.error('OpenAI realtime token failed:', response.status, data)
      throw new HttpsError('failed-precondition', 'تعذر إنشاء جلسة الصوت اللايف. تأكد من OPENAI_API_KEY وصلاحية Realtime API.')
    }

    return {
      value: data?.value || data?.client_secret?.value,
      expires_at: data?.expires_at || data?.client_secret?.expires_at || null,
    }
  },
)

exports.createSenseiRealtimeCall = onRequest(
  {
    secrets: [openaiKey],
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
    cors: true,
  },
  async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.status(204).send('')
      return
    }
    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed')
      return
    }

    const authHeader = String(request.headers.authorization || '')
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!idToken) {
      response.status(401).send('Missing Firebase auth token')
      return
    }

    let decoded
    try {
      decoded = await getAuth().verifyIdToken(idToken)
    } catch (error) {
      response.status(401).send('Invalid Firebase auth token')
      return
    }

    const sdp = request.rawBody?.toString('utf8') || String(request.body || '')
    if (!sdp.trim()) {
      response.status(400).send('Missing SDP offer')
      return
    }

    const context = readEncodedContext(request.headers['x-sensei-context'])
    const sessionConfig = JSON.stringify(buildRealtimeSession(context))

    const formData = new FormData()
    formData.set('sdp', sdp)
    formData.set('session', sessionConfig)

    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey.value()}`,
        'OpenAI-Safety-Identifier': decoded.uid,
      },
      body: formData,
    })

    const answerSdp = await openaiResponse.text()
    if (!openaiResponse.ok) {
      console.error('OpenAI realtime call failed:', openaiResponse.status, answerSdp)
      response.status(openaiResponse.status).send(answerSdp || 'OpenAI realtime call failed')
      return
    }

    response.type('application/sdp').send(answerSdp)
  },
)
