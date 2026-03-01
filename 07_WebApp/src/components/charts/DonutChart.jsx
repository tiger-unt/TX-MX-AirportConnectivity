/**
 * DonutChart — Interactive donut/ring chart with slice selection, center text,
 * and a side legend.
 *
 * ── BOILERPLATE: NO CHANGES NEEDED ─────────────────────────────────────────
 * Chart components are data-agnostic — they render whatever data array is
 * passed via props. When swapping datasets, update the page components
 * (src/pages/) that prepare and pass data to these charts, not the charts
 * themselves. The only reason to modify a chart is to change its visual
 * style or add new interactive features.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 * Renders a donut chart where:
 *   - Each data item becomes one pie slice, colored via CHART_COLORS.
 *   - The center of the donut displays a label and value: "Total" by
 *     default, or the hovered/selected slice's name and value.
 *   - Clicking a slice "selects" it — the slice explodes outward slightly,
 *     non-selected slices are dimmed, and the center text updates.
 *   - Clicking outside the chart (anywhere on the page) deselects.
 *   - A right-side legend is shown when width > 500px and there are <= 10
 *     items. Legend items are also clickable for selection.
 *   - Hover expands the slice arc (arcHover vs arc).
 *
 * PROPS
 * @param {Array<Object>} data
 *   Array of objects, each with at least `nameKey` and `valueKey`.
 *   Example: [{ label: 'Truck', value: 42000000 }, ...]
 *
 * @param {string} [nameKey='label']
 *   Property name for the slice label (used in legend and center text).
 *
 * @param {string} [valueKey='value']
 *   Property name for the numeric value that determines slice size.
 *
 * @param {Function} [formatValue=formatCurrency]
 *   Formatter for the center value and legend values.
 *
 * @param {Function} [onSliceClick]
 *   Optional callback invoked with the clicked datum (or `null` when
 *   deselecting). Used together with `selectedSlice`.
 *
 * @param {string} [selectedSlice]
 *   The `nameKey` value of the currently selected slice. Non-selected
 *   slices render at reduced opacity. Pass `null`/`undefined` to clear.
 *
 * @param {boolean} [animate=true]
 *   Whether slices fade in on first render. Animation only runs once
 *   (tracked by `hasAnimated` ref) to avoid replaying on selection changes.
 *
 * EDGE CASES & LIMITATIONS
 * - If ALL values are 0, `d3.sum` returns 0 and the center shows
 *   "Total: $0". D3's pie layout will render equal-angle slices (all zero).
 * - The click-outside deselection handler attaches a document-level click
 *   listener. It's cleaned up on unmount or when selection clears.
 * - Legend is hidden when width <= 500px or data has more than 10 items
 *   to prevent overflow.
 * - The donut hole ratio is fixed at 55% of the radius (innerRadius = 0.55r).
 */
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { useChartResize, getResponsiveFontSize } from '@/lib/useChartResize'
import { CHART_COLORS, formatCurrency } from '@/lib/chartColors'

