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
  { code: 'LRD', city: 'Laredo' },
  { code: 'MFE', city: 'McAllen' },
  { code: 'HRL', city: 'Harlingen' },
  { code: 'BRO', city: 'Brownsville' },
  { code: 'DRT', city: 'Del Rio' },
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
 * Returns an array sorted by descending percentage, ready for BarChart.
 */
export function computeAdherenceData(segmentData) {
  if (!segmentData?.length) return []

  const scheduled = segmentData.filter(
    (d) => d.SCHED_REPORTED === 1 && d.CLASS === 'F',
  )
  if (!scheduled.length) return []

  const totalDeps = scheduled.reduce((s, d) => s + d.DEPARTURES_SCHEDULED, 0)
  if (!totalDeps) return []

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
    const weight = d.DEPARTURES_SCHEDULED
    if (diff === 0) buckets['Exact match'] += weight
    else if (diff >= -2 && diff <= -1) buckets['1\u20132 fewer'] += weight
    else if (diff >= -5 && diff <= -3) buckets['3\u20135 fewer'] += weight
    else if (diff >= -10 && diff <= -6) buckets['6\u201310 fewer'] += weight
    else if (diff < -10) buckets['11+ fewer'] += weight
    else if (diff >= 1 && diff <= 2) buckets['1\u20132 extra'] += weight
    else if (diff >= 3 && diff <= 5) buckets['3\u20135 extra'] += weight
    else if (diff >= 6) buckets['6+ extra'] += weight
  }

  return Object.entries(buckets)
    .map(([label, count]) => ({ label, value: +((count / totalDeps) * 100).toFixed(1) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
}
