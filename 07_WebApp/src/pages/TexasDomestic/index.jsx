import { useMemo, useState, useEffect } from 'react'
import { Plane, Users, MapPin, Award, Building2, TrendingUp } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, fmtLbs, isTxDomestic, isTxToUs, isUsToTx, computeAdherenceData, CLASS_LABELS, CARRIER_TYPE_LABELS, getCarrierType, MAP_METRIC_OPTIONS } from '@/lib/aviationHelpers'
import { useCascadingFilters } from '@/lib/useCascadingFilters'
import { CHART_COLORS } from '@/lib/chartColors'
import { aggregateRoutes, aggregateAirportVolumes } from '@/lib/airportUtils'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import AirportMap from '@/components/maps/AirportMap'
import InsightCallout from '@/components/ui/InsightCallout'

/* ── cascading-filter config (stable refs, defined once) ───────────── */
const buildApplicators = (f) => ({
  year: (data) => f.year.length ? data.filter((d) => f.year.includes(String(d.YEAR))) : data,
  direction: (data) => {
    if (f.direction === 'TX_TO_US') return data.filter(isTxToUs)
    if (f.direction === 'US_TO_TX') return data.filter(isUsToTx)
    return data
  },
  serviceClass: (data) => f.serviceClass.length ? data.filter((d) => f.serviceClass.includes(d.CLASS)) : data,
  carrierType: (data) => f.carrierType ? data.filter((d) => getCarrierType(d) === f.carrierType) : data,
  carrier: (data) => f.carrier.length ? data.filter((d) => f.carrier.includes(d.CARRIER_NAME)) : data,
  originAirport: (data) => f.originAirport.length ? data.filter((d) => f.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN)) : data,
  destAirport: (data) => f.destAirport.length ? data.filter((d) => f.destAirport.includes(d.DEST_FULL_LABEL || d.DEST)) : data,
  originState: (data) => f.originState.length ? data.filter((d) => f.originState.includes(d.ORIGIN_STATE_NM)) : data,
  destState: (data) => f.destState.length ? data.filter((d) => f.destState.includes(d.DEST_STATE_NM)) : data,
})

const EXTRACTORS = {
  year: (d) => String(d.YEAR),
  serviceClass: (d) => d.CLASS,
  carrier: (d) => d.CARRIER_NAME,
  originAirport: (d) => d.ORIGIN_FULL_LABEL || d.ORIGIN,
  destAirport: (d) => d.DEST_FULL_LABEL || d.DEST,
  originState: (d) => d.ORIGIN_STATE_NM,
  destState: (d) => d.DEST_STATE_NM,
}

