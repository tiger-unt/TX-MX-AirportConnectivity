/**
 * StatCard.jsx — KPI metric card with trend indicator
 * ----------------------------------------------------
 * Displays a single key performance indicator (KPI) as a styled card with:
 *   - A label (uppercase, smaller text)
 *   - A large formatted value
 *   - An optional trend indicator (up / down / neutral) with an icon and label
 *   - An optional decorative icon in the top-right corner
 *
 * Variants & Highlighting
 *   The card supports visual hierarchy through two mechanisms:
 *   - `highlight` (boolean) — When true, the card uses a blue gradient background
 *     with white text instead of the default white card style.
 *   - `variant` ('primary' | 'secondary' | 'default') — When combined with highlight:
 *       - 'primary'   → Dark gradient (for the lead/hero KPI card)
 *       - other       → Lighter gradient with a subtle white border (supporting cards)
 *   - Without highlight, the card is white with a light border.
 *
 * Trend Colors
 *   - 'up'      → Green (brand-green)
 *   - 'down'    → Red (brand-red)
 *   - 'neutral' → Gray (text-secondary)
 *
 * Props
 *   @param {string}       label      — KPI label text (e.g. "Total Trade Value")
 *   @param {string|React} value      — Formatted display value (e.g. "$1.2B")
 *   @param {'up'|'down'|'neutral'} [trend] — Direction for the trend icon
 *   @param {string}      [trendLabel] — Text next to the trend icon (e.g. "+5.2% YoY")
 *   @param {boolean}     [highlight=false] — Use gradient background
 *   @param {string}      [variant='default'] — 'primary' for lead card dark gradient
 *   @param {Component}   [icon]      — Lucide icon component for the corner badge
 *   @param {number}      [delay=0]   — CSS animation delay in ms (for staggered fade-up)
 *
 * BOILERPLATE NOTE:
 *   This component is data-agnostic. When adapting for a new project, change the
 *   label text, value formatting, and trend calculations in the PAGE components
 *   that use StatCard — not here. This file does not need modification.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({
  label,
  value,
  trend,
  trendLabel,
  highlight = false,
  variant = 'default',
  icon: Icon,
  delay = 0,
}) {
  const trendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const TrendIcon = trendIcon
  const trendColor =
    trend === 'up'
      ? 'text-brand-green'
      : trend === 'down'
      ? 'text-brand-red'
      : 'text-text-secondary'

  // highlight + primary = dark gradient (lead card)
  // highlight + default/secondary = lighter gradient (supporting cards)
  // no highlight = white card
  const cardClass = highlight
    ? variant === 'primary'
      ? 'gradient-blue text-white shadow-lg'
      : 'gradient-blue-light text-white shadow-lg border border-white/35'
    : 'bg-white border border-border-light shadow-xs hover:shadow-md'

  return (
    <div
      className={`rounded-xl p-5 transition-all duration-300 animate-fade-up ${cardClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-base font-medium uppercase tracking-wider mb-2 min-h-[3rem] ${
              highlight ? 'text-white/70' : 'text-text-secondary'
            }`}
          >
            {label}
          </p>
          <p
            className={`text-2xl md:text-3xl font-bold leading-none tracking-tight ${
              highlight ? 'text-white' : 'text-text-primary'
            }`}
          >
            {value}
          </p>
          {trendLabel && (
            <div className={`flex items-center gap-1 mt-2 text-base font-medium ${
              highlight ? 'text-white/80' : trendColor
            }`}>
              <TrendIcon size={14} />
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`p-2 rounded-lg ${
              highlight ? 'bg-white/10' : 'bg-surface-alt'
            }`}
          >
            <Icon
              size={20}
              className={highlight ? 'text-white/80' : 'text-brand-blue'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
