/**
 * Unit tests for aviationHelpers.js — route predicates, formatters, and helpers.
 */
import { describe, it, expect } from 'vitest'
import {
  isEmptyOrAllZero,
  fmtCompact,
  fmtLbs,
  BORDER_AIRPORTS,
  AIRCRAFT_GROUP_LABELS,
  CLASS_LABELS,
  getCarrierType,
  isTxOrigin,
  isTxDest,
  isTxToMx,
  isMxToTx,
  isTxMx,
  isUsToMx,
  isMxToUs,
  isTxToIntl,
  isIntlToTx,
  isTxIntl,
  isTxToUs,
  isUsToTx,
  isTxDomestic,
  computeAdherenceData,
} from '@/lib/aviationHelpers'

describe('isEmptyOrAllZero', () => {
  it('returns true for empty array', () => {
    expect(isEmptyOrAllZero([])).toBe(true)
  })
  it('returns true when every value is zero', () => {
    expect(isEmptyOrAllZero([{ value: 0 }, { value: 0 }])).toBe(true)
  })
  it('returns false when any value is non-zero', () => {
    expect(isEmptyOrAllZero([{ value: 0 }, { value: 1 }])).toBe(false)
  })
  it('uses custom key when provided', () => {
    expect(isEmptyOrAllZero([{ count: 0 }], 'count')).toBe(true)
    expect(isEmptyOrAllZero([{ count: 5 }], 'count')).toBe(false)
  })
})

describe('fmtCompact', () => {
  it('formats thousands with K', () => {
    expect(fmtCompact(1500)).toBe('1.5K')
    expect(fmtCompact(999)).toBe('999')
  })
  it('formats millions with M', () => {
    expect(fmtCompact(1_500_000)).toBe('1.5M')
    expect(fmtCompact(1_000_000)).toBe('1.0M')
  })
  it('formats billions with B', () => {
    expect(fmtCompact(2_300_000_000)).toBe('2.3B')
  })
  it('handles null/NaN as zero', () => {
    expect(fmtCompact(null)).toBe('0')
    expect(fmtCompact(NaN)).toBe('0')
  })
  it('handles negative numbers', () => {
    expect(fmtCompact(-1500)).toBe('-1.5K')
  })
})

describe('fmtLbs', () => {
  it('appends lbs and uses K/M/B', () => {
    expect(fmtLbs(500)).toBe('500 lbs')
    expect(fmtLbs(1500)).toBe('1.5K lbs')
    expect(fmtLbs(1_500_000)).toBe('1.5M lbs')
  })
  it('handles null/NaN as 0 lbs', () => {
    expect(fmtLbs(null)).toBe('0 lbs')
  })
})

describe('BORDER_AIRPORTS', () => {
  it('contains the six Texas border airport codes', () => {
    expect(BORDER_AIRPORTS.has('ELP')).toBe(true)
    expect(BORDER_AIRPORTS.has('LRD')).toBe(true)
    expect(BORDER_AIRPORTS.has('MFE')).toBe(true)
    expect(BORDER_AIRPORTS.has('HRL')).toBe(true)
    expect(BORDER_AIRPORTS.has('BRO')).toBe(true)
    expect(BORDER_AIRPORTS.has('DRT')).toBe(true)
    expect(BORDER_AIRPORTS.size).toBe(6)
  })
})

describe('getCarrierType', () => {
  it('returns U for Domestic from DATA_SOURCE second letter', () => {
    expect(getCarrierType({ DATA_SOURCE: 'DU' })).toBe('U')
    expect(getCarrierType({ DATA_SOURCE: 'IU' })).toBe('U')
  })
  it('returns F for International', () => {
    expect(getCarrierType({ DATA_SOURCE: 'DF' })).toBe('F')
    expect(getCarrierType({ DATA_SOURCE: 'IF' })).toBe('F')
  })
  it('returns Unknown when missing', () => {
    expect(getCarrierType({})).toBe('Unknown')
    expect(getCarrierType({ DATA_SOURCE: 'X' })).toBe('Unknown')
  })
})

