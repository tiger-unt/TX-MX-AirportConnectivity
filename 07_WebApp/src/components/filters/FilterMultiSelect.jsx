/**
 * FilterMultiSelect.jsx — Generic multi-select dropdown (data-agnostic)
 * ---------------------------------------------------------------------
 * Supports:
 *   - "All" state represented by an empty array []
 *   - String options and { value, label } object options
 *   - Outside click dismissal
 *   - Checkbox-style selected indicators
 *
 * BOILERPLATE NOTE:
 *   Page components should pass string option values for predictable filter
 *   comparisons (especially for numeric fields like Year converted to strings).
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function FilterMultiSelect({ label, value = [], options = [], onChange, allLabel = 'All' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const allSelected = value.length === 0
  const optionValues = options.map((opt) => (typeof opt === 'string' ? opt : opt.value))

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
      ? value[0]
      : `${value.length} selected`

  return (
    <div className="flex flex-col gap-1 min-w-0 w-full" ref={ref}>
      <label className="text-base font-medium text-text-secondary uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="appearance-none w-full px-3 py-2 pr-8 rounded-lg border border-border
                     bg-white text-base text-text-primary text-left
                     focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue
                     transition-all duration-150 cursor-pointer"
        >
          <span className={allSelected ? 'text-text-secondary' : ''}>{displayLabel}</span>
        </button>
        <ChevronDown
          size={14}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg">
            {/* All option */}
            <button
              type="button"
              onClick={selectAll}
              className={`w-full flex items-center gap-2 px-3 py-2 text-base text-left hover:bg-brand-blue/5 transition-colors ${allSelected ? 'bg-brand-blue/10 font-medium text-brand-blue' : ''}`}
            >
              <span className={`flex items-center justify-center w-4 h-4 rounded border ${allSelected ? 'bg-brand-blue border-brand-blue' : 'border-border'}`}>
                {allSelected && <Check size={12} className="text-white" />}
              </span>
              {allLabel}
            </button>

            {options.map((opt) => {
              const val = typeof opt === 'string' ? opt : opt.value
              const lbl = typeof opt === 'string' ? opt : opt.label
              const checked = value.includes(val)
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggle(val)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-base text-left hover:bg-brand-blue/5 transition-colors ${checked ? 'bg-brand-blue/10 font-medium text-brand-blue' : ''}`}
                >
                  <span className={`flex items-center justify-center w-4 h-4 rounded border ${checked ? 'bg-brand-blue border-brand-blue' : 'border-border'}`}>
                    {checked && <Check size={12} className="text-white" />}
                  </span>
                  {lbl}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
