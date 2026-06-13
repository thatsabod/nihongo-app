// Phase 7 — AI Sensei prompt templates.
//
// Each template turns the grounded SenseiContext (+ optional params) into a
// system/user prompt pair, in Arabic, ready for a FUTURE approved provider.
// These are pure string builders — they perform no I/O and call no API.

import type {
  PromptTemplate,
  SenseiContext,
  SenseiFeatureId,
  SenseiPrompt,
  SenseiRequestParams,
} from './aiSensei.types'
import { senseiTextPersona } from './senseiPersona'

// Shared persona/system instruction (text mode), tuned per level.
// Sourced from the single persona constant in ./senseiPersona.
function systemPrompt(ctx: SenseiContext): string {
  return senseiTextPersona(ctx)
}

function weakSummary(ctx: SenseiContext): string {
  const g = ctx.weakGrammar.slice(0, 5).map((w) => w.label).join('، ') || 'لا يوجد'
  const v = ctx.weakVocabulary.slice(0, 8).map((w) => w.label).join('، ') || 'لا يوجد'
  const k = ctx.weakKanji.slice(0, 8).map((w) => w.label).join('، ') || 'لا يوجد'
  return `نقاط ضعف القواعد: ${g}\nنقاط ضعف المفردات: ${v}\nنقاط ضعف الكانجي: ${k}`
}

const templates: Record<SenseiFeatureId, PromptTemplate> = {
  explainGrammar: {
    feature: 'explainGrammar',
    build: (ctx, params) => {
      const g = params?.grammar
      const target = g
        ? `القاعدة: «${g.titleAr}»\nالنمط: ${g.pattern}\nالشرح المتاح: ${g.explanationAr || '—'}`
        : 'القاعدة التي يدرسها الطالب حالياً في هذا الدرس.'
      return {
        system: systemPrompt(ctx),
        user: [
          'اشرح القاعدة التالية بالعربية خطوة بخطوة:',
          target,
          'قدّم: (1) متى تُستخدم، (2) بناء الجملة، (3) مثالان قصيران مع القراءة والترجمة، (4) خطأ شائع يقع فيه الطلاب العرب.',
        ].join('\n'),
      }
    },
  },

  simplerExamples: {
    feature: 'simplerExamples',
    build: (ctx, params) => ({
      system: systemPrompt(ctx),
      user: [
        params?.grammar
          ? `أعطني أمثلة أبسط على القاعدة «${params.grammar.titleAr}» (${params.grammar.pattern}).`
          : 'أعطني أمثلة أبسط على آخر قاعدة درسها الطالب.',
        'اكتب ٣ جُمل قصيرة جداً مناسبة لمستوى مبتدئ، كل جملة بالياباني + الروماجي + العربية، متدرجة من الأسهل للأصعب.',
      ].join('\n'),
    }),
  },

  quizWeakPoints: {
    feature: 'quizWeakPoints',
    build: (ctx) => ({
      system: systemPrompt(ctx),
      user: [
        'اختبرني في نقاط ضعفي التالية فقط:',
        weakSummary(ctx),
        'كوّن ٥ أسئلة اختيار من متعدد قصيرة، سؤال لكل نقطة ضعف إن أمكن، مع الإجابة الصحيحة وشرح موجز لكل سؤال. لا تخرج عن نقاط الضعف المذكورة.',
      ].join('\n'),
    }),
  },

  readingFromVocab: {
    feature: 'readingFromVocab',
    build: (ctx) => ({
      system: systemPrompt(ctx),
      user: [
        `كوّن نص قراءة قصير (٣–٤ جُمل) بمستوى ${ctx.level} باستخدام مفردات يعرفها الطالب فقط (عدد المفردات المعروفة: ${ctx.knownVocabularyCount}).`,
        'بعد النص: اكتب القراءة (روماجي) ثم الترجمة العربية، ثم سؤالَي فهم بسيطين مع إجابتيهما.',
        'تجنّب أي مفردات أو قواعد أعلى من مستوى الطالب.',
      ].join('\n'),
    }),
  },

  speakingPrompts: {
    feature: 'speakingPrompts',
    build: (ctx) => ({
      system: systemPrompt(ctx),
      user: [
        `أعطني ٣ مواقف محادثة قصيرة بمستوى ${ctx.level} لأتدرّب على النطق.`,
        'لكل موقف: اكتب الجملة بالياباني + الروماجي + العربية، واطلب مني تكرارها، واذكر النقطة التي يجب الانتباه لها في النطق.',
        ctx.weakGrammar.length
          ? `حاول دمج نقاط ضعفي في القواعد: ${ctx.weakGrammar.slice(0, 3).map((w) => w.label).join('، ')}.`
          : '',
      ].filter(Boolean).join('\n'),
    }),
  },

  explainWrongAnswer: {
    feature: 'explainWrongAnswer',
    build: (ctx, params) => {
      const w = params?.wrongAnswer
      const detail = w
        ? `السؤال: ${w.questionAr || '—'}\nالإجابة الصحيحة: ${w.expected || '—'}\nإجابتي الخاطئة: ${w.got || '—'}${w.grammarTitle ? `\nالقاعدة المعنية: ${w.grammarTitle}` : ''}`
        : 'آخر إجابة خاطئة للطالب.'
      return {
        system: systemPrompt(ctx),
        user: [
          'اشرح لماذا إجابتي خاطئة ولماذا الإجابة الصحيحة صحيحة:',
          detail,
          'اشرح القاعدة وراء ذلك بإيجاز، وأعطني مثالاً واحداً صحيحاً مشابهاً، ونصيحة لتفادي الخطأ مستقبلاً.',
        ].join('\n'),
      }
    },
  },

  sevenDayPlan: {
    feature: 'sevenDayPlan',
    build: (ctx) => ({
      system: systemPrompt(ctx),
      user: [
        'ابنِ لي خطة مراجعة لمدة ٧ أيام بناءً على وضعي الحالي:',
        `المستوى: ${ctx.level}`,
        `عدد المراجعات المستحقة اليوم: ${ctx.reviewDueCount}`,
        weakSummary(ctx),
        'لكل يوم: حدّد هدفاً واضحاً (٢٠–٣٠ دقيقة)، وما الذي يُراجَع (قواعد/مفردات/كانجي)، ونوع التمرين. وزّع نقاط الضعف عبر الأيام وابدأ بالأهم. اجعل اللهجة محفّزة وناضجة.',
      ].join('\n'),
    }),
  },
}