export default function DonutChart({
  data = [],
  nameKey = 'label',
  valueKey = 'value',
  formatValue = formatCurrency,
  onSliceClick,
  selectedSlice,
  animate = true,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const hasAnimated = useRef(false)
  const { width, height: containerHeight, isFullscreen } = useChartResize(containerRef)

  // Click-outside handler: deselect when clicking anywhere outside the chart container
  useEffect(() => {
    if (!onSliceClick || !selectedSlice) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onSliceClick(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onSliceClick, selectedSlice])

  useEffect(() => {
    if (!data.length || !width) return

    const FS = getResponsiveFontSize(width, isFullscreen)
    const charW = FS * 0.6

    // In fullscreen, give legend more space based on longest label
    const maxLabelLen = d3.max(data, (d) => `${d[nameKey]} (${formatValue(d[valueKey])})`.length) || 20
    const legendW = isFullscreen
      ? Math.min(width * 0.35, Math.max(320, maxLabelLen * charW + 40))
      : 300
    const showLegendRight = width > 500 && data.length <= 10
    const legendWidth = showLegendRight ? legendW : 0
    const chartArea = width - legendWidth
    const maxSize = containerHeight > 100 ? containerHeight : 300
    const size = Math.min(chartArea, maxSize)
    const explodeOffset = 6
    const radius = size / 2 - explodeOffset
    const innerRadius = radius * 0.55
    const shouldAnimate = animate && !hasAnimated.current

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', size)

    // Click on SVG background to deselect
    if (onSliceClick && selectedSlice) {
      svg.on('click', () => onSliceClick(null))
    } else {
      svg.on('click', null)
    }

    const g = svg.append('g').attr('transform', `translate(${chartArea / 2},${size / 2})`)

    const colorScale = d3.scaleOrdinal().range(CHART_COLORS)
    const pie = d3.pie().value((d) => d[valueKey]).sort(null).padAngle(0.02)
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius - 4)
    const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius)

    const slices = g.selectAll('.slice').data(pie(data)).enter()
      .append('g')
      .attr('class', 'slice')
      .attr('transform', (d) => {
        if (selectedSlice && d.data[nameKey] === selectedSlice) {
          const midAngle = (d.startAngle + d.endAngle) / 2
          const x = Math.sin(midAngle) * explodeOffset
          const y = -Math.cos(midAngle) * explodeOffset
          return `translate(${x},${y})`
        }
        return 'translate(0,0)'
      })

    // Center text (declared early so mouse handlers can reference them)
    const total = d3.sum(data, (d) => d[valueKey])
    const selectedData = selectedSlice ? data.find((d) => d[nameKey] === selectedSlice) : null
    const centerLabel = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('font-size', `${FS}px`)
      .attr('fill', 'var(--color-text-secondary)')
      .text(selectedData ? selectedData[nameKey] : 'Total')

    const centerValue = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', `${Math.round(FS * 1.25)}px`)
      .attr('font-weight', '700')
      .attr('fill', 'var(--color-text-primary)')
      .text(selectedData ? formatValue(selectedData[valueKey]) : formatValue(total))

    slices.append('path')
      .attr('d', (d) => {
        return selectedSlice && d.data[nameKey] === selectedSlice ? arcHover(d) : arc(d)
      })
      .attr('fill', (d) => {
        const c = colorScale(d.data[nameKey])
        return selectedSlice && d.data[nameKey] !== selectedSlice ? `${c}55` : c
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('cursor', onSliceClick ? 'pointer' : 'default')
      .on('click', (e, d) => {
        e.stopPropagation()
        onSliceClick?.(d.data)
      })
      .on('mouseenter', function (e, d) {
        if (!selectedSlice || d.data[nameKey] !== selectedSlice) {
          d3.select(this).transition().duration(150).attr('d', arcHover)
        }
        centerLabel.text(d.data[nameKey])
        centerValue.text(formatValue(d.data[valueKey]))
      })
      .on('mouseleave', function (e, d) {
        if (!selectedSlice || d.data[nameKey] !== selectedSlice) {
          d3.select(this).transition().duration(150).attr('d', arc)
        }
        if (selectedSlice) {
          const sel = data.find((item) => item[nameKey] === selectedSlice)
          centerLabel.text(sel ? sel[nameKey] : 'Total')
          centerValue.text(sel ? formatValue(sel[valueKey]) : formatValue(total))
        } else {
          centerLabel.text('Total')
          centerValue.text(formatValue(total))
        }
      })

    // Only animate on first render, not on selection changes
    if (shouldAnimate) {
      slices.selectAll('path')
        .attr('opacity', 0)
        .transition()
        .duration(600)
        .delay((d, i) => i * 60)
        .attr('opacity', 1)
      hasAnimated.current = true
    }

    // Legend
    if (showLegendRight && data.length <= 10) {
      const dotR = isFullscreen ? 8 : 6
      const rowH = isFullscreen ? Math.round(FS * 1.8) : 26
      const legendX = chartArea + 16
      const legendY = Math.max(8, size / 2 - (data.length * rowH) / 2)

      const legendG = svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`)

      data.forEach((d, i) => {
        const isDimmed = selectedSlice && d[nameKey] !== selectedSlice
        const item = legendG.append('g')
          .attr('transform', `translate(0, ${i * rowH})`)
          .attr('opacity', isDimmed ? 0.4 : 1)
          .attr('cursor', onSliceClick ? 'pointer' : 'default')
          .on('click', (e) => {
            e.stopPropagation()
            onSliceClick?.(d)
          })
        item.append('circle')
          .attr('cx', dotR).attr('cy', 5).attr('r', dotR)
          .attr('fill', colorScale(d[nameKey]))

        const label = `${d[nameKey]} (${formatValue(d[valueKey])})`

        item.append('text')
          .attr('x', dotR * 2 + 8).attr('y', 10)
          .attr('font-size', `${FS}px`)
          .attr('fill', 'var(--color-text-primary)')
          .text(label)
      })
    }

  }, [data, width, containerHeight, isFullscreen, nameKey, valueKey, selectedSlice, animate])

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 300 }}>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
