/**
 * ── aviationHelpers.js ──────────────────────────────────────────────────
 * Shared filter predicates and number formatters used across all pages.
 * Extracted from Overview and Market pages to avoid duplication.
 */

/* ── Empty-state helpers ──────────────────────────────────────────── */

/** True when data array is empty or every value is zero/falsy.
 *  Used with ChartCard `emptyState` prop to show contextual messages. */
export const isEmptyOrAllZero = (data, key = 'value') =>
  !data.length || data.every((d) => !d[key])

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

/* ── Map metric options ───────────────────────────────────────────── */

export const MAP_METRIC_OPTIONS = [
  { value: 'PASSENGERS', label: 'Passengers',   field: 'PASSENGERS',           source: 'market',  formatter: fmtCompact, unit: 'passengers' },
  { value: 'FREIGHT',    label: 'Freight (lbs)', field: 'FREIGHT',              source: 'market',  formatter: fmtLbs,     unit: 'freight' },
  { value: 'MAIL',       label: 'Mail (lbs)',    field: 'MAIL',                 source: 'market',  formatter: fmtLbs,     unit: 'mail' },
  { value: 'FLIGHTS',    label: 'Flights',       field: 'DEPARTURES_PERFORMED', source: 'segment', formatter: fmtCompact, unit: 'flights' },
]

/* ── Border airports ──────────────────────────────────────────────
 * Texas border airports are defined as airports located within a
 * TxDOT border district. Six airports meet this criterion.
 * ─────────────────────────────────────────────────────────────── */

export const BORDER_AIRPORT_LIST = [
  { code: 'ELP', city: 'El Paso' },
  { code: 'DRT', city: 'Del Rio' },
  { code: 'LRD', city: 'Laredo' },
  { code: 'MFE', city: 'McAllen' },
  { code: 'HRL', city: 'Harlingen' },
  { code: 'BRO', city: 'Brownsville' },
]

export const BORDER_AIRPORTS = new Set(BORDER_AIRPORT_LIST.map((a) => a.code))

/* ── Aircraft group labels (BTS AIRCRAFT_GROUP codes) ────────────── */

export const AIRCRAFT_GROUP_LABELS = {
  0: 'Unknown',
  1: 'Piston',
  3: 'Turbojet (3+ Engine)',
  4: 'Turboprop',
  5: 'Regional Jet',
  6: 'Narrow-Body Jet',
  7: 'Wide-Body Jet',
  8: 'Wide-Body (3+ Engine)',
}

/* ── CLASS labels ─────────────────────────────────────────────────── */

export const CLASS_LABELS = {
  F: 'Class F – Scheduled Service',
  G: 'Class G – Cargo-Only Service',
  L: 'Class L – Charter Service',
  P: 'Class P – Non-Scheduled Civilian',
}

/* ── Carrier type labels (derived from DATA_SOURCE second letter) ─── */

export const CARRIER_TYPE_LABELS = {
  U: 'Domestic',
  F: 'International',
}

export const getCarrierType = (d) => d.DATA_SOURCE?.[1] || 'Unknown'

/* ── Record predicates ─────────────────────────────────────────────── */

/** TX origin going to any destination */
export const isTxOrigin = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'United States' && d.ORIGIN_STATE_NM === 'Texas'

/** Any origin coming to TX */
export const isTxDest = (d) =>
  d.DEST_COUNTRY_NAME === 'United States' && d.DEST_STATE_NM === 'Texas'

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

/** TX → international (non-US) */
export const isTxToIntl = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME !== 'United States'

/** International (non-US) → TX */
export const isIntlToTx = (d) =>
  isTxDest(d) && d.ORIGIN_COUNTRY_NAME !== 'United States'

/** TX ↔ international (non-US) — either direction */
export const isTxIntl = (d) => isTxToIntl(d) || isIntlToTx(d)

/** TX → other US states */
export const isTxToUs = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME === 'United States'

/** Other US states → TX */
export const isUsToTx = (d) =>
  isTxDest(d) && d.ORIGIN_COUNTRY_NAME === 'United States'