export function getPromptTemplate(feature: SenseiFeatureId): PromptTemplate {
  return templates[feature]
}

export function buildPrompt(
  feature: SenseiFeatureId,
  ctx: SenseiContext,
  params?: SenseiRequestParams,
): SenseiPrompt {
  return templates[feature].build(ctx, params)
}

// Static catalogue used by the UI to render the feature list.
export const SENSEI_FEATURES = [
  { id: 'explainGrammar', titleAr: 'اشرح هذه القاعدة', titleEn: 'Explain this grammar', descriptionAr: 'شرح مبسّط بالعربية مع أمثلة', icon: 'grammar', requiresGrammar: true },
  { id: 'simplerExamples', titleAr: 'أمثلة أبسط', titleEn: 'Simpler examples', descriptionAr: 'جُمل أسهل ومتدرّجة', icon: 'hint', requiresGrammar: true },
  { id: 'quizWeakPoints', titleAr: 'اختبرني في نقاط ضعفي', titleEn: 'Quiz my weak points', descriptionAr: 'أسئلة موجّهة لنقاط ضعفك', icon: 'quiz' },
  { id: 'readingFromVocab', titleAr: 'نص قراءة من مفرداتي', titleEn: 'Reading from my vocab', descriptionAr: 'قراءة قصيرة بمفردات تعرفها', icon: 'grammar' },
  { id: 'speakingPrompts', titleAr: 'تدريبات محادثة', titleEn: 'Speaking prompts', descriptionAr: 'مواقف نطق قصيرة', icon: 'quiz' },
  { id: 'explainWrongAnswer', titleAr: 'لماذا إجابتي خاطئة؟', titleEn: 'Why is my answer wrong?', descriptionAr: 'تحليل الخطأ والصواب', icon: 'wrong', requiresWrongAnswer: true },
  { id: 'sevenDayPlan', titleAr: 'خطة مراجعة ٧ أيام', titleEn: '7-day review plan', descriptionAr: 'خطة مخصّصة حسب تقدّمك', icon: 'streak' },
] as const
