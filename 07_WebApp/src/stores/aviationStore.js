/**
 * ── aviationStore.js ──────────────────────────────────────────────────────
 * Central Zustand store for BTS T-100 air carrier data.
 * Loads market + segment CSVs, normalizes columns, provides global filter state.
 *
 * Market data: origin-to-destination passenger journeys (counted once).
 *   Columns: YEAR, ORIGIN, DEST, CARRIER_NAME, CLASS, PASSENGERS, FREIGHT, MAIL, DISTANCE
 *
 * Segment data: individual flight legs.
 *   Additional columns: DEPARTURES_SCHEDULED, DEPARTURES_PERFORMED, SEATS,
 *                       PAYLOAD, AIR_TIME, RAMP_TO_RAMP
 */
import { create } from 'zustand'
import * as d3 from 'd3'

const STRING_FIELDS = [
  'ORIGIN', 'ORIGIN_CITY_NAME', 'ORIGIN_STATE_NM', 'ORIGIN_COUNTRY_NAME',
  'DEST', 'DEST_CITY_NAME', 'DEST_STATE_NM', 'DEST_COUNTRY_NAME',
  'CARRIER_NAME', 'CLASS', 'DATA_SOURCE',
]

function normalizeRow(d, extraNumeric = []) {
  d.YEAR = typeof d.YEAR === 'number' ? d.YEAR : parseInt(d.YEAR, 10) || null
  d.PASSENGERS = +(d.PASSENGERS) || 0
  d.FREIGHT = +(d.FREIGHT) || 0
  d.MAIL = +(d.MAIL) || 0
  d.DISTANCE = +(d.DISTANCE) || 0

  extraNumeric.forEach((key) => {
    if (key in d) d[key] = +(d[key]) || 0
  })

  STRING_FIELDS.forEach((key) => {
    if (typeof d[key] === 'string') d[key] = d[key].trim()
  })
}

export const useAviationStore = create((set) => ({
  marketData: null,
  segmentData: null,
  loading: true,
  error: null,

  filters: {
    year: '',
    direction: '',      // '' = All, 'TX_TO_MX', 'MX_TO_TX'
    carrier: '',
    originAirport: '',
    destAirport: '',
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }))
  },

  resetFilters: () => {
    set({
      filters: { year: '', direction: '', carrier: '', originAirport: '', destAirport: '' },
    })
  },

  loadData: async () => {
    set({ loading: true, error: null })
    try {
      const base = import.meta.env.BASE_URL
      const [market, segment] = await Promise.all([
        d3.csv(`${base}data/BTS_T-100_Market_2015-2024.csv`, d3.autoType),
        d3.csv(`${base}data/BTS_T-100_Segment_2015-2024.csv`, d3.autoType),
      ])

      // Normalize market data
      market.forEach((d) => normalizeRow(d))

      // Normalize segment data (has extra numeric columns)
      const segmentNumeric = [
        'DEPARTURES_SCHEDULED', 'DEPARTURES_PERFORMED',
        'PAYLOAD', 'SEATS', 'RAMP_TO_RAMP', 'AIR_TIME',
      ]
      segment.forEach((d) => normalizeRow(d, segmentNumeric))

      if (!market.length) console.warn('[aviationStore] Market data is empty.')
      if (!segment.length) console.warn('[aviationStore] Segment data is empty.')

      set({ marketData: market, segmentData: segment, loading: false })
    } catch (err) {
      console.error('Failed to load aviation data:', err)
      set({ error: err.message, loading: false })
    }
  },
}))
