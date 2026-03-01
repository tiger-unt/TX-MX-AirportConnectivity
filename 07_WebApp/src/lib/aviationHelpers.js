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