describe('Route predicates — Texas origin/dest', () => {
  const txOriginRow = {
    ORIGIN_COUNTRY_NAME: 'United States',
    ORIGIN_STATE_NM: 'Texas',
    DEST_COUNTRY_NAME: 'Mexico',
    DEST_STATE_NM: null,
  }
  const mxOriginRow = {
    ORIGIN_COUNTRY_NAME: 'Mexico',
    ORIGIN_STATE_NM: null,
    DEST_COUNTRY_NAME: 'United States',
    DEST_STATE_NM: 'Texas',
  }
  const usOtherOrigin = {
    ORIGIN_COUNTRY_NAME: 'United States',
    ORIGIN_STATE_NM: 'California',
    DEST_COUNTRY_NAME: 'Mexico',
  }

  it('isTxOrigin identifies TX origin', () => {
    expect(isTxOrigin(txOriginRow)).toBe(true)
    expect(isTxOrigin(mxOriginRow)).toBe(false)
    expect(isTxOrigin(usOtherOrigin)).toBe(false)
  })
  it('isTxDest identifies TX destination', () => {
    expect(isTxDest(mxOriginRow)).toBe(true)
    expect(isTxDest(txOriginRow)).toBe(false)
  })
  it('isTxToMx: TX → Mexico', () => {
    expect(isTxToMx(txOriginRow)).toBe(true)
    expect(isTxToMx(mxOriginRow)).toBe(false)
    expect(isTxToMx(usOtherOrigin)).toBe(false)
  })
  it('isMxToTx: Mexico → TX', () => {
    expect(isMxToTx(mxOriginRow)).toBe(true)
    expect(isMxToTx(txOriginRow)).toBe(false)
  })
  it('isTxMx: either TX ↔ Mexico', () => {
    expect(isTxMx(txOriginRow)).toBe(true)
    expect(isTxMx(mxOriginRow)).toBe(true)
    expect(isTxMx(usOtherOrigin)).toBe(false)
  })
  it('isUsToMx: any US → Mexico', () => {
    expect(isUsToMx(txOriginRow)).toBe(true)
    expect(isUsToMx(usOtherOrigin)).toBe(true)
    expect(isUsToMx(mxOriginRow)).toBe(false)
  })
  it('isMxToUs: Mexico → any US', () => {
    expect(isMxToUs(mxOriginRow)).toBe(true)
    expect(isMxToUs(txOriginRow)).toBe(false)
  })
})

describe('Route predicates — TX domestic and international', () => {
  const txToFlorida = {
    ORIGIN_COUNTRY_NAME: 'United States',
    ORIGIN_STATE_NM: 'Texas',
    DEST_COUNTRY_NAME: 'United States',
    DEST_STATE_NM: 'Florida',
  }
  const floridaToTx = {
    ORIGIN_COUNTRY_NAME: 'United States',
    ORIGIN_STATE_NM: 'Florida',
    DEST_COUNTRY_NAME: 'United States',
    DEST_STATE_NM: 'Texas',
  }
  const txToCanada = {
    ORIGIN_COUNTRY_NAME: 'United States',
    ORIGIN_STATE_NM: 'Texas',
    DEST_COUNTRY_NAME: 'Canada',
  }
  const ukToTx = {
    ORIGIN_COUNTRY_NAME: 'United Kingdom',
    DEST_COUNTRY_NAME: 'United States',
    DEST_STATE_NM: 'Texas',
  }

  it('isTxToUs and isUsToTx for domestic', () => {
    expect(isTxToUs(txToFlorida)).toBe(true)
    expect(isUsToTx(floridaToTx)).toBe(true)
    expect(isTxDomestic(txToFlorida)).toBe(true)
    expect(isTxDomestic(floridaToTx)).toBe(true)
  })
  it('isTxToIntl and isIntlToTx for international (non-US)', () => {
    expect(isTxToIntl(txToCanada)).toBe(true)
    expect(isIntlToTx(ukToTx)).toBe(true)
    expect(isTxIntl(txToCanada)).toBe(true)
    expect(isTxIntl(ukToTx)).toBe(true)
  })
})

describe('computeAdherenceData', () => {
  it('returns empty array for empty or null segment data', () => {
    expect(computeAdherenceData([])).toEqual([])
    expect(computeAdherenceData(null)).toEqual([])
  })
  it('returns empty when no rows have SCHED_REPORTED=1 and CLASS=F', () => {
    expect(computeAdherenceData([
      { SCHED_REPORTED: 0, CLASS: 'F', DEPARTURES_SCHEDULED: 10, DEPARTURES_PERFORMED: 10 },
    ])).toEqual([])
  })
  it('returns buckets with values for valid scheduled rows', () => {
    const data = [
      { SCHED_REPORTED: 1, CLASS: 'F', DEPARTURES_SCHEDULED: 100, DEPARTURES_PERFORMED: 100 },
      { SCHED_REPORTED: 1, CLASS: 'F', DEPARTURES_SCHEDULED: 50, DEPARTURES_PERFORMED: 48 },
    ]
    const result = computeAdherenceData(data)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((d) => typeof d.label === 'string' && typeof d.value === 'number' && d.color)).toBe(true)
    const exact = result.find((d) => d.label === 'Exact match')
    expect(exact).toBeDefined()
    expect(exact.value).toBeGreaterThan(0)
  })
})

describe('Constants', () => {
  it('AIRCRAFT_GROUP_LABELS has expected keys', () => {
    expect(AIRCRAFT_GROUP_LABELS[6]).toBe('Narrow-Body Jet')
    expect(AIRCRAFT_GROUP_LABELS[0]).toBe('Unknown')
  })
  it('CLASS_LABELS has F, G, L, P', () => {
    expect(CLASS_LABELS.F).toBeDefined()
    expect(CLASS_LABELS.G).toBeDefined()
  })
})
