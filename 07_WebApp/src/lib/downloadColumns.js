/**
 * ── DOWNLOAD COLUMN MAPS ─────────────────────────────────────────────────
 *
 * Reusable column-rename maps for CSV downloads. Each map specifies which
 * data keys to include and what header name to use in the exported CSV.
 *
 * Usage: pass as `columns` in the downloadData spec:
 *   downloadData={{ summary: { data, filename, columns: DL.paxTrend } }}
 *
 * When `columns` is provided, only the listed keys are exported (implicitly
 * excluding internal fields like `color`). When omitted, all keys export
 * as-is (backward compatible).
 */

/* ═══════════════════════════════════════════════════════════════════════════
   CHART-LEVEL COLUMN MAPS  (DL)
   ═══════════════════════════════════════════════════════════════════════════ */

export const DL = {
  /* ── Single-series trends { year, value } ──────────────────────────── */
  paxTrend:         { year: 'Year', value: 'Passengers' },
  flightTrend:      { year: 'Year', value: 'Flights (Performed)' },
  freightTrend:     { year: 'Year', value: 'Freight (lbs)' },
  mailTrend:        { year: 'Year', value: 'Mail (lbs)' },
  seatTrend:        { year: 'Year', value: 'Seats' },
  classTrend:       { year: 'Year', value: 'Departures (Performed)' },

  /* ── Multi-series trends { year, value, seriesKey } ────────────────── */
  paxTrendDir:      { year: 'Year', value: 'Passengers', Direction: 'Direction' },
  flightTrendDir:   { year: 'Year', value: 'Flights (Performed)', Direction: 'Direction' },
  freightTrendDir:  { year: 'Year', value: 'Freight (lbs)', Direction: 'Direction' },
  mailTrendDir:     { year: 'Year', value: 'Mail (lbs)', Direction: 'Direction' },
  depTrendMetric:   { year: 'Year', value: 'Departures', Metric: 'Metric' },
  loadFactorDir:    { year: 'Year', value: 'Load Factor (%)', Direction: 'Direction' },
  payloadUtilDir:   { year: 'Year', value: 'Payload Utilization (%)', Direction: 'Direction' },
  depTrendAircraft: { year: 'Year', value: 'Departures', Aircraft: 'Aircraft Type' },

  /* ── Rankings / bar charts { label, value } ────────────────────────── */
  statesPax:        { label: 'State', value: 'Passengers' },
  routesPax:        { label: 'Route', value: 'Passengers' },
  airportsPax:      { label: 'Airport', value: 'Passengers' },
  countriesPax:     { label: 'Country', value: 'Passengers' },
  carrierPax:       { label: 'Carrier', value: 'Passengers' },
  regionPax:        { label: 'Region', value: 'Passengers' },
  statesCargo:      { label: 'State', value: 'Freight (lbs)' },
  carrierCargo:     { label: 'Carrier', value: 'Freight (lbs)' },
  serviceClass:     { label: 'Service Class', value: 'Departures (Performed)' },
  freightIntensity: { label: 'Route', value: 'Freight per Departure (lbs)' },

  /* ── Schedule adherence { label, value, color } — drops `color` ──── */
  adherence:        { label: 'Adherence Category', value: 'Share of Flights (%)' },

  /* ── Box plot { year, min, q1, median, q3, max, count } ────────────── */
  boxPlotPct:       { year: 'Year', min: 'Min (%)', q1: 'Q1 (%)', median: 'Median (%)', q3: 'Q3 (%)', max: 'Max (%)', count: 'Route Count' },

  /* ── Cargo-specific ────────────────────────────────────────────────── */
  freightImbalance:    { label: 'Airport', Exports: 'Exports (lbs)', Imports: 'Imports (lbs)' },
  classGUtilTrend:     { year: 'Year', value: 'Freight Payload Utilization (%)' },
  classGUtilRoute:     { label: 'Route', value: 'Freight Payload Utilization (%)', deps: 'Departures' },
  aircraftIntensity:   { label: 'Aircraft Type', value: 'Freight per Departure (lbs)', depPct: 'Share of Flights (%)' },
  nonNbCarriers:       { label: 'Carrier', value: 'Freight (lbs)' },

  /* ── Scatter / table (already descriptive keys) ────────────────────── */
  airportScatter: {
    Code: 'Airport Code', Airport: 'Airport Name', City: 'City',
    Type: 'Airport Type', Passengers: 'Passengers', Freight: 'Freight (lbs)',
    PctPax: 'Passenger Share (%)', PctFreight: 'Freight Share (%)',
  },
  routeDetails: {
    Year: 'Year', Origin: 'Origin Airport', Dest: 'Destination Airport',
    Carrier: 'Carrier', Passengers: 'Passengers', Freight: 'Freight (lbs)', Mail: 'Mail (lbs)',
  },
}


/* ═══════════════════════════════════════════════════════════════════════════
   PAGE-LEVEL DOWNLOAD COLUMN MAPS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Market data (BTS_MARKET rows after enrichment) */
export const PAGE_MARKET_COLS = {
  YEAR:                'Year',
  ORIGIN:              'Origin Code',
  ORIGIN_FULL_LABEL:   'Origin Airport',
  ORIGIN_CITY_NAME:    'Origin City',
  ORIGIN_STATE_NM:     'Origin State',
  ORIGIN_COUNTRY_NAME: 'Origin Country',
  DEST:                'Dest Code',
  DEST_FULL_LABEL:     'Dest Airport',
  DEST_CITY_NAME:      'Dest City',
  DEST_STATE_NM:       'Dest State',
  DEST_COUNTRY_NAME:   'Dest Country',
  CARRIER_NAME:        'Carrier',
  CLASS:               'Service Class',
  DATA_SOURCE:         'Data Source',
  PASSENGERS:          'Passengers',
  FREIGHT:             'Freight (lbs)',
  MAIL:                'Mail (lbs)',
  DISTANCE:            'Distance (miles)',
}

/** Segment data (BTS_SEGMENT rows after enrichment) */
export const PAGE_SEGMENT_COLS = {
  YEAR:                  'Year',
  ORIGIN:                'Origin Code',
  ORIGIN_FULL_LABEL:     'Origin Airport',
  ORIGIN_CITY_NAME:      'Origin City',
  ORIGIN_STATE_NM:       'Origin State',
  ORIGIN_COUNTRY_NAME:   'Origin Country',
  DEST:                  'Dest Code',
  DEST_FULL_LABEL:       'Dest Airport',
  DEST_CITY_NAME:        'Dest City',
  DEST_STATE_NM:         'Dest State',
  DEST_COUNTRY_NAME:     'Dest Country',
  CARRIER_NAME:          'Carrier',
  CLASS:                 'Service Class',
  DATA_SOURCE:           'Data Source',
  DEPARTURES_SCHEDULED:  'Departures Scheduled',
  DEPARTURES_PERFORMED:  'Departures Performed',
  SEATS:                 'Seats',
  PASSENGERS:            'Passengers',
  FREIGHT:               'Freight (lbs)',
  MAIL:                  'Mail (lbs)',
  PAYLOAD:               'Payload Capacity (lbs)',
  DISTANCE:              'Distance (miles)',
  AIRCRAFT_GROUP:        'Aircraft Group',
  SCHED_REPORTED:        'Schedule Reported',
}
