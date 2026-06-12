// Backwards-compatible shim. The canonical, typed implementation now lives in
// lessonModule.ts (Phase 5 scalable data model). This re-export keeps the
// existing LessonView import path stable — and guarantees the guided lesson
// path and the typed LessonModule share one source of truth for sections.
export { deriveLessonSections, totalLessonMinutes } from './lessonModule.ts'
