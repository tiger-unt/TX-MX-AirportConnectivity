/**
 * FilterMultiSelect.jsx — Multi-select dropdown with checkboxes (data-agnostic)
 * ------------------------------------------------------------------------------
 * Supports:
 *   - "All" state represented by an empty array []
 *   - String options and { value, label } object options
 *   - Grouped options with non-clickable subheaders
 *   - Search/filter input for long lists
 *   - Scrollable dropdown with configurable max height
 *   - Outside click dismissal
 */
import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

function getVal(opt) {
  return typeof opt === 'string' ? opt : opt.value
}
function getLbl(opt) {
  return typeof opt === 'string' ? opt : opt.label
}

export default function FilterMultiSelect({
  label,
  value = [],
  options = [],
  groups = null,
  onChange,
  allLabel = 'All',
  searchable = false,
  maxHeight = 280,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const searchRef = useRef(null)
  const triggerRef = useRef(null)
  const [computedMaxH, setComputedMaxH] = useState(maxHeight)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Compute available viewport space when dropdown opens
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const available = window.innerHeight - rect.bottom - 16
      setComputedMaxH(Math.max(200, available))
    }
  }, [open])

  // Reset search when dropdown closes; focus search when it opens
  useEffect(() => {
    if (!open) {
      setSearch('')
    } else if (searchable) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, searchable])

  // Flatten all options (from groups, nested subgroups, or flat list)
  const allOptions = useMemo(() => {
    if (groups) {
      return groups.flatMap((g) =>
        g.subgroups ? g.subgroups.flatMap((sg) => sg.options) : g.options
      )
    }
    return options
  }, [groups, options])

  const optionValues = useMemo(() => allOptions.map(getVal), [allOptions])

  const allSelected = value.length === 0

  const matchesSearch = (lbl) =>
    !search || lbl.toLowerCase().includes(search.toLowerCase())

  const toggle = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val))
    } else {
      const next = [...value, val]
      // If all are selected, reset to empty (meaning "All")
      onChange(next.length === optionValues.length ? [] : next)
    }
  }

  const selectAll = () => onChange([])

  const displayLabel = allSelected
    ? allLabel
    : value.length === 1
      ? getLbl(allOptions.find((o) => getVal(o) === value[0]) || value[0])
      : `${value.length} selected`

  const renderOption = (opt) => {
    const val = getVal(opt)
    const lbl = getLbl(opt)
    if (!matchesSearch(lbl)) return null
    const checked = value.includes(val)
    return (
      <button
        key={val}
        type="button"
        onClick={() => toggle(val)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-brand-blue/5 transition-colors ${checked ? 'bg-brand-blue/10 font-medium text-brand-blue' : ''}`}
      >
        <span
          className={`flex-shrink-0 flex items-center justify-center w-4 h-4 rounded border ${checked ? 'bg-brand-blue border-brand-blue' : 'border-border'}`}
        >
          {checked && <Check size={12} className="text-white" />}
        </span>
        <span className="truncate">{lbl}</span>
      </button>
    )
  }

  const renderGroups = () => {
    return groups.map((group) => {
      // Nested subgroups (e.g. Class → U.S./Foreign carriers)
      if (group.subgroups) {
        const visibleSubs = group.subgroups
          .map((sg) => ({ ...sg, visible: sg.options.filter((opt) => matchesSearch(getLbl(opt))) }))
          .filter((sg) => sg.visible.length > 0)
        if (visibleSubs.length === 0) return null
        return (
          <div key={group.label}>
            <div className="px-3 py-1.5 text-[11px] font-bold text-text-primary uppercase tracking-wider bg-gray-100 border-t border-border/40 sticky top-0 z-10">
              {group.label}
            </div>
            {visibleSubs.map((sg) => (
              <div key={sg.label}>
                <div className="px-3 pl-5 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider bg-gray-50 border-t border-border/20 sticky top-7 z-[9]">
                  {sg.label}
                </div>
                {sg.visible.map(renderOption)}
              </div>
            ))}
          </div>
        )
      }
      // Simple group (e.g. airports by state)
      const visibleOpts = group.options.filter((opt) => matchesSearch(getLbl(opt)))
      if (visibleOpts.length === 0) return null
      return (
        <div key={group.label}>
          <div className="px-3 py-1.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-white border-t border-border/40 sticky top-0 z-10">
            {group.label}
          </div>
          {visibleOpts.map(renderOption)}
        </div>
      )
    })
  }

  const renderFlatOptions = () => {
    return allOptions.filter((opt) => matchesSearch(getLbl(opt))).map(renderOption)
  }

  return (
    <div className="flex flex-col gap-1 min-w-0 w-full" ref={ref}>
      <label className="text-base font-medium text-text-secondary uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="appearance-none w-full px-3 py-2 pr-8 rounded-lg border border-border
                     bg-white text-base text-text-primary text-left
                     focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue
                     transition-all duration-150 cursor-pointer"
        >
          <span className={allSelected ? 'text-text-secondary' : ''}>
            {displayLabel}
          </span>
        </button>
        <ChevronDown
          size={14}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />

        {open && (
          <div
            className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg flex flex-col"
            style={{ maxHeight: `${computedMaxH}px` }}
          >
            {/* All option */}
            <button
              type="button"
              onClick={selectAll}
              className={`flex-shrink-0 w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-brand-blue/5 transition-colors ${allSelected ? 'bg-brand-blue/10 font-medium text-brand-blue' : ''}`}
            >
              <span
                className={`flex-shrink-0 flex items-center justify-center w-4 h-4 rounded border ${allSelected ? 'bg-brand-blue border-brand-blue' : 'border-border'}`}
              >
                {allSelected && <Check size={12} className="text-white" />}
              </span>
              {allLabel}
            </button>

            {/* Search input */}
            {searchable && (
              <div className="flex-shrink-0 px-2 py-1.5 border-t border-border/40">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-7 pr-2 py-1 text-sm rounded border border-border/60 bg-surface-secondary/30
                               focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue/40"
                  />
                </div>
              </div>
            )}

            {/* Options list (scrollable) */}
            <div className="overflow-y-auto flex-1">
              {groups ? renderGroups() : renderFlatOptions()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
