import { useMemo, useState } from 'react'
import { Users, PieChart, MapPin, Route } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, isUsToMx, isMxToUs, computeAdherenceData } from '@/lib/aviationHelpers'
import { CHART_COLORS } from '@/lib/chartColors'
import { aggregateRoutes, aggregateAirportVolumes } from '@/lib/airportUtils'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import AirportMap from '@/components/maps/AirportMap'

const isUsMx = (d) => isUsToMx(d) || isMxToUs(d)

export default function USMexicoPage() {
  const { marketData, segmentData, airportIndex, loading, filters, setFilter, resetFilters } = useAviationStore()
  const [selectedAirport, setSelectedAirport] = useState(null)

  /* ── base dataset ──────────────────────────────────────────────────── */
  const baseMarket = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isUsMx)
  }, [marketData])

  const baseSegment = useMemo(() => {
    if (!segmentData) return []
    return segmentData.filter(isUsMx)
  }, [segmentData])

  /* ── filter options ────────────────────────────────────────────────── */
  const yearOptions = useMemo(() => {
    return [...new Set(baseMarket.map((d) => d.YEAR))].filter(Number.isFinite).sort().map(String)
  }, [baseMarket])

  const carrierOptions = useMemo(() => {
    return [...new Set(baseMarket.map((d) => d.CARRIER_NAME))].filter(Boolean).sort()
  }, [baseMarket])

  const originOptions = useMemo(() => {
    return [...new Set(baseMarket.map((d) => d.ORIGIN_FULL_LABEL || d.ORIGIN))].filter(Boolean).sort()
  }, [baseMarket])

  const destOptions = useMemo(() => {
    return [...new Set(baseMarket.map((d) => d.DEST_FULL_LABEL || d.DEST))].filter(Boolean).sort()
  }, [baseMarket])

  const originStateOptions = useMemo(() => {
    return [...new Set(
      baseMarket.filter(isUsToMx).map((d) => d.ORIGIN_STATE_NM)
    )].filter(Boolean).sort()
  }, [baseMarket])

  /* ── filtered dataset ──────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = baseMarket
    if (filters.year) data = data.filter((d) => String(d.YEAR) === filters.year)
    if (filters.carrier) data = data.filter((d) => d.CARRIER_NAME === filters.carrier)
    if (filters.originAirport) {
      data = data.filter((d) => (d.ORIGIN_FULL_LABEL || d.ORIGIN) === filters.originAirport)
    }
    if (filters.destAirport) {
      data = data.filter((d) => (d.DEST_FULL_LABEL || d.DEST) === filters.destAirport)
    }
    if (filters.originState) {
      data = data.filter((d) => d.ORIGIN_STATE_NM === filters.originState)
    }
    return data
  }, [baseMarket, filters])

  const filteredSegment = useMemo(() => {
    let data = baseSegment
    if (filters.year) data = data.filter((d) => String(d.YEAR) === filters.year)
    if (filters.carrier) data = data.filter((d) => d.CARRIER_NAME === filters.carrier)
    if (filters.originAirport) {
      data = data.filter((d) => (d.ORIGIN_FULL_LABEL || d.ORIGIN) === filters.originAirport)
    }
    if (filters.destAirport) {
      data = data.filter((d) => (d.DEST_FULL_LABEL || d.DEST) === filters.destAirport)
    }
    if (filters.originState) {
      data = data.filter((d) => d.ORIGIN_STATE_NM === filters.originState)
    }
    return data
  }, [baseSegment, filters])

  const adherenceData = useMemo(() => computeAdherenceData(filteredSegment), [filteredSegment])

  /* ── active filter count & tags ────────────────────────────────────── */
  const activeCount = [
    filters.year, filters.carrier, filters.originAirport, filters.destAirport, filters.originState,
  ].filter(Boolean).length

  const activeTags = useMemo(() => {
    const tags = []
    if (filters.year) tags.push({ group: 'Year', label: filters.year, onRemove: () => setFilter('year', '') })
    if (filters.carrier) tags.push({ group: 'Carrier', label: filters.carrier, onRemove: () => setFilter('carrier', '') })
    if (filters.originAirport) tags.push({ group: 'Origin', label: filters.originAirport, onRemove: () => setFilter('originAirport', '') })
    if (filters.destAirport) tags.push({ group: 'Dest', label: filters.destAirport, onRemove: () => setFilter('destAirport', '') })
    if (filters.originState) tags.push({ group: 'Origin State', label: filters.originState, onRemove: () => setFilter('originState', '') })
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
  const trendData = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.PASSENGERS)
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
  const mapRoutes = useMemo(() => aggregateRoutes(filtered, airportIndex), [filtered, airportIndex])

  const mapAirports = useMemo(() => {
    const volumes = aggregateAirportVolumes(filtered)
    const seen = new Set()
    const airports = []
    for (const d of filtered) {
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
  }, [filtered, airportIndex])

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
      <FilterSelect label="Year" value={filters.year} options={yearOptions} onChange={(v) => setFilter('year', v)} />
      <FilterSelect label="Carrier" value={filters.carrier} options={carrierOptions} onChange={(v) => setFilter('carrier', v)} />
      <FilterSelect label="Origin Airport" value={filters.originAirport} options={originOptions} onChange={(v) => setFilter('originAirport', v)} />
      <FilterSelect label="Dest Airport" value={filters.destAirport} options={destOptions} onChange={(v) => setFilter('destAirport', v)} />
      <FilterSelect label="Origin State" value={filters.originState} options={originStateOptions} onChange={(v) => setFilter('originState', v)} />
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
        <ChartCard title="U.S.–Mexico Route Map" subtitle="All U.S. airports serving Mexico, Texas airports highlighted">
          <AirportMap
            airports={mapAirports}
            routes={mapRoutes}
            topN={20}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            center={[28, -99]}
            zoom={4}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trends */}
      <SectionBlock>
        <ChartCard
          title="U.S.–Mexico Passenger Trends"
          subtitle="Total passengers by year (both directions)"
          downloadData={{ summary: { data: trendData, filename: 'us-mx-passenger-trends' } }}
        >
          <LineChart data={trendData} xKey="year" yKey="value" formatValue={fmtCompact} />
        </ChartCard>
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

      {/* Top Routes */}
      <SectionBlock>
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
          <p className="text-xs text-text-secondary mt-3 italic">Note: U.S. carriers only — foreign carriers are not required to report schedule data to BTS.</p>
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
