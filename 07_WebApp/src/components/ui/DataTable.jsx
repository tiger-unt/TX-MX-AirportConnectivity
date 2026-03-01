/**
 * DataTable.jsx — Sortable, paginated data table (data-agnostic)
 * ---------------------------------------------------------------
 * A generic table component that supports:
 *   - Click-to-sort on any column (ascending / descending toggle)
 *   - Pagination with Prev/Next controls and a "Showing X-Y of Z" indicator
 *   - Dynamic page size in fullscreen mode: a ResizeObserver measures the
 *     available container height and calculates how many rows fit, so the
 *     table fills the viewport without scrolling
 *   - Alternating row backgrounds and hover highlights
 *
 * Column Definition
 *   Columns are defined by the parent via the `columns` prop — an array of:
 *     { key: string, label: string, render?: (cellValue, row) => ReactNode }
 *   - `key`    — Property name on each data row object
 *   - `label`  — Display text for the column header
 *   - `render` — Optional custom render function for the cell content;
 *                receives the cell value and the full row object.
 *                If omitted, the raw cell value is displayed as-is.
 *
 * Props
 *   @param {Array<{ key: string, label: string, render?: Function }>} columns — Column definitions
 *   @param {object[]}  data                — Array of row objects to display
 *   @param {number}   [pageSize]           — Fixed page size (overrides dynamic sizing)
 *
 * Fullscreen Detection
 *   The component checks whether it is inside a `.fullscreen-chart-area` ancestor
 *   (rendered by FullscreenChart). If so, it switches to dynamic page sizing via
 *   ResizeObserver; otherwise it uses the default of 10 rows per page.
 *
 * BOILERPLATE NOTE:
 *   This component is fully data-agnostic. No changes are needed when adapting
 *   this boilerplate for a new project or dataset. Simply pass different `columns`
 *   and `data` from the parent.
 */
import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const DEFAULT_PAGE_SIZE = 10
const HEADER_HEIGHT = 45   // thead row height (px)
const ROW_HEIGHT = 41      // tbody row height (px)
const FOOTER_HEIGHT = 49   // pagination bar height (px)

export default function DataTable({ columns, data, pageSize: fixedPageSize }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [dynamicPageSize, setDynamicPageSize] = useState(fixedPageSize || DEFAULT_PAGE_SIZE)
  const rootRef = useRef(null)

  // In fullscreen, fit as many rows as the viewport allows (using the
  // fullscreen overlay's height, not the table's own auto-height).
  // In normal mode use a sensible default page size.
  const recalcPageSize = useCallback(() => {
    if (fixedPageSize) return
    const el = rootRef.current
    if (!el) return

    const fsArea = el.closest('.fullscreen-chart-area')
    if (!fsArea) {
      setDynamicPageSize(DEFAULT_PAGE_SIZE)
      return
    }

    // Subtract the fullscreen area's padding so we only count usable space
    const style = getComputedStyle(fsArea)
    const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
    const available = fsArea.clientHeight - padY
    if (available <= 0) return
    // 2 extra px for the DataTable's own top+bottom border
    const bodySpace = available - HEADER_HEIGHT - FOOTER_HEIGHT - 2
    const rows = Math.max(1, Math.floor(bodySpace / ROW_HEIGHT))
    setDynamicPageSize(rows)
  }, [fixedPageSize])

  useLayoutEffect(() => {
    recalcPageSize()
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(recalcPageSize)
    ro.observe(el)
    const fsArea = el.closest('.fullscreen-chart-area')
    if (fsArea) ro.observe(fsArea)
    return () => ro.disconnect()
  }, [recalcPageSize])

  const pageSize = fixedPageSize || dynamicPageSize

  // Reset to page 0 when page size or data changes (e.g. entering/exiting
  // fullscreen, or applying a filter that reduces available pages)
  useLayoutEffect(() => {
    setPage(0)
  }, [pageSize, data])

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-text-secondary/40" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-brand-blue" />
    ) : (
      <ChevronDown size={12} className="text-brand-blue" />
    )
  }

  return (
    <div ref={rootRef} className="data-table-root bg-white rounded-xl border border-border-light shadow-xs overflow-hidden flex flex-col mx-auto w-fit max-w-full">
      <div
        className="overflow-x-auto overflow-y-hidden flex-1 min-h-0 data-table-scroll"
        style={totalPages > 1 ? { minHeight: HEADER_HEIGHT + pageSize * ROW_HEIGHT } : undefined}
      >
        <table className="text-base">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-alt border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-base font-semibold text-text-secondary
                           uppercase tracking-wider cursor-pointer select-none
                           hover:text-brand-blue transition-colors whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border-light/60 transition-colors duration-100
                  ${i % 2 === 0 ? 'bg-white' : 'bg-surface-alt/40'}
                  hover:bg-brand-blue/[0.03]`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-text-primary whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light bg-surface-alt/30">
          <p className="text-base text-text-secondary">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of{' '}
            {sorted.length.toLocaleString()} records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 text-base font-medium rounded-md border border-border
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-surface-alt transition-colors"
            >
              Prev
            </button>
            <span className="px-2 text-base text-text-secondary">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-base font-medium rounded-md border border-border
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-surface-alt transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
