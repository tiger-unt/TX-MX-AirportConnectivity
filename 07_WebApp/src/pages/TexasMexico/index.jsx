import { useMemo, useState } from 'react'
import { Users, Plane, Package, Route, ArrowRightLeft } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, fmtLbs, isTxToMx, isMxToTx, isTxMx, computeAdherenceData, CLASS_LABELS, CARRIER_TYPE_LABELS, getCarrierType } from '@/lib/aviationHelpers'
import { useCascadingFilters } from '@/lib/useCascadingFilters'
import { aggregateRoutes, aggregateAirportVolumes } from '@/lib/airportUtils'
import { formatNumber, CHART_COLORS } from '@/lib/chartColors'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import DataTable from '@/components/ui/DataTable'
import AirportMap from '@/components/maps/AirportMap'

/* ── cascading-filter config (stable refs, defined once) ───────────── */
const buildApplicators = (f) => ({
  year: (data) => f.year.length ? data.filter((d) => f.year.includes(String(d.YEAR))) : data,
  direction: (data) => {
    if (f.direction === 'TX_TO_MX') return data.filter(isTxToMx)
    if (f.direction === 'MX_TO_TX') return data.filter(isMxToTx)
    return data
  },
  serviceClass: (data) => f.serviceClass.length ? data.filter((d) => f.serviceClass.includes(d.CLASS)) : data,
  carrierType: (data) => f.carrierType ? data.filter((d) => getCarrierType(d) === f.carrierType) : data,
  carrier: (data) => f.carrier.length ? data.filter((d) => f.carrier.includes(d.CARRIER_NAME)) : data,
  originAirport: (data) => f.originAirport.length ? data.filter((d) => f.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN)) : data,
  destAirport: (data) => f.destAirport.length ? data.filter((d) => f.destAirport.includes(d.DEST_FULL_LABEL || d.DEST)) : data,
  destState: (data) => f.destState.length ? data.filter((d) => {
    if (isTxToMx(d)) return f.destState.includes(d.DEST_STATE_NM)
    if (isMxToTx(d)) return f.destState.includes(d.ORIGIN_STATE_NM)
    return false
  }) : data,
})

const EXTRACTORS = {
  year: (d) => String(d.YEAR),
  serviceClass: (d) => d.CLASS,
  carrier: (d) => d.CARRIER_NAME,
  originAirport: (d) => d.ORIGIN_FULL_LABEL || d.ORIGIN,
  destAirport: (d) => d.DEST_FULL_LABEL || d.DEST,
  destState: (d) => {
    if (isTxToMx(d)) return d.DEST_STATE_NM
    if (isMxToTx(d)) return d.ORIGIN_STATE_NM
    return null
  },
}

