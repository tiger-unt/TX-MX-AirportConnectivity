import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Plane, Package, Route, BarChart3, Settings2, MapPin } from 'lucide-react'
import HeroStardust from '@/components/ui/HeroStardust'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, fmtLbs, isTxToMx, isMxToTx, isTxMx, CLASS_LABELS, AIRCRAFT_GROUP_LABELS, CARRIER_TYPE_LABELS, getCarrierType, BORDER_AIRPORTS, BORDER_AIRPORT_LIST, MAP_METRIC_OPTIONS } from '@/lib/aviationHelpers'
import { useCascadingFilters } from '@/lib/useCascadingFilters'
import { aggregateRoutes, aggregateAirportVolumes } from '@/lib/airportUtils'
import { formatNumber, CHART_COLORS } from '@/lib/chartColors'
import { PAGE_MARKET_COLS, PAGE_SEGMENT_COLS } from '@/lib/downloadColumns'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import StatCard from '@/components/ui/StatCard'
import SectionBlock from '@/components/ui/SectionBlock'
import TabBar from '@/components/ui/TabBar'
import OverviewTab from './tabs/OverviewTab'
import PassengersRoutesTab from './tabs/PassengersRoutesTab'
import OperationsCapacityTab from './tabs/OperationsCapacityTab'
import CargoTradeTab from './tabs/CargoTradeTab'
import BorderAirportsTab from './tabs/BorderAirportsTab'

/* ── stable color map for border airports (shared with BorderAirportsTab) */
const ORIGIN_COLORS = Object.fromEntries(
  BORDER_AIRPORT_LIST.map((a, i) => [a.code, CHART_COLORS[i % CHART_COLORS.length]])
)

