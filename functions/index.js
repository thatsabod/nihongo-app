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
const { getMessaging } = require('firebase-admin/messaging')
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

// ── Admin Web Push (FCM) — send a broadcast to users' devices ────────────────
// Callable only by owner/admin/moderator (or username 'abdol'). Validates the
// caller's role SERVER-SIDE (never trusts the client), fans the message out to
// all matching, enabled FCM tokens, prunes invalid tokens, and returns stats.
async function callerCanBroadcast(uid) {
  if (!uid) return false
  const snap = await db.doc(`users/${uid}`).get()
  if (!snap.exists) return false
  const u = snap.data() || {}
  return ['owner', 'admin', 'moderator'].includes(u.role)
    || u.userUsername === 'abdol' || u.username === 'abdol'
}

exports.sendAdminBroadcastPush = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '256MiB', maxInstances: 5 },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
    if (!(await callerCanBroadcast(uid))) throw new HttpsError('permission-denied', 'Admins only.')

    const d = request.data || {}
    const test = d.test === true // self-test: only the caller's own devices
    const title = String(d.title || (test ? 'إشعار تجريبي' : '')).slice(0, 120).trim()
    const body = String(d.body || (test ? 'هذا إشعار تجريبي من لوحة التحكم ✅' : '')).slice(0, 500).trim()
    if (!title && !body) throw new HttpsError('invalid-argument', 'Title or body required.')
    const audience = test ? 'self' : String(d.audience || 'all') // 'all' | 'N5'..'N1'
    const uids = test ? [uid] : (Array.isArray(d.uids) ? d.uids.slice(0, 500).map(String) : [])
    const clickAction = String(d.clickAction || '/').slice(0, 300)
    const type = String(d.type || (test ? 'admin_test' : 'admin_broadcast')).slice(0, 60)
    const icon = String(d.icon || '/favicon.svg').slice(0, 400)
    const image = d.image ? String(d.image).slice(0, 600) : ''

    // Gather enabled tokens. For test/specific targets read each user's OWN
    // subcollection directly (uses the automatic single-field index — no
    // collection-group index needed → self-test works immediately). For
    // all/level use a collection-group query (needs the fcmTokens.enabled
    // COLLECTION_GROUP index from firestore.indexes.json). Errors are captured
    // (not thrown) so the client gets a readable report instead of "internal".
    const targets = [] // { token, ref, platform, enabled, level }
    const ownerSet = new Set()
    let enabledTokensTotal = 0
    let fetchError = null
    const pushTok = (docSnap, ownerUid) => {
      const data = docSnap.data() || {}
      if (!data.token) return false
      targets.push({ token: data.token, ref: docSnap.ref, platform: data.platform || '', enabled: data.enabled !== false, level: data.level || '' })
      if (ownerUid) ownerSet.add(ownerUid)
      return true
    }
    try {
      if (uids.length) {
        for (const targetUid of uids) {
          const us = await db.collection('users').doc(targetUid).collection('fcmTokens').where('enabled', '==', true).get()
          enabledTokensTotal += us.size
          us.forEach((docSnap) => pushTok(docSnap, targetUid))
        }
      } else {
        const snap = await db.collectionGroup('fcmTokens').where('enabled', '==', true).get()
        enabledTokensTotal = snap.size
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {}
          const ownerUid = docSnap.ref.parent.parent ? docSnap.ref.parent.parent.id : ''
          if (audience !== 'all' && data.level !== audience) return
          pushTok(docSnap, ownerUid)
        })
      }
    } catch (e) {
      fetchError = { code: e.code != null ? String(e.code) : 'fetch-error', message: e.message || String(e) }
    }

    const tokensPreview = targets.slice(0, 12).map((x) => ({
      head: `${x.token.slice(0, 14)}…${x.token.slice(-6)}`,
      platform: x.platform, enabled: x.enabled, level: x.level,
    }))

    // Always write a debug log so failures are inspectable in Firestore.
    const writeDebug = async (response, errorDetails) => {
      try {
        const ref = await db.collection('pushDebugLogs').add({
          uid, audience, test, tokenCount: targets.length,
          enabledTokensTotal, usersWithTokens: ownerSet.size,
          tokensPreview, response, errors: (errorDetails || []).slice(0, 12),
          fetchError, createdAt: FieldValue.serverTimestamp(),
        })
        return ref.id
      } catch (e) { return `log-failed:${e.code || e.message || ''}` }
    }

    const base = {
      audience, test,
      callerUid: uid,
      enabledTokensTotal,
      usersWithTokens: ownerSet.size,
      totalTokens: targets.length,
      tokensPreview,
      successCount: 0, failureCount: 0, invalidRemoved: 0, errors: {}, errorDetails: [],
      error: fetchError,
    }
    if (fetchError || !targets.length) {
      base.debugLogId = await writeDebug({ successCount: 0, failureCount: 0 }, fetchError ? [fetchError] : [])
      return base
    }

    // Cross-platform payload: include `notification` so iOS Safari PWA + Chrome
    // display it (data-only is NOT reliably shown on iOS web push). `data` keeps
    // click routing; fcmOptions.link is the click target.
    const dataPayload = { title, body, icon, image, clickAction, type, tag: `bc-${Date.now()}` }
    const webpushNotification = { title: title || 'نيهونغو', body: body || '', icon }
    if (image) webpushNotification.image = image
    try {
    const messaging = getMessaging()
    let success = 0
    let failure = 0
    const invalidRefs = []
    const errors = {}
    const errorDetails = []

    for (let i = 0; i < targets.length; i += 500) {
      const chunk = targets.slice(i, i + 500)
      const res = await messaging.sendEachForMulticast({
        tokens: chunk.map((x) => x.token),
        data: dataPayload,
        notification: { title: title || 'نيهونغو', body: body || '' },
        webpush: { notification: webpushNotification, fcmOptions: { link: clickAction }, headers: { Urgency: 'high' } },
        android: { priority: 'high' },
      })
      success += res.successCount
      failure += res.failureCount
      res.responses.forEach((r, j) => {
        if (!r.success) {
          const code = (r.error && r.error.code) || 'unknown'
          const message = (r.error && r.error.message) || ''
          errors[code] = (errors[code] || 0) + 1
          errorDetails.push({ code, message, platform: chunk[j].platform })
          if (code === 'messaging/registration-token-not-registered'
            || code === 'messaging/invalid-registration-token'
            || code === 'messaging/invalid-argument') {
            invalidRefs.push(chunk[j].ref)
          }
        }
      })
    }

    for (let i = 0; i < invalidRefs.length; i += 400) {
      const batch = db.batch()
      invalidRefs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
      await batch.commit()
    }

    const stats = { ...base, successCount: success, failureCount: failure, invalidRemoved: invalidRefs.length, errors, errorDetails: errorDetails.slice(0, 12) }
    stats.debugLogId = await writeDebug({ successCount: success, failureCount: failure }, errorDetails)

    if (d.broadcastId) {
      try {
        await db.doc(`broadcasts/${String(d.broadcastId)}`).set(
          { pushStats: { successCount: success, failureCount: failure, totalTokens: targets.length, invalidRemoved: invalidRefs.length, sentAt: FieldValue.serverTimestamp(), sentBy: uid } },
          { merge: true },
        )
      } catch (e) { /* non-fatal */ }
    }

    return stats
    } catch (sendErr) {
      base.error = { code: sendErr.code != null ? String(sendErr.code) : 'send-error', message: sendErr.message || String(sendErr) }
      base.debugLogId = await writeDebug({ successCount: 0, failureCount: 0 }, [base.error])
      return base
    }
  },
)
