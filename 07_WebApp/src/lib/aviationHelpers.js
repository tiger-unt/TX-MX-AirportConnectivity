/**
 * ── aviationHelpers.js ──────────────────────────────────────────────────
 * Shared filter predicates and number formatters used across all pages.
 * Extracted from Overview and Market pages to avoid duplication.
 */

/* ── Number formatters ─────────────────────────────────────────────── */

export const fmtCompact = (v) => {
  if (v == null || isNaN(v)) return '0'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toFixed(0)}`
}

export const fmtLbs = (v) => {
  if (v == null || isNaN(v)) return '0 lbs'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B lbs`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M lbs`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K lbs`
  return `${sign}${abs.toFixed(0)} lbs`
}

/* ── Record predicates ─────────────────────────────────────────────── */

/** TX origin going to any destination */
export const isTxOrigin = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'United States' && d.ORIGIN_STATE_NM === 'Texas'

/** TX → Mexico */
export const isTxToMx = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME === 'Mexico'

/** Mexico → TX */
export const isMxToTx = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'Mexico' &&
  d.DEST_COUNTRY_NAME === 'United States' && d.DEST_STATE_NM === 'Texas'

/** TX ↔ Mexico (either direction) */
export const isTxMx = (d) => isTxToMx(d) || isMxToTx(d)

/** Any US → Mexico */
export const isUsToMx = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'United States' && d.DEST_COUNTRY_NAME === 'Mexico'

/** Mexico → any US */
export const isMxToUs = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'Mexico' && d.DEST_COUNTRY_NAME === 'United States'

/** TX origin → international (non-US) destination */
export const isTxIntl = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME !== 'United States'

/** TX origin → US domestic destination */
export const isTxDomestic = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME === 'United States'

/* ── Schedule adherence ──────────────────────────────────────────── */

/**
 * Compute schedule adherence distribution from segment data.
 * Filters to CLASS='F' (scheduled service) AND DEPARTURES_SCHEDULED > 0.
 * This captures all US carriers (DU + IU) that report schedule data while
 * naturally excluding foreign carriers (DF/IF, who never report schedules)
 * and extra-section flights (sched=0 supplemental operations).
 * Buckets by (DEPARTURES_PERFORMED − DEPARTURES_SCHEDULED) and returns
 * an array sorted by descending percentage, ready for BarChart.
 */
export function computeAdherenceData(segmentData) {
  if (!segmentData?.length) return []

  const scheduled = segmentData.filter(
    (d) => d.CLASS === 'F' && d.DEPARTURES_SCHEDULED > 0,
  )
  if (!scheduled.length) return []

  const total = scheduled.length
  const buckets = {
    'Exact match': 0,
    '1\u20132 fewer': 0,
    '3\u20135 fewer': 0,
    '6\u201310 fewer': 0,
    '11+ fewer': 0,
    '1\u20132 extra': 0,
    '3\u20135 extra': 0,
    '6+ extra': 0,
  }

  for (const d of scheduled) {
    const diff = d.DEPARTURES_PERFORMED - d.DEPARTURES_SCHEDULED
    if (diff === 0) buckets['Exact match']++
    else if (diff >= -2 && diff <= -1) buckets['1\u20132 fewer']++
    else if (diff >= -5 && diff <= -3) buckets['3\u20135 fewer']++
    else if (diff >= -10 && diff <= -6) buckets['6\u201310 fewer']++
    else if (diff < -10) buckets['11+ fewer']++
    else if (diff >= 1 && diff <= 2) buckets['1\u20132 extra']++
    else if (diff >= 3 && diff <= 5) buckets['3\u20135 extra']++
    else if (diff >= 6) buckets['6+ extra']++
  }

  return Object.entries(buckets)
    .map(([label, count]) => ({ label, value: +((count / total) * 100).toFixed(1) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
}
