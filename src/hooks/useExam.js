import { useEffect, useState } from 'react'
import { LEVEL_ORDER } from '../content/examConfig.js'

// Exam domain (Phase 4 de-monolith) — the entrance/exit exam state machine,
// extracted verbatim from App.jsx. Behaviour-identical: App still owns
// navigation (screen/setScreen), the level economy (setLevelExams /
// setUnlockedLevels) and kanjiReadingMode, and passes in the pure question
// builder `buildExamQuestions` (whose helper cluster stays in App.jsx).
export function useExam({ screen, setScreen, kanjiReadingMode, setLevelExams, setUnlockedLevels, buildExamQuestions }) {
  const [examState, setExamState] = useState(null)

  const startExitExam = (levelId) => {
    const exam = buildExamQuestions(levelId, 'exit', kanjiReadingMode)
    setExamState({ levelId, examType: 'exit', exam, sectionIndex: 0, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: [], phase: 'section-intro' })
    setScreen('exam-intro')
  }

  const startEntranceExam = (levelId) => {
    const exam = buildExamQuestions(levelId, 'entrance', kanjiReadingMode)
    setExamState({ levelId, examType: 'entrance', exam, sectionIndex: 0, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: [], phase: 'section-intro' })
    setScreen('exam-intro')
  }

  const finalizeExam = (sectionScores) => {
    const total = sectionScores.reduce((a, b) => a + b, 0)
    const passed = total >= examState.exam.passScore
    const { levelId, examType } = examState
    setLevelExams((prev) => ({
      ...prev,
      [levelId]: {
        ...prev[levelId],
        ...(examType === 'exit' ? { exitScore: total, exitPassed: passed } : { entranceScore: total, entrancePassed: passed }),
      },
    }))
    if (passed) {
      if (examType === 'exit') {
        const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(levelId) + 1]
        if (next) setUnlockedLevels((prev) => prev.includes(next) ? prev : [...prev, next])
      } else {
        setUnlockedLevels((prev) => prev.includes(levelId) ? prev : [...prev, levelId])
      }
    }
    setExamState((prev) => ({ ...prev, sectionScores, totalScore: total, passed, phase: 'finished' }))
    setScreen('exam-result')
  }

  const handleExamAnswer = (opt) => {
    setExamState((prev) => (prev && prev.selected === null ? { ...prev, selected: opt } : prev))
  }

  const handleSectionStart = () => {
    setExamState((prev) => (prev ? { ...prev, phase: 'active' } : prev))
  }

  const forceFinishSection = () => {
    if (!examState) return
    const section = examState.exam.sections[examState.sectionIndex]
    const sectionScore = Math.round((examState.sectionCorrect / section.questions.length) * (examState.exam.totalScore / examState.exam.sections.length))
    const newSectionScores = [...examState.sectionScores, sectionScore]
    if (examState.sectionIndex + 1 < examState.exam.sections.length) {
      setExamState((prev) => ({ ...prev, sectionIndex: prev.sectionIndex + 1, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: newSectionScores, phase: 'section-intro' }))
    } else {
      finalizeExam(newSectionScores)
    }
  }

  useEffect(() => {
    if (screen !== 'exam' || !examState || examState.phase !== 'active' || examState.selected === null) return
    const section = examState.exam.sections[examState.sectionIndex]
    const q = section.questions[examState.qIndex]
    const isCorrect = examState.selected === q.answer
    const timer = setTimeout(() => {
      const nextCorrect = examState.sectionCorrect + (isCorrect ? 1 : 0)
      if (examState.qIndex + 1 < section.questions.length) {
        setExamState((prev) => ({ ...prev, qIndex: prev.qIndex + 1, selected: null, sectionCorrect: nextCorrect }))
        return
      }
      const sectionScore = Math.round((nextCorrect / section.questions.length) * (examState.exam.totalScore / examState.exam.sections.length))
      const newSectionScores = [...examState.sectionScores, sectionScore]
      if (examState.sectionIndex + 1 < examState.exam.sections.length) {
        setExamState((prev) => ({ ...prev, sectionIndex: prev.sectionIndex + 1, qIndex: 0, selected: null, sectionCorrect: 0, sectionScores: newSectionScores, phase: 'section-intro' }))
        return
      }
      finalizeExam(newSectionScores)
    }, isCorrect ? 700 : 1300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, examState])

  return { examState, setExamState, startExitExam, startEntranceExam, handleExamAnswer, handleSectionStart, forceFinishSection }
}
