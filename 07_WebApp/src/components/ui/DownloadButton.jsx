/**
 * DownloadButton.jsx — CSV download dropdown button (data-agnostic)
 * -----------------------------------------------------------------
 * Renders a small download icon button. When both summary and detail datasets
 * are provided, clicking opens a dropdown menu letting the user choose which
 * CSV to download. When only one option is available, clicking the button
 * triggers an immediate download without showing a dropdown.
 *
 * The actual CSV generation and browser download is handled by downloadCsv()
 * from `@/lib/downloadCsv`.
 *
 * Props
 *   @param {object}  [summary]       — { data: object[], filename: string } for aggregated data
 *   @param {object}  [detail]        — { data: object[], filename: string } for row-level data
 *   @param {string}  [size='default'] — 'default' for compact icon button (inside ChartCard header),
 *                                       'fullscreen' for a larger labeled button (inside FullscreenChart)
 *
 * Behavior
 *   - Returns null if neither summary nor detail has any data rows
 *   - Dropdown closes on outside click (pointerdown listener)
 *   - Single-option mode: auto-downloads the available CSV without a dropdown
 *
 * BOILERPLATE NOTE:
 *   This component is fully data-agnostic. No changes are needed when adapting
 *   this boilerplate for a new project or dataset. The parent component is
 *   responsible for assembling the summary/detail data objects.
 */
import { useState, useRef, useEffect } from 'react'
import { Download } from 'lucide-react'
import { downloadCsv } from '@/lib/downloadCsv'

/**
 * Small download icon button with a dropdown to choose Summary or Detail CSV.
 *
 * @param {{ summary?: { data: object[], filename: string }, detail?: { data: object[], filename: string } }} props
 */
export default function DownloadButton({ summary, detail, size = 'default' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const hasSummary = summary?.data?.length > 0
  const hasDetail = detail?.data?.length > 0
  if (!hasSummary && !hasDetail) return null

  const handleClick = (type) => {
    const src = type === 'summary' ? summary : detail
    if (src?.data?.length) downloadCsv(src.data, src.filename)
    setOpen(false)
  }

  // If only one option, download directly without dropdown
  const singleOption = hasSummary && !hasDetail ? 'summary' : !hasSummary && hasDetail ? 'detail' : null

  const isFullscreen = size === 'fullscreen'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => (singleOption ? handleClick(singleOption) : setOpen((o) => !o))}
        className={
          isFullscreen
            ? 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-medium text-text-secondary bg-surface-alt hover:bg-gray-200 border border-border-light transition-all duration-150'
            : 'p-1.5 rounded-md text-text-secondary hover:text-brand-blue hover:bg-surface-alt transition-all duration-150'
        }
        title="Download data"
      >
        <Download size={isFullscreen ? 18 : 14} />
        {isFullscreen && <span>Download CSV</span>}
      </button>

      {open && !singleOption && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-border-light py-1 min-w-[160px]">
          {hasSummary && (
            <button
              onClick={() => handleClick('summary')}
              className="w-full text-left px-3 py-1.5 text-base text-text-primary hover:bg-surface-alt transition-colors"
              title="Aggregated totals matching the current chart view"
            >
              Summary (CSV)
            </button>
          )}
          {hasDetail && (
            <button
              onClick={() => handleClick('detail')}
              className="w-full text-left px-3 py-1.5 text-base text-text-primary hover:bg-surface-alt transition-colors"
              title="Row-level records with all columns for the current filters"
            >
              Detail (CSV)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