/* ── tab configuration ─────────────────────────────────────────────── */
const TAB_CONFIG = [
  { key: 'overview',    label: 'Overview',              icon: BarChart3 },
  { key: 'passengers',  label: 'Passengers & Routes',   icon: Users },
  { key: 'operations',  label: 'Operations & Capacity', icon: Settings2 },
  { key: 'cargo',       label: 'Cargo & Trade',         icon: Package },
  { key: 'border',      label: 'Border Airports',       icon: MapPin },
]

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
  const [mapMetric, setMapMetric] = useState('PASSENGERS')
  const mapMetricConfig = MAP_METRIC_OPTIONS.find((m) => m.value === mapMetric)

  /* ── tab state (synced to URL for shareability) ──────────────────── */
  const [searchParams, setSearchParams] = useSearchParams()
  const VALID_TABS = useMemo(() => new Set(TAB_CONFIG.map((t) => t.key)), [])
  const rawTab = searchParams.get('tab')
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview'
  const handleTabChange = useCallback((key) => {
    setSearchParams({ tab: key }, { replace: true })
  }, [setSearchParams])
  const tabBarRef = useRef(null)

  // Reset stale direction filter carried from other pages
  useEffect(() => {
    if (filters.direction && filters.direction !== 'TX_TO_MX' && filters.direction !== 'MX_TO_TX') {
      setFilter('direction', '')
    }
  }, [filters.direction, setFilter])

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

  /* ── year-agnostic filtered data (for trend charts) ──────────────── */
  const filteredNoYear = useMemo(() => {
    let data = baseMarket
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

  const filteredSegmentNoYear = useMemo(() => {
    let data = baseSegment
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
      label: filters.direction === 'TX_TO_MX' ? 'Texas → Mexico' : 'Mexico → Texas',
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

  /* ── trends (year-agnostic — not affected by year filter) ──────────── */
  const paxTrend = useMemo(() => {
    const byYD = new Map()
    filteredNoYear.forEach((d) => {
      const dir = isTxToMx(d) ? 'Texas → Mexico' : 'Mexico → Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.PASSENGERS
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredNoYear])

  const flightTrend = useMemo(() => {
    const byYD = new Map()
    filteredSegmentNoYear.forEach((d) => {
      const dir = isTxToMx(d) ? 'Texas → Mexico' : 'Mexico → Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.DEPARTURES_PERFORMED
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredSegmentNoYear])

  const mailTrend = useMemo(() => {
    const byYD = new Map()
    filteredNoYear.forEach((d) => {
      const dir = isTxToMx(d) ? 'Texas → Mexico' : 'Mexico → Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.MAIL
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredNoYear])

  /* ── routes & airports ─────────────────────────────────────────────── */
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
    const byCarrier = new Map()
    filtered.forEach((d) => {
      if (!d.CARRIER_NAME) return
      byCarrier.set(d.CARRIER_NAME, (byCarrier.get(d.CARRIER_NAME) || 0) + d.PASSENGERS)
    })
    return Array.from(byCarrier, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered])

  /* ── operations (segment, year-agnostic trends) ──────────────────── */
  const seatTrend = useMemo(() => {
    const byYear = new Map()
    filteredSegmentNoYear.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.SEATS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredSegmentNoYear])

  const depTrend = useMemo(() => {
    const byYK = new Map()
    filteredSegmentNoYear
      .filter((d) => d.SCHED_REPORTED === 1 && d.CLASS === 'F')
      .forEach((d) => {
        for (const [metric, field] of [['Scheduled', 'DEPARTURES_SCHEDULED'], ['Performed', 'DEPARTURES_PERFORMED']]) {
          const key = `${d.YEAR}|${metric}`
          if (!byYK.has(key)) byYK.set(key, { year: d.YEAR, value: 0, Metric: metric })
          byYK.get(key).value += d[field]
        }
      })
    return Array.from(byYK.values()).sort((a, b) => a.year - b.year || a.Metric.localeCompare(b.Metric))
  }, [filteredSegmentNoYear])

  /* ── load factor analysis (year-agnostic trends) ──────────────────── */
  const loadFactorTrend = useMemo(() => {
    const byYD = new Map()
    filteredSegmentNoYear.forEach((d) => {
      if (d.SEATS <= 0) return
      const dir = isTxToMx(d) ? 'Texas → Mexico' : 'Mexico → Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, pax: 0, seats: 0, Direction: dir })
      const row = byYD.get(key)
      row.pax += d.PASSENGERS
      row.seats += d.SEATS
    })
    return Array.from(byYD.values())
      .map((d) => ({ year: d.year, value: d.seats ? +(d.pax / d.seats * 100).toFixed(1) : 0, Direction: d.Direction }))
      .sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredSegmentNoYear])

  const loadFactorDistribution = useMemo(() => {
    // Group by year + route, sum passengers and seats
    const byYearRoute = new Map()
    filteredSegmentNoYear.forEach((d) => {
      if (d.SEATS <= 0) return
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} → ${d.DEST_FULL_LABEL || d.DEST}`
      const key = `${d.YEAR}|${label}`
      if (!byYearRoute.has(key)) byYearRoute.set(key, { year: d.YEAR, label, pax: 0, seats: 0 })
      const row = byYearRoute.get(key)
      row.pax += d.PASSENGERS
      row.seats += d.SEATS
    })
    // Compute load factor per route per year, filter to min 100 seats
    const byYear = new Map()
    byYearRoute.forEach((r) => {
      if (r.seats < 100) return
      const lf = +(r.pax / r.seats * 100).toFixed(1)
      if (lf <= 0) return
      if (!byYear.has(r.year)) byYear.set(r.year, [])
      byYear.get(r.year).push({ value: lf, label: r.label })
    })
    // Five-number summary + outliers per year
    const quantile = (sorted, p) => {
      const idx = p * (sorted.length - 1)
      const lo = Math.floor(idx)
      const hi = Math.ceil(idx)
      if (lo === hi) return sorted[lo]
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
    }
    return Array.from(byYear.entries())
      .map(([year, routes]) => {
        const values = routes.map((r) => r.value).sort((a, b) => a - b)
        const q1 = quantile(values, 0.25)
        const median = quantile(values, 0.5)
        const q3 = quantile(values, 0.75)
        const iqr = q3 - q1
        const lowerFence = q1 - 1.5 * iqr
        const upperFence = q3 + 1.5 * iqr
        const nonOutliers = values.filter((v) => v >= lowerFence && v <= upperFence)
        const min = nonOutliers.length ? nonOutliers[0] : q1
        const max = nonOutliers.length ? nonOutliers[nonOutliers.length - 1] : q3
        const outliers = routes.filter((r) => r.value < lowerFence || r.value > upperFence)
        return { year, min, q1, median, q3, max, outliers, count: values.length }
      })
      .sort((a, b) => a.year - b.year)
  }, [filteredSegmentNoYear])

  /* ── payload weight utilization (all services, year-agnostic trend) ── */
  const AVG_PAX_WEIGHT_LBS = 200 // FAA standard: ~200 lbs per passenger including carry-on baggage

  const payloadUtilTrend = useMemo(() => {
    const byYD = new Map()
    filteredSegmentNoYear.forEach((d) => {
      if (d.PAYLOAD <= 0) return
      const dir = isTxToMx(d) ? 'Texas → Mexico' : 'Mexico → Texas'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, estWeight: 0, payload: 0, Direction: dir })
      const row = byYD.get(key)
      row.estWeight += (d.PASSENGERS * AVG_PAX_WEIGHT_LBS) + d.FREIGHT + d.MAIL
      row.payload += d.PAYLOAD
    })
    return Array.from(byYD.values())
      .map((d) => ({ year: d.year, value: d.payload ? +(d.estWeight / d.payload * 100).toFixed(1) : 0, Direction: d.Direction }))
      .sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredSegmentNoYear])

  /* ── Class G (all-cargo) freight payload utilization ─────────────── */
  const classGSegment = useMemo(() => filteredSegment.filter((d) => d.CLASS === 'G'), [filteredSegment])
  const classGSegmentNoYear = useMemo(() => filteredSegmentNoYear.filter((d) => d.CLASS === 'G'), [filteredSegmentNoYear])

  const classGFreightUtilTrend = useMemo(() => {
    const byYear = new Map()
    classGSegmentNoYear.forEach((d) => {
      if (d.PAYLOAD <= 0) return
      if (!byYear.has(d.YEAR)) byYear.set(d.YEAR, { year: d.YEAR, cargoWeight: 0, payload: 0 })
      const row = byYear.get(d.YEAR)
      row.cargoWeight += d.FREIGHT + d.MAIL
      row.payload += d.PAYLOAD
    })
    return Array.from(byYear.values())
      .map((d) => ({ year: d.year, value: d.payload ? +(d.cargoWeight / d.payload * 100).toFixed(1) : 0 }))
      .sort((a, b) => a.year - b.year)
  }, [classGSegmentNoYear])

  const classGFreightUtilByRoute = useMemo(() => {
    const byRoute = new Map()
    classGSegment.forEach((d) => {
      if (d.PAYLOAD <= 0 || d.DEPARTURES_PERFORMED <= 0) return
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} → ${d.DEST_FULL_LABEL || d.DEST}`
      if (!byRoute.has(label)) byRoute.set(label, { label, cargoWeight: 0, payload: 0, deps: 0 })
      const row = byRoute.get(label)
      row.cargoWeight += d.FREIGHT + d.MAIL
      row.payload += d.PAYLOAD
      row.deps += d.DEPARTURES_PERFORMED
    })
    return Array.from(byRoute.values())
      .filter((d) => d.deps >= 5) // minimum 5 departures to avoid noise
      .map((d) => ({ label: d.label, value: d.payload ? +(d.cargoWeight / d.payload * 100).toFixed(1) : 0, deps: d.deps }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [classGSegment])

  const classGStats = useMemo(() => {
    if (!classGSegment.length) return null
    const totalDeps = classGSegment.reduce((s, d) => s + d.DEPARTURES_PERFORMED, 0)
    const totalFreight = classGSegment.reduce((s, d) => s + d.FREIGHT, 0)
    const totalPayload = classGSegment.reduce((s, d) => s + d.PAYLOAD, 0)
    const carriers = new Set(classGSegment.map((d) => d.CARRIER_NAME).filter(Boolean))
    return {
      totalDeps,
      totalFreight,
      avgUtil: totalPayload > 0 ? +(totalFreight / totalPayload * 100).toFixed(1) : 0,
      carrierCount: carriers.size,
    }
  }, [classGSegment])

  /* ── freight trends (bidirectional, year-agnostic) ──────────────── */
  const freightTrend = useMemo(() => {
    const byYD = new Map()
    filteredNoYear.forEach((d) => {
      const dir = isTxToMx(d) ? 'TX → MX (Exports)' : 'MX → TX (Imports)'
      const key = `${d.YEAR}|${dir}`
      if (!byYD.has(key)) byYD.set(key, { year: d.YEAR, value: 0, Direction: dir })
      byYD.get(key).value += d.FREIGHT
    })
    return Array.from(byYD.values()).sort((a, b) => a.year - b.year || a.Direction.localeCompare(b.Direction))
  }, [filteredNoYear])

  /* ── freight imbalance by TX airport ─────────────────────────────── */
  const freightImbalance = useMemo(() => {
    const byAirport = new Map()
    filtered.forEach((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      const txLabel = isTxToMx(d) ? (d.ORIGIN_FULL_LABEL || d.ORIGIN) : (d.DEST_FULL_LABEL || d.DEST)
      if (!byAirport.has(txCode)) byAirport.set(txCode, { label: txLabel, exports: 0, imports: 0 })
      const row = byAirport.get(txCode)
      if (isTxToMx(d)) row.exports += d.FREIGHT
      else row.imports += d.FREIGHT
    })
    return Array.from(byAirport.values())
      .filter((d) => d.exports > 0 || d.imports > 0)
      .sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
      .slice(0, 12)
  }, [filtered])

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

  /* ── border vs non-border airport analysis ────────────────────────── */
  const borderPaxShare = useMemo(() => {
    let borderPax = 0, nonBorderPax = 0
    filtered.forEach((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      if (BORDER_AIRPORTS.has(txCode)) borderPax += d.PASSENGERS
      else nonBorderPax += d.PASSENGERS
    })
    if (!borderPax && !nonBorderPax) return []
    return [
      { label: 'Border Airports', value: borderPax },
      { label: 'Non-Border Airports', value: nonBorderPax },
    ]
  }, [filtered])

  const borderCargoShare = useMemo(() => {
    let borderCargo = 0, nonBorderCargo = 0
    filtered.forEach((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      if (BORDER_AIRPORTS.has(txCode)) borderCargo += d.FREIGHT
      else nonBorderCargo += d.FREIGHT
    })
    if (!borderCargo && !nonBorderCargo) return []
    return [
      { label: 'Border Airports', value: borderCargo },
      { label: 'Non-Border Airports', value: nonBorderCargo },
    ]
  }, [filtered])

  const borderSummaryTable = useMemo(() => {
    const byAirport = new Map()
    let totalPax = 0, totalFreight = 0
    filtered.forEach((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      const txLabel = isTxToMx(d) ? (d.ORIGIN_FULL_LABEL || d.ORIGIN) : (d.DEST_FULL_LABEL || d.DEST)
      const txCity = isTxToMx(d) ? d.ORIGIN_CITY_NAME : d.DEST_CITY_NAME
      if (!byAirport.has(txCode)) {
        byAirport.set(txCode, {
          Code: txCode, Airport: txLabel, City: txCity,
          Type: BORDER_AIRPORTS.has(txCode) ? 'Border Airport' : 'Non-Border Airport',
          Passengers: 0, Freight: 0,
        })
      }
      const row = byAirport.get(txCode)
      row.Passengers += d.PASSENGERS
      row.Freight += d.FREIGHT
      totalPax += d.PASSENGERS
      totalFreight += d.FREIGHT
    })
    return Array.from(byAirport.values())
      .map((r) => ({
        ...r,
        PctPax: totalPax ? ((r.Passengers / totalPax) * 100).toFixed(1) + '%' : '0%',
        PctFreight: totalFreight ? ((r.Freight / totalFreight) * 100).toFixed(1) + '%' : '0%',
      }))
      .sort((a, b) => b.Passengers - a.Passengers)
  }, [filtered])

  const borderInsight = useMemo(() => {
    if (!borderPaxShare.length) return null
    const paxBorder = borderPaxShare.find((d) => d.label === 'Border Airports')?.value || 0
    const paxTotal = borderPaxShare.reduce((s, d) => s + d.value, 0)
    const cargoBorder = borderCargoShare.find((d) => d.label === 'Border Airports')?.value || 0
    const cargoTotal = borderCargoShare.reduce((s, d) => s + d.value, 0)
    return {
      paxPct: paxTotal ? (paxBorder / paxTotal * 100).toFixed(1) : '0',
      cargoPct: cargoTotal ? (cargoBorder / cargoTotal * 100).toFixed(1) : '0',
    }
  }, [borderPaxShare, borderCargoShare])

  /* ── scatter plot scale toggle ───────────────────────────────────── */
  const [scatterScale, setScatterScale] = useState('symlog')

  /* ── O-D matrix for border airports ──────────────────────────────── */
  const [matrixMetric, setMatrixMetric] = useState('passengers')

  const odMatrixData = useMemo(() => {
    const field = matrixMetric === 'passengers' ? 'PASSENGERS' : 'FREIGHT'
    const borderRows = new Map()
    const mxCols = new Set()

    filtered.forEach((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      const mxCode = isTxToMx(d) ? d.DEST : d.ORIGIN
      if (!BORDER_AIRPORTS.has(txCode)) return

      if (!borderRows.has(txCode)) borderRows.set(txCode, new Map())
      const row = borderRows.get(txCode)
      row.set(mxCode, (row.get(mxCode) || 0) + d[field])
      mxCols.add(mxCode)
    })

    const colLabels = [...mxCols].sort()
    const borderOrder = BORDER_AIRPORT_LIST.map((a) => a.code)
    const rowLabels = [...borderRows.keys()].sort(
      (a, b) => borderOrder.indexOf(a) - borderOrder.indexOf(b)
    )
    const cells = rowLabels.map((r) =>
      colLabels.map((c) => borderRows.get(r)?.get(c) || 0)
    )

    return { rowLabels, colLabels, cells }
  }, [filtered, matrixMetric])

  /* ── route evolution data (animated map + bar chart race) ───────────── */
  const routeEvolutionData = useMemo(() => {
    const field = matrixMetric === 'passengers' ? 'PASSENGERS' : 'FREIGHT'

    const borderData = filteredNoYear.filter((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      return BORDER_AIRPORTS.has(txCode)
    })

    const years = [...new Set(borderData.map((d) => d.YEAR))].sort()
    if (!years.length) return { years: [], mapFrames: [], raceFrames: [], globalMax: 0 }

    let globalMax = 0
    const mapFrames = []
    const raceFrames = []

    for (const year of years) {
      const yearData = borderData.filter((d) => d.YEAR === year)

      // Map frame — color routes by TX border airport origin
      const routes = aggregateRoutes(yearData, airportIndex, field)
      for (const r of routes) {
        const txCode = BORDER_AIRPORTS.has(r.origin) ? r.origin : r.dest
        r.color = ORIGIN_COLORS[txCode] || null
      }
      const volumes = aggregateAirportVolumes(yearData, field)
      const seen = new Set()
      const airports = []
      for (const d of yearData) {
        for (const code of [d.ORIGIN, d.DEST]) {
          if (seen.has(code)) continue
          seen.add(code)
          const info = airportIndex?.get(code)
          if (!info?.lat) continue
          const isOrigin = code === d.ORIGIN
          airports.push({
            iata: code, name: info.name,
            city: isOrigin ? d.ORIGIN_CITY_NAME : d.DEST_CITY_NAME,
            country: isOrigin ? d.ORIGIN_COUNTRY_NAME : d.DEST_COUNTRY_NAME,
            lat: info.lat, lng: info.lng,
            volume: volumes.get(code) || 0,
            color: BORDER_AIRPORTS.has(code) ? ORIGIN_COLORS[code] : '#6b7280',
          })
        }
      }
      mapFrames.push({ year, routes, airports })

      // Race frame
      const byRoute = new Map()
      yearData.forEach((d) => {
        const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
        const mxCode = isTxToMx(d) ? d.DEST : d.ORIGIN
        const key = `${txCode}-${mxCode}`
        const txName = airportIndex?.get(txCode)?.name || txCode
        const mxName = airportIndex?.get(mxCode)?.name || mxCode
        const route = `${txName} → ${mxName}`
        if (!byRoute.has(key)) byRoute.set(key, { route, value: 0, origin: txCode })
        byRoute.get(key).value += d[field]
      })
      const sorted = [...byRoute.values()].sort((a, b) => b.value - a.value)
      sorted.forEach((r) => { if (r.value > globalMax) globalMax = r.value })
      raceFrames.push({ year, routes: sorted })
    }

    return { years, mapFrames, raceFrames, globalMax }
  }, [filteredNoYear, airportIndex, matrixMetric])

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
    { key: 'Origin', label: 'Origin', wrap: true },
    { key: 'Dest', label: 'Destination', wrap: true },
    { key: 'Carrier', label: 'Carrier', wrap: true },
    { key: 'Passengers', label: 'Passengers', render: (v) => formatNumber(v) },
    { key: 'Freight', label: 'Freight (lbs)', render: (v) => formatNumber(v) },
    { key: 'Mail', label: 'Mail (lbs)', render: (v) => formatNumber(v) },
  ]

  /* ── service class breakdown ─────────────────────────────────────── */
  const serviceClassShare = useMemo(() => {
    const byClass = new Map()
    filteredSegment.forEach((d) => {
      const cls = d.CLASS || 'Unknown'
      byClass.set(cls, (byClass.get(cls) || 0) + d.DEPARTURES_PERFORMED)
    })
    return Array.from(byClass, ([cls, value]) => ({
      label: CLASS_LABELS[cls] || cls,
      value,
    })).sort((a, b) => b.value - a.value)
  }, [filteredSegment])

  const serviceClassTrend = useMemo(() => {
    const byYC = new Map()
    filteredSegmentNoYear.forEach((d) => {
      const cls = CLASS_LABELS[d.CLASS] || d.CLASS || 'Unknown'
      const key = `${d.YEAR}|${cls}`
      if (!byYC.has(key)) byYC.set(key, { year: d.YEAR, value: 0, Class: cls })
      byYC.get(key).value += d.DEPARTURES_PERFORMED
    })
    return Array.from(byYC.values()).sort((a, b) => a.year - b.year || a.Class.localeCompare(b.Class))
  }, [filteredSegmentNoYear])

  // Wide-format pivot for StackedBarChart: { year, 'Class F – ...': val, 'Class G – ...': val, ... }
  const serviceClassTrendWide = useMemo(() => {
    const classes = [...new Set(serviceClassTrend.map((d) => d.Class))].sort()
    const byYear = new Map()
    serviceClassTrend.forEach((d) => {
      if (!byYear.has(d.year)) {
        const row = { year: d.year }
        classes.forEach((c) => { row[c] = 0 })
        byYear.set(d.year, row)
      }
      byYear.get(d.year)[d.Class] = d.value
    })
    return { data: Array.from(byYear.values()).sort((a, b) => a.year - b.year), keys: classes }
  }, [serviceClassTrend])

  /* ── aircraft mix ──────────────────────────────────────────────────── */
  const NB_GROUP = 6 // AIRCRAFT_GROUP code for Narrow-Body Jet

  const aircraftMixInsight = useMemo(() => {
    if (!filteredSegment.length) return null
    const byGroup = new Map()
    filteredSegment.forEach((d) => {
      const grp = d.AIRCRAFT_GROUP
      if (grp == null) return
      if (!byGroup.has(grp)) byGroup.set(grp, { deps: 0, freight: 0 })
      const row = byGroup.get(grp)
      row.deps += d.DEPARTURES_PERFORMED
      row.freight += d.FREIGHT
    })
    const totalDeps = [...byGroup.values()].reduce((s, r) => s + r.deps, 0)
    const totalFreight = [...byGroup.values()].reduce((s, r) => s + r.freight, 0)
    if (!totalDeps || !totalFreight) return null
    const nb = byGroup.get(NB_GROUP) || { deps: 0, freight: 0 }
    const nbDepPct = ((nb.deps / totalDeps) * 100).toFixed(1)
    const nbFreightPct = ((nb.freight / totalFreight) * 100).toFixed(1)
    const nonNbFreightPct = (100 - parseFloat(nbFreightPct)).toFixed(0)
    const nonNbDepPct = (100 - parseFloat(nbDepPct)).toFixed(1)
    return { nbDepPct, nbFreightPct, nonNbFreightPct, nonNbDepPct }
  }, [filteredSegment])

  const aircraftFreightByYear = useMemo(() => {
    const byYG = new Map()
    const groups = new Set()
    filteredSegmentNoYear.forEach((d) => {
      const grp = d.AIRCRAFT_GROUP
      if (grp == null) return
      const label = AIRCRAFT_GROUP_LABELS[grp] || `Group ${grp}`
      groups.add(label)
      if (!byYG.has(d.YEAR)) byYG.set(d.YEAR, { year: d.YEAR })
      byYG.get(d.YEAR)[label] = (byYG.get(d.YEAR)[label] || 0) + d.FREIGHT
    })
    const groupTotals = new Map()
    groups.forEach((g) => {
      let total = 0
      byYG.forEach((row) => { total += row[g] || 0 })
      groupTotals.set(g, total)
    })
    const sortedGroups = [...groups].sort((a, b) => groupTotals.get(b) - groupTotals.get(a))
    const data = Array.from(byYG.values())
      .map((row) => {
        sortedGroups.forEach((g) => { if (!(g in row)) row[g] = 0 })
        return row
      })
      .sort((a, b) => a.year - b.year)
    return { data, keys: sortedGroups }
  }, [filteredSegmentNoYear])

  const aircraftFreightIntensity = useMemo(() => {
    const byGroup = new Map()
    let totalDeps = 0
    filteredSegment.forEach((d) => {
      const grp = d.AIRCRAFT_GROUP
      if (grp == null || d.DEPARTURES_PERFORMED <= 0) return
      totalDeps += d.DEPARTURES_PERFORMED
      const label = AIRCRAFT_GROUP_LABELS[grp] || `Group ${grp}`
      if (!byGroup.has(label)) byGroup.set(label, { freight: 0, deps: 0 })
      const row = byGroup.get(label)
      row.freight += d.FREIGHT
      row.deps += d.DEPARTURES_PERFORMED
    })
    return Array.from(byGroup, ([label, r]) => ({
      label,
      value: r.deps > 0 ? Math.round(r.freight / r.deps) : 0,
      deps: r.deps,
      depPct: totalDeps > 0
        ? ((r.deps / totalDeps) * 100) < 0.05 ? '< 0.1' : ((r.deps / totalDeps) * 100).toFixed(1)
        : '0',
      freight: r.freight,
    }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [filteredSegment])

  const nonNbCargoCarriers = useMemo(() => {
    const byCarrier = new Map()
    filteredSegment.forEach((d) => {
      if (d.AIRCRAFT_GROUP == null || d.AIRCRAFT_GROUP === NB_GROUP) return
      if (d.FREIGHT <= 0 && d.DEPARTURES_PERFORMED <= 0) return
      const carrier = d.CARRIER_NAME || 'Unknown'
      byCarrier.set(carrier, (byCarrier.get(carrier) || 0) + d.FREIGHT)
    })
    return Array.from(byCarrier, ([label, value]) => ({ label, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredSegment])

  const nonNbDepTrend = useMemo(() => {
    const byYG = new Map()
    filteredSegmentNoYear.forEach((d) => {
      if (d.AIRCRAFT_GROUP == null || d.AIRCRAFT_GROUP === NB_GROUP) return
      const label = AIRCRAFT_GROUP_LABELS[d.AIRCRAFT_GROUP] || `Group ${d.AIRCRAFT_GROUP}`
      const key = `${d.YEAR}|${label}`
      if (!byYG.has(key)) byYG.set(key, { year: d.YEAR, value: 0, Aircraft: label })
      byYG.get(key).value += d.DEPARTURES_PERFORMED
    })
    return Array.from(byYG.values()).sort((a, b) => a.year - b.year || a.Aircraft.localeCompare(b.Aircraft))
  }, [filteredSegmentNoYear])

  /* ── freight per departure (segment-level intensity) ───────────────── */
  const freightPerDep = useMemo(() => {
    const byRoute = new Map()
    filteredSegment.forEach((d) => {
      if (d.DEPARTURES_PERFORMED <= 0) return
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} → ${d.DEST_FULL_LABEL || d.DEST}`
      if (!byRoute.has(label)) byRoute.set(label, { label, freight: 0, deps: 0 })
      const row = byRoute.get(label)
      row.freight += d.FREIGHT
      row.deps += d.DEPARTURES_PERFORMED
    })
    return Array.from(byRoute.values())
      .filter((d) => d.deps >= 10)
      .map((d) => ({ label: d.label, value: Math.round(d.freight / d.deps) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredSegment])

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
          region: (isOrigin ? d.ORIGIN_STATE_NM : d.DEST_STATE_NM) || '',
          lat: info.lat, lng: info.lng,
          volume: volumes.get(code) || 0,
        })
      }
    }
    return airports
  }, [mapDataSource, airportIndex, mapMetricConfig.field])

  /* ── border airport hover state ──────────────────────────────────── */
  const [hoveredBorderAirport, setHoveredBorderAirport] = useState(null)

  /* ── border airport map (intro mini-map) ─────────────────────────── */
  const borderMapAirports = useMemo(() => {
    if (!airportIndex) return []
    return BORDER_AIRPORT_LIST.map((b) => {
      const info = airportIndex.get(b.code)
      if (!info?.lat) return null
      return {
        iata: b.code,
        name: info.name,
        city: b.city,
        country: 'United States',
        lat: info.lat,
        lng: info.lng,
        volume: 1, // uniform size for intro map
      }
    }).filter(Boolean)
  }, [airportIndex])

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
          { value: 'TX_TO_MX', label: 'Texas → Mexico' },
          { value: 'MX_TO_TX', label: 'Mexico → Texas' },
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
    <div className="gradient-blue text-white relative overflow-visible">
      <HeroStardust seed={61} animate />
      <div className="container-chrome py-10 md:py-14 relative">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas&ndash;Mexico Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base">
          Comprehensive analysis using market and segment data for air travel
          between Texas and Mexico (2015&ndash;{latestYear || '…'}).
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
      filteredEmpty={!filtered.length}
      pageDownload={{
        market: { data: filtered, filename: 'texas-mexico-market-data', columns: PAGE_MARKET_COLS },
        segment: { data: filteredSegment, filename: 'texas-mexico-segment-data', columns: PAGE_SEGMENT_COLS },
      }}
    >
      {/* KPI Cards — always visible above tabs */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Texas–Mexico Passengers (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.pax) : '—'}
            trend={stats?.paxChange > 0 ? 'up' : stats?.paxChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.paxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={Users} delay={0}
          />
          <StatCard
            label={`Texas–Mexico Flights (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.flights) : '—'}
            highlight icon={Plane} delay={100}
          />
          <StatCard
            label={`Texas–Mexico Freight (${latestYear || '—'})`}
            value={stats ? fmtLbs(stats.freight) : '—'}
            highlight icon={Package} delay={200}
          />
          <StatCard
            label={`Texas–Mexico Mail (${latestYear || '—'})`}
            value={stats ? fmtLbs(stats.mail) : '—'}
            highlight icon={Package} delay={300}
          />
          <StatCard
            label={`Active Texas–Mexico Routes (${latestYear || '—'})`}
            value={stats ? String(stats.activeRoutes) : '—'}
            highlight icon={Route} delay={400}
          />
        </div>
      </SectionBlock>

      {/* Tab Bar — sticky on scroll so users can switch tabs without scrolling back up */}
      <div ref={tabBarRef} className="sticky top-0 z-40 shadow-sm">
          <TabBar
            tabs={TAB_CONFIG}
            activeTab={activeTab}
            onChange={handleTabChange}
            idPrefix="txmx-tab"
          />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div role="tabpanel" id="txmx-tab-panel-overview" aria-labelledby="txmx-tab-overview">
          <OverviewTab
            mapAirports={mapAirports}
            mapRoutes={mapRoutes}
            mapMetric={mapMetric}
            setMapMetric={setMapMetric}
            mapMetricConfig={mapMetricConfig}
            selectedAirport={selectedAirport}
            setSelectedAirport={setSelectedAirport}
            paxTrend={paxTrend}
            flightTrend={flightTrend}
            freightTrend={freightTrend}
            mailTrend={mailTrend}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'passengers' && (
        <div role="tabpanel" id="txmx-tab-panel-passengers" aria-labelledby="txmx-tab-passengers">
          <PassengersRoutesTab
            topRoutes={topRoutes}
            topTxAirports={topTxAirports}
            topMxAirports={topMxAirports}
            topMxStates={topMxStates}
            carrierMarketShare={carrierMarketShare}
            tableData={tableData}
            tableColumns={tableColumns}
            filters={filters}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'operations' && (
        <div role="tabpanel" id="txmx-tab-panel-operations" aria-labelledby="txmx-tab-operations">
          <OperationsCapacityTab
            seatTrend={seatTrend}
            depTrend={depTrend}
            filteredSegment={filteredSegment}
            loadFactorTrend={loadFactorTrend}
            loadFactorDistribution={loadFactorDistribution}
            payloadUtilTrend={payloadUtilTrend}
            serviceClassShare={serviceClassShare}
            serviceClassTrend={serviceClassTrend}
            serviceClassTrendWide={serviceClassTrendWide}
            aircraftMixInsight={aircraftMixInsight}
            aircraftFreightByYear={aircraftFreightByYear}
            aircraftFreightIntensity={aircraftFreightIntensity}
            nonNbCargoCarriers={nonNbCargoCarriers}
            nonNbDepTrend={nonNbDepTrend}
          />
        </div>
      )}
      {activeTab === 'cargo' && (
        <div role="tabpanel" id="txmx-tab-panel-cargo" aria-labelledby="txmx-tab-cargo">
          <CargoTradeTab
            freightTrend={freightTrend}
            mailTrend={mailTrend}
            freightImbalance={freightImbalance}
            freightPerDep={freightPerDep}
            borderSummaryTable={borderSummaryTable}
            scatterScale={scatterScale}
            setScatterScale={setScatterScale}
            classGFreightUtilTrend={classGFreightUtilTrend}
            classGFreightUtilByRoute={classGFreightUtilByRoute}
            classGStats={classGStats}
          />
        </div>
      )}
      {activeTab === 'border' && (
        <div role="tabpanel" id="txmx-tab-panel-border" aria-labelledby="txmx-tab-border">
          <BorderAirportsTab
            borderMapAirports={borderMapAirports}
            hoveredBorderAirport={hoveredBorderAirport}
            setHoveredBorderAirport={setHoveredBorderAirport}
            borderPaxShare={borderPaxShare}
            borderCargoShare={borderCargoShare}
            borderInsight={borderInsight}
            odMatrixData={odMatrixData}
            matrixMetric={matrixMetric}
            setMatrixMetric={setMatrixMetric}
            airportIndex={airportIndex}
            routeEvolutionData={routeEvolutionData}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
