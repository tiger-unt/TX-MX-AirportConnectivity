/**
 * ── DASHBOARD LAYOUT ────────────────────────────────────────────────────
 *
 * Two-column layout wrapper used by all pages that have a filter sidebar.
 * Renders an optional full-width hero above a flex row with:
 *   - Left: main content area (flex-1, min-w-0 to prevent overflow)
 *   - Right: FilterSidebar with filter controls
 *
 * Props:
 *   - children     — Main page content (charts, tables, stat cards)
 *   - hero         — Full-width hero JSX rendered above the filter layout
 *   - filters      — JSX filter controls to render inside the sidebar
 *                     (e.g., FilterSelect, FilterMultiSelect components)
 *   - onResetAll   — Callback to clear all active filters
 *   - activeCount  — Number of active filter categories
 *   - activeTags   — Array of { group, label, onRemove } for tag display
 *
 * The hero section spans full width; the filter sidebar begins below it.
 *
 * ── BOILERPLATE: HOW TO ADAPT ───────────────────────────────────────────
 * No changes are needed when adapting for a new dataset. This is a
 * structural wrapper only. If you want to move the sidebar to the left,
 * add a top toolbar, or change the layout structure, edit this file.
 */
import FilterSidebar from '@/components/filters/FilterSidebar'
import FilterBar from '@/components/filters/FilterBar'
import FilterContext from '@/contexts/FilterContext'

export default function DashboardLayout({ children, hero, filters, onResetAll, activeCount, activeTags }) {
  return (
    <FilterContext.Provider value={filters ? { filters, onResetAll, activeCount, activeTags } : null}>
      {/* Hero — full-width, above the filter sidebar */}
      {hero}

      {/* Dashboard content + sidebar begin below hero */}
      <div data-sidebar-top className="flex min-h-screen flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile/tablet filters: inline bar above content */}
          {filters && (
            <div className="px-4 pt-4 lg:hidden">
              <FilterBar onResetAll={onResetAll} activeCount={activeCount}>
                {filters}
              </FilterBar>
            </div>
          )}
          {children}
        </div>

        {/* Desktop sidebar filters */}
        {filters && (
          <div className="hidden lg:block">
            <FilterSidebar onResetAll={onResetAll} activeCount={activeCount} activeTags={activeTags}>
              {filters}
            </FilterSidebar>
          </div>
        )}
      </div>
    </FilterContext.Provider>
  )
}
