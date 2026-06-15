import { useEffect, useState } from 'react'
import { playCorrect, playWrong, speakJapanese } from '../sounds.js'
import DrawingPad from '../components/DrawingPad.jsx'
import RuaaMascot from '../components/RuaaMascot.jsx'
import AppIcon from '../components/AppIcon.jsx'
import IconCircle from '../components/IconCircle.jsx'
import { ProgressHeader, AnswerOption, getOptionState } from '../components/exercise-ui/index.jsx'
import useExerciseSettings from '../hooks/useExerciseSettings.js'
import { RubyText } from '../components/JapaneseText.jsx'

function hasJapaneseText(value = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ''))
}

function speakQuizText(value, options = {}) {
  if (!hasJapaneseText(value)) return
  speakJapanese(value, options)
}

const text = {
  ar: {
    question: 'السؤال',
    of: 'من',
    prompt: 'ما قراءة هذا الرمز؟',
    reversePrompt: 'اختر شكل الحرف الصحيح',
    drawPrompt: 'ارسم هذا الحرف بيدك',
    meaningPrompt: 'اختر معنى الكلمة الصحيح',
    audioWordPrompt: 'استمع واختر الكلمة الصحيحة',
    matchingPrompt: 'طابق الكلمات مع معانيها',
    sentencePrompt: 'أكمل الجملة بالكلمة المناسبة',
    hear: 'اسمع النطق',
    leftColumn: 'الكلمات',
    rightColumn: 'المعاني',
    correct: 'صحيح',
    wrong: 'الصحيح',
    next: 'ينتقل تلقائيا...',
    cantListen: 'لا أستطيع الاستماع الآن',
  },
  en: {
    question: 'Question',
    of: 'of',
    prompt: 'What is the reading?',
    reversePrompt: 'Choose the correct character',
    drawPrompt: 'Draw this character by hand',
    meaningPrompt: 'Choose the correct meaning',
    audioWordPrompt: 'Listen and choose the correct word',
    matchingPrompt: 'Match each word with its meaning',
    sentencePrompt: 'Complete the sentence',
    hear: 'Hear pronunciation',
    leftColumn: 'Words',
    rightColumn: 'Meanings',
    correct: 'Correct',
    wrong: 'Correct answer',
    next: 'Moving on...',
    cantListen: "Can't listen now",
  },
}

function ruaaMode({ q, selected, isCorrect }) {
  if (selected) return isCorrect ? 'cheer' : 'skeptical'
  if (q?.type === 'audio_word') return 'wave'
  if (q?.type === 'matching') return 'calm'
  if (q?.type === 'sentence') return 'thinking'
  if (q?.type === 'draw') return 'surprise'
  return 'thinking'
}


