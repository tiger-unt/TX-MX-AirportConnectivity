import { useMemo, useState, useEffect } from 'react'
import { Plane, Users, Globe, Award, TrendingUp } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, fmtLbs, isTxIntl, isTxToIntl, isIntlToTx, computeAdherenceData, CLASS_LABELS, CARRIER_TYPE_LABELS, getCarrierType, MAP_METRIC_OPTIONS } from '@/lib/aviationHelpers'
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
import InsightCallout from '@/components/ui/InsightCallout'

/* ── cascading-filter config (stable refs, defined once) ───────────── */
const buildApplicators = (f) => ({
  year: (data) => f.year.length ? data.filter((d) => f.year.includes(String(d.YEAR))) : data,
  direction: (data) => {
    if (f.direction === 'TX_TO_INTL') return data.filter(isTxToIntl)
    if (f.direction === 'INTL_TO_TX') return data.filter(isIntlToTx)
    return data
  },
  serviceClass: (data) => f.serviceClass.length ? data.filter((d) => f.serviceClass.includes(d.CLASS)) : data,
  carrierType: (data) => f.carrierType ? data.filter((d) => getCarrierType(d) === f.carrierType) : data,
  carrier: (data) => f.carrier.length ? data.filter((d) => f.carrier.includes(d.CARRIER_NAME)) : data,
  originAirport: (data) => f.originAirport.length ? data.filter((d) => f.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN)) : data,
  destAirport: (data) => f.destAirport.length ? data.filter((d) => f.destAirport.includes(d.DEST_FULL_LABEL || d.DEST)) : data,
  originCountry: (data) => f.originCountry.length ? data.filter((d) => f.originCountry.includes(d.ORIGIN_COUNTRY_NAME)) : data,
  destCountry: (data) => f.destCountry.length ? data.filter((d) => f.destCountry.includes(d.DEST_COUNTRY_NAME)) : data,
})

const EXTRACTORS = {
  year: (d) => String(d.YEAR),
  serviceClass: (d) => d.CLASS,
  carrier: (d) => d.CARRIER_NAME,
  originAirport: (d) => d.ORIGIN_FULL_LABEL || d.ORIGIN,
  destAirport: (d) => d.DEST_FULL_LABEL || d.DEST,
  originCountry: (d) => d.ORIGIN_COUNTRY_NAME,
  destCountry: (d) => d.DEST_COUNTRY_NAME,
}

