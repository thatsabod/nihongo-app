export const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1']

export const EXAM_CONFIG = {
  N5: {
    exit: {
      totalScore: 180,
      passScore: 120,
      sections: [
        { key: 'vocab', label: { ar: 'المفردات والحروف', en: 'Vocabulary' }, minutes: 25, count: 25, types: ['vocab_meaning', 'audio_word', 'word_production'] },
        { key: 'grammar', label: { ar: 'القواعد والقراءة', en: 'Grammar & Reading' }, minutes: 45, count: 25, types: ['sentence', 'matching', 'word_production', 'sentence_build'] },
        { key: 'listening', label: { ar: 'الاستماع والتحدث', en: 'Listening & Speaking' }, minutes: 35, count: 18, types: ['audio_word', 'audio_sentence'] },
      ],
    },
    entrance: null,
  },
  N4: {
    exit: { contentReady: false },
    entrance: {
      totalScore: 100,
      passScore: 60,
      sourceLevel: 'N5',
      sections: [
        { key: 'general', label: { ar: 'اختبار تحديد المستوى', en: 'Placement check' }, minutes: 15, count: 15, types: ['vocab_meaning', 'sentence', 'audio_word'] },
      ],
    },
  },
  N3: {
    exit: { contentReady: false },
    entrance: { contentReady: false, sourceLevel: 'N4' },
  },
  N2: {
    exit: { contentReady: false },
    entrance: { contentReady: false, sourceLevel: 'N3' },
  },
  N1: {
    exit: { contentReady: false },
    entrance: { contentReady: false, sourceLevel: 'N2' },
  },
}