export default function Quiz({ questions, qIndex, selected, score, xp, hearts, lang, onAnswer, onBack }) {
  const q = questions[qIndex]
  const t = text[lang] || text.en
  // Pick the reading LIVE from the chosen pronunciation mode so toggling
  // romaji↔hiragana updates the displayed furigana immediately (falls back to
  // the precomputed string for any question built without a reading pair).
  const { settings: exSettings } = useExerciseSettings()
  const readNow = (pair, fallback) => (pair ? (exSettings.pronunciationMode === 'romanized' ? pair.romaji : pair.kana) : fallback)
  const voiceIndex = Math.floor(qIndex / 3)
  const [matchingState, setMatchingState] = useState({ qIndex: -1, selected: null, matched: [] })
  const matchingSelected = matchingState.qIndex === qIndex ? matchingState.selected : null
  const matchedIds = matchingState.qIndex === qIndex ? matchingState.matched : []

  useEffect(() => {
    if (q?.soundEnabled !== false && q?.speakText) speakJapanese(q.speakText, { rate: 0.6496, voiceIndex })
    else if (q?.soundEnabled !== false && q?.kana && q?.type !== 'matching') speakJapanese(q.kana, { rate: 0.6496, voiceIndex })
  }, [q, voiceIndex])

  if (!q) return null

  const isDraw = q.type === 'draw'
  const isReverse = q.type === 'reverse'
  const isMatching = q.type === 'matching'
  const isAudioWord = q.type === 'audio_word'
  const isSentence = q.type === 'sentence'
  const isMeaning = q.type === 'vocab_meaning'
  const isCorrect = selected === q.answer
  const showRuaa = isAudioWord || (isSentence && String(q.sentence || '').length <= 30)
  const mascotMode = ruaaMode({ q, selected, isCorrect })
  const mascotCharacter = qIndex % 2 === 0 ? 'joni' : 'ruaa'
  const quizClass = [
    'quiz-body',
    `quiz-type-${q.type}`,
    showRuaa ? 'has-ruaa' : 'no-ruaa',
  ].join(' ')

  const answer = (opt) => {
    if (selected) return
    if (opt === q.answer) playCorrect()
    else playWrong()
    onAnswer(opt)
  }

  const speakOption = (opt) => {
    const textToSpeak = q.optionSpeakTexts?.[opt] || q.optionReadings?.[opt] || opt
    speakQuizText(textToSpeak, { rate: 0.6264, voiceIndex })
  }

  const chooseMatch = (side, pair) => {
    if (selected || matchedIds.includes(pair.id)) return
    speakQuizText(side === 'left' ? (pair.leftSpeak || pair.leftReading || pair.left) : (pair.rightSpeak || pair.right), { rate: 0.6264, voiceIndex })
    if (!matchingSelected || matchingSelected.side === side) {
      setMatchingState({ qIndex, selected: { side, id: pair.id }, matched: matchedIds })
      return
    }
    if (matchingSelected.id !== pair.id) {
      playWrong()
      setMatchingState({ qIndex, selected: null, matched: matchedIds })
      return
    }
    playCorrect()
    const next = [...matchedIds, pair.id]
    setMatchingState({ qIndex, selected: null, matched: next })
    if (next.length === q.pairs.length) onAnswer(q.answer)
  }

  const prompt = isReverse
    ? t.reversePrompt
    : isMatching
      ? t.matchingPrompt
      : isAudioWord
        ? t.audioWordPrompt
        : isSentence
          ? t.sentencePrompt
          : isMeaning
            ? t.meaningPrompt
            : t.prompt

  return (
    <main className="quiz-screen">
      <ProgressHeader onClose={onBack} progress={((qIndex + 1) / questions.length) * 100}>
        <div className="quiz-stats">
          <span className="quiz-stat quiz-stat-hearts"><AppIcon name="life" size={20} className="life-indicator" /> {hearts}</span>
          <span className="quiz-stat quiz-stat-xp">{xp} XP</span>
        </div>
      </ProgressHeader>

      <section className={quizClass}>
        <p className="eyebrow">{t.question} {qIndex + 1} {t.of} {questions.length} · {score} ✓</p>
        {isDraw ? (
          <>
            <div className={`quiz-character-scene ${showRuaa ? '' : 'no-mascot'}`}>
              <RuaaMascot mode={mascotMode} visible={showRuaa} character={mascotCharacter} />
              <div className="ruaa-speech">
                <h1>{t.drawPrompt}</h1>
              </div>
            </div>
            <DrawingPad char={q.kana} lang={lang} autoGrade onDone={({ correct }) => answer(correct ? q.answer : '__draw_wrong__')} />
          </>
        ) : isMatching ? (
          <>
            <div className={`quiz-character-scene ${showRuaa ? '' : 'no-mascot'}`}>
              <RuaaMascot mode={mascotMode} visible={showRuaa} character={mascotCharacter} />
              <div className="ruaa-speech">
                <h1>{prompt}</h1>
              </div>
            </div>
            <div className="matching-board">
              <div>
                <strong>{t.leftColumn}</strong>
                {q.pairs.map((pair) => (
                  <AnswerOption
                    key={pair.id}
                    variant="plain"
                    state={`${matchingSelected?.side === 'left' && matchingSelected.id === pair.id ? 'active' : ''} ${matchedIds.includes(pair.id) ? 'matched' : ''}`.trim()}
                    disabled={matchedIds.includes(pair.id)}
                    onClick={() => chooseMatch('left', pair)}
                  >
                    <RubyText text={pair.left} reading={readNow(pair.leftReadingPair, pair.leftReading)} />
                  </AnswerOption>
                ))}
              </div>
              <div>
                <strong>{t.rightColumn}</strong>
                {q.rightOptions.map((pair) => (
                  <AnswerOption
                    key={pair.id}
                    variant="plain"
                    state={`${matchingSelected?.side === 'right' && matchingSelected.id === pair.id ? 'active' : ''} ${matchedIds.includes(pair.id) ? 'matched' : ''}`.trim()}
                    disabled={matchedIds.includes(pair.id)}
                    onClick={() => chooseMatch('right', pair)}
                  >
                    {pair.right}
                  </AnswerOption>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <h1>{prompt}</h1>
            <div className={`quiz-character-scene ${showRuaa ? '' : 'no-mascot'}`}>
              <RuaaMascot mode={mascotMode} visible={showRuaa} character={mascotCharacter} />
              <button className={`kana-focus ruaa-speech ${selected ? isCorrect ? 'correct' : 'wrong' : ''}`} onClick={() => q.soundEnabled !== false && speakQuizText(q.speakText || q.kana, { rate: 0.6264, voiceIndex })}>
                {isSentence ? <span className="sentence-focus-text" style={{ fontSize: `${Math.max(28, Math.min(74, 620 / Math.max(q.sentence.length, 8)))}px` }}>{q.sentence}</span> : isAudioWord ? <span className="listen-focus"><AppIcon name="sound" size={82} /></span> : isReverse ? <span>{q.answerLabel}</span> : <RubyText text={q.kana} reading={readNow(q.kanaReadingPair, q.kanaReading)} className="quiz-ruby-main" />}
                <small>{t.hear}</small>
                {selected && <strong>{isCorrect ? t.correct : `${t.wrong}: ${q.answer}`}</strong>}
                {!isAudioWord && q.soundEnabled !== false && <IconCircle name="sound" size={38} className="stage-sound-badge" />}
              </button>
            </div>
            {isAudioWord && (
              <button type="button" className="muted-link" onClick={() => speakQuizText(q.speakText || q.kana, { rate: 0.6264, voiceIndex })}>
                {t.cantListen}
              </button>
            )}
            <div className={`answer-grid ${q.options.length <= 3 ? 'pill-row' : ''}`}>
              {q.options.map((opt) => (
                <AnswerOption
                  key={opt}
                  variant="plain"
                  dir="ltr"
                  state={getOptionState(selected, opt, q.answer)}
                  disabled={Boolean(selected)}
                  onClick={() => {
                    speakOption(opt)
                    answer(opt)
                  }}
                >
                  <RubyText text={opt} reading={readNow(q.optionReadingPairs?.[opt], q.optionReadings?.[opt])} />
                </AnswerOption>
              ))}
            </div>
          </>
        )}
        {selected && <p className="next-note">{t.next}</p>}
      </section>
    </main>
  )
}
