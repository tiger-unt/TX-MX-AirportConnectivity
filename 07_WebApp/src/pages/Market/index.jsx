import { useMemo } from 'react'
import { Users, TrendingUp, Route, Building2 } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import DataTable from '@/components/ui/DataTable'
import { formatNumber } from '@/lib/chartColors'

/* ── helpers ─────────────────────────────────────────────────────── */

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

const isTxOrigin = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'United States' && d.ORIGIN_STATE_NM === 'Texas'

const isTxToMx = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME === 'Mexico'

const isMxToTx = (d) =>
  d.ORIGIN_COUNTRY_NAME === 'Mexico' &&
  d.DEST_COUNTRY_NAME === 'United States' && d.DEST_STATE_NM === 'Texas'

const isTxMx = (d) => isTxToMx(d) || isMxToTx(d)


export default function MarketPage() {
  const { marketData, loading, filters, setFilter, resetFilters } = useAviationStore()

  /* ── TX-MX base dataset ─────────────────────────────────────────── */
  const txMxData = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isTxMx)
  }, [marketData])

  /* ── filter options ─────────────────────────────────────────────── */
  const yearOptions = useMemo(() => {
    const years = [...new Set(txMxData.map((d) => d.YEAR))].filter(Number.isFinite).sort()
    return years.map(String)
  }, [txMxData])

  const carrierOptions = useMemo(() => {
    const carriers = [...new Set(txMxData.map((d) => d.CARRIER_NAME))].filter(Boolean).sort()
    return carriers
  }, [txMxData])

  const originOptions = useMemo(() => {
    const origins = [...new Set(txMxData.map((d) => d.ORIGIN))].filter(Boolean).sort()
    return origins
  }, [txMxData])

  const destOptions = useMemo(() => {
    const dests = [...new Set(txMxData.map((d) => d.DEST))].filter(Boolean).sort()
    return dests
  }, [txMxData])

  /* ── filtered dataset ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = txMxData
    if (filters.year) data = data.filter((d) => String(d.YEAR) === filters.year)
    if (filters.direction === 'TX_TO_MX') data = data.filter(isTxToMx)
    if (filters.direction === 'MX_TO_TX') data = data.filter(isMxToTx)
    if (filters.carrier) data = data.filter((d) => d.CARRIER_NAME === filters.carrier)
    if (filters.originAirport) data = data.filter((d) => d.ORIGIN === filters.originAirport)
    if (filters.destAirport) data = data.filter((d) => d.DEST === filters.destAirport)
    return data
  }, [txMxData, filters])

  /* ── active filter count & tags ─────────────────────────────────── */
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

  /* ── KPI stats ──────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!txMxData.length) return null
    return Math.max(...txMxData.map((d) => d.YEAR).filter(Number.isFinite))
  }, [txMxData])

  const stats = useMemo(() => {
    if (!filtered.length || !latestYear) return null
    const totalPax = filtered.reduce((s, d) => s + d.PASSENGERS, 0)
    const totalFreight = filtered.reduce((s, d) => s + d.FREIGHT, 0)

    // Routes = unique origin-dest pairs
    const routeSet = new Set(filtered.map((d) => `${d.ORIGIN}-${d.DEST}`))
    const activeRoutes = routeSet.size

    // Top carrier
    const byCarrier = new Map()
    filtered.forEach((d) => {
      if (!d.CARRIER_NAME) return
      byCarrier.set(d.CARRIER_NAME, (byCarrier.get(d.CARRIER_NAME) || 0) + d.PASSENGERS)
    })
    const topCarrier = byCarrier.size
      ? [...byCarrier.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : '—'

    // YoY change (only meaningful when no year filter is applied)
    let yoyChange = null
    if (!filters.year) {
      const latestPax = filtered.filter((d) => d.YEAR === latestYear).reduce((s, d) => s + d.PASSENGERS, 0)
      const prevPax = filtered.filter((d) => d.YEAR === latestYear - 1).reduce((s, d) => s + d.PASSENGERS, 0)
      if (prevPax > 0) yoyChange = (latestPax - prevPax) / prevPax
    }

    return { totalPax, totalFreight, activeRoutes, topCarrier, yoyChange }
  }, [filtered, latestYear, filters.year])

  /* ── trend data ─────────────────────────────────────────────────── */
  const passengerTrend = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      if (!byYear.has(d.YEAR)) byYear.set(d.YEAR, 0)
      byYear.set(d.YEAR, byYear.get(d.YEAR) + d.PASSENGERS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filtered])

  const freightTrend = useMemo(() => {
    const byYear = new Map()
    filtered.forEach((d) => {
      if (!byYear.has(d.YEAR)) byYear.set(d.YEAR, 0)
      byYear.set(d.YEAR, byYear.get(d.YEAR) + d.FREIGHT)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filtered])

  /* ── routes & airports ──────────────────────────────────────────── */
  const topRoutes = useMemo(() => {
    const byRoute = new Map()
    filtered.forEach((d) => {
      const key = `${d.ORIGIN}–${d.DEST}`
      byRoute.set(key, (byRoute.get(key) || 0) + d.PASSENGERS)
    })
    return Array.from(byRoute, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  const topTxAirports = useMemo(() => {
    const byAirport = new Map()
    filtered.forEach((d) => {
      // TX airport is origin if TX→MX, or dest if MX→TX
      const ap = isTxToMx(d) ? d.ORIGIN : d.DEST
      byAirport.set(ap, (byAirport.get(ap) || 0) + d.PASSENGERS)
    })
    return Array.from(byAirport, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  const topMxAirports = useMemo(() => {
    const byAirport = new Map()
    filtered.forEach((d) => {
      // MX airport is dest if TX→MX, or origin if MX→TX
      const ap = isTxToMx(d) ? d.DEST : d.ORIGIN
      byAirport.set(ap, (byAirport.get(ap) || 0) + d.PASSENGERS)
    })
    return Array.from(byAirport, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── airlines ───────────────────────────────────────────────────── */
  const carrierMarketShare = useMemo(() => {
    const byCarrier = new Map()
    // Use latest year for market share donut
    const yearToUse = filters.year ? Number(filters.year) : latestYear
    const subset = filtered.filter((d) => d.YEAR === yearToUse)
    subset.forEach((d) => {
      if (!d.CARRIER_NAME) return
      byCarrier.set(d.CARRIER_NAME, (byCarrier.get(d.CARRIER_NAME) || 0) + d.PASSENGERS)
    })
    return Array.from(byCarrier, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered, filters.year, latestYear])

  const topCarriers = useMemo(() => {
    const byCarrier = new Map()
    filtered.forEach((d) => {
      if (!d.CARRIER_NAME) return
      byCarrier.set(d.CARRIER_NAME, (byCarrier.get(d.CARRIER_NAME) || 0) + d.PASSENGERS)
    })
    return Array.from(byCarrier, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── data table ─────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    // Aggregate by route + carrier + year for a clean table
    const byKey = new Map()
    filtered.forEach((d) => {
      const key = `${d.YEAR}|${d.ORIGIN}|${d.DEST}|${d.CARRIER_NAME}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.YEAR,
          Origin: d.ORIGIN,
          'Origin City': d.ORIGIN_CITY_NAME,
          Dest: d.DEST,
          'Dest City': d.DEST_CITY_NAME,
          Carrier: d.CARRIER_NAME,
          Passengers: 0,
          Freight: 0,
        })
      }
      const row = byKey.get(key)
      row.Passengers += d.PASSENGERS
      row.Freight += d.FREIGHT
    })
    return Array.from(byKey.values()).sort((a, b) => b.Passengers - a.Passengers)
  }, [filtered])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'Origin', label: 'Origin' },
    { key: 'Origin City', label: 'Origin City' },
    { key: 'Dest', label: 'Dest' },
    { key: 'Dest City', label: 'Dest City' },
    { key: 'Carrier', label: 'Carrier' },
    { key: 'Passengers', label: 'Passengers', render: (v) => formatNumber(v) },
    { key: 'Freight', label: 'Freight (lbs)', render: (v) => formatNumber(v) },
  ]

  /* ── render ─────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading market data...</p>
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

  return (
    <DashboardLayout
      filters={filterControls}
      onResetAll={resetFilters}
      activeCount={activeCount}
      activeTags={activeTags}
    >
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="gradient-blue text-white">
        <div className="container-chrome py-8 md:py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            TX–Mexico Market
          </h2>
          <p className="text-white/70 mt-2 text-base max-w-2xl">
            Passenger market analysis for air travel between Texas and Mexico.
            Market data counts each passenger journey once, regardless of
            intermediate stops.
          </p>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          <StatCard
            label="Total Passengers"
            value={stats ? fmtCompact(stats.totalPax) : '—'}
            trend={stats?.yoyChange != null ? (stats.yoyChange > 0 ? 'up' : 'down') : undefined}
            trendLabel={stats?.yoyChange != null ? `${(stats.yoyChange * 100).toFixed(1)}% YoY` : ''}
            highlight
            variant="primary"
            icon={Users}
            delay={0}
          />
          <StatCard
            label="Total Freight"
            value={stats ? fmtLbs(stats.totalFreight) : '—'}
            highlight
            icon={Building2}
            delay={100}
          />
          <StatCard
            label="Active Routes"
            value={stats ? formatNumber(stats.activeRoutes) : '—'}
            highlight
            icon={Route}
            delay={200}
          />
          <StatCard
            label="Top Carrier"
            value={stats?.topCarrier || '—'}
            highlight
            icon={TrendingUp}
            delay={300}
          />
        </div>
      </SectionBlock>

      {/* ── Trends ────────────────────────────────────────────────── */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Passenger Trend"
            subtitle="Annual passengers (filtered)"
            downloadData={{ summary: { data: passengerTrend, filename: 'market-passenger-trend' } }}
          >
            <LineChart data={passengerTrend} xKey="year" yKey="value" formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Freight Trend"
            subtitle="Annual freight volume (filtered)"
            downloadData={{ summary: { data: freightTrend, filename: 'market-freight-trend' } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" formatValue={fmtLbs} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Routes & Airports ─────────────────────────────────────── */}
      <SectionBlock>
        <ChartCard
          title="Top 10 Routes by Passengers"
          subtitle="Origin–Destination pairs (filtered)"
          downloadData={{ summary: { data: topRoutes, filename: 'market-top-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Top Texas Airports"
            subtitle="TX airports by Mexico-bound passengers"
            downloadData={{ summary: { data: topTxAirports, filename: 'market-top-tx-airports' } }}
          >
            <BarChart data={topTxAirports} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Top Mexico Airports"
            subtitle="Mexico airports by TX-bound passengers"
            downloadData={{ summary: { data: topMxAirports, filename: 'market-top-mx-airports' } }}
          >
            <BarChart data={topMxAirports} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Airlines ──────────────────────────────────────────────── */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <ChartCard
              title="Carrier Market Share"
              subtitle={`${filters.year || latestYear || '—'} passengers`}
              downloadData={{ summary: { data: carrierMarketShare, filename: 'market-carrier-share' } }}
            >
              <DonutChart data={carrierMarketShare} formatValue={fmtCompact} />
            </ChartCard>
          </div>
          <div className="lg:col-span-2">
            <ChartCard
              title="Top Carriers by Passengers"
              subtitle="All filtered data"
              downloadData={{ summary: { data: topCarriers, filename: 'market-top-carriers' } }}
            >
              <BarChart data={topCarriers} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
            </ChartCard>
          </div>
        </div>
      </SectionBlock>

      {/* ── Data Table ────────────────────────────────────────────── */}
      <SectionBlock alt>
        <ChartCard
          title="Route Details"
          subtitle={`${formatNumber(tableData.length)} routes (filtered)`}
          downloadData={{ summary: { data: tableData, filename: 'market-route-details' } }}
        >
          <DataTable columns={tableColumns} data={tableData} />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
