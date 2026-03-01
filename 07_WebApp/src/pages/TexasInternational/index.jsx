import { useMemo, useState } from 'react'
import { Plane, Users, Globe, Award } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, isTxIntl } from '@/lib/aviationHelpers'
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

export default function TexasInternationalPage() {
  const { marketData, segmentData, airportIndex, loading, filters, setFilter, resetFilters } = useAviationStore()
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState(null)

  /* ── base dataset ──────────────────────────────────────────────────── */
  const baseMarket = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isTxIntl)
  }, [marketData])

  const baseSegment = useMemo(() => {
    if (!segmentData) return []
    return segmentData.filter(isTxIntl)
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

  const destCountryOptions = useMemo(() => {
    return [...new Set(baseMarket.map((d) => d.DEST_COUNTRY_NAME))].filter(Boolean).sort()
  }, [baseMarket])

  /* ── filtered datasets ─────────────────────────────────────────────── */
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
    if (filters.destCountry) data = data.filter((d) => d.DEST_COUNTRY_NAME === filters.destCountry)
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
    if (filters.destCountry) data = data.filter((d) => d.DEST_COUNTRY_NAME === filters.destCountry)
    return data
  }, [baseSegment, filters])

  /* ── active filter count & tags ────────────────────────────────────── */
  const activeCount = [
    filters.year, filters.carrier, filters.originAirport, filters.destAirport, filters.destCountry,
  ].filter(Boolean).length

  const activeTags = useMemo(() => {
    const tags = []
    if (filters.year) tags.push({ group: 'Year', label: filters.year, onRemove: () => setFilter('year', '') })
    if (filters.carrier) tags.push({ group: 'Carrier', label: filters.carrier, onRemove: () => setFilter('carrier', '') })
    if (filters.originAirport) tags.push({ group: 'Origin', label: filters.originAirport, onRemove: () => setFilter('originAirport', '') })
    if (filters.destAirport) tags.push({ group: 'Dest', label: filters.destAirport, onRemove: () => setFilter('destAirport', '') })
    if (filters.destCountry) tags.push({ group: 'Country', label: filters.destCountry, onRemove: () => setFilter('destCountry', '') })
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

    const countries = new Set(latest.map((d) => d.DEST_COUNTRY_NAME)).size

    const byCountry = new Map()
    latest.forEach((d) => {
      if (!d.DEST_COUNTRY_NAME) return
      byCountry.set(d.DEST_COUNTRY_NAME, (byCountry.get(d.DEST_COUNTRY_NAME) || 0) + d.PASSENGERS)
    })
    const topCountry = byCountry.size
      ? [...byCountry.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : '\u2014'

    return { pax, paxChange, flights, countries, topCountry, latestYear, prevYear }
  }, [filtered, filteredSegment, latestYear])

  /* ── trends ────────────────────────────────────────────────────────── */
  const trendData = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.PASSENGERS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filtered])

  /* ── top countries (donut) ─────────────────────────────────────────── */
  const topCountries = useMemo(() => {
    const byCountry = new Map()
    filtered.forEach((d) => {
      if (!d.DEST_COUNTRY_NAME) return
      byCountry.set(d.DEST_COUNTRY_NAME, (byCountry.get(d.DEST_COUNTRY_NAME) || 0) + d.PASSENGERS)
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
      <FilterSelect label="Dest Country" value={filters.destCountry} options={destCountryOptions} onChange={(v) => setFilter('destCountry', v)} />
    </>
  )

  const heroSection = (
    <div className="gradient-blue text-white">
      <div className="container-chrome py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas International Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base max-w-2xl">
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
      {/* KPI Cards */}
      <SectionBlock>
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
            label="Countries Served"
            value={stats ? String(stats.countries) : '\u2014'}
            highlight icon={Globe} delay={200}
          />
          <StatCard
            label="Top International Dest"
            value={stats?.topCountry || '\u2014'}
            highlight icon={Award} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Map */}
      <SectionBlock alt>
        <ChartCard title="International Route Map" subtitle="Texas airports with connections to world destinations">
          <AirportMap
            airports={mapAirports}
            routes={mapRoutes}
            topN={15}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            center={[20, -40]}
            zoom={3}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trends + Countries donut */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ChartCard
              title="Texas International Passenger Trends"
              subtitle={`Total passengers departing Texas internationally by year`}
              downloadData={{ summary: { data: trendData, filename: 'tx-intl-passenger-trends' } }}
            >
              <LineChart data={trendData} xKey="year" yKey="value" formatValue={fmtCompact} />
            </ChartCard>
          </div>
          <div>
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
            </ChartCard>
          </div>
        </div>
      </SectionBlock>

      {/* Top Routes */}
      <SectionBlock alt>
        <ChartCard
          title="Top International Routes from Texas"
          subtitle="Total passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'tx-intl-top-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
