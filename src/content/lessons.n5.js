import { lessonTwo } from './lessons/lesson02.js'
import { lessonThree } from './lessons/lesson03.js'
import { lessonFour } from './lessons/lesson04.js'
import { lessonFive } from './lessons/lesson05.js'
import { lessonSix } from './lessons/lesson06.js'
import { lessonSeven } from './lessons/lesson07.js'
import { lessonEight } from './lessons/lesson08.js'
import { lessonNine } from './lessons/lesson09.js'
import { lessonTen } from './lessons/lesson10.js'
import { lessonEleven } from './lessons/lesson11.js'
import { lessonTwelve } from './lessons/lesson12.js'
import { lessonThirteen } from './lessons/lesson13.js'
import { lessonFourteen } from './lessons/lesson14.js'
import { lessonFifteen } from './lessons/lesson15.js'
import { lessonSixteen } from './lessons/lesson16.js'
import { lessonSeventeen } from './lessons/lesson17.js'
import { lessonEighteen } from './lessons/lesson18.js'
import { lessonNineteen } from './lessons/lesson19.js'
import { lessonTwenty } from './lessons/lesson20.js'
import { lessonTwentyOne } from './lessons/lesson21.js'
import { lessonTwentyTwo } from './lessons/lesson22.js'
import { lessonTwentyThree } from './lessons/lesson23.js'
import { lessonTwentyFour } from './lessons/lesson24.js'
import { lessonTwentyFive } from './lessons/lesson25.js'

