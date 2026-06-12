import AppIcon from '../AppIcon.jsx'

// Guided lesson path — a vertical checklist of the lesson's bite-sized
// sections (microlearning chunks). Shows per-section completion, estimated
// minutes, and an overall progress summary. Tapping a section routes the
// LessonView to the matching content tab.
export default function LessonSectionPath({ sections, totalMinutes, lang, onSelect }) {
  const isAr = lang === 'ar'
  const doneCount = sections.filter((s) => s.completed).length

  return (
    <section className="lesson-path-overview">
      <div className="lesson-path-summary">
        <div>
          <p className="eyebrow">{isAr ? 'مسار الدرس' : 'Lesson path'}</p>
          <h2>{isAr ? `${doneCount} من ${sections.length} أقسام` : `${doneCount} of ${sections.length} sections`}</h2>
        </div>
        <span className="lesson-path-time">
          <AppIcon name="streak" size={16} />
          {isAr ? `~${totalMinutes} دقيقة` : `~${totalMinutes} min`}
        </span>
      </div>

      <div className="lesson-path-progress">
        <span style={{ width: `${sections.length ? (doneCount / sections.length) * 100 : 0}%` }} />
      </div>

      <ol className="lesson-section-list">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              className={`lesson-section-row ${s.completed ? 'done' : ''}`}
              onClick={() => onSelect(s)}
            >
              <span className="lesson-section-icon">
                {s.completed ? <AppIcon name="correct" size={20} /> : <AppIcon name={s.icon} size={20} />}
              </span>
              <span className="lesson-section-copy">
                <strong>{isAr ? s.titleAr : s.titleEn}</strong>
                <small>{isAr ? `~${s.estimatedMinutes} دقيقة` : `~${s.estimatedMinutes} min`}</small>
              </span>
              <AppIcon name="next" size={16} className="lesson-section-go" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
