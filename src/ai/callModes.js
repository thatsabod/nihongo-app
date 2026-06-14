// "Call Sensei" conversation modes (Phase B). Pure data: each mode carries a
// bilingual label + an Arabic instruction snippet appended to the realtime
// system prompt (passed to the server via the encoded call context, so the
// realtime WebRTC core is untouched). Role Play has sub-scenarios.

export const CALL_MODES = [
  {
    id: 'free', icon: '💬', ar: 'محادثة حرة', en: 'Free conversation',
    promptAr: 'وضع المحادثة الحرة: دردشة قصيرة طبيعية. اطرح سؤالاً واحداً صغيراً، واستمع، ثم اطرح سؤال متابعة قصيراً مرتبطاً بجواب الطالب. أبقِ الحوار خفيفاً ومستمراً.',
  },
  {
    id: 'roleplay', icon: '🎭', ar: 'لعب أدوار', en: 'Role play',
    promptAr: 'وضع لعب الأدوار: ابقَ داخل الشخصية طوال الوقت ولا تكسرها. تكلّم كما في الموقف الحقيقي. صحّح الطالب فقط بعد أن يكمل جوابه، بإيجاز، ثم تابع الدور.',
    scenarios: [
      { id: 'restaurant', ar: 'مطعم', en: 'Restaurant', promptAr: 'أنت نادل في مطعم ياباني: رحّب، اعرض القائمة، خذ الطلب، اسأل عن المشروبات والتفضيلات خطوة بخطوة.' },
      { id: 'airport', ar: 'مطار', en: 'Airport', promptAr: 'أنت موظف في مطار ياباني: اسأل عن الوجهة والتذكرة والجواز والأمتعة وبوابة الصعود خطوة بخطوة.' },
      { id: 'hotel', ar: 'فندق', en: 'Hotel', promptAr: 'أنت موظف استقبال في فندق ياباني: سجّل الدخول، اسأل عن الحجز وعدد الليالي والغرفة والخدمات خطوة بخطوة.' },
      { id: 'shopping', ar: 'تسوّق', en: 'Shopping', promptAr: 'أنت بائع في متجر ياباني: اسأل عمّا يبحث عنه الطالب، واعرض المقاس واللون والسعر وطريقة الدفع خطوة بخطوة.' },
      { id: 'interview', ar: 'مقابلة عمل', en: 'Job interview', promptAr: 'أنت مسؤول توظيف ياباني: أجرِ مقابلة بسيطة (التعريف بالنفس، الخبرة، نقاط القوة) بأسئلة مناسبة لمستوى الطالب.' },
    ],
  },
  { id: 'jlpt', icon: '🎓', ar: 'محادثة JLPT', en: 'JLPT speaking', promptAr: 'وضع محادثة JLPT: اطرح أسئلة محادثة بأسلوب الامتحان مناسبة لمستوى الطالب بالضبط. بعد كل جواب أعطِ تقييماً خفيفاً للطلاقة بجملة واحدة وتصحيحاً قصيراً، ثم سؤالاً آخر.' },
  { id: 'pronunciation', icon: '🗣️', ar: 'تدريب النطق', en: 'Pronunciation', promptAr: 'وضع النطق: ركّز على صوت/مقطع (mora) واحد في كل مرة. انطقه بوضوح وببطء، اطلب من الطالب ترديده، ثم صحّح ذلك الصوت تحديداً بلطف قبل الانتقال للتالي.' },
  { id: 'grammar', icon: '📐', ar: 'تدريب القواعد', en: 'Grammar', promptAr: 'وضع القواعد: درّب الطالب على نقاط ضعفه النحوية المذكورة في السياق تحديداً. اطلب منه تكوين جُمل قصيرة تستخدم تلك القاعدة، وصحّح الخطأ النحوي بوضوح مع الجملة الصحيحة.' },
  { id: 'vocab', icon: '📚', ar: 'تدريب المفردات', en: 'Vocabulary', promptAr: 'وضع المفردات: استعمل مفردات الطالب الضعيفة المذكورة في السياق داخل أسئلتك، واطلب منه توظيف كل كلمة في جملة قصيرة من عنده.' },
  { id: 'shadowing', icon: '🔁', ar: 'تدريب الظل', en: 'Shadowing', promptAr: 'وضع الـShadowing: انطق جملة واحدة قصيرة وواضحة، انتظر حتى يردّدها الطالب بنفس الإيقاع، صحّح بلطف عند الحاجة، ثم انتقل لجملة جديدة. لا تشرح كثيراً.' },
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
