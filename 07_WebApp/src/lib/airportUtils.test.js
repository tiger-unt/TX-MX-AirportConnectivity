/**
 * Unit tests for airportUtils.js — GeoJSON index, enrichment, aggregation, arcs.
 */
import { describe, it, expect } from 'vitest'
import {
  buildAirportIndex,
  enrichRow,
  aggregateRoutes,
  aggregateAirportVolumes,
  greatCircleArc,
} from '@/lib/airportUtils'

describe('buildAirportIndex', () => {
  it('returns empty Map for null or missing features', () => {
    expect(buildAirportIndex(null).size).toBe(0)
    expect(buildAirportIndex({}).size).toBe(0)
    expect(buildAirportIndex({ features: [] }).size).toBe(0)
  })
  it('builds index from GeoJSON features', () => {
    const geojson = {
      features: [
        {
          type: 'Feature',
          properties: {
            AIRPORT: 'DFW',
            AIRPORT_NAME: 'Dallas/Fort Worth International',
            LATITUDE: 32.9,
            LONGITUDE: -97.0,
          },
          geometry: { coordinates: [-97.0, 32.9] },
        },
        {
          type: 'Feature',
          properties: { AIRPORT: 'AUS', LATITUDE: 30.2, LONGITUDE: -97.7 },
          geometry: null,
        },
      ],
    }
    const index = buildAirportIndex(geojson)
    expect(index.size).toBe(2)
    expect(index.get('DFW')).toEqual({
      name: 'Dallas/Fort Worth International',
      lat: 32.9,
      lng: -97.0,
    })
    expect(index.get('AUS').name).toBe('AUS')
    expect(index.get('AUS').lat).toBe(30.2)
  })
  it('skips features without AIRPORT property', () => {
    const geojson = {
      features: [
        { type: 'Feature', properties: { LATITUDE: 32, LONGITUDE: -97 } },
      ],
    }
    expect(buildAirportIndex(geojson).size).toBe(0)
  })
})

describe('enrichRow', () => {
  it('adds airport names and coords from index', () => {
    const index = new Map([
      ['DFW', { name: 'Dallas/Fort Worth', lat: 32.9, lng: -97.0 }],
      ['CUN', { name: 'Cancún', lat: 21.0, lng: -86.9 }],
    ])
    const row = { ORIGIN: 'DFW', DEST: 'CUN' }
    enrichRow(row, index)
    expect(row.ORIGIN_FULL_LABEL).toBe('Dallas/Fort Worth')
    expect(row.DEST_FULL_LABEL).toBe('Cancún')
    expect(row.ORIGIN_LAT).toBe(32.9)
    expect(row.DEST_LNG).toBe(-86.9)
  })
  it('falls back to code when airport not in index', () => {
    const row = { ORIGIN: 'XXX', DEST: 'YYY' }
    enrichRow(row, new Map())
    expect(row.ORIGIN_FULL_LABEL).toBe('XXX')
    expect(row.DEST_FULL_LABEL).toBe('YYY')
    expect(row.ORIGIN_LAT).toBeNull()
  })
})

describe('aggregateRoutes', () => {
  it('groups by O-D pair and sums field', () => {
    const index = new Map([
      ['DFW', { name: 'Dallas', lat: 32.9, lng: -97.0 }],
      ['CUN', { name: 'Cancún', lat: 21.0, lng: -86.9 }],
    ])
    const data = [
      { ORIGIN: 'DFW', DEST: 'CUN', PASSENGERS: 100 },
      { ORIGIN: 'DFW', DEST: 'CUN', PASSENGERS: 50 },
      { ORIGIN: 'CUN', DEST: 'DFW', PASSENGERS: 80 },
    ]
    const result = aggregateRoutes(data, index, 'PASSENGERS')
    expect(result).toHaveLength(2)
    const dfwCun = result.find((r) => r.origin === 'DFW' && r.dest === 'CUN')
    const cunDfw = result.find((r) => r.origin === 'CUN' && r.dest === 'DFW')
    expect(dfwCun.value).toBe(150)
    expect(cunDfw.value).toBe(80)
    expect(result[0].value).toBeGreaterThanOrEqual(result[1].value)
  })
  it('uses custom field when provided', () => {
    const data = [
      { ORIGIN: 'A', DEST: 'B', FREIGHT: 1000 },
    ]
    const result = aggregateRoutes(data, null, 'FREIGHT')
    expect(result[0].value).toBe(1000)
  })
})

describe('aggregateAirportVolumes', () => {
  it('sums metric per airport as origin and destination', () => {
    const data = [
      { ORIGIN: 'DFW', DEST: 'CUN', PASSENGERS: 100 },
      { ORIGIN: 'CUN', DEST: 'DFW', PASSENGERS: 80 },
      { ORIGIN: 'DFW', DEST: 'AUS', PASSENGERS: 30 },
    ]
    const vols = aggregateAirportVolumes(data, 'PASSENGERS')
    expect(vols.get('DFW')).toBe(100 + 80 + 30)
    expect(vols.get('CUN')).toBe(100 + 80)
    expect(vols.get('AUS')).toBe(30)
  })
  it('defaults to PASSENGERS', () => {
    const data = [{ ORIGIN: 'A', DEST: 'B', PASSENGERS: 5 }]
    const vols = aggregateAirportVolumes(data)
    expect(vols.get('A')).toBe(5)
    expect(vols.get('B')).toBe(5)
  })
})

describe('greatCircleArc', () => {
  it('returns start and end for same point', () => {
    const pts = greatCircleArc([30, -97], [30, -97], 10)
    expect(pts).toHaveLength(2)
    expect(pts[0]).toEqual([30, -97])
    expect(pts[1]).toEqual([30, -97])
  })
  it('returns n+1 points for n segments', () => {
    const pts = greatCircleArc([32, -97], [21, -87], 50)
    expect(pts).toHaveLength(51)
    expect(pts[0]).toEqual([32, -97])
    expect(pts[50]).toEqual([21, -87])
  })
  it('produces numeric [lat, lng] pairs', () => {
    const pts = greatCircleArc([0, 0], [1, 1], 5)
    pts.forEach((p) => {
      expect(p).toHaveLength(2)
      expect(typeof p[0]).toBe('number')
      expect(typeof p[1]).toBe('number')
    })
  })
})