/* ── COVID annotation for trend charts ─────────────────────────────── */
const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function TexasInternationalPage() {
  const { marketData, segmentData, airportIndex, loading, filters, setFilter, setFilters, resetFilters } = useAviationStore()
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [mapMetric, setMapMetric] = useState('PASSENGERS')
  const mapMetricConfig = MAP_METRIC_OPTIONS.find((m) => m.value === mapMetric)

  // Reset stale direction filter carried from other pages
  useEffect(() => {
    if (filters.direction && filters.direction !== 'TX_TO_INTL' && filters.direction !== 'INTL_TO_TX') {
      setFilter('direction', '')
    }
  }, [filters.direction, setFilter])

  /* ── base dataset ──────────────────────────────────────────────────── */
  const baseMarket = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isTxIntl)
  }, [marketData])

  const baseSegment = useMemo(() => {
    if (!segmentData) return []
    return segmentData.filter(isTxIntl)
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

  const originCountryOptions = useMemo(() => {
    return [...new Set(pools.originCountry.map((d) => d.ORIGIN_COUNTRY_NAME))].filter(Boolean).sort()
  }, [pools])

  const destCountryOptions = useMemo(() => {
    return [...new Set(pools.destCountry.map((d) => d.DEST_COUNTRY_NAME))].filter(Boolean).sort()
  }, [pools])

  /* ── filtered datasets ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = baseMarket
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'TX_TO_INTL') data = data.filter(isTxToIntl)
    if (filters.direction === 'INTL_TO_TX') data = data.filter(isIntlToTx)
    if (filters.serviceClass.length) data = data.filter((d) => filters.serviceClass.includes(d.CLASS))
    if (filters.carrierType) data = data.filter((d) => getCarrierType(d) === filters.carrierType)
    if (filters.carrier.length) data = data.filter((d) => filters.carrier.includes(d.CARRIER_NAME))
    if (filters.originAirport.length) {
      data = data.filter((d) => filters.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN))
    }
    if (filters.destAirport.length) {
      data = data.filter((d) => filters.destAirport.includes(d.DEST_FULL_LABEL || d.DEST))
    }
    if (filters.originCountry.length) data = data.filter((d) => filters.originCountry.includes(d.ORIGIN_COUNTRY_NAME))
    if (filters.destCountry.length) data = data.filter((d) => filters.destCountry.includes(d.DEST_COUNTRY_NAME))
    return data
  }, [baseMarket, filters])

  const filteredSegment = useMemo(() => {
    let data = baseSegment
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'TX_TO_INTL') data = data.filter(isTxToIntl)
    if (filters.direction === 'INTL_TO_TX') data = data.filter(isIntlToTx)
    if (filters.serviceClass.length) data = data.filter((d) => filters.serviceClass.includes(d.CLASS))
    if (filters.carrierType) data = data.filter((d) => getCarrierType(d) === filters.carrierType)
    if (filters.carrier.length) data = data.filter((d) => filters.carrier.includes(d.CARRIER_NAME))
    if (filters.originAirport.length) {
      data = data.filter((d) => filters.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN))
    }
    if (filters.destAirport.length) {
      data = data.filter((d) => filters.destAirport.includes(d.DEST_FULL_LABEL || d.DEST))
    }
    if (filters.originCountry.length) data = data.filter((d) => filters.originCountry.includes(d.ORIGIN_COUNTRY_NAME))
    if (filters.destCountry.length) data = data.filter((d) => filters.destCountry.includes(d.DEST_COUNTRY_NAME))
    return data
  }, [baseSegment, filters])

  /* ── active filter count & tags ────────────────────────────────────── */
  const activeCount =
    filters.year.length + (filters.direction ? 1 : 0) +
    filters.serviceClass.length + (filters.carrierType ? 1 : 0) + filters.carrier.length + filters.originAirport.length +
    filters.destAirport.length + filters.originCountry.length + filters.destCountry.length

  const activeTags = useMemo(() => {
    const tags = []
    const push = (key, group, labelFn) =>
      filters[key].forEach((v) =>
        tags.push({ group, label: labelFn ? labelFn(v) : v, onRemove: () => setFilter(key, filters[key].filter((x) => x !== v)) })
      )
    push('year', 'Year')
    if (filters.direction) tags.push({
      group: 'Direction',
      label: filters.direction === 'TX_TO_INTL' ? 'Texas \u2192 International' : 'International \u2192 Texas',
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
    push('originCountry', 'Origin Country')
    push('destCountry', 'Dest Country')
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

    const flights = filteredSegment
      .filter((d) => d.YEAR === latestYear)
      .reduce((s, d) => s + d.DEPARTURES_PERFORMED, 0)

    // For bidirectional data, get the foreign (non-US) country from each record:
    // TX→Intl: foreign country = DEST_COUNTRY_NAME
    // Intl→TX: foreign country = ORIGIN_COUNTRY_NAME
    const foreignCountry = (d) =>
      isTxToIntl(d) ? d.DEST_COUNTRY_NAME : d.ORIGIN_COUNTRY_NAME

    const countries = new Set(latest.map(foreignCountry).filter(Boolean)).size

    const byCountry = new Map()
    latest.forEach((d) => {
      const country = foreignCountry(d)
      if (!country) return
      byCountry.set(country, (byCountry.get(country) || 0) + d.PASSENGERS)
    })
    const topCountry = byCountry.size
      ? [...byCountry.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : '\u2014'

    return { pax, paxChange, flights, countries, topCountry, latestYear, prevYear }
  }, [filtered, filteredSegment, latestYear])

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

  /* ── top countries (donut) ─────────────────────────────────────────── */
  const topCountries = useMemo(() => {
    const foreignCountry = (d) =>
      isTxToIntl(d) ? d.DEST_COUNTRY_NAME : d.ORIGIN_COUNTRY_NAME
    const byCountry = new Map()
    filtered.forEach((d) => {
      const country = foreignCountry(d)
      if (!country) return
      byCountry.set(country, (byCountry.get(country) || 0) + d.PASSENGERS)
    })
    return Array.from(byCountry, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── top routes ────────────────────────────────────────────────────── */
  const topRoutes = useMemo(() => {
    const byRoute = new Map()
    filtered.forEach((d) => {
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} \u2192 ${d.DEST_FULL_LABEL || d.DEST}`
      byRoute.set(label, (byRoute.get(label) || 0) + d.PASSENGERS)
    })
    return Array.from(byRoute, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  const adherenceData = useMemo(() => computeAdherenceData(filteredSegment), [filteredSegment])

  /* ── storytelling insights ───────────────────────────────────────── */
  const mexicoShareInsight = useMemo(() => {
    if (!topCountries.length) return null
    const mexicoRow = topCountries.find((d) => d.label === 'Mexico')
    if (!mexicoRow) return null
    const total = topCountries.reduce((s, d) => s + d.value, 0)
    const pct = total ? (mexicoRow.value / total * 100).toFixed(0) : null
    return pct ? { pct } : null
  }, [topCountries])

  const growthInsight = useMemo(() => {
    if (paxTrend.length < 2) return null
    const first = paxTrend[0]
    const last = paxTrend[paxTrend.length - 1]
    if (!first?.value) return null
    const pct = ((last.value - first.value) / first.value * 100).toFixed(0)
    return { pct: Math.abs(pct), startYear: first.year, endYear: last.year, direction: last.value >= first.value ? 'grown' : 'declined' }
  }, [paxTrend])

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
          { value: 'TX_TO_INTL', label: 'Texas \u2192 International' },
          { value: 'INTL_TO_TX', label: 'International \u2192 Texas' },
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
      <FilterMultiSelect label="Origin Country" value={filters.originCountry} options={originCountryOptions} onChange={(v) => setFilter('originCountry', v)} searchable />
      <FilterMultiSelect label="Destination Country" value={filters.destCountry} options={destCountryOptions} onChange={(v) => setFilter('destCountry', v)} searchable />
    </>
  )

  const heroSection = (
    <div className="gradient-blue text-white">
      <div className="container-chrome py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas International Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base">
          Texas&rsquo;s air connections to the world using BTS T-100 data
          (2015&ndash;{latestYear || '\u2026'}).
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
            Texas&rsquo;s three major hubs &mdash; Dallas/Fort Worth, Houston Intercontinental,
            and Austin &mdash; operate extensive international networks reaching Latin America,
            Europe, and Asia. Yet one country dominates: Mexico accounts for the largest share
            of Texas&rsquo;s international air traffic by a wide margin. This page surveys
            Texas&rsquo;s global air connections from 2015 to {latestYear || '\u2026'}.
          </p>
          <p className="text-base text-text-secondary/70 leading-relaxed italic">
            Scope: all non-U.S. destinations, including Mexico. For a dedicated deep-dive into
            the Texas&ndash;Mexico corridor, see the <a href="#/texas-mexico" className="text-brand-blue underline hover:text-brand-blue-dark">Texas&ndash;Mexico</a> page.
          </p>
          {mexicoShareInsight && (
            <InsightCallout
              finding={`Mexico accounts for roughly ${mexicoShareInsight.pct}% of Texas international passenger traffic.`}
              context="No other single country comes close in volume, reflecting deep economic and cultural ties."
              variant="default"
              icon={Globe}
            />
          )}
          {growthInsight && (
            <InsightCallout
              finding={`Texas international passenger traffic has ${growthInsight.direction} ${growthInsight.pct}% between ${growthInsight.startYear} and ${growthInsight.endYear}.`}
              variant={growthInsight.direction === 'grown' ? 'highlight' : 'default'}
              icon={TrendingUp}
            />
          )}
        </div>
      </SectionBlock>

      {/* KPI Cards */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Texas Intl Passengers (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.pax) : '\u2014'}
            trend={stats?.paxChange > 0 ? 'up' : stats?.paxChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.paxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={Users} delay={0}
          />
          <StatCard
            label={`Texas Intl Flights (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.flights) : '\u2014'}
            highlight icon={Plane} delay={100}
          />
          <StatCard
            label={`Countries Served (${latestYear || '\u2014'})`}
            value={stats ? String(stats.countries) : '\u2014'}
            highlight icon={Globe} delay={200}
          />
          <StatCard
            label={`Top International Dest (${latestYear || '\u2014'})`}
            value={stats?.topCountry || '\u2014'}
            highlight icon={Award} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Map */}
      <SectionBlock>
        <ChartCard
          title="International Route Map"
          subtitle="Texas airports with connections to world destinations"
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
              { color: '#df5c16', label: 'Mexico' },
              { color: '#5a7a7a', label: 'Other' },
            ]}
            center={[25, -90]}
            zoom={4}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trends (2x2 grid) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartCard
            title="Passenger Trends"
            subtitle="Total passengers by year"
            downloadData={{ summary: { data: paxTrend, filename: 'tx-intl-passenger-trends' } }}
          >
            <LineChart data={paxTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{ summary: { data: flightTrend, filename: 'tx-intl-flight-trends' } }}
          >
            <LineChart data={flightTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Freight Trends"
            subtitle="Freight volume by year (lbs)"
            downloadData={{ summary: { data: freightTrend, filename: 'tx-intl-freight-trends' } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Mail Trends"
            subtitle="Mail volume by year (lbs)"
            downloadData={{ summary: { data: mailTrend, filename: 'tx-intl-mail-trends' } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top International Destinations */}
      <SectionBlock>
        <ChartCard
          title="Top International Destinations"
          subtitle="From Texas (all filtered years)"
          downloadData={{ summary: { data: topCountries, filename: 'tx-top-intl-destinations' } }}
        >
          <DonutChart
            data={topCountries}
            formatValue={fmtCompact}
            onSliceClick={(d) => {
              if (!d) return setSelectedCountry(null)
              setSelectedCountry((prev) => (prev === d.label ? null : d.label))
            }}
            selectedSlice={selectedCountry}
          />
          <p className="text-base text-text-secondary mt-3 italic">Mexico accounts for the single largest share of Texas international passengers &mdash; more than the next several countries combined.</p>
        </ChartCard>
      </SectionBlock>

      {/* Top Routes */}
      <SectionBlock alt>
        <ChartCard
          title="Top International Routes"
          subtitle="Total passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'tx-intl-top-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Operations (segment) */}
      <SectionBlock>
        <ChartCard
          title="Schedule Adherence"
          subtitle="Departure-weighted: performed vs scheduled (Class F, scheduled service)"
          downloadData={{ summary: { data: adherenceData, filename: 'tx-intl-schedule-adherence' } }}
        >
          <BarChart data={adherenceData} xKey="label" yKey="value" horizontal color={CHART_COLORS[2]} formatValue={(v) => `${v.toFixed(1)}%`} maxBars={10} animate />
          <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only — foreign carriers are not required to report schedule data to BTS.</p>
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