/** TX ↔ US domestic — either direction (TX as origin or destination) */
export const isTxDomestic = (d) => isTxToUs(d) || isUsToTx(d)

/* ── Schedule adherence ──────────────────────────────────────────── */

/**
 * Compute schedule adherence distribution from segment data.
 * Filters to SCHED_REPORTED=1 (trustworthy schedule data) AND CLASS='F'.
 * Excludes foreign carriers (IF/DF, who don't report schedules) and
 * US scheduled-service rows with missing-as-zero schedule data (~14% of DU/F).
 * Buckets by (DEPARTURES_PERFORMED − DEPARTURES_SCHEDULED), weighted by
 * DEPARTURES_SCHEDULED (departure-weighted, not row-weighted).
 * Returns an array in fixed display order (extra → exact → fewer) with
 * a `color` property per item, ready for BarChart with colorAccessor.
 */

const ADHERENCE_GREEN = '#196533'   // exact match
const ADHERENCE_AMBER = '#d97706'   // fewer flights (cancelled/not operated)
const ADHERENCE_BLUE  = '#3b82f6'   // extra flights (over-operated)

/** Fixed display order: extra (top) → exact match → fewer (bottom) */
const ADHERENCE_BUCKETS = [
  { label: '6+ extra flights',       color: ADHERENCE_BLUE },
  { label: '3–5 extra flights',      color: ADHERENCE_BLUE },
  { label: '1–2 extra flights',      color: ADHERENCE_BLUE },
  { label: 'Exact match',            color: ADHERENCE_GREEN },
  { label: '1–2 fewer flights',      color: ADHERENCE_AMBER },
  { label: '3–5 fewer flights',      color: ADHERENCE_AMBER },
  { label: '6–10 fewer flights',     color: ADHERENCE_AMBER },
  { label: '11–20 fewer flights',    color: ADHERENCE_AMBER },
  { label: '21–50 fewer flights',    color: ADHERENCE_AMBER },
  { label: '51–100 fewer flights',   color: ADHERENCE_AMBER },
  { label: '100+ fewer flights',     color: ADHERENCE_AMBER },
]

export function computeAdherenceData(segmentData) {
  if (!segmentData?.length) return []

  const scheduled = segmentData.filter(
    (d) => d.SCHED_REPORTED === 1 && d.CLASS === 'F',
  )
  if (!scheduled.length) return []

  const totalDeps = scheduled.reduce((s, d) => s + d.DEPARTURES_SCHEDULED, 0)
  if (!totalDeps) return []

  const counts = {}
  for (const b of ADHERENCE_BUCKETS) counts[b.label] = 0

  for (const d of scheduled) {
    const diff = d.DEPARTURES_PERFORMED - d.DEPARTURES_SCHEDULED
    const weight = d.DEPARTURES_SCHEDULED
    if (diff === 0) counts['Exact match'] += weight
    else if (diff >= -2 && diff <= -1) counts['1–2 fewer flights'] += weight
    else if (diff >= -5 && diff <= -3) counts['3–5 fewer flights'] += weight
    else if (diff >= -10 && diff <= -6) counts['6–10 fewer flights'] += weight
    else if (diff >= -20 && diff <= -11) counts['11–20 fewer flights'] += weight
    else if (diff >= -50 && diff <= -21) counts['21–50 fewer flights'] += weight
    else if (diff >= -100 && diff <= -51) counts['51–100 fewer flights'] += weight
    else if (diff < -100) counts['100+ fewer flights'] += weight
    else if (diff >= 1 && diff <= 2) counts['1–2 extra flights'] += weight
    else if (diff >= 3 && diff <= 5) counts['3–5 extra flights'] += weight
    else if (diff >= 6) counts['6+ extra flights'] += weight
  }

  return ADHERENCE_BUCKETS
    .map((b) => ({ label: b.label, value: +((counts[b.label] / totalDeps) * 100).toFixed(1), color: b.color }))
    .filter((d) => d.value > 0)
}
