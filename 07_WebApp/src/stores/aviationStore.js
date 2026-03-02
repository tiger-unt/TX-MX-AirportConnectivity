/**
 * ── aviationStore.js ──────────────────────────────────────────────────────
 * Central Zustand store for BTS T-100 air carrier data.
 * Loads market + segment CSVs + airport GeoJSON, normalizes columns,
 * enriches rows with airport names/coords, provides global filter state.
 */
import { create } from 'zustand'
import * as d3 from 'd3'
import { buildAirportIndex, enrichRow } from '@/lib/airportUtils'

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
  airportIndex: null,
  airportGeo: null,
  loading: true,
  error: null,

  filters: {
    year: [],
    direction: '',       // '' = All, single-select (only 2 options)
    serviceClass: [],    // CLASS field: F, G, L, P
    carrierType: '',     // '' = All, single-select: U (Domestic) or F (International) from DATA_SOURCE second letter
    carrier: [],
    originAirport: [],
    destAirport: [],
    originState: [],
    destState: [],
    originCountry: [],
    destCountry: [],
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }))
  },

  setFilters: (updates) => {
    set((state) => ({
      filters: { ...state.filters, ...updates },
    }))
  },

  resetFilters: () => {
    set({
      filters: {
        year: [], direction: '', serviceClass: [], carrierType: '',
        carrier: [], originAirport: [], destAirport: [],
        originState: [], destState: [], originCountry: [], destCountry: [],
      },
    })
  },

  loadData: async () => {
    set({ loading: true, error: null })
    try {
      const base = import.meta.env.BASE_URL
      const [market, segment, airportGeo] = await Promise.all([
        d3.csv(`${base}data/BTS_T-100_Market_2015-2024.csv`, d3.autoType),
        d3.csv(`${base}data/BTS_T-100_Segment_2015-2024.csv`, d3.autoType),
        d3.json(`${base}data/BTS_T-100_Airports_2015-2024.geojson`),
      ])

      // Normalize market data
      market.forEach((d) => normalizeRow(d))

      // Normalize segment data (has extra numeric columns)
      const segmentNumeric = [
        'DEPARTURES_SCHEDULED', 'DEPARTURES_PERFORMED',
        'PAYLOAD', 'SEATS',
        'SCHED_REPORTED',
      ]
      segment.forEach((d) => normalizeRow(d, segmentNumeric))

      // Build airport index from GeoJSON
      const airportIndex = buildAirportIndex(airportGeo)

      // Enrich every row with airport names and coordinates
      market.forEach((d) => enrichRow(d, airportIndex))
      segment.forEach((d) => enrichRow(d, airportIndex))

      if (!market.length) console.warn('[aviationStore] Market data is empty.')
      if (!segment.length) console.warn('[aviationStore] Segment data is empty.')
      if (!airportIndex.size) console.warn('[aviationStore] Airport index is empty.')

      set({ marketData: market, segmentData: segment, airportIndex, airportGeo, loading: false })
    } catch (err) {
      console.error('Failed to load aviation data:', err)
      set({ error: err.message, loading: false })
    }
  },
}))