export default function TexasMexicoPage() {
  const { marketData, segmentData, airportIndex, loading, filters, setFilter, setFilters, resetFilters } = useAviationStore()
  const [selectedAirport, setSelectedAirport] = useState(null)

  /* ── base datasets ─────────────────────────────────────────────────── */
  const baseMarket = useMemo(() => {
    if (!marketData) return []
    return marketData.filter(isTxMx)
  }, [marketData])

  const baseSegment = useMemo(() => {
    if (!segmentData) return []
    return segmentData.filter(isTxMx)
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

  const destStateOptions = useMemo(() => {
    // Mexican states from dest side of TX→MX + origin side of MX→TX
    const states = new Set()
    pools.destState.forEach((d) => {
      if (isTxToMx(d) && d.DEST_STATE_NM) states.add(d.DEST_STATE_NM)
      if (isMxToTx(d) && d.ORIGIN_STATE_NM) states.add(d.ORIGIN_STATE_NM)
    })
    return [...states].sort()
  }, [pools])

  /* ── filtered datasets ─────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = baseMarket
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'TX_TO_MX') data = data.filter(isTxToMx)
    if (filters.direction === 'MX_TO_TX') data = data.filter(isMxToTx)
    if (filters.serviceClass.length) data = data.filter((d) => filters.serviceClass.includes(d.CLASS))
    if (filters.carrierType) data = data.filter((d) => getCarrierType(d) === filters.carrierType)
    if (filters.carrier.length) data = data.filter((d) => filters.carrier.includes(d.CARRIER_NAME))
    if (filters.originAirport.length) {
      data = data.filter((d) => filters.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN))
    }
    if (filters.destAirport.length) {
      data = data.filter((d) => filters.destAirport.includes(d.DEST_FULL_LABEL || d.DEST))
    }
    if (filters.destState.length) {
      data = data.filter((d) => {
        if (isTxToMx(d)) return filters.destState.includes(d.DEST_STATE_NM)
        if (isMxToTx(d)) return filters.destState.includes(d.ORIGIN_STATE_NM)
        return false
      })
    }
    return data
  }, [baseMarket, filters])

  const filteredSegment = useMemo(() => {
    let data = baseSegment
    if (filters.year.length) data = data.filter((d) => filters.year.includes(String(d.YEAR)))
    if (filters.direction === 'TX_TO_MX') data = data.filter(isTxToMx)
    if (filters.direction === 'MX_TO_TX') data = data.filter(isMxToTx)
    if (filters.serviceClass.length) data = data.filter((d) => filters.serviceClass.includes(d.CLASS))
    if (filters.carrierType) data = data.filter((d) => getCarrierType(d) === filters.carrierType)
    if (filters.carrier.length) data = data.filter((d) => filters.carrier.includes(d.CARRIER_NAME))
    if (filters.originAirport.length) {
      data = data.filter((d) => filters.originAirport.includes(d.ORIGIN_FULL_LABEL || d.ORIGIN))
    }
    if (filters.destAirport.length) {
      data = data.filter((d) => filters.destAirport.includes(d.DEST_FULL_LABEL || d.DEST))
    }
    if (filters.destState.length) {
      data = data.filter((d) => {
        if (isTxToMx(d)) return filters.destState.includes(d.DEST_STATE_NM)
        if (isMxToTx(d)) return filters.destState.includes(d.ORIGIN_STATE_NM)
        return false
      })
    }
    return data
  }, [baseSegment, filters])

  /* ── active filter count & tags ────────────────────────────────────── */
  const activeCount =
    filters.year.length + (filters.direction ? 1 : 0) +
    filters.serviceClass.length + (filters.carrierType ? 1 : 0) + filters.carrier.length + filters.originAirport.length +
    filters.destAirport.length + filters.destState.length

  const activeTags = useMemo(() => {
    const tags = []
    const push = (key, group, labelFn) =>
      filters[key].forEach((v) =>
        tags.push({ group, label: labelFn ? labelFn(v) : v, onRemove: () => setFilter(key, filters[key].filter((x) => x !== v)) })
      )
    push('year', 'Year')
    if (filters.direction) tags.push({
      group: 'Direction',
      label: filters.direction === 'TX_TO_MX' ? 'Texas \u2192 Mexico' : 'Mexico \u2192 Texas',
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
    push('destAirport', 'Destination Airport')
    push('destState', 'MX State')
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

    const freight = latest.reduce((s, d) => s + d.FREIGHT, 0)
    const mail = latest.reduce((s, d) => s + d.MAIL, 0)
    const routeSet = new Set(latest.map((d) => `${d.ORIGIN}-${d.DEST}`))

    return { pax, paxChange, flights, freight, mail, activeRoutes: routeSet.size, latestYear, prevYear }
  }, [filtered, filteredSegment, latestYear])

  /* ── trends (bidirectional) ────────────────────────────────────────── */
  const paxTrend = useMemo(() => {
    const byYD = new Map()
    filtered.forEach((d) => {
      const dir = isTxToMx(d) ? 'Texas \u2192 Mexico' : 'Mexico \u2192 Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.PASSENGERS
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filtered])

  const flightTrend = useMemo(() => {
    const byYD = new Map()
    filteredSegment.forEach((d) => {
      const dir = isTxToMx(d) ? 'Texas \u2192 Mexico' : 'Mexico \u2192 Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.DEPARTURES_PERFORMED
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredSegment])

  const mailTrend = useMemo(() => {
    const byYD = new Map()
    filtered.forEach((d) => {
      const dir = isTxToMx(d) ? 'Texas \u2192 Mexico' : 'Mexico \u2192 Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.MAIL
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filtered])

  /* ── routes & airports ─────────────────────────────────────────────── */
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

  const topTxAirports = useMemo(() => {
    const byAp = new Map()
    filtered.forEach((d) => {
      const ap = isTxToMx(d) ? (d.ORIGIN_FULL_LABEL || d.ORIGIN) : (d.DEST_FULL_LABEL || d.DEST)
      byAp.set(ap, (byAp.get(ap) || 0) + d.PASSENGERS)
    })
    return Array.from(byAp, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  const topMxAirports = useMemo(() => {
    const byAp = new Map()
    filtered.forEach((d) => {
      const ap = isTxToMx(d) ? (d.DEST_FULL_LABEL || d.DEST) : (d.ORIGIN_FULL_LABEL || d.ORIGIN)
      byAp.set(ap, (byAp.get(ap) || 0) + d.PASSENGERS)
    })
    return Array.from(byAp, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── airlines ──────────────────────────────────────────────────────── */
  const carrierMarketShare = useMemo(() => {
    const yearToUse = filters.year.length === 1 ? Number(filters.year[0]) : latestYear
    const subset = filtered.filter((d) => d.YEAR === yearToUse)
    const byCarrier = new Map()
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

  /* ── operations (segment) ──────────────────────────────────────────── */
  const seatTrend = useMemo(() => {
    const byYear = new Map()
    filteredSegment.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.SEATS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredSegment])

  const depTrend = useMemo(() => {
    const byYK = new Map()
    filteredSegment
      .filter((d) => d.CLASS === 'F' && d.DEPARTURES_SCHEDULED > 0)
      .forEach((d) => {
        for (const [metric, field] of [['Scheduled', 'DEPARTURES_SCHEDULED'], ['Performed', 'DEPARTURES_PERFORMED']]) {
          const key = `${d.YEAR}|${metric}`
          if (!byYK.has(key)) byYK.set(key, { year: d.YEAR, value: 0, Metric: metric })
          byYK.get(key).value += d[field]
        }
      })
    return Array.from(byYK.values()).sort((a, b) => a.year - b.year || a.Metric.localeCompare(b.Metric))
  }, [filteredSegment])

  const adherenceData = useMemo(() => computeAdherenceData(filteredSegment), [filteredSegment])

  /* ── state-level storytelling ───────────────────────────────────────── */
  const topMxStates = useMemo(() => {
    const byState = new Map()
    filtered.forEach((d) => {
      const state = isTxToMx(d) ? d.DEST_STATE_NM : d.ORIGIN_STATE_NM
      if (!state) return
      byState.set(state, (byState.get(state) || 0) + d.PASSENGERS)
    })
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  /* ── data table ────────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    const byKey = new Map()
    filtered.forEach((d) => {
      const key = `${d.YEAR}|${d.ORIGIN}|${d.DEST}|${d.CARRIER_NAME}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          Year: d.YEAR,
          Origin: d.ORIGIN_FULL_LABEL || d.ORIGIN,
          Dest: d.DEST_FULL_LABEL || d.DEST,
          Carrier: d.CARRIER_NAME,
          Passengers: 0, Freight: 0, Mail: 0,
        })
      }
      const row = byKey.get(key)
      row.Passengers += d.PASSENGERS
      row.Freight += d.FREIGHT
      row.Mail += d.MAIL
    })
    return Array.from(byKey.values()).sort((a, b) => b.Passengers - a.Passengers)
  }, [filtered])

  const tableColumns = [
    { key: 'Year', label: 'Year' },
    { key: 'Origin', label: 'Origin' },
    { key: 'Dest', label: 'Destination' },
    { key: 'Carrier', label: 'Carrier' },
    { key: 'Passengers', label: 'Passengers', render: (v) => formatNumber(v) },
    { key: 'Freight', label: 'Freight (lbs)', render: (v) => formatNumber(v) },
    { key: 'Mail', label: 'Mail (lbs)', render: (v) => formatNumber(v) },
  ]

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
      <FilterMultiSelect label="Year" value={filters.year} options={yearOptions} onChange={(v) => setFilter('year', v)} />
      <FilterSelect
        label="Direction"
        value={filters.direction}
        options={[
          { value: 'TX_TO_MX', label: 'Texas \u2192 Mexico' },
          { value: 'MX_TO_TX', label: 'Mexico \u2192 Texas' },
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
      <FilterMultiSelect label="Mexico State" value={filters.destState} options={destStateOptions} onChange={(v) => setFilter('destState', v)} searchable />
    </>
  )

  const heroSection = (
    <div className="gradient-blue text-white">
      <div className="container-chrome py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas&ndash;Mexico Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base max-w-2xl">
          Comprehensive analysis using market and segment data for air travel
          between Texas and Mexico (2015&ndash;{latestYear || '\u2026'}).
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Texas–Mexico Passengers (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.pax) : '\u2014'}
            trend={stats?.paxChange > 0 ? 'up' : stats?.paxChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.paxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={Users} delay={0}
          />
          <StatCard
            label={`Texas–Mexico Flights (${latestYear || '\u2014'})`}
            value={stats ? fmtCompact(stats.flights) : '\u2014'}
            highlight icon={Plane} delay={100}
          />
          <StatCard
            label="Texas–Mexico Freight"
            value={stats ? fmtLbs(stats.freight) : '\u2014'}
            highlight icon={Package} delay={200}
          />
          <StatCard
            label="Texas–Mexico Mail"
            value={stats ? fmtLbs(stats.mail) : '\u2014'}
            highlight icon={Package} delay={300}
          />
          <StatCard
            label="Active Texas–Mexico Routes"
            value={stats ? String(stats.activeRoutes) : '\u2014'}
            highlight icon={Route} delay={400}
          />
        </div>
      </SectionBlock>

      {/* Map */}
      <SectionBlock alt>
        <ChartCard title="Texas–Mexico Route Map" subtitle="Texas and Mexico airports with route arcs">
          <AirportMap
            airports={mapAirports}
            routes={mapRoutes}
            topN={15}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            center={[25.5, -99.5]}
            zoom={5}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trends (3-col) */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard
            title="Texas–Mexico Passenger Trends"
            subtitle="Bidirectional passenger flows by year"
            downloadData={{ summary: { data: paxTrend, filename: 'tx-mx-passenger-trends' } }}
          >
            <LineChart data={paxTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Texas–Mexico Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{ summary: { data: flightTrend, filename: 'tx-mx-flight-trends' } }}
          >
            <LineChart data={flightTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Texas–Mexico Mail Trends"
            subtitle="Bidirectional mail volume by year"
            downloadData={{ summary: { data: mailTrend, filename: 'tx-mx-mail-trends' } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtLbs} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Routes & Airports */}
      <SectionBlock alt>
        <ChartCard
          title="Top 10 Texas–Mexico Routes"
          subtitle="By total passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'tx-mx-top-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Top Texas Airports for Mexico Traffic"
            subtitle="By total passengers"
            downloadData={{ summary: { data: topTxAirports, filename: 'tx-mx-top-tx-airports' } }}
          >
            <BarChart data={topTxAirports} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Top Mexico Airports for Texas Traffic"
            subtitle="By total passengers"
            downloadData={{ summary: { data: topMxAirports, filename: 'tx-mx-top-mx-airports' } }}
          >
            <BarChart data={topMxAirports} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Airlines */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <ChartCard
              title="Carrier Market Share"
              subtitle={`${filters.year.length === 1 ? filters.year[0] : latestYear || '\u2014'} passengers`}
              downloadData={{ summary: { data: carrierMarketShare, filename: 'tx-mx-carrier-share' } }}
            >
              <DonutChart data={carrierMarketShare} formatValue={fmtCompact} />
            </ChartCard>
          </div>
          <div className="lg:col-span-2">
            <ChartCard
              title="Top Carriers by Passengers"
              subtitle="All filtered data"
              downloadData={{ summary: { data: topCarriers, filename: 'tx-mx-top-carriers' } }}
            >
              <BarChart data={topCarriers} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
            </ChartCard>
          </div>
        </div>
      </SectionBlock>

      {/* Operations (segment) */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard
            title="Seat Capacity Trends"
            subtitle="Total seats by year (segment data)"
            downloadData={{ summary: { data: seatTrend, filename: 'tx-mx-seat-trends' } }}
          >
            <LineChart data={seatTrend} xKey="year" yKey="value" formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Departures: Scheduled vs Performed"
            subtitle="Scheduled service by year (Class F, sched > 0)"
            downloadData={{ summary: { data: depTrend, filename: 'tx-mx-dep-trends' } }}
          >
            <LineChart data={depTrend} xKey="year" yKey="value" seriesKey="Metric" formatValue={fmtCompact} />
            <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only — foreign carriers are not required to report schedule data to BTS.</p>
          </ChartCard>
          <ChartCard
            title="Schedule Adherence"
            subtitle="Performed vs scheduled departures (Class F, scheduled service)"
            downloadData={{ summary: { data: adherenceData, filename: 'tx-mx-schedule-adherence' } }}
          >
            <BarChart data={adherenceData} xKey="label" yKey="value" horizontal color={CHART_COLORS[2]} formatValue={(v) => `${v.toFixed(1)}%`} maxBars={10} animate />
            <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only — foreign carriers are not required to report schedule data to BTS.</p>
          </ChartCard>
        </div>
      </SectionBlock>

      {/* State-Level Storytelling */}
      <SectionBlock alt>
        <ChartCard
          title="Top Mexico Destinations by State"
          subtitle="Quintana Roo, Jalisco, Nuevo Leon, etc. by passenger volume"
          downloadData={{ summary: { data: topMxStates, filename: 'tx-mx-top-mx-states' } }}
        >
          <BarChart data={topMxStates} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Data Table */}
      <SectionBlock>
        <ChartCard
          title="Route Details"
          subtitle={`${formatNumber(tableData.length)} routes (filtered)`}
          downloadData={{ summary: { data: tableData, filename: 'tx-mx-route-details' } }}
        >
          <DataTable columns={tableColumns} data={tableData} />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
