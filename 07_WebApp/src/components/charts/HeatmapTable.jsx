/**
 * HeatmapTable — Color-intensity grid table for O-D matrices.
 *
 * Renders an HTML table where cell background color intensity is proportional
 * to the cell value. Used for origin-destination matrices (e.g., border
 * airport ↔ Mexico airport passenger/freight flows).
 *
 * PROPS
 * @param {Object} data
 *   { rowLabels: string[], colLabels: string[], cells: number[][] }
 *   cells[r][c] is the value at row r, column c
 *
 * @param {Function} [formatValue] — formatter for cell values
 */
import { useMemo } from 'react'
import { fmtCompact } from '@/lib/aviationHelpers'

export default function HeatmapTable({
  data = { rowLabels: [], colLabels: [], cells: [] },
  formatValue = fmtCompact,
}) {
  const { rowLabels, colLabels, cells } = data

  const maxVal = useMemo(() => {
    let max = 0
    cells.forEach((row) => row.forEach((v) => { if (v > max) max = v }))
    return max
  }, [cells])

  if (!rowLabels.length || !colLabels.length) {
    return <p className="text-base text-text-secondary italic py-4 text-center">No border airport routes found for current filters.</p>
  }

  const getCellStyle = (v) => {
    if (!v || !maxVal) return {}
    const intensity = Math.min(1, v / maxVal)
    const alpha = 0.08 + intensity * 0.72
    const textColor = intensity > 0.45 ? 'white' : 'inherit'
    return {
      backgroundColor: `rgba(0, 86, 169, ${alpha})`,
      color: textColor,
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-base">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-text-secondary border-b border-border sticky left-0 bg-surface-primary z-10">
              TX Airport
            </th>
            {colLabels.map((col) => (
              <th key={col} className="px-3 py-2 text-center font-semibold text-text-secondary border-b border-border whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((row, ri) => (
            <tr key={row}>
              <td className="px-3 py-2 font-medium text-text-primary border-b border-border sticky left-0 bg-surface-primary z-10 whitespace-nowrap">
                {row}
              </td>
              {colLabels.map((col, ci) => {
                const v = cells[ri]?.[ci] || 0
                return (
                  <td
                    key={col}
                    className="px-3 py-2 text-center border-b border-border font-medium whitespace-nowrap"
                    style={getCellStyle(v)}
                  >
                    {v > 0 ? formatValue(v) : <span className="text-text-secondary/40">&ndash;</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
