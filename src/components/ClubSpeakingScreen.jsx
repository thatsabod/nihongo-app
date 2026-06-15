import { useState } from 'react'
import { ExerciseContainer, ProgressHeader, SpeakingPracticeQuiz, ResultCard, ActionButton } from './exercise-ui/index.jsx'

// Club → Speaking: a standalone "repeat after Sensei" drill that reuses the
// existing SpeakingPracticeQuiz (Web-Speech pronunciation scoring) over a set
// of real sentences for the learner's level.
export default function ClubSpeakingScreen({ lang, sentences = [], onClose, onStudyActivity }) {
  const isAr = lang === 'ar'
  const items = sentences.slice(0, 10)
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (!items.length) {
    return (
      <ExerciseContainer>
        <ResultCard icon="speaking" message={isAr ? 'لا توجد جُمل للتدريب الآن.' : 'No sentences to practice yet.'}>
          <ActionButton onClick={onClose}>{isAr ? 'رجوع' : 'Back'}</ActionButton>
        </ResultCard>
      </ExerciseContainer>
    )
  }

  if (done) {
    const perfect = score === items.length
    return (
      <ExerciseContainer>
        <ResultCard
          icon={perfect ? 'star' : 'correct'}
          score={score}
          total={items.length}
          message={isAr ? (perfect ? 'نطق مثالي! 🎉' : 'أحسنت! استمر في التدريب.') : (perfect ? 'Perfect pronunciation! 🎉' : 'Nice work — keep practicing.')}
        >
          <ActionButton onClick={onClose}>{isAr ? 'إنهاء' : 'Finish'}</ActionButton>
        </ResultCard>
      </ExerciseContainer>
    )
  }

  const cur = items[idx]
  const handle = (passed) => {
    const nextScore = score + (passed ? 1 : 0)
    if (idx + 1 >= items.length) {
      setScore(nextScore)
      onStudyActivity?.()
      setDone(true)
    } else {
      setScore(nextScore)
      setIdx((i) => i + 1)
    }
  }

  return (
    <ExerciseContainer>
      <ProgressHeader
        onClose={onClose}
        closeLabel={isAr ? 'إغلاق' : 'Close'}
        progress={(idx / items.length) * 100}
        counter={`${idx + 1}/${items.length}`}
        lang={lang}
      />
      <SpeakingPracticeQuiz
        key={idx}
        sentence={cur.jp}
        reading={cur.reading}
        speakText={cur.speakText || cur.jp}
        lang={lang}
        onAnswer={handle}
        onSkip={() => handle(false)}
        mascotCharacter="joni"
      />
    </ExerciseContainer>
  )
}
