/**
 * TabBar.jsx — Horizontal tab navigation component
 * -------------------------------------------------
 * Renders a row of pill-style tab buttons with active/inactive states.
 * Used for sub-page navigation within a dashboard page.
 *
 * Props
 *   @param {Array<{key: string, label: string, icon?: Component}>} tabs
 *   @param {string}  activeTab  — Key of the currently active tab
 *   @param {(key: string) => void} onChange — Callback when a tab is clicked
 *   @param {string}  [className] — Additional CSS classes for the outer container
 *
 * BOILERPLATE NOTE:
 *   This component is fully data-agnostic. No changes are needed when adapting
 *   this boilerplate for a new project or dataset.
 */
export default function TabBar({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-base font-medium
                        rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer
                        ${isActive
                          ? 'bg-brand-blue text-white shadow-sm'
                          : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
                        }`}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
