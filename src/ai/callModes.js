// "Call Sensei" conversation modes (Phase B). Pure data: each mode carries a
// bilingual label + an Arabic instruction snippet appended to the realtime
// system prompt (passed to the server via the encoded call context, so the
// realtime WebRTC core is untouched). Role Play has sub-scenarios.

export const CALL_MODES = [
  {
    id: 'free', icon: '💬', ar: 'محادثة حرة', en: 'Free conversation',
    promptAr: 'وضع المحادثة الحرة: تحدّث بشكل طبيعي عن أي موضوع يطرحه الطالب، وشجّعه على الاستمرار.',
  },
  {
    id: 'roleplay', icon: '🎭', ar: 'لعب أدوار', en: 'Role play',
    promptAr: 'وضع لعب الأدوار: مثّل موقفاً واقعياً وابقَ في الشخصية، وصحّح بلطف عند الحاجة.',
    scenarios: [
      { id: 'restaurant', ar: 'مطعم', en: 'Restaurant', promptAr: 'أنت نادل في مطعم ياباني. رحّب بالطالب وخذ طلبه واسأله عن تفضيلاته.' },
      { id: 'airport', ar: 'مطار', en: 'Airport', promptAr: 'أنت موظف في مطار ياباني. ساعد الطالب في إجراءات السفر والبوابة والأمتعة.' },
      { id: 'hotel', ar: 'فندق', en: 'Hotel', promptAr: 'أنت موظف استقبال في فندق ياباني. ساعد الطالب في تسجيل الدخول والغرفة والخدمات.' },
      { id: 'shopping', ar: 'تسوّق', en: 'Shopping', promptAr: 'أنت بائع في متجر ياباني. ساعد الطالب في اختيار المنتج والأسعار والدفع.' },
      { id: 'interview', ar: 'مقابلة عمل', en: 'Job interview', promptAr: 'أنت مسؤول توظيف ياباني. أجرِ مقابلة عمل بسيطة واطرح أسئلة مناسبة لمستوى الطالب.' },
    ],
  },
  { id: 'jlpt', icon: '🎓', ar: 'محادثة JLPT', en: 'JLPT speaking', promptAr: 'وضع محادثة JLPT: اطرح أسئلة بأسلوب امتحان المحادثة المناسب لمستوى الطالب، وصحّح إجاباته باختصار.' },
  { id: 'pronunciation', icon: '🗣️', ar: 'تدريب النطق', en: 'Pronunciation', promptAr: 'وضع النطق: ركّز على النطق. اطلب من الطالب تكرار كلمات وجُمل قصيرة، وصحّح النطق بلطف مع نموذج صحيح.' },
  { id: 'grammar', icon: '📐', ar: 'تدريب القواعد', en: 'Grammar', promptAr: 'وضع القواعد: درّب الطالب على نقاط ضعفه النحوية عبر جُمل وأمثلة قصيرة، وصحّح الأخطاء النحوية بوضوح.' },
  { id: 'vocab', icon: '📚', ar: 'تدريب المفردات', en: 'Vocabulary', promptAr: 'وضع المفردات: استخدم مفردات مناسبة لمستوى الطالب، واطلب منه توظيف كلمات جديدة في جُمل قصيرة.' },
  { id: 'shadowing', icon: '🔁', ar: 'تدريب الظل', en: 'Shadowing', promptAr: 'وضع الـShadowing: انطق جملة قصيرة واضحة واطلب من الطالب ترديدها فوراً بنفس الإيقاع، ثم انتقل لجملة جديدة.' },
]

export function getCallMode(modeId) {
  return CALL_MODES.find((m) => m.id === modeId) || CALL_MODES[0]
}

// Build the instruction snippet for the chosen mode (+ role-play scenario),
// appended to the realtime system prompt server-side.
export function modePromptSnippet(modeId, scenarioId) {
  const mode = getCallMode(modeId)
  if (mode.id === 'roleplay' && scenarioId) {
    const s = (mode.scenarios || []).find((x) => x.id === scenarioId)
    return s ? `${mode.promptAr} ${s.promptAr}` : mode.promptAr
  }
  return mode.promptAr
}