export const lessonOne = {
  id: 1,
  title: { ar: 'تحية وتعارف', en: 'Greetings and Introductions' },
  focus: 'بناء جمل اسمية بسيطة للتعريف عن النفس والآخرين',
  dialogue: {
    titleAr: 'اللقاء الأول — ساتو تتعرف على ميلر',
    lines: [
      { speaker: 'ساتو', jp: 'はじめまして。さとうです。', romaji: 'Hajimemashite. Satou desu.', ar: 'تشرّفت بلقائك. أنا ساتو.' },
      { speaker: 'ميلر', jp: 'はじめまして。マイク・ミラーです。', romaji: 'Hajimemashite. Maiku Miraa desu.', ar: 'تشرّفت بلقائك. أنا مايك ميلر.' },
      { speaker: 'ساتو', jp: 'ミラーさんは 学生ですか。', romaji: 'Miraa-san wa gakusei desu ka.', ar: 'سيد ميلر، هل أنت طالب؟' },
      { speaker: 'ميلر', jp: 'いいえ、学生じゃありません。会社員です。', romaji: 'Iie, gakusei ja arimasen. Kaishain desu.', ar: 'لا، لست طالبًا. أنا موظف شركة.' },
      { speaker: 'ساتو', jp: '私は 銀行員です。', romaji: 'Watashi wa ginkouin desu.', ar: 'أنا موظفة بنك.' },
      { speaker: 'ميلر', jp: 'どうぞよろしく。', romaji: 'Douzo yoroshiku.', ar: 'سررت بمعرفتك.' },
      { speaker: 'ساتو', jp: 'どうぞよろしく。', romaji: 'Douzo yoroshiku.', ar: 'وأنا كذلك.' },
    ],
  },
  reading: {
    titleAr: 'تعريف ذاتي — كريم يقدّم نفسه',
    sentences: [
      { jp: '私は カリムです。', romaji: 'Watashi wa Karimu desu.', ar: 'أنا كريم.' },
      { jp: 'イラク人です。', romaji: 'Irakujin desu.', ar: 'أنا عراقي.' },
      { jp: '学生じゃありません。', romaji: 'Gakusei ja arimasen.', ar: 'لست طالبًا.' },
      { jp: 'エンジニアです。', romaji: 'Enjinia desu.', ar: 'أنا مهندس.' },
      { jp: '先生は 日本人です。', romaji: 'Sensei wa nihonjin desu.', ar: 'المعلم ياباني.' },
    ],
    questions: [
      { q: 'من أي بلد كريم؟', options: ['من العراق', 'من اليابان', 'من أمريكا'], answer: 'من العراق' },
      { q: 'ما مهنة كريم؟', options: ['مهندس', 'طالب', 'طبيب'], answer: 'مهندس' },
      { q: 'من هو الياباني في النص؟', options: ['المعلم', 'كريم', 'لا أحد'], answer: 'المعلم' },
    ],
  },
  vocab: [
    { id: 'watashi', type: 'pronoun', jp: '私', kanji: '私', hiragana: 'わたし', reading: 'watashi', meaning: 'أنا' },
    { id: 'watashitachi', type: 'pronoun', jp: '私たち', kanji: '私たち', hiragana: 'わたしたち', reading: 'watashitachi', meaning: 'نحن' },
    { id: 'anata', type: 'pronoun', jp: 'あなた', kanji: 'あなた', hiragana: 'あなた', reading: 'anata', meaning: 'أنت' },
    { id: 'ano-hito', type: 'person', jp: 'あの人', kanji: 'あの人', hiragana: 'あのひと', reading: 'ano hito', meaning: 'ذلك الشخص' },
    { id: 'ano-kata', type: 'person', jp: 'あの方', kanji: 'あの方', hiragana: 'あのかた', reading: 'ano kata', meaning: 'ذلك الشخص بصيغة مهذبة' },
    { id: 'minasan', type: 'person', jp: '皆さん', kanji: '皆さん', hiragana: 'みなさん', reading: 'minasan', meaning: 'الجميع' },
    { id: 'san', type: 'suffix', jp: '〜さん', hiragana: '〜さん', reading: '~san', meaning: 'السيد / السيدة' },
    { id: 'chan', type: 'suffix', jp: '〜ちゃん', hiragana: '〜ちゃん', reading: '~chan', meaning: 'لاحقة للأطفال أو المقربين' },
    { id: 'kun', type: 'suffix', jp: '〜くん', hiragana: '〜くん', reading: '~kun', meaning: 'لاحقة للأولاد أو الشباب' },
    { id: 'jin', type: 'suffix', jp: '〜人', kanji: '〜人', hiragana: '〜じん', reading: '~jin', meaning: 'لاحقة الجنسية' },
    { id: 'sensei', type: 'occupation', jp: '先生', kanji: '先生', hiragana: 'せんせい', reading: 'sensei', meaning: 'أستاذ / معلم' },
    { id: 'kyoushi', type: 'occupation', jp: '教師', kanji: '教師', hiragana: 'きょうし', reading: 'kyoushi', meaning: 'مدرس' },
    { id: 'gakusei', type: 'occupation', jp: '学生', kanji: '学生', hiragana: 'がくせい', reading: 'gakusei', meaning: 'طالب' },
    { id: 'kaishain', type: 'occupation', jp: '会社員', kanji: '会社員', hiragana: 'かいしゃいん', reading: 'kaishain', meaning: 'موظف شركة' },
    { id: 'shain', type: 'occupation', jp: '社員', kanji: '社員', hiragana: 'しゃいん', reading: 'shain', meaning: 'موظف' },
    { id: 'ginkouin', type: 'occupation', jp: '銀行員', kanji: '銀行員', hiragana: 'ぎんこういん', reading: 'ginkouin', meaning: 'موظف بنك' },
    { id: 'isha', type: 'occupation', jp: '医者', kanji: '医者', hiragana: 'いしゃ', reading: 'isha', meaning: 'طبيب' },
    { id: 'kenkyuusha', type: 'occupation', jp: '研究者', kanji: '研究者', hiragana: 'けんきゅうしゃ', reading: 'kenkyuusha', meaning: 'باحث' },
    { id: 'engineer', type: 'occupation', jp: 'エンジニア', hiragana: 'エンジニア', reading: 'enjinia', meaning: 'مهندس' },
    { id: 'daigaku', type: 'place', jp: '大学', kanji: '大学', hiragana: 'だいがく', reading: 'daigaku', meaning: 'جامعة' },
    { id: 'byouin', type: 'place', jp: '病院', kanji: '病院', hiragana: 'びょういん', reading: 'byouin', meaning: 'مستشفى' },
    { id: 'denki', type: 'organization', jp: '電気', kanji: '電気', hiragana: 'でんき', reading: 'denki', meaning: 'كهرباء / شركة كهرباء' },
    { id: 'dare', type: 'question-word', jp: '誰', kanji: '誰', hiragana: 'だれ', reading: 'dare', meaning: 'من' },
    { id: 'donata', type: 'question-word', jp: 'どなた', hiragana: 'どなた', reading: 'donata', meaning: 'من بصيغة مهذبة' },
    { id: 'nansai', type: 'age', jp: '何歳ですか', kanji: '何歳ですか', hiragana: 'なんさいですか', reading: 'nan-sai desu ka', meaning: 'كم عمرك؟' },
    { id: 'sai', type: 'age', jp: '歳', kanji: '歳', hiragana: 'さい', reading: 'sai', meaning: 'سنة للعمر' },
    { id: 'ik-kusai', type: 'age', jp: '一歳', kanji: '一歳', hiragana: 'いっさい', reading: 'issai', meaning: 'سنة واحدة' },
    { id: 'hai', type: 'response', jp: 'はい', hiragana: 'はい', reading: 'hai', meaning: 'نعم' },
    { id: 'iie', type: 'response', jp: 'いいえ', hiragana: 'いいえ', reading: 'iie', meaning: 'لا' },
    { id: 'imc', type: 'organization', jp: 'IMC', hiragana: 'IMC', reading: 'IMC', meaning: 'شركة IMC' },
  ],
  grammar: [
    {
      title: 'は + です — التعريف أو الوصف',
      pattern: 'اسم 1 + は + اسم 2 + です',
      particle: 'は',
      howItWorks: 'は تأتي بعد الموضوع — الشيء الذي نتحدث عنه. ثم تصف أو تعرّف ذلك الموضوع وتختم بـ です.',
      explanation: 'تأتي は بعد موضوع الجملة وتحدد الشيء الذي نتحدث عنه، ثم تأتي です في نهاية الجملة الاسمية بصيغة مهذبة.',
      example: { jp: 'わたし は マイク・ミラー です。', romaji: 'Watashi wa Maiku Miraa desu.', ar: 'أنا مايك ميلر.' },
      exercises: [
        {
          type: 'build',
          ar: 'أنا طالب.',
          words: ['わたし', 'は', '学生', 'です', '。'],
          particles: ['は'],
          answer: 'わたし は 学生 です 。',
        },
        {
          type: 'fill',
          ar: 'هل أنت أستاذ؟',
          sentence: 'あなた ___ 先生 ですか。',
          options: ['は', 'が', 'も', 'の'],
          answer: 'は',
        },
        {
          type: 'meaning',
          sentence: 'わたし は エンジニア です。',
          particle: 'は',
          options: ['أنا مهندس.', 'هل أنت مهندس؟', 'هو ليس مهندسا.', 'نحن مهندسون.'],
          answer: 'أنا مهندس.',
        },
        {
          type: 'error',
          ar: 'السيد ميلر طالب.',
          options: ['ミラーさん が 学生 ます。', 'ミラーさん は 学生 です。', 'ミラーさん の 学生 する。'],
          answer: 'ミラーさん は 学生 です。',
        },
      ],
    },
    {
      title: 'じゃありません — النفي',
      pattern: 'اسم 1 + は + اسم 2 + じゃありません',
      particle: 'じゃありません',
      howItWorks: 'لنفي الجملة الاسمية نستبدل です بـ じゃありません — مثل قول "ليس" في العربية.',
      explanation: 'تستخدم لنفي الجملة الاسمية، ومعناها ليس.',
      example: { jp: 'サントスさん は 学生 じゃありません。', romaji: 'Santosu-san wa gakusei ja arimasen.', ar: 'السيد سانتوس ليس طالبا.' },
      exercises: [
        {
          type: 'build',
          ar: 'أنا لست طبيبا.',
          words: ['わたし', 'は', '医者', 'じゃありません', '。'],
          particles: ['じゃありません'],
          answer: 'わたし は 医者 じゃありません 。',
        },
        {
          type: 'fill',
          ar: 'السيد ميلر ليس مدرسا.',
          sentence: 'ミラーさん は 教師 ___。',
          options: ['じゃありません', 'ですか', 'です', 'も'],
          answer: 'じゃありません',
        },
        {
          type: 'meaning',
          sentence: 'サントスさん は 学生 じゃありません。',
          particle: 'じゃありません',
          options: ['السيد سانتوس ليس طالبا.', 'هل السيد سانتوس طالب؟', 'السيد سانتوس طالب.', 'السيد سانتوس أيضا طالب.'],
          answer: 'السيد سانتوس ليس طالبا.',
        },
        {
          type: 'error',
          ar: 'أنا لست موظفا.',
          options: ['わたし は 会社員 ないです。', 'わたし は 会社員 じゃある。', 'わたし は 会社員 じゃありません。'],
          answer: 'わたし は 会社員 じゃありません。',
        },
      ],
    },
    {
      title: 'か — السؤال',
      pattern: 'جملة + か',
      particle: 'か',
      howItWorks: 'نضيف か في نهاية أي جملة لتصبح سؤالاً — بدون علامة استفهام. نطقها يرتفع في نهاية الجملة.',
      explanation: 'تضاف か في نهاية الجملة لتحويلها إلى سؤال. لا نحتاج علامة استفهام في اليابانية الرسمية.',
      example: { jp: 'ミラーさん は 先生 ですか。', romaji: 'Miraa-san wa sensei desu ka.', ar: 'هل السيد ميلر أستاذ؟' },
      exercises: [
        {
          type: 'build',
          ar: 'هل أنت طالب؟',
          words: ['あなた', 'は', '学生', 'ですか', '。'],
          particles: ['か', 'ですか'],
          answer: 'あなた は 学生 ですか 。',
        },
        {
          type: 'fill',
          ar: 'هل ذلك الشخص مهندس؟',
          sentence: 'あの 方 は エンジニア です___。',
          options: ['か', 'も', 'の', 'は'],
          answer: 'か',
        },
        {
          type: 'meaning',
          sentence: 'あなた は 学生 ですか。',
          particle: 'か',
          options: ['هل أنت طالب؟', 'أنا طالب.', 'أنت لست طالبا.', 'أنا أيضا طالب.'],
          answer: 'هل أنت طالب؟',
        },
        {
          type: 'error',
          ar: 'هل السيد غوبتا موظف شركة؟',
          options: ['グプタさん は 会社員 ですの。', 'グプタさん は 会社員 ですか。', 'グプタさん か 会社員 です。'],
          answer: 'グプタさん は 会社員 ですか。',
        },
      ],
    },
    {
      title: 'も — أيضا',
      pattern: 'اسم 1 + も + اسم 2 + です',
      particle: 'も',
      howItWorks: 'عندما تريد قول "أيضا" نستبدل は بـ も مباشرة — لا نحتاج كلمة "أيضا" مستقلة.',
      explanation: 'تستخدم も بدل は عندما نريد قول أيضا.',
      example: { jp: 'グプタさん も 会社員 です。', romaji: 'Guputa-san mo kaishain desu.', ar: 'السيد غوبتا أيضا موظف شركة.' },
      exercises: [
        {
          type: 'build',
          ar: 'أنا أيضا طالب.',
          words: ['わたし', 'も', '学生', 'です', '。'],
          particles: ['も'],
          answer: 'わたし も 学生 です 。',
        },
        {
          type: 'fill',
          ar: 'السيد سانتوس أيضا طبيب.',
          sentence: 'サントスさん ___ 医者 です。',
          options: ['も', 'は', 'の', 'か'],
          answer: 'も',
        },
        {
          type: 'meaning',
          sentence: 'グプタさん も 会社員 です。',
          particle: 'も',
          options: ['السيد غوبتا أيضا موظف شركة.', 'هل السيد غوبتا موظف شركة؟', 'السيد غوبتا ليس موظفا.', 'أنا أيضا موظف شركة.'],
          answer: 'السيد غوبتا أيضا موظف شركة.',
        },
        {
          type: 'error',
          ar: 'أنا أيضا أستاذ.',
          options: ['わたし は も 先生 です。', 'わたし も 先生 です。', 'わたし の も 先生 です。'],
          answer: 'わたし も 先生 です。',
        },
      ],
    },
    {
      title: 'の — الانتماء أو التخصيص',
      pattern: 'اسم 1 + の + اسم 2',
      particle: 'の',
      howItWorks: 'の تربط اسمين — الاسم قبلها يمتلك أو يُخصّص الاسم بعدها. مثل "موظف شركة IMC" أو "طالب جامعة طوكيو".',
      explanation: 'تربط の اسمين للدلالة على الانتماء أو التخصيص، مثل موظف شركة IMC أو طالب جامعة.',
      example: { jp: 'ミラーさん は IMC の 社員 です。', romaji: 'Miraa-san wa IMC no shain desu.', ar: 'السيد ميلر موظف في شركة IMC.' },
      exercises: [
        {
          type: 'build',
          ar: 'أنا طالب في الجامعة.',
          words: ['わたし', 'は', '大学', 'の', '学生', 'です', '。'],
          particles: ['の'],
          answer: 'わたし は 大学 の 学生 です 。',
        },
        {
          type: 'fill',
          ar: 'السيد ميلر موظف في شركة IMC.',
          sentence: 'ミラーさん は IMC ___ 社員 です。',
          options: ['の', 'は', 'も', 'か'],
          answer: 'の',
        },
        {
          type: 'meaning',
          sentence: 'ミラーさん は IMC の 社員 です。',
          particle: 'の',
          options: ['السيد ميلر موظف في شركة IMC.', 'هل السيد ميلر موظف في IMC؟', 'السيد ميلر أيضا موظف.', 'السيد ميلر ليس موظفا في IMC.'],
          answer: 'السيد ميلر موظف في شركة IMC.',
        },
        {
          type: 'error',
          ar: 'السيد غوبتا طبيب في المستشفى.',
          options: ['グプタさん は 病院 は 医者 です。', 'グプタさん は 病院 の 医者 です。', 'グプタさん の 病院 は 医者 です。'],
          answer: 'グプタさん は 病院 の 医者 です。',
        },
      ],
    },
    {
      title: 'さん — لاحقة الاحترام',
      pattern: 'اسم شخص + さん',
      particle: 'さん',
      howItWorks: 'さん لاحقة مثل "السيد/السيدة" تضاف بعد اسم الشخص عند الحديث عن الآخرين. لا تستخدمها مع اسمك أنت.',
      explanation: 'تضاف さん بعد أسماء الأشخاص عند الحديث عن الآخرين بأدب. لا تستخدمها عادة مع اسمك أنت.',
      example: { jp: 'あの 方 は ミラーさん です。', romaji: 'Ano kata wa Miraa-san desu.', ar: 'ذلك الشخص هو السيد ميلر.' },
      exercises: [
        {
          type: 'build',
          ar: 'السيد سانتوس أستاذ.',
          words: ['サントス', 'さん', 'は', '先生', 'です', '。'],
          particles: ['さん'],
          answer: 'サントス さん は 先生 です 。',
        },
        {
          type: 'fill',
          ar: 'السيدة سوزوكي طبيبة.',
          sentence: '鈴木 ___ は 医者 です。',
          options: ['さん', 'くん', 'ちゃん', 'じん'],
          answer: 'さん',
        },
        {
          type: 'meaning',
          sentence: 'あの 方 は ミラーさん です。',
          particle: 'さん',
          options: ['ذلك الشخص هو السيد ميلر.', 'هل ذلك الشخص السيد ميلر؟', 'أنا السيد ميلر.', 'السيد ميلر ليس هناك.'],
          answer: 'ذلك الشخص هو السيد ميلر.',
        },
        {
          type: 'error',
          ar: 'السيد غوبتا باحث.',
          options: ['グプタ は 研究者 です。', 'グプタさん は 研究者 です。', 'さんグプタ は 研究者 です。'],
          answer: 'グプタさん は 研究者 です。',
        },
      ],
    },
  ],
  examples: [
    { jp: 'わたし は マイク・ミラー です。', romaji: 'Watashi wa Maiku Miraa desu.', ar: 'أنا مايك ميلر.', en: 'I am Mike Miller.' },
    { jp: 'わたし は エンジニア です。', romaji: 'Watashi wa enjinia desu.', ar: 'أنا مهندس.', en: 'I am an engineer.' },
    { jp: 'サントスさん は 学生 じゃありません。', romaji: 'Santosu-san wa gakusei ja arimasen.', ar: 'السيد سانتوس ليس طالبا.', en: 'Mr. Santos is not a student.' },
    { jp: 'ミラーさん は アメリカ人 ですか。', romaji: 'Miraa-san wa Amerika-jin desu ka.', ar: 'هل السيد ميلر أمريكي؟', en: 'Is Mr. Miller American?' },
    { jp: 'はい、アメリカ人 です。', romaji: 'Hai, Amerika-jin desu.', ar: 'نعم، هو أمريكي.', en: 'Yes, he is American.' },
    { jp: 'ミラーさん は 先生 ですか。', romaji: 'Miraa-san wa sensei desu ka.', ar: 'هل السيد ميلر أستاذ؟', en: 'Is Mr. Miller a teacher?' },
    { jp: 'いいえ、先生 じゃありません。', romaji: 'Iie, sensei ja arimasen.', ar: 'لا، ليس أستاذا.', en: 'No, he is not a teacher.' },
    { jp: 'あの 方 は どなた ですか。', romaji: 'Ano kata wa donata desu ka.', ar: 'من ذلك الشخص؟', en: 'Who is that person?' },
    { jp: 'あの 方 は ミラーさん です。', romaji: 'Ano kata wa Miraa-san desu.', ar: 'ذلك الشخص هو السيد ميلر.', en: 'That person is Mr. Miller.' },
    { jp: 'ミラーさん は 会社員 です。', romaji: 'Miraa-san wa kaishain desu.', ar: 'السيد ميلر موظف شركة.', en: 'Mr. Miller is a company employee.' },
    { jp: 'グプタさん も 会社員 です。', romaji: 'Guputa-san mo kaishain desu.', ar: 'السيد غوبتا أيضا موظف شركة.', en: 'Mr. Gupta is also a company employee.' },
    { jp: 'ミラーさん は IMC の 社員 です。', romaji: 'Miraa-san wa IMC no shain desu.', ar: 'السيد ميلر موظف في شركة IMC.', en: 'Mr. Miller is an employee of IMC.' },
    { jp: 'あなた は 学生 ですか。', romaji: 'Anata wa gakusei desu ka.', ar: 'هل أنت طالب؟', en: 'Are you a student?' },
    { jp: 'はい、学生 です。', romaji: 'Hai, gakusei desu.', ar: 'نعم، أنا طالب.', en: 'Yes, I am a student.' },
    { jp: 'いいえ、会社員 です。', romaji: 'Iie, kaishain desu.', ar: 'لا، أنا موظف شركة.', en: 'No, I am a company employee.' },
    { jp: '鈴木さん は 学生 ですか。', romaji: 'Suzuki-san wa gakusei desu ka.', ar: 'هل السيد سوزوكي طالب؟', en: 'Is Mr. Suzuki a student?' },
    { jp: 'いいえ、会社員 です。', romaji: 'Iie, kaishain desu.', ar: 'لا، هو موظف شركة.', en: 'No, he is a company employee.' },
    { jp: '何歳 ですか。', romaji: 'Nan-sai desu ka.', ar: 'كم عمرك؟', en: 'How old are you?' },
  ],
  exercises: [
    { type: 'choose', prompt: 'اختر المعنى الصحيح: わたし は 学生 です。', answer: 'أنا طالب.', hint: 'ترجمة الجملة' },
    { type: 'choose', prompt: 'اختر المعنى الصحيح: ミラーさん は 会社員 です。', answer: 'السيد ميلر موظف شركة.', hint: 'ترجمة الجملة' },
    { type: 'complete', prompt: 'أكمل: わたし ___ エンジニア です。', answer: 'は', hint: 'أداة الموضوع' },
    { type: 'complete', prompt: 'أكمل: ミラーさん は 学生 ___。', answer: 'じゃありません', hint: 'النفي' },
    { type: 'complete', prompt: 'أكمل السؤال: あなた は 学生 です ___。', answer: 'か', hint: 'أداة السؤال' },
    { type: 'order', prompt: 'رتب: です / わたし / 学生 / は', answer: 'わたし は 学生 です。', hint: 'ترتيب جملة اسمية' },
    { type: 'order', prompt: 'رتب: 社員 / IMC / の / です / ミラーさん / は', answer: 'ミラーさん は IMC の 社員 です。', hint: 'استخدام の' },
    { type: 'answer', prompt: 'ミラーさん は 先生 ですか。 جواب بالنفي.', answer: 'いいえ、先生 じゃありません。', hint: 'إجابة سؤال نعم/لا' },
    { type: 'answer', prompt: 'あの 方 は どなた ですか。', answer: 'あの 方 は ミラーさん です。', hint: 'سؤال عن الهوية' },
  ],
  videos: [],
}

export const n5Lessons = [lessonOne, lessonTwo, lessonThree, lessonFour, lessonFive, lessonSix, lessonSeven, lessonEight, lessonNine, lessonTen, lessonEleven, lessonTwelve, lessonThirteen, lessonFourteen, lessonFifteen, lessonSixteen, lessonSeventeen, lessonEighteen, lessonNineteen, lessonTwenty, lessonTwentyOne, lessonTwentyTwo, lessonTwentyThree, lessonTwentyFour, lessonTwentyFive]