/* ── COVID annotation for trend charts ─────────────────────────────── */
const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function TexasDomesticPage() {
  const { marketData, segmentData, airportIndex, loading, filters, setFilter, setFilters, resetFilters } = useAviationStore()
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [mapMetric, setMapMetric] = useState('PASSENGERS')
  const mapMetricConfig = MAP_METRIC_OPTIONS.find((m) => m.value === mapMetric)

  // Reset stale direction filter carried from other pages
  useEffect(() => {
    if (filters.direction && filters.direction !== 'TX_TO_US' && filters.direction !== 'US_TO_TX') {
      setFilter('direction', '')
    }
  }, [filters.direction, setFilter])

  /* ── base dataset ──────────────────────────────────────────────────── */
  const baseMarket = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isTxDomestic)
  }, [marketData])

  const baseSegment = useMemo(() => {
    if (!segmentData) return []
    return segmentData.filter(isTxDomestic)
  }, [segmentData])

  /* ── cascading filter pools ────────────────────────────────────────── */
  const pools = useCascadingFilters(baseMarket, buildApplicators, EXTRACTORS, filters, setFilters)

  /* ── filter options (cascading — derived from cross-filtered pools) ── */
  const yearOptions = useMemo(() => {
    return [...new Set(pools.year.map((d) => d.YEAR))].filter(Number.isFinite).sort().map(String)
  }, [pools])

  const serviceClassOptions = useMemo(() => {
    return [...new Set(pools.serviceClass.map((d) => d.CLASS))].filter(Boolean).sort()
      .map((c) => ({ value: c, label: CLASS_LABELS[c] || c }))
  }, [pools])

  const carrierGrouped = useMemo(() => {
    const classMap = new Map()
    pools.carrier.forEach((d) => {
      if (!d.CARRIER_NAME) return
      const cls = d.CLASS || 'Unknown'
      const isUS = d.DATA_SOURCE?.endsWith('U')
      if (!classMap.has(cls)) classMap.set(cls, { us: new Set(), foreign: new Set() })
      const bucket = classMap.get(cls)
      if (isUS) bucket.us.add(d.CARRIER_NAME)
      else bucket.foreign.add(d.CARRIER_NAME)
    })
    return [...classMap.entries()]
      .sort(([a], [b]) => (CLASS_LABELS[a] || a).localeCompare(CLASS_LABELS[b] || b))
      .map(([cls, { us, foreign }]) => {
        const subgroups = []
        if (us.size) subgroups.push({ label: 'U.S. Carriers', options: [...us].sort() })
        if (foreign.size) subgroups.push({ label: 'Foreign Carriers', options: [...foreign].sort() })
        return { label: CLASS_LABELS[cls] || cls, subgroups }
      })
      .filter((g) => g.subgroups.length > 0)
  }, [pools])

  const originStateOptions = useMemo(() => {
    return [...new Set(pools.originState.map((d) => d.ORIGIN_STATE_NM))].filter(Boolean).sort()
  }, [pools])

  const destStateOptions = useMemo(() => {
    return [...new Set(pools.destState.map((d) => d.DEST_STATE_NM))].filter(Boolean).sort()
  }, [pools])

  /* ── grouped airport options (by state, cascading) ──────────────── */
  const originGrouped = useMemo(() => {
    const stateMap = new Map()
    pools.originAirport.forEach((d) => {
      const label = d.ORIGIN_FULL_LABEL || d.ORIGIN
      const state = d.ORIGIN_STATE_NM || 'Unknown'
      if (!label) return
      if (!stateMap.has(state)) stateMap.set(state, new Set())
      stateMap.get(state).add(label)
    })
    return [...stateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, airports]) => ({ label: state, options: [...airports].sort() }))
  }, [pools])

  const destGrouped = useMemo(() => {
    const stateMap = new Map()
    pools.destAirport.forEach((d) => {
      const label = d.DEST_FULL_LABEL || d.DEST
      const state = d.DEST_STATE_NM || 'Unknown'
      if (!label) return
      if (!stateMap.has(state)) stateMap.set(state, new Set())
      stateMap.get(state).add(label)
    })
    return [...stateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, airports]) => ({ label: state, options: [...airports].sort() }))
  }, [pools])

  /* ── filtered datasets ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = baseMarket
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'TX_TO_US') data = data.filter(isTxToUs)
    if (filters.direction === 'US_TO_TX') data = data.filter(isUsToTx)
    if (filters.serviceClass.length) data = data.filter((d) => filters.serviceClass.includes(d.CLASS))
    if (filters.carrierType) data = data.filter((d) => getCarrierType(d) === filters.carrierType)
    if (filters.carrier.length) data = data.filter((d) => filters.carrier.includes(d.CARRIER_NAME))
    if (filters.originAirport.length) {
      data = data.filter((d) => filters.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN))
    }
    if (filters.destAirport.length) {
      data = data.filter((d) => filters.destAirport.includes(d.DEST_FULL_LABEL || d.DEST))
    }
    if (filters.originState.length) data = data.filter((d) => filters.originState.includes(d.ORIGIN_STATE_NM))
    if (filters.destState.length) data = data.filter((d) => filters.destState.includes(d.DEST_STATE_NM))
    return data
  }, [baseMarket, filters])

  const filteredSegment = useMemo(() => {
    let data = baseSegment
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'TX_TO_US') data = data.filter(isTxToUs)
    if (filters.direction === 'US_TO_TX') data = data.filter(isUsToTx)
    if (filters.serviceClass.length) data = data.filter((d) => filters.serviceClass.includes(d.CLASS))
    if (filters.carrierType) data = data.filter((d) => getCarrierType(d) === filters.carrierType)
    if (filters.carrier.length) data = data.filter((d) => filters.carrier.includes(d.CARRIER_NAME))
    if (filters.originAirport.length) {
      data = data.filter((d) => filters.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN))
    }
    if (filters.destAirport.length) {
      data = data.filter((d) => filters.destAirport.includes(d.DEST_FULL_LABEL || d.DEST))
    }
    if (filters.originState.length) data = data.filter((d) => filters.originState.includes(d.ORIGIN_STATE_NM))
    if (filters.destState.length) data = data.filter((d) => filters.destState.includes(d.DEST_STATE_NM))
    return data
  }, [baseSegment, filters])

  /* ── active filter count & tags ────────────────────────────────────── */
  const activeCount =
    filters.year.length + (filters.direction ? 1 : 0) +
    filters.serviceClass.length + (filters.carrierType ? 1 : 0) + filters.carrier.length + filters.originAirport.length +
    filters.destAirport.length + filters.originState.length + filters.destState.length

  const activeTags = useMemo(() => {
    const tags = []
    const push = (key, group, labelFn) =>
      filters[key].forEach((v) =>
        tags.push({ group, label: labelFn ? labelFn(v) : v, onRemove: () => setFilter(key, filters[key].filter((x) => x !== v)) })
      )
    push('year', 'Year')
    if (filters.direction) tags.push({
      group: 'Direction',
      label: filters.direction === 'TX_TO_US' ? 'Texas \u2192 Other States' : 'Other States \u2192 Texas',
      onRemove: () => setFilter('direction', ''),
    })
    push('serviceClass', 'Service Class', (v) => CLASS_LABELS[v] || v)
    if (filters.carrierType) tags.push({
      group: 'Carrier Type',
      label: CARRIER_TYPE_LABELS[filters.carrierType] || filters.carrierType,
      onRemove: () => setFilter('carrierType', ''),
    })
    push('carrier', 'Carrier')
    push('originAirport', 'Origin Airport')
    push('destAirport', 'Dest Airport')
    push('originState', 'Origin State')
    push('destState', 'Dest State')
    return tags
  }, [filters, setFilter])

  /* ── KPI stats ─────────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filtered.length) return null
    return Math.max(...filtered.map((d) => d.YEAR).filter(Number.isFinite))
  }, [filtered])

  const stats = useMemo(() => {
    if (!filtered.length || !latestYear) return null
    const prevYear = latestYear - 1
    const latest = filtered.filter((d) => d.YEAR === latestYear)
    const prev = filtered.filter((d) => d.YEAR === prevYear)
    const pax = latest.reduce((s, d) => s + d.PASSENGERS, 0)
    const paxPrev = prev.reduce((s, d) => s + d.PASSENGERS, 0)
    const paxChange = paxPrev ? (pax - paxPrev) / paxPrev : 0

    const flights = filteredSegment
      .filter((d) => d.YEAR === latestYear)
      .reduce((s, d) => s + d.DEPARTURES_PERFORMED, 0)

    // Counterpart state: for outbound (TX→US), use dest; for inbound (US→TX), use origin
    const counterpartState = (d) => isTxToUs(d) ? d.DEST_STATE_NM : d.ORIGIN_STATE_NM
    const destStates = new Set(latest.map(counterpartState).filter(Boolean)).size

    const byState = new Map()
    latest.forEach((d) => {
      const s = counterpartState(d)
      if (!s) return
      byState.set(s, (byState.get(s) || 0) + d.PASSENGERS)
    })
    const topState = byState.size
      ? [...byState.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : '—'

    return { pax, paxChange, flights, destStates, topState, latestYear, prevYear }
  }, [filtered, filteredSegment, latestYear])

  /* ── trend data ────────────────────────────────────────────────────── */
  const paxTrend = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.PASSENGERS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filtered])

  const flightTrend = useMemo(() => {
    const byYear = new Map()
    filteredSegment.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.DEPARTURES_PERFORMED)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredSegment])

  const freightTrend = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.FREIGHT)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filtered])

  const mailTrend = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.MAIL)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filtered])

  /* ── top connected states ──────────────────────────────────────────── */
  const topStates = useMemo(() => {
    const byState = new Map()
    filtered.forEach((d) => {
      // Counterpart state: for outbound (TX→US), use dest; for inbound (US→TX), use origin
      const state = isTxToUs(d) ? d.DEST_STATE_NM : d.ORIGIN_STATE_NM
      if (!state) return
      byState.set(state, (byState.get(state) || 0) + d.PASSENGERS)
    })
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── top routes (full names) ───────────────────────────────────────── */
  const topRoutes = useMemo(() => {
    const byRoute = new Map()
    filtered.forEach((d) => {
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} → ${d.DEST_FULL_LABEL || d.DEST}`
      byRoute.set(label, (byRoute.get(label) || 0) + d.PASSENGERS)
    })
    return Array.from(byRoute, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  const adherenceData = useMemo(() => computeAdherenceData(filteredSegment), [filteredSegment])

  /* ── storytelling insights ───────────────────────────────────────── */
  const hubInsight = useMemo(() => {
    if (!filtered.length || !latestYear) return null
    const latest = filtered.filter((d) => d.YEAR === latestYear)
    const byAirport = new Map()
    latest.forEach((d) => {
      const txCode = isTxToUs(d) ? d.ORIGIN : d.DEST
      byAirport.set(txCode, (byAirport.get(txCode) || 0) + d.PASSENGERS)
    })
    const sorted = [...byAirport.entries()].sort((a, b) => b[1] - a[1])
    const top2 = sorted.slice(0, 2)
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    if (!total || top2.length < 2) return null
    const share = ((top2[0][1] + top2[1][1]) / total * 100).toFixed(0)
    return { share, airports: [top2[0][0], top2[1][0]] }
  }, [filtered, latestYear])

  const covidRecovery = useMemo(() => {
    if (!filtered.length || !latestYear) return null
    const pax2019 = filtered.filter((d) => d.YEAR === 2019).reduce((s, d) => s + d.PASSENGERS, 0)
    const paxLatest = filtered.filter((d) => d.YEAR === latestYear).reduce((s, d) => s + d.PASSENGERS, 0)
    if (!pax2019) return null
    const pct = ((paxLatest - pax2019) / pax2019 * 100).toFixed(1)
    return { pct: Math.abs(pct), direction: paxLatest >= pax2019 ? 'above' : 'below' }
  }, [filtered, latestYear])

  /* ── map data ──────────────────────────────────────────────────────── */
  const mapDataSource = mapMetricConfig.source === 'segment' ? filteredSegment : filtered

  const mapRoutes = useMemo(
    () => aggregateRoutes(mapDataSource, airportIndex, mapMetricConfig.field),
    [mapDataSource, airportIndex, mapMetricConfig.field]
  )

  const mapAirports = useMemo(() => {
    const volumes = aggregateAirportVolumes(mapDataSource, mapMetricConfig.field)
    const seen = new Set()
    const airports = []
    for (const d of mapDataSource) {
      for (const code of [d.ORIGIN, d.DEST]) {
        if (seen.has(code)) continue
        seen.add(code)
        const info = airportIndex?.get(code)
        if (!info?.lat) continue
        const isOrigin = code === d.ORIGIN
        const stateNm = isOrigin ? d.ORIGIN_STATE_NM : d.DEST_STATE_NM
        airports.push({
          iata: code,
          name: info.name,
          city: isOrigin ? d.ORIGIN_CITY_NAME : d.DEST_CITY_NAME,
          country: stateNm === 'Texas' ? 'Texas' : 'US Other',
          lat: info.lat,
          lng: info.lng,
          volume: volumes.get(code) || 0,
        })
      }
    }
    return airports
  }, [mapDataSource, airportIndex, mapMetricConfig.field])

  /* ── render ────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading aviation data...</p>
        </div>
      </div>
    )
  }

  const filterControls = (
    <>
      <FilterMultiSelect label="Year" value={filters.year} options={yearOptions} onChange={(v) => setFilter('year', v)} />
      <FilterSelect
        label="Direction"
        value={filters.direction}
        options={[
          { value: 'TX_TO_US', label: 'Texas \u2192 Other States' },
          { value: 'US_TO_TX', label: 'Other States \u2192 Texas' },
        ]}
        onChange={(v) => setFilter('direction', v)}
      />
      <FilterMultiSelect label="Service Class" value={filters.serviceClass} options={serviceClassOptions} onChange={(v) => setFilter('serviceClass', v)} />
      <FilterSelect
        label="Carrier Type"
        value={filters.carrierType}
        options={[
          { value: 'U', label: 'Domestic' },
          { value: 'F', label: 'International' },
        ]}
        onChange={(v) => setFilter('carrierType', v)}
      />
      <FilterMultiSelect label="Carrier" value={filters.carrier} groups={carrierGrouped} onChange={(v) => setFilter('carrier', v)} searchable />
      <FilterMultiSelect label="Origin Airport" value={filters.originAirport} groups={originGrouped} onChange={(v) => setFilter('originAirport', v)} searchable />
      <FilterMultiSelect label="Destination Airport" value={filters.destAirport} groups={destGrouped} onChange={(v) => setFilter('destAirport', v)} searchable />
      <FilterMultiSelect label="Origin State" value={filters.originState} options={originStateOptions} onChange={(v) => setFilter('originState', v)} searchable />
      <FilterMultiSelect label="Destination State" value={filters.destState} options={destStateOptions} onChange={(v) => setFilter('destState', v)} searchable />
    </>
  )

  const heroSection = (
    <div className="gradient-blue text-white">
      <div className="container-chrome py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas Domestic Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base">
          Air connections between Texas and other U.S. states using BTS T-100
          data (2015&ndash;{latestYear || '\u2026'}).
        </p>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      hero={heroSection}
      filters={filterControls}
      onResetAll={resetFilters}
      activeCount={activeCount}
      activeTags={activeTags}
    >
      {/* Page Introduction */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-base text-text-secondary leading-relaxed">
            Texas is one of the most air-connected states in the U.S., with dozens of airports
            linking Texans to destinations across all 50 states. But domestic connectivity
            isn&rsquo;t evenly distributed &mdash; a handful of hub airports carry the vast majority
            of traffic. This page examines passenger volumes, flight operations, cargo flows,
            and schedule reliability from 2015 to {latestYear || '\u2026'}.
          </p>
          {hubInsight && (
            <InsightCallout
              finding={`${hubInsight.airports[0]} and ${hubInsight.airports[1]} together account for ${hubInsight.share}% of Texas domestic air passengers (${latestYear}).`}
              context="Disruptions at either hub disproportionately affect statewide connectivity."
              variant="warning"
              icon={Building2}
            />
          )}
          {covidRecovery && (
            <InsightCallout
              finding={`Texas domestic traffic in ${latestYear} is ${covidRecovery.pct}% ${covidRecovery.direction} pre-COVID 2019 levels.`}
              variant={covidRecovery.direction === 'above' ? 'highlight' : 'default'}
              icon={TrendingUp}
            />
          )}
        </div>
      </SectionBlock>

      {/* KPI Cards */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Texas Domestic Passengers (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.pax) : '\u2014'}
            trend={stats?.paxChange > 0 ? 'up' : stats?.paxChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.paxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={Users} delay={0}
          />
          <StatCard
            label={`Texas Domestic Flights (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.flights) : '\u2014'}
            highlight icon={Plane} delay={100}
          />
          <StatCard
            label={`U.S. States & Territories (${latestYear || '\u2014'})`}
            value={stats ? String(stats.destStates) : '\u2014'}
            highlight icon={MapPin} delay={200}
          />
          <StatCard
            label={`Top Connected State (${latestYear || '\u2014'})`}
            value={stats?.topState || '\u2014'}
            highlight icon={Award} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Map */}
      <SectionBlock>
        <ChartCard
          title="Domestic Route Map"
          subtitle="Texas airports with connections to U.S. destinations"
          headerRight={
            <select
              value={mapMetric}
              onChange={(e) => setMapMetric(e.target.value)}
              className="text-base border border-border rounded-md px-2 py-1 bg-surface-primary"
            >
              {MAP_METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          }
        >
          <AirportMap
            airports={mapAirports}
            routes={mapRoutes}
            topN={15}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            formatValue={mapMetricConfig.formatter}
            metricLabel={mapMetricConfig.unit}
            legendItems={[
              { color: '#0056a9', label: 'Texas' },
              { color: '#94c4de', label: 'Other U.S.' },
            ]}
            center={[32, -99]}
            zoom={5}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trends (2x2 grid) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartCard
            title="Passenger Trends"
            subtitle="Total passengers by year"
            downloadData={{ summary: { data: paxTrend, filename: 'tx-domestic-passenger-trends' } }}
          >
            <LineChart data={paxTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
            <p className="text-base text-text-secondary mt-3 italic">The COVID-19 pandemic caused a sharp drop in 2020. Texas domestic traffic has since recovered, with most major corridors exceeding pre-pandemic levels.</p>
          </ChartCard>
          <ChartCard
            title="Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{ summary: { data: flightTrend, filename: 'tx-domestic-flight-trends' } }}
          >
            <LineChart data={flightTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Freight Trends"
            subtitle="Freight volume by year (lbs)"
            downloadData={{ summary: { data: freightTrend, filename: 'tx-domestic-freight-trends' } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Mail Trends"
            subtitle="Mail volume by year (lbs)"
            downloadData={{ summary: { data: mailTrend, filename: 'tx-domestic-mail-trends' } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top States */}
      <SectionBlock>
        <div className="mb-4">
          <p className="text-base text-text-secondary">
            Beyond aggregate trends, the state-level view reveals which corridors drive Texas domestic connectivity.
          </p>
        </div>
        <ChartCard
          title="Top Connected U.S. States"
          subtitle="Counterpart state by passengers (bidirectional totals)"
          downloadData={{ summary: { data: topStates, filename: 'tx-domestic-top-states' } }}
        >
          <BarChart data={topStates} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Top Routes — full width for long airport-name labels */}
      <SectionBlock alt>
        <ChartCard
          title="Top Domestic Routes from Texas"
          subtitle="Total passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'tx-domestic-top-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Operations (segment) */}
      <SectionBlock>
        <div className="mb-4">
          <p className="text-base text-text-secondary">
            Schedule adherence measures how closely airlines&rsquo; actual operations match their filed schedules.
          </p>
        </div>
        <ChartCard
          title="Schedule Adherence"
          subtitle="Departure-weighted: performed vs scheduled (Class F, scheduled service)"
          downloadData={{ summary: { data: adherenceData, filename: 'tx-domestic-schedule-adherence' } }}
        >
          <BarChart data={adherenceData} xKey="label" yKey="value" horizontal color={CHART_COLORS[2]} formatValue={(v) => `${v.toFixed(1)}%`} maxBars={10} animate />
          <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only — foreign carriers are not required to report schedule data to BTS.</p>
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
