// Horizontal, scrollable category tabs. Selected = filled pill; others dimmed.
export default function CommunityTabs({ tabs, activeTab, onSelect, lang }) {
  const isAr = lang === 'ar'
  return (
    <nav className="cm-tabs" aria-label={isAr ? 'تصنيفات المجتمع' : 'Community categories'}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`cm-tab ${activeTab === tab.id ? 'active' : ''}`}
          aria-pressed={activeTab === tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {isAr ? tab.labelAr : tab.labelEn}
        </button>
      ))}
    </nav>
  )
}
