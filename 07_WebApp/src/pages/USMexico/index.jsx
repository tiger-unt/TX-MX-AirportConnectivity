import { useMemo, useState } from 'react'
import { Users, PieChart, MapPin, Route, Package } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, fmtLbs, isUsToMx, isMxToUs, computeAdherenceData, CLASS_LABELS, CARRIER_TYPE_LABELS, getCarrierType, MAP_METRIC_OPTIONS } from '@/lib/aviationHelpers'
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
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import AirportMap from '@/components/maps/AirportMap'

const isUsMx = (d) => isUsToMx(d) || isMxToUs(d)

/* ── COVID annotation for trend charts ─────────────────────────────── */
const COVID_ANNOTATION = [{ x: 2020, x2: 2021, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

/* ── cascading-filter config (stable refs, defined once) ───────────── */
const buildApplicators = (f) => ({
  year: (data) => f.year.length ? data.filter((d) => f.year.includes(String(d.YEAR))) : data,
  direction: (data) => {
    if (f.direction === 'US_TO_MX') return data.filter(isUsToMx)
    if (f.direction === 'MX_TO_US') return data.filter(isMxToUs)
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

export default function USMexicoPage() {
  const { marketData, segmentData, airportIndex, loading, filters, setFilter, setFilters, resetFilters } = useAviationStore()
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [mapMetric, setMapMetric] = useState('PASSENGERS')
  const mapMetricConfig = MAP_METRIC_OPTIONS.find((m) => m.value === mapMetric)

  /* ── base dataset ──────────────────────────────────────────────────── */
  const baseMarket = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isUsMx)
  }, [marketData])

  const baseSegment = useMemo(() => {
    if (!segmentData) return []
    return segmentData.filter(isUsMx)
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

  /* ── grouped airport options (by country, cascading) ────────────── */
  const originGrouped = useMemo(() => {
    const countryMap = new Map()
    pools.originAirport.forEach((d) => {
      const label = d.ORIGIN_FULL_LABEL || d.ORIGIN
      const country = d.ORIGIN_COUNTRY_NAME || 'Unknown'
      if (!label) return
      if (!countryMap.has(country)) countryMap.set(country, new Set())
      countryMap.get(country).add(label)
    })
    return [...countryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, airports]) => ({ label: country, options: [...airports].sort() }))
  }, [pools])

  const destGrouped = useMemo(() => {
    const countryMap = new Map()
    pools.destAirport.forEach((d) => {
      const label = d.DEST_FULL_LABEL || d.DEST
      const country = d.DEST_COUNTRY_NAME || 'Unknown'
      if (!label) return
      if (!countryMap.has(country)) countryMap.set(country, new Set())
      countryMap.get(country).add(label)
    })
    return [...countryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, airports]) => ({ label: country, options: [...airports].sort() }))
  }, [pools])

  const originStateOptions = useMemo(() => {
    return [...new Set(
      pools.originState.filter(isUsToMx).map((d) => d.ORIGIN_STATE_NM)
    )].filter(Boolean).sort()
  }, [pools])

  const destStateOptions = useMemo(() => {
    return [...new Set(
      pools.destState.map((d) => d.DEST_STATE_NM)
    )].filter(Boolean).sort()
  }, [pools])

  /* ── filtered dataset ──────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = baseMarket
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'US_TO_MX') data = data.filter(isUsToMx)
    if (filters.direction === 'MX_TO_US') data = data.filter(isMxToUs)
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
    if (filters.direction === 'US_TO_MX') data = data.filter(isUsToMx)
    if (filters.direction === 'MX_TO_US') data = data.filter(isMxToUs)
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

  const adherenceData = useMemo(() => computeAdherenceData(filteredSegment), [filteredSegment])

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
      label: filters.direction === 'US_TO_MX' ? 'U.S. \u2192 Mexico' : 'Mexico \u2192 U.S.',
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

  /* ── KPIs ──────────────────────────────────────────────────────────── */
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

    // TX share
    const usToMxLatest = latest.filter(isUsToMx)
    const txPax = usToMxLatest.filter((d) => d.ORIGIN_STATE_NM === 'Texas').reduce((s, d) => s + d.PASSENGERS, 0)
    const totalUsToMx = usToMxLatest.reduce((s, d) => s + d.PASSENGERS, 0)
    const txShare = totalUsToMx ? (txPax / totalUsToMx * 100).toFixed(1) + '%' : '\u2014'

    // US states serving Mexico
    const stateSet = new Set(usToMxLatest.map((d) => d.ORIGIN_STATE_NM).filter(Boolean))

    // Top route
    const byRoute = new Map()
    latest.forEach((d) => {
      const key = `${d.ORIGIN_FULL_LABEL || d.ORIGIN}–${d.DEST_FULL_LABEL || d.DEST}`
      byRoute.set(key, (byRoute.get(key) || 0) + d.PASSENGERS)
    })
    const topRoute = byRoute.size
      ? [...byRoute.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : '\u2014'

    return { pax, paxChange, txShare, usStates: stateSet.size, topRoute, latestYear, prevYear }
  }, [filtered, latestYear])

  /* ── trends ────────────────────────────────────────────────────────── */
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

  /* ── TX share donut ────────────────────────────────────────────────── */
  const txShareData = useMemo(() => {
    let txTotal = 0, otherTotal = 0
    filtered.filter(isUsToMx).forEach((d) => {
      if (d.ORIGIN_STATE_NM === 'Texas') txTotal += d.PASSENGERS
      else otherTotal += d.PASSENGERS
    })
    if (txTotal === 0 && otherTotal === 0) return []
    return [
      { label: 'Texas', value: txTotal },
      { label: 'Other States', value: otherTotal },
    ]
  }, [filtered])

  /* ── top US states ─────────────────────────────────────────────────── */
  const topStates = useMemo(() => {
    const byState = new Map()
    filtered.filter(isUsToMx).forEach((d) => {
      if (!d.ORIGIN_STATE_NM) return
      byState.set(d.ORIGIN_STATE_NM, (byState.get(d.ORIGIN_STATE_NM) || 0) + d.PASSENGERS)
    })
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── state ranking: passengers vs cargo ───────────────────────────── */
  const stateRankingCargo = useMemo(() => {
    const byState = new Map()
    filtered.filter(isUsToMx).forEach((d) => {
      if (!d.ORIGIN_STATE_NM) return
      byState.set(d.ORIGIN_STATE_NM, (byState.get(d.ORIGIN_STATE_NM) || 0) + d.FREIGHT)
    })
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filtered])

  const stateRankingPax = useMemo(() => {
    const byState = new Map()
    filtered.filter(isUsToMx).forEach((d) => {
      if (!d.ORIGIN_STATE_NM) return
      byState.set(d.ORIGIN_STATE_NM, (byState.get(d.ORIGIN_STATE_NM) || 0) + d.PASSENGERS)
    })
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filtered])

  const txRankStats = useMemo(() => {
    const paxRank = stateRankingPax.findIndex((d) => d.label === 'Texas') + 1
    const cargoRank = stateRankingCargo.findIndex((d) => d.label === 'Texas') + 1
    const totalPax = stateRankingPax.reduce((s, d) => s + d.value, 0)
    const txPax = stateRankingPax.find((d) => d.label === 'Texas')?.value || 0
    const paxPct = totalPax ? (txPax / totalPax * 100).toFixed(1) : '0'
    const totalCargo = stateRankingCargo.reduce((s, d) => s + d.value, 0)
    const txCargo = stateRankingCargo.find((d) => d.label === 'Texas')?.value || 0
    const cargoPct = totalCargo ? (txCargo / totalCargo * 100).toFixed(1) : '0'
    return { paxRank: paxRank || '-', paxPct, cargoRank: cargoRank || '-', cargoPct }
  }, [stateRankingPax, stateRankingCargo])

  /* ── top routes ────────────────────────────────────────────────────── */
  const topRoutes = useMemo(() => {
    const byRoute = new Map()
    filtered.forEach((d) => {
      const airports = [d.ORIGIN, d.DEST].sort()
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} \u2192 ${d.DEST_FULL_LABEL || d.DEST}`
      byRoute.set(label, (byRoute.get(label) || 0) + d.PASSENGERS)
    })
    return Array.from(byRoute, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

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
        airports.push({
          iata: code,
          name: info.name,
          city: isOrigin ? d.ORIGIN_CITY_NAME : d.DEST_CITY_NAME,
          country: isOrigin ? d.ORIGIN_COUNTRY_NAME : d.DEST_COUNTRY_NAME,
          lat: info.lat, lng: info.lng,
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
          { value: 'US_TO_MX', label: 'U.S. \u2192 Mexico' },
          { value: 'MX_TO_US', label: 'Mexico \u2192 U.S.' },
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
          U.S.&ndash;Mexico Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base max-w-2xl">
          National perspective on cross-border air traffic, with Texas&rsquo;s role
          as a gateway (2015&ndash;{latestYear || '\u2026'}).
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
      {/* KPI Cards */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`U.S.–Mexico Passengers (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.pax) : '\u2014'}
            trend={stats?.paxChange > 0 ? 'up' : stats?.paxChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.paxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={Users} delay={0}
          />
          <StatCard
            label="Texas Share"
            value={stats?.txShare || '\u2014'}
            highlight icon={PieChart} delay={100}
          />
          <StatCard
            label="U.S. States Serving Mexico"
            value={stats ? String(stats.usStates) : '\u2014'}
            highlight icon={MapPin} delay={200}
          />
          <StatCard
            label="Top U.S.–Mexico Route"
            value={stats?.topRoute || '\u2014'}
            highlight icon={Route} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Map */}
      <SectionBlock alt>
        <ChartCard
          title="U.S.–Mexico Route Map"
          subtitle="All U.S. airports serving Mexico, Texas airports highlighted"
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
            topN={20}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            formatValue={mapMetricConfig.formatter}
            metricLabel={mapMetricConfig.unit}
            legendItems={[
              { color: '#0056a9', label: 'U.S.' },
              { color: '#df5c16', label: 'Mexico' },
            ]}
            center={[28, -99]}
            zoom={4}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trends (2x2 grid) */}
      <SectionBlock>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartCard
            title="U.S.–Mexico Passenger Trends"
            subtitle="Total passengers by year (both directions)"
            downloadData={{ summary: { data: paxTrend, filename: 'us-mx-passenger-trends' } }}
          >
            <LineChart data={paxTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="U.S.–Mexico Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{ summary: { data: flightTrend, filename: 'us-mx-flight-trends' } }}
          >
            <LineChart data={flightTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="U.S.–Mexico Freight Trends"
            subtitle="Freight volume by year (lbs)"
            downloadData={{ summary: { data: freightTrend, filename: 'us-mx-freight-trends' } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="U.S.–Mexico Mail Trends"
            subtitle="Mail volume by year (lbs)"
            downloadData={{ summary: { data: mailTrend, filename: 'us-mx-mail-trends' } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* TX Share + Top States */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <ChartCard
              title="Texas Share of U.S.–Mexico Air Traffic"
              subtitle="Passengers from U.S. to Mexico (all filtered years)"
              downloadData={{ summary: { data: txShareData, filename: 'tx-share-us-mx' } }}
            >
              <DonutChart data={txShareData} formatValue={fmtCompact} />
            </ChartCard>
          </div>
          <div className="lg:col-span-2">
            <ChartCard
              title="Top U.S. States Serving Mexico"
              subtitle="Total passengers, U.S. \u2192 Mexico (all filtered years)"
              downloadData={{ summary: { data: topStates, filename: 'top-us-states-to-mexico' } }}
            >
              <BarChart data={topStates} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
            </ChartCard>
          </div>
        </div>
      </SectionBlock>

      {/* TX National Ranking: Passengers vs Cargo */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-5">
          <StatCard
            label="TX Passenger Rank"
            value={`#${txRankStats.paxRank} (${txRankStats.paxPct}%)`}
            highlight variant="primary" icon={Users}
          />
          <StatCard
            label="TX Cargo Rank"
            value={`#${txRankStats.cargoRank} (${txRankStats.cargoPct}%)`}
            highlight icon={Package}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="U.S. States by Mexico Passengers"
            subtitle="Top 15 states, U.S. &rarr; Mexico"
            downloadData={{ summary: { data: stateRankingPax, filename: 'us-states-mx-passengers' } }}
          >
            <BarChart data={stateRankingPax} xKey="label" yKey="value" horizontal formatValue={fmtCompact} selectedBar="Texas" />
          </ChartCard>
          <ChartCard
            title="U.S. States by Mexico Cargo"
            subtitle="Top 15 states, U.S. &rarr; Mexico (freight lbs)"
            downloadData={{ summary: { data: stateRankingCargo, filename: 'us-states-mx-cargo' } }}
          >
            <BarChart data={stateRankingCargo} xKey="label" yKey="value" horizontal formatValue={fmtLbs} selectedBar="Texas" />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top Routes */}
      <SectionBlock alt>
        <ChartCard
          title="Top U.S.–Mexico Routes"
          subtitle="Top 10 by passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'top-us-mx-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Operations (segment) */}
      <SectionBlock alt>
        <ChartCard
          title="Schedule Adherence"
          subtitle="Performed vs scheduled departures (Class F, scheduled service)"
          downloadData={{ summary: { data: adherenceData, filename: 'us-mx-schedule-adherence' } }}
        >
          <BarChart data={adherenceData} xKey="label" yKey="value" horizontal color={CHART_COLORS[2]} formatValue={(v) => `${v.toFixed(1)}%`} maxBars={10} animate />
          <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only — foreign carriers are not required to report schedule data to BTS.</p>
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
