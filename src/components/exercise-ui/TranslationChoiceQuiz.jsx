import { useState } from 'react'
import { speakJapanese, playCorrect, playWrong } from '../../sounds.js'
import RuaaMascot from '../RuaaMascot.jsx'
import { ExercisePane } from './ExerciseContainer.jsx'
import QuestionCard, { SentenceDisplay } from './QuestionCard.jsx'
import AnswerOption, { getOptionState } from './AnswerOption.jsx'
import ActionButton from './ActionButton.jsx'

// Reusable "Select the correct translation" exercise.
// `options` is an array of `{ value, label, reading }`; `answer` is the
// `value` of the correct option. Selecting a card arms the Check button —
// the result is only revealed (and `onAnswer` fired) once Check is pressed.
export default function TranslationChoiceQuiz({
  prompt,
  speakText,
  emoji,
  options,
  answer,
  lang = 'en',
  onAnswer,
}) {
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const isAr = lang === 'ar'
  const correctOption = options.find((opt) => opt.value === answer)

  const pick = (opt) => {
    if (checked) return
    setPicked(opt)
  }

  const check = () => {
    if (!picked || checked) return
    setChecked(true)
    const correct = picked.value === answer
    if (correct) playCorrect()
    else playWrong()
    setTimeout(() => onAnswer(correct), 1100)
  }

  const mascotMode = checked ? (picked.value === answer ? 'cheer' : 'skeptical') : 'thinking'

  return (
    <ExercisePane>
      <RuaaMascot mode={mascotMode} />
      <QuestionCard prompt={isAr ? 'اختر الترجمة الصحيحة' : 'Select the correct translation'} />

      <SentenceDisplay dir="ltr" onClick={() => speakText && speakJapanese(speakText)}>
        {emoji && <span className="translation-prompt-emoji">{emoji}</span>}
        <span>{prompt}</span>
      </SentenceDisplay>

      <div className="translation-options">
        {options.map((opt) => (
          <AnswerOption
            key={opt.value}
            dir="ltr"
            disabled={checked}
            state={getOptionState(checked ? picked : null, opt, correctOption)}
            className={!checked && picked === opt ? 'selected' : ''}
            onClick={() => pick(opt)}
          >
            {opt.reading && <small className="translation-option-reading">{opt.reading}</small>}
            <span className="translation-option-label">{opt.label}</span>
          </AnswerOption>
        ))}
      </div>

      <ActionButton onClick={check} disabled={!picked || checked}>
        {isAr ? 'تحقّق' : 'CHECK'}
      </ActionButton>
    </ExercisePane>
  )
}
