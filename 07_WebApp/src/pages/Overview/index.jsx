import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plane, Users, ArrowRightLeft, BarChart3, Package } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'

/* ── helpers ─────────────────────────────────────────────────────── */

/** Compact number formatter for chart axes and values */
const fmtCompact = (v) => {
  if (v == null || isNaN(v)) return '0'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toFixed(0)}`
}

const fmtLbs = (v) => {
  if (v == null || isNaN(v)) return '0 lbs'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B lbs`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M lbs`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K lbs`
  return `${sign}${abs.toFixed(0)} lbs`
}

/** Is this record a TX origin going to any destination? */
const isTxOrigin = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'United States' && d.ORIGIN_STATE_NM === 'Texas'

/** Is this record TX → Mexico? */
const isTxToMx = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME === 'Mexico'

/** Is this record Mexico → TX? */
const isMxToTx = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'Mexico' &&
  d.DEST_COUNTRY_NAME === 'United States' && d.DEST_STATE_NM === 'Texas'

/** Is this record any US → Mexico? */
const isUsToMx = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'United States' && d.DEST_COUNTRY_NAME === 'Mexico'

/** Is this record TX origin going internationally? */
const isTxIntl = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME !== 'United States'


export default function OverviewPage() {
  const { marketData, segmentData, loading, filters, setFilter, resetFilters } = useAviationStore()
  const navigate = useNavigate()
  const [selectedCountry, setSelectedCountry] = useState(null)

  /* ── filter options ───────────────────────────────────────────────── */
  const yearOptions = useMemo(() => {
    if (!marketData) return []
    const years = [...new Set(marketData.map((d) => d.YEAR))].filter(Number.isFinite).sort()
    return years.map(String)
  }, [marketData])

  const carrierOptions = useMemo(() => {
    if (!marketData) return []
    return [...new Set(marketData.map((d) => d.CARRIER_NAME))].filter(Boolean).sort()
  }, [marketData])

  const originOptions = useMemo(() => {
    if (!marketData) return []
    return [...new Set(marketData.map((d) => d.ORIGIN))].filter(Boolean).sort()
  }, [marketData])

  const destOptions = useMemo(() => {
    if (!marketData) return []
    return [...new Set(marketData.map((d) => d.DEST))].filter(Boolean).sort()
  }, [marketData])

  /* ── filtered datasets ────────────────────────────────────────────── */
  const filteredMarket = useMemo(() => {
    if (!marketData) return []
    let data = marketData
    if (filters.year) data = data.filter((d) => String(d.YEAR) === filters.year)
    if (filters.direction === 'TX_TO_MX') data = data.filter(isTxToMx)
    if (filters.direction === 'MX_TO_TX') data = data.filter(isMxToTx)
    if (filters.carrier) data = data.filter((d) => d.CARRIER_NAME === filters.carrier)
    if (filters.originAirport) data = data.filter((d) => d.ORIGIN === filters.originAirport)
    if (filters.destAirport) data = data.filter((d) => d.DEST === filters.destAirport)
    return data
  }, [marketData, filters])

  const filteredSegment = useMemo(() => {
    if (!segmentData) return []
    let data = segmentData
    if (filters.year) data = data.filter((d) => String(d.YEAR) === filters.year)
    if (filters.direction === 'TX_TO_MX') data = data.filter(isTxToMx)
    if (filters.direction === 'MX_TO_TX') data = data.filter(isMxToTx)
    if (filters.carrier) data = data.filter((d) => d.CARRIER_NAME === filters.carrier)
    if (filters.originAirport) data = data.filter((d) => d.ORIGIN === filters.originAirport)
    if (filters.destAirport) data = data.filter((d) => d.DEST === filters.destAirport)
    return data
  }, [segmentData, filters])

  /* ── active filter count & tags ───────────────────────────────────── */
  const activeCount = [
    filters.year, filters.direction, filters.carrier,
    filters.originAirport, filters.destAirport,
  ].filter(Boolean).length

  const activeTags = useMemo(() => {
    const tags = []
    if (filters.year) tags.push({ group: 'Year', label: filters.year, onRemove: () => setFilter('year', '') })
    if (filters.direction) tags.push({
      group: 'Direction',
      label: filters.direction === 'TX_TO_MX' ? 'TX → Mexico' : 'Mexico → TX',
      onRemove: () => setFilter('direction', ''),
    })
    if (filters.carrier) tags.push({ group: 'Carrier', label: filters.carrier, onRemove: () => setFilter('carrier', '') })
    if (filters.originAirport) tags.push({ group: 'Origin', label: filters.originAirport, onRemove: () => setFilter('originAirport', '') })
    if (filters.destAirport) tags.push({ group: 'Dest', label: filters.destAirport, onRemove: () => setFilter('destAirport', '') })
    return tags
  }, [filters, setFilter])

  /* ── derived data ───────────────────────────────────────────────── */

  const latestYear = useMemo(() => {
    if (!filteredMarket.length) return null
    return Math.max(...filteredMarket.map((d) => d.YEAR).filter(Number.isFinite))
  }, [filteredMarket])

  /* ── KPI stats ──────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!filteredMarket.length || !filteredSegment.length || !latestYear) return null
    const prevYear = latestYear - 1

    // Market data KPIs
    const txLatest = filteredMarket.filter((d) => d.YEAR === latestYear && isTxOrigin(d))
    const txPrev = filteredMarket.filter((d) => d.YEAR === prevYear && isTxOrigin(d))
    const txPax = txLatest.reduce((s, d) => s + d.PASSENGERS, 0)
    const txPaxPrev = txPrev.reduce((s, d) => s + d.PASSENGERS, 0)
    const txPaxChange = txPaxPrev ? (txPax - txPaxPrev) / txPaxPrev : 0

    const txMxLatest = filteredMarket.filter((d) => d.YEAR === latestYear && (isTxToMx(d) || isMxToTx(d)))
    const txMxPrev = filteredMarket.filter((d) => d.YEAR === prevYear && (isTxToMx(d) || isMxToTx(d)))
    const txMxPax = txMxLatest.reduce((s, d) => s + d.PASSENGERS, 0)
    const txMxPaxPrev = txMxPrev.reduce((s, d) => s + d.PASSENGERS, 0)
    const txMxPaxChange = txMxPaxPrev ? (txMxPax - txMxPaxPrev) / txMxPaxPrev : 0

    // Segment data KPIs (flight counts)
    const txFlightsLatest = filteredSegment
      .filter((d) => d.YEAR === latestYear && isTxOrigin(d))
      .reduce((s, d) => s + d.DEPARTURES_PERFORMED, 0)

    const txMxFlightsLatest = filteredSegment
      .filter((d) => d.YEAR === latestYear && (isTxToMx(d) || isMxToTx(d)))
      .reduce((s, d) => s + d.DEPARTURES_PERFORMED, 0)

    const txMxMail = txMxLatest.reduce((s, d) => s + d.MAIL, 0)

    return {
      txPax, txPaxChange, txFlightsLatest,
      txMxPax, txMxPaxChange, txMxFlightsLatest, txMxMail,
      latestYear, prevYear,
    }
  }, [filteredMarket, filteredSegment, latestYear])

  /* ── Texas passenger trends by year ────────────────────────────── */
  const txTrendData = useMemo(() => {
    if (!filteredMarket.length) return []
    const byYear = new Map()
    filteredMarket.forEach((d) => {
      if (!isTxOrigin(d)) return
      if (!byYear.has(d.YEAR)) byYear.set(d.YEAR, 0)
      byYear.set(d.YEAR, byYear.get(d.YEAR) + d.PASSENGERS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredMarket])

  /* ── Top destination countries from TX ─────────────────────────── */
  const topCountries = useMemo(() => {
    if (!filteredMarket.length) return []
    const byCountry = new Map()
    filteredMarket.forEach((d) => {
      if (!isTxOrigin(d) || d.DEST_COUNTRY_NAME === 'United States') return
      const c = d.DEST_COUNTRY_NAME
      if (!byCountry.has(c)) byCountry.set(c, 0)
      byCountry.set(c, byCountry.get(c) + d.PASSENGERS)
    })
    return Array.from(byCountry, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredMarket])

  /* ── TX–MX passenger trends (bidirectional) ────────────────────── */
  const txMxTrendData = useMemo(() => {
    if (!filteredMarket.length) return []
    const byYearDir = new Map()
    filteredMarket.forEach((d) => {
      let dir = null
      if (isTxToMx(d)) dir = 'TX → Mexico'
      else if (isMxToTx(d)) dir = 'Mexico → TX'
      if (!dir) return
      const key = `${d.YEAR}|${dir}`
      if (!byYearDir.has(key)) byYearDir.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYearDir.get(key).value += d.PASSENGERS
    })
    return Array.from(byYearDir.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredMarket])

  /* ── Top TX-MX routes ──────────────────────────────────────────── */
  const topRoutes = useMemo(() => {
    if (!filteredMarket.length) return []
    const byRoute = new Map()
    filteredMarket.forEach((d) => {
      if (!isTxToMx(d) && !isMxToTx(d)) return
      const airports = [d.ORIGIN, d.DEST].sort()
      const routeKey = `${airports[0]}–${airports[1]}`
      if (!byRoute.has(routeKey)) byRoute.set(routeKey, 0)
      byRoute.set(routeKey, byRoute.get(routeKey) + d.PASSENGERS)
    })
    return Array.from(byRoute, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredMarket])

  /* ── TX share of US→MX traffic ─────────────────────────────────── */
  const txShareData = useMemo(() => {
    if (!filteredMarket.length) return []
    let txTotal = 0
    let otherTotal = 0
    filteredMarket.forEach((d) => {
      if (isUsToMx(d)) {
        if (d.ORIGIN_STATE_NM === 'Texas') txTotal += d.PASSENGERS
        else otherTotal += d.PASSENGERS
      }
    })
    if (txTotal === 0 && otherTotal === 0) return []
    return [
      { label: 'Texas', value: txTotal },
      { label: 'Other States', value: otherTotal },
    ]
  }, [filteredMarket])

  /* ── Top US states serving Mexico ──────────────────────────────── */
  const topStates = useMemo(() => {
    if (!filteredMarket.length) return []
    const byState = new Map()
    filteredMarket.forEach((d) => {
      if (!isUsToMx(d)) return
      const st = d.ORIGIN_STATE_NM
      if (!st) return
      if (!byState.has(st)) byState.set(st, 0)
      byState.set(st, byState.get(st) + d.PASSENGERS)
    })
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredMarket])

  /* ── TX-MX flight trends (segment) ─────────────────────────────── */
  const txMxFlightTrend = useMemo(() => {
    if (!filteredSegment.length) return []
    const byYearDir = new Map()
    filteredSegment.forEach((d) => {
      let dir = null
      if (isTxToMx(d)) dir = 'TX → Mexico'
      else if (isMxToTx(d)) dir = 'Mexico → TX'
      if (!dir) return
      const key = `${d.YEAR}|${dir}`
      if (!byYearDir.has(key)) byYearDir.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYearDir.get(key).value += d.DEPARTURES_PERFORMED
    })
    return Array.from(byYearDir.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredSegment])

  /* ── TX-MX mail trends (bidirectional) ───────────────────────────── */
  const txMxMailTrend = useMemo(() => {
    if (!filteredMarket.length) return []
    const byYearDir = new Map()
    filteredMarket.forEach((d) => {
      let dir = null
      if (isTxToMx(d)) dir = 'TX → Mexico'
      else if (isMxToTx(d)) dir = 'Mexico → TX'
      if (!dir) return
      const key = `${d.YEAR}|${dir}`
      if (!byYearDir.has(key)) byYearDir.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYearDir.get(key).value += d.MAIL
    })
    return Array.from(byYearDir.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredMarket])

  /* ── render ─────────────────────────────────────────────────────── */

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
      <FilterSelect
        label="Year"
        value={filters.year}
        options={yearOptions}
        onChange={(v) => setFilter('year', v)}
      />
      <FilterSelect
        label="Direction"
        value={filters.direction}
        options={[
          { value: 'TX_TO_MX', label: 'TX → Mexico' },
          { value: 'MX_TO_TX', label: 'Mexico → TX' },
        ]}
        onChange={(v) => setFilter('direction', v)}
      />
      <FilterSelect
        label="Carrier"
        value={filters.carrier}
        options={carrierOptions}
        onChange={(v) => setFilter('carrier', v)}
      />
      <FilterSelect
        label="Origin Airport"
        value={filters.originAirport}
        options={originOptions}
        onChange={(v) => setFilter('originAirport', v)}
      />
      <FilterSelect
        label="Dest Airport"
        value={filters.destAirport}
        options={destOptions}
        onChange={(v) => setFilter('destAirport', v)}
      />
    </>
  )

  const heroSection = (
    <div className="gradient-blue text-white">
      <div className="container-chrome py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas–Mexico Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base max-w-2xl">
          Analysis of air carrier passenger markets and flight operations between
          Texas and Mexico using BTS T-100 data (2015–{latestYear || '…'}).
          Covers market-level passenger demand and segment-level flight operations.
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
      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`TX Passengers (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.txPax) : '—'}
            trend={stats?.txPaxChange > 0 ? 'up' : 'down'}
            trendLabel={stats ? `${(stats.txPaxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight
            variant="primary"
            icon={Users}
            delay={0}
          />
          <StatCard
            label={`TX Flights (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.txFlightsLatest) : '—'}
            highlight
            icon={Plane}
            delay={100}
          />
          <StatCard
            label={`TX–MX Passengers (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.txMxPax) : '—'}
            trend={stats?.txMxPaxChange > 0 ? 'up' : 'down'}
            trendLabel={stats ? `${(stats.txMxPaxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight
            icon={ArrowRightLeft}
            delay={200}
          />
          <StatCard
            label={`TX–MX Flights (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.txMxFlightsLatest) : '—'}
            highlight
            icon={BarChart3}
            delay={300}
          />
          <StatCard
            label={`TX–MX Mail (${latestYear || '—'})`}
            value={stats ? fmtLbs(stats.txMxMail) : '—'}
            highlight
            icon={Package}
            delay={400}
          />
        </div>
      </SectionBlock>

      {/* ── Texas Aviation Trends ─────────────────────────────────── */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ChartCard
              title="Texas Passenger Trends"
              subtitle={`Total passengers departing Texas by year (2015–${latestYear || '…'})`}
              downloadData={{
                summary: { data: txTrendData, filename: 'tx-passenger-trends' },
              }}
            >
              <LineChart
                data={txTrendData}
                xKey="year"
                yKey="value"
                formatValue={fmtCompact}
              />
            </ChartCard>
          </div>
          <div>
            <ChartCard
              title="Top International Destinations"
              subtitle="From Texas (all years)"
              downloadData={{
                summary: { data: topCountries, filename: 'tx-top-intl-destinations' },
              }}
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

      {/* ── Texas–Mexico Connection ───────────────────────────────── */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard
            title="TX–Mexico Passenger Trends"
            subtitle="Bidirectional passenger flows by year"
            downloadData={{
              summary: { data: txMxTrendData, filename: 'tx-mx-passenger-trends' },
            }}
          >
            <LineChart
              data={txMxTrendData}
              xKey="year"
              yKey="value"
              seriesKey="Direction"
              formatValue={fmtCompact}
            />
          </ChartCard>
          <ChartCard
            title="TX–Mexico Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{
              summary: { data: txMxFlightTrend, filename: 'tx-mx-flight-trends' },
            }}
          >
            <LineChart
              data={txMxFlightTrend}
              xKey="year"
              yKey="value"
              seriesKey="Direction"
              formatValue={fmtCompact}
            />
          </ChartCard>
          <ChartCard
            title="TX–Mexico Mail Trends"
            subtitle="Bidirectional mail volume by year"
            downloadData={{
              summary: { data: txMxMailTrend, filename: 'tx-mx-mail-trends' },
            }}
          >
            <LineChart
              data={txMxMailTrend}
              xKey="year"
              yKey="value"
              seriesKey="Direction"
              formatValue={fmtLbs}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Top Routes ────────────────────────────────────────────── */}
      <SectionBlock alt>
        <ChartCard
          title="Top 10 TX–Mexico Routes by Passengers"
          subtitle="All years combined (market data)"
          headerRight={
            <button
              onClick={() => navigate('/market')}
              className="text-base text-brand-blue hover:text-brand-blue-dark font-medium transition-colors"
            >
              Explore market &rarr;
            </button>
          }
          downloadData={{
            summary: { data: topRoutes, filename: 'top-tx-mx-routes' },
          }}
        >
          <BarChart
            data={topRoutes}
            xKey="label"
            yKey="value"
            horizontal
            formatValue={fmtCompact}
          />
        </ChartCard>
      </SectionBlock>

      {/* ── Mexico's US Perspective ───────────────────────────────── */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <ChartCard
              title="Texas Share of U.S.–Mexico Air Traffic"
              subtitle="Passengers from U.S. to Mexico (all years)"
              downloadData={{
                summary: { data: txShareData, filename: 'tx-share-us-mx' },
              }}
            >
              <DonutChart
                data={txShareData}
                formatValue={fmtCompact}
              />
            </ChartCard>
          </div>
          <div className="lg:col-span-2">
            <ChartCard
              title="Top U.S. States Serving Mexico"
              subtitle="Total passengers, U.S. → Mexico (all years)"
              downloadData={{
                summary: { data: topStates, filename: 'top-us-states-to-mexico' },
              }}
            >
              <BarChart
                data={topStates}
                xKey="label"
                yKey="value"
                horizontal
                formatValue={fmtCompact}
              />
            </ChartCard>
          </div>
        </div>
      </SectionBlock>
    </DashboardLayout>
  )
}
