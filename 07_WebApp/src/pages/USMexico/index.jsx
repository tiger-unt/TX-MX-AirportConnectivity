import { useMemo, useState, useEffect } from 'react'
import { Users, PieChart, MapPin, Route, Package, Award, AlertTriangle } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import HeroStardust from '@/components/ui/HeroStardust'
import { fmtCompact, fmtLbs, isUsToMx, isMxToUs, computeAdherenceData, isEmptyOrAllZero, CLASS_LABELS, CARRIER_TYPE_LABELS, getCarrierType, MAP_METRIC_OPTIONS } from '@/lib/aviationHelpers'
import { useCascadingFilters } from '@/lib/useCascadingFilters'
import { CHART_COLORS } from '@/lib/chartColors'
import { aggregateRoutes, aggregateAirportVolumes } from '@/lib/airportUtils'
import { DL, PAGE_MARKET_COLS, PAGE_SEGMENT_COLS } from '@/lib/downloadColumns'
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
import BoxPlotChart from '@/components/charts/BoxPlotChart'
import InsightCallout from '@/components/ui/InsightCallout'

const isUsMx = (d) => isUsToMx(d) || isMxToUs(d)

function aggregateByUsState(data, field, sidebarDirection) {
  const byState = new Map()
  const doExport = sidebarDirection !== 'MX_TO_US'
  const doImport = sidebarDirection !== 'US_TO_MX'
  if (doExport) {
    data.filter(isUsToMx).forEach((d) => {
      if (!d.ORIGIN_STATE_NM) return
      byState.set(d.ORIGIN_STATE_NM, (byState.get(d.ORIGIN_STATE_NM) || 0) + d[field])
    })
  }
  if (doImport) {
    data.filter(isMxToUs).forEach((d) => {
      if (!d.DEST_STATE_NM) return
      byState.set(d.DEST_STATE_NM, (byState.get(d.DEST_STATE_NM) || 0) + d[field])
    })
  }
  return byState
}

/* ── COVID annotation for trend charts ─────────────────────────────── */
const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

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
  const [mapMetric, setMapMetric] = useState('FLIGHTS')
  const mapMetricConfig = MAP_METRIC_OPTIONS.find((m) => m.value === mapMetric)

  // Reset stale direction filter carried from other pages
  useEffect(() => {
    if (filters.direction && filters.direction !== 'US_TO_MX' && filters.direction !== 'MX_TO_US') {
      setFilter('direction', '')
    }
  }, [filters.direction, setFilter])

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

  /* ── year-agnostic filtered data (for trend charts) ──────────────── */
  const filteredNoYear = useMemo(() => {
    let data = baseMarket
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

  const filteredSegmentNoYear = useMemo(() => {
    let data = baseSegment
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

  /* ── Schedule Adherence: local year selector ───────────────────────── */
  const [adherenceYear, setAdherenceYear] = useState('')
  const [lfView, setLfView] = useState('box')              // 'line' | 'box'
  const adherenceYears = useMemo(() =>
    [...new Set(filteredSegment.map((d) => d.YEAR))].sort((a, b) => a - b),
  [filteredSegment])
  const adherenceData = useMemo(() => {
    const data = adherenceYear
      ? filteredSegment.filter((d) => d.YEAR === Number(adherenceYear))
      : filteredSegment
    return computeAdherenceData(data)
  }, [filteredSegment, adherenceYear])

  /* ── seat capacity & load factor (year-agnostic — trends) ──────────── */
  const seatTrend = useMemo(() => {
    const byYear = new Map()
    filteredSegmentNoYear.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.SEATS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredSegmentNoYear])

  const loadFactorTrend = useMemo(() => {
    const byYD = new Map()
    filteredSegmentNoYear.forEach((d) => {
      if (d.SEATS <= 0) return
      const dir = isUsToMx(d) ? 'U.S. → Mexico' : 'Mexico → U.S.'
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
      label: filters.direction === 'US_TO_MX' ? 'U.S. → Mexico' : 'Mexico → U.S.',
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
    const txShare = totalUsToMx ? (txPax / totalUsToMx * 100).toFixed(1) + '%' : '—'

    // US states serving Mexico
    const stateSet = new Set(usToMxLatest.map((d) => d.ORIGIN_STATE_NM).filter(Boolean))

    // Top route (short IATA codes for card display, full names for tooltip)
    const byRoute = new Map()
    latest.forEach((d) => {
      const code = `${d.ORIGIN}–${d.DEST}`
      const full = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} – ${d.DEST_FULL_LABEL || d.DEST}`
      const prev = byRoute.get(code) || { pax: 0, full }
      byRoute.set(code, { pax: prev.pax + d.PASSENGERS, full: prev.full })
    })
    let topRoute = '—'
    let topRouteFull = ''
    if (byRoute.size) {
      const [code, { full }] = [...byRoute.entries()].sort((a, b) => b[1].pax - a[1].pax)[0]
      topRoute = code
      topRouteFull = full
    }

    return { pax, paxChange, txShare, usStates: stateSet.size, topRoute, topRouteFull, latestYear, prevYear }
  }, [filtered, latestYear])

  /* ── trends (year-agnostic — not affected by year filter) ──────────── */
  const paxTrend = useMemo(() => {
    const byYear = new Map()
    filteredNoYear.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.PASSENGERS)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredNoYear])

  const flightTrend = useMemo(() => {
    const byYear = new Map()
    filteredSegmentNoYear.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.DEPARTURES_PERFORMED)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredSegmentNoYear])

  const freightTrend = useMemo(() => {
    const byYear = new Map()
    filteredNoYear.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.FREIGHT)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredNoYear])

  const mailTrend = useMemo(() => {
    const byYear = new Map()
    filteredNoYear.forEach((d) => {
      byYear.set(d.YEAR, (byYear.get(d.YEAR) || 0) + d.MAIL)
    })
    return Array.from(byYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)
  }, [filteredNoYear])

  /* ── TX share donut ────────────────────────────────────────────────── */
  const txShareData = useMemo(() => {
    const byState = aggregateByUsState(filtered, 'PASSENGERS', filters.direction)
    const txTotal = byState.get('Texas') || 0
    let otherTotal = 0
    byState.forEach((v, k) => { if (k !== 'Texas') otherTotal += v })
    if (txTotal === 0 && otherTotal === 0) return []
    return [
      { label: 'Texas', value: txTotal },
      { label: 'Other States', value: otherTotal },
    ]
  }, [filtered, filters.direction])

  /* ── top US states ─────────────────────────────────────────────────── */
  const topStates = useMemo(() => {
    const byState = aggregateByUsState(filtered, 'PASSENGERS', filters.direction)
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered, filters.direction])

  /* ── state ranking: passengers vs cargo ───────────────────────────── */
  const stateRankingCargo = useMemo(() => {
    const byState = aggregateByUsState(filtered, 'FREIGHT', filters.direction)
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filtered, filters.direction])

  const stateRankingPax = useMemo(() => {
    const byState = aggregateByUsState(filtered, 'PASSENGERS', filters.direction)
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filtered, filters.direction])

  /* Latest-year national totals & rankings for consistent TX share % (matches KPI card) */
  const latestYearData = useMemo(() => {
    if (!latestYear) return []
    return filtered.filter((d) => d.YEAR === latestYear)
  }, [filtered, latestYear])

  const nationalTotalsLatest = useMemo(() => {
    if (!latestYearData.length) return { totalPax: 0, totalCargo: 0 }
    const byState = aggregateByUsState(latestYearData, 'PASSENGERS', filters.direction)
    const totalPax = Array.from(byState.values()).reduce((s, v) => s + v, 0)
    const byStateCargo = aggregateByUsState(latestYearData, 'FREIGHT', filters.direction)
    const totalCargo = Array.from(byStateCargo.values()).reduce((s, v) => s + v, 0)
    return { totalPax, totalCargo }
  }, [latestYearData, filters.direction])

  const stateRankingPaxLatest = useMemo(() => {
    if (!latestYearData.length) return []
    const byState = aggregateByUsState(latestYearData, 'PASSENGERS', filters.direction)
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [latestYearData, filters.direction])

  const stateRankingCargoLatest = useMemo(() => {
    if (!latestYearData.length) return []
    const byState = aggregateByUsState(latestYearData, 'FREIGHT', filters.direction)
    return Array.from(byState, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [latestYearData, filters.direction])

  const txRankStats = useMemo(() => {
    const paxRank = stateRankingPaxLatest.findIndex((d) => d.label === 'Texas') + 1
    const cargoRank = stateRankingCargoLatest.findIndex((d) => d.label === 'Texas') + 1
    const txPax = stateRankingPaxLatest.find((d) => d.label === 'Texas')?.value || 0
    const paxPct = nationalTotalsLatest.totalPax ? (txPax / nationalTotalsLatest.totalPax * 100).toFixed(1) : '0'
    const txCargo = stateRankingCargoLatest.find((d) => d.label === 'Texas')?.value || 0
    const cargoPct = nationalTotalsLatest.totalCargo ? (txCargo / nationalTotalsLatest.totalCargo * 100).toFixed(1) : '0'
    return { paxRank: paxRank || '-', paxPct, cargoRank: cargoRank || '-', cargoPct }
  }, [stateRankingPaxLatest, stateRankingCargoLatest, nationalTotalsLatest])

  /* ── storytelling insights ───────────────────────────────────────── */
  const loadFactorInsight = useMemo(() => {
    if (!loadFactorTrend.length || !latestYear) return null
    const latestRows = loadFactorTrend.filter((d) => d.year === latestYear)
    if (!latestRows.length) return null
    const avg = latestRows.reduce((s, d) => s + d.value, 0) / latestRows.length
    return { avg: avg.toFixed(1) }
  }, [loadFactorTrend, latestYear])

  /* ── top routes ────────────────────────────────────────────────────── */
  const topRoutes = useMemo(() => {
    const byRoute = new Map()
    filtered.forEach((d) => {
      const airports = [d.ORIGIN, d.DEST].sort()
      const label = `${d.ORIGIN_FULL_LABEL || d.ORIGIN} → ${d.DEST_FULL_LABEL || d.DEST}`
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
          region: (isOrigin ? d.ORIGIN_STATE_NM : d.DEST_STATE_NM) || '',
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
          { value: 'US_TO_MX', label: 'U.S. → Mexico' },
          { value: 'MX_TO_US', label: 'Mexico → U.S.' },
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
    <div className="gradient-blue text-white relative overflow-visible">
      <HeroStardust seed={47} animate />
      <div className="container-chrome py-10 md:py-14 relative">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          U.S.&ndash;Mexico Air Connectivity
        </h2>
        <p className="text-white/70 mt-2 text-base">
          National perspective on cross-border air traffic, with Texas&rsquo;s role
          as a gateway (2015&ndash;{latestYear || '…'}).
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
        market: { data: filtered, filename: 'us-mexico-market-data', columns: PAGE_MARKET_COLS },
        segment: { data: filteredSegment, filename: 'us-mexico-segment-data', columns: PAGE_SEGMENT_COLS },
      }}
    >
      {/* Page Introduction */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-base text-text-secondary leading-relaxed">
            Air travel between the United States and Mexico forms one of the world&rsquo;s
            busiest bilateral corridors. Texas serves as the primary gateway &mdash; more
            U.S.-Mexico passengers depart from Texas airports than from any other state.
            This page provides a national perspective on the cross-border market and
            Texas&rsquo;s outsized role in it, from 2015 to {latestYear || '…'}.
          </p>
          <p className="text-base text-text-secondary/70 leading-relaxed italic">
            Scope: all U.S.&ndash;Mexico air traffic nationwide, both directions. For Texas-specific
            analysis, see the <a href="#/texas-mexico" className="text-brand-blue underline hover:text-brand-blue/80">Texas&ndash;Mexico</a> page.
          </p>
          {txRankStats.paxRank && txRankStats.paxRank !== '-' && (
            <InsightCallout
              finding={`Texas ranks #${txRankStats.paxRank} among all U.S. states for Mexico-bound air passengers, carrying ${txRankStats.paxPct}% of the national total.`}
              variant="default"
              icon={Award}
            />
          )}
          {loadFactorInsight && (
            <InsightCallout
              finding={`Average passenger load factor on U.S.–Mexico routes was ${loadFactorInsight.avg}% in ${latestYear}.`}
              context="Passenger load factor = Passengers ÷ Seats. Values above 80% typically signal high demand relative to available capacity."
              variant="default"
              icon={Users}
            />
          )}
        </div>
      </SectionBlock>

      {/* KPI Cards */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`U.S.–Mexico Passengers (${latestYear || '—'})`}
            value={stats ? fmtCompact(stats.pax) : '—'}
            trend={stats?.paxChange > 0 ? 'up' : stats?.paxChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.paxChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={Users} delay={0}
          />
          <StatCard
            label={`Texas Share (${latestYear || '—'})`}
            value={stats?.txShare || '—'}
            highlight icon={PieChart} delay={100}
          />
          <StatCard
            label={`U.S. States Serving Mexico (${latestYear || '—'})`}
            value={stats ? String(stats.usStates) : '—'}
            highlight icon={MapPin} delay={200}
          />
          <StatCard
            label={`Top U.S.–Mexico Route (${latestYear || '—'})`}
            value={stats?.topRoute || '—'}
            title={stats?.topRouteFull ? `${stats.topRouteFull} was the top U.S.–Mexico route in ${stats.latestYear}` : undefined}
            highlight icon={Route} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Map */}
      <SectionBlock>
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
      <SectionBlock alt>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartCard
            title="U.S.–Mexico Passenger Trends"
            subtitle="Total passengers by year (both directions)"
            downloadData={{ summary: { data: paxTrend, filename: 'us-mx-passenger-trends', columns: DL.paxTrend } }}
          >
            <LineChart data={paxTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="U.S.–Mexico Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{ summary: { data: flightTrend, filename: 'us-mx-flight-trends', columns: DL.flightTrend } }}
          >
            <LineChart data={flightTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="U.S.–Mexico Freight Trends"
            subtitle="Freight volume by year (lbs)"
            downloadData={{ summary: { data: freightTrend, filename: 'us-mx-freight-trends', columns: DL.freightTrend } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="U.S.–Mexico Mail Trends"
            subtitle="Mail volume by year (lbs)"
            downloadData={{ summary: { data: mailTrend, filename: 'us-mx-mail-trends', columns: DL.mailTrend } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* TX Share + Top States */}
      <SectionBlock>
        <div className="mb-4">
          <p className="text-base text-text-secondary">
            Texas&rsquo;s geographic position and major hub airports give it an outsized role in the national U.S.-Mexico market.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard
            title="Texas Share of U.S.–Mexico Air Traffic"
            subtitle={`Passengers, ${filters.direction === 'US_TO_MX' ? 'U.S. → Mexico' : filters.direction === 'MX_TO_US' ? 'Mexico → U.S.' : 'both directions'} (all filtered years)`}
            downloadData={{ summary: { data: txShareData, filename: `tx-share-us-mx-${filters.direction || 'both'}`, columns: DL.regionPax } }}
            emptyState={isEmptyOrAllZero(txShareData) ? 'No passenger data for the current filter selection. Cargo (Class G) flights do not carry passengers.' : null}
            footnote={<p className="text-base text-text-secondary mt-1 italic">Texas's dominant share reflects both geographic proximity to Mexico and the state's concentration of major hub airports.</p>}
          >
            <DonutChart data={txShareData} formatValue={fmtCompact} maxSize={250} />
          </ChartCard>
          <ChartCard
            className="lg:col-span-2"
            title="Top U.S. States Serving Mexico"
            subtitle={`Top 10 by passengers, ${filters.direction === 'US_TO_MX' ? 'U.S. → Mexico' : filters.direction === 'MX_TO_US' ? 'Mexico → U.S.' : 'both directions'} (all filtered years)`}
            downloadData={{ summary: { data: topStates, filename: `top-us-states-to-mexico-${filters.direction || 'both'}`, columns: DL.statesPax } }}
            emptyState={isEmptyOrAllZero(topStates) ? 'No passenger data for the current filter selection. Cargo (Class G) flights do not carry passengers.' : null}
          >
            <BarChart data={topStates} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* TX National Ranking: Passengers vs Cargo */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-5">
          <StatCard
            label={`TX Passenger Rank (${latestYear || '—'})`}
            value={`#${txRankStats.paxRank} (${txRankStats.paxPct}%)`}
            highlight variant="primary" icon={Users}
          />
          <StatCard
            label={`TX Cargo Rank (${latestYear || '—'})`}
            value={`#${txRankStats.cargoRank} (${txRankStats.cargoPct}%)`}
            highlight icon={Package}
          />
        </div>
        {txRankStats.paxRank && txRankStats.cargoRank && txRankStats.paxRank !== '-' && txRankStats.cargoRank !== '-' && Number(txRankStats.cargoRank) > Number(txRankStats.paxRank) && (
          <div className="mb-5">
            <InsightCallout
              finding={`Texas ranks #${txRankStats.paxRank} for U.S.–Mexico air passengers but only #${txRankStats.cargoRank} for air cargo — a striking disparity.`}
              context="Texas's proximity to Mexico means most cross-border cargo can move overland at lower cost than by air. States farther from the border (Kentucky, California, Alaska) rely more heavily on air freight, pushing Texas down in cargo rankings despite its dominant passenger position."
              variant="warning"
              icon={AlertTriangle}
            />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="U.S. States by Mexico Passengers"
            subtitle={`Top 15 states, ${filters.direction === 'US_TO_MX' ? 'U.S. → Mexico' : filters.direction === 'MX_TO_US' ? 'Mexico → U.S.' : 'both directions'}`}
            downloadData={{ summary: { data: stateRankingPax, filename: `us-states-mx-passengers-${filters.direction || 'both'}`, columns: DL.statesPax } }}
            emptyState={isEmptyOrAllZero(stateRankingPax) ? 'No passenger data for the current filter selection. Cargo (Class G) flights do not carry passengers.' : null}
          >
            <BarChart data={stateRankingPax} xKey="label" yKey="value" horizontal formatValue={fmtCompact} selectedBar="Texas" />
          </ChartCard>
          <ChartCard
            title="U.S. States by Mexico Cargo"
            subtitle={`Top 15 states, ${filters.direction === 'US_TO_MX' ? 'U.S. → Mexico' : filters.direction === 'MX_TO_US' ? 'Mexico → U.S.' : 'both directions'} (freight lbs)`}
            downloadData={{ summary: { data: stateRankingCargo, filename: `us-states-mx-cargo-${filters.direction || 'both'}`, columns: DL.statesCargo } }}
          >
            <BarChart data={stateRankingCargo} xKey="label" yKey="value" horizontal formatValue={fmtLbs} selectedBar="Texas" />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top Routes */}
      <SectionBlock>
        <ChartCard
          title="Top U.S.–Mexico Routes"
          subtitle="Top 10 by passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'top-us-mx-routes', columns: DL.routesPax } }}
          emptyState={isEmptyOrAllZero(topRoutes) ? 'No passenger data for the current filter selection. Cargo (Class G) flights do not carry passengers.' : null}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Operations (segment) */}
      <SectionBlock alt>
        <ChartCard
          title="Schedule Adherence"
          subtitle={`Class F scheduled service, U.S. carriers only — departure-weighted${adherenceYear ? ` (${adherenceYear})` : ''}`}
          downloadData={{ summary: { data: adherenceData, filename: 'us-mx-schedule-adherence', columns: DL.adherence } }}
          emptyState={!adherenceData.length ? 'Schedule adherence is only available for Class F (Scheduled Service) U.S. carrier flights.' : null}
          headerRight={
            <select
              value={adherenceYear}
              onChange={(e) => setAdherenceYear(e.target.value)}
              className="text-base border border-gray-300 rounded px-2 py-1 bg-white text-text-primary"
            >
              <option value="">All Years</option>
              {adherenceYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          }
          footnote={
            <p className="text-base text-text-secondary mt-1 italic">
              Each bar shows the share of annual carrier-route records by how many flights were performed
              vs. scheduled. For example, &ldquo;11+ fewer flights&rdquo; means the carrier operated 11+
              fewer flights than scheduled on that route for the year &mdash; missing flights were cancelled,
              consolidated, or simply never operated. Weighted by scheduled departures.
              U.S. carriers only &mdash; foreign carriers are not required to report schedule data to BTS.
            </p>
          }
        >
          <BarChart data={adherenceData} xKey="label" yKey="value" horizontal colorAccessor={(d) => d.color} formatValue={(v) => `${v.toFixed(1)}%`} maxBars={15} animate />
        </ChartCard>
      </SectionBlock>

      {/* Seat Capacity & Load Factor */}
      <SectionBlock>
        <div className="mb-4">
          <p className="text-base text-text-secondary">
            Seat capacity and passenger load factors reveal whether airline supply is keeping pace with passenger demand.
          </p>
        </div>
        <div className="space-y-5">
          <ChartCard
            title="Seat Capacity Trends"
            subtitle="Total seats by year (segment data)"
            downloadData={{ summary: { data: seatTrend, filename: 'us-mx-seat-trends', columns: DL.seatTrend } }}
          >
            <LineChart data={seatTrend} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title={lfView === 'line' ? 'Passenger Load Factor Trends' : 'Route-Level Passenger Load Factor Distribution by Year'}
            subtitle={lfView === 'line' ? 'Passengers ÷ Seats (%) by year and direction' : 'Distribution of annual route load factors (routes with 100+ seats)'}
            downloadData={lfView === 'line'
              ? { summary: { data: loadFactorTrend, filename: 'us-mx-load-factor-trend', columns: DL.loadFactorDir } }
              : { summary: { data: loadFactorDistribution, filename: 'us-mx-load-factor-distribution', columns: DL.boxPlotPct } }}
            emptyState={lfView === 'line'
              ? (!loadFactorTrend.length ? 'Load factor requires passenger flights with seat data. Cargo-only (Class G) and charter flights may not report seat capacity.' : null)
              : (!loadFactorDistribution.length ? 'Load factor requires passenger flights with seat data. Cargo-only (Class G) and charter flights may not report seat capacity.' : null)}
            footnote={lfView === 'box' ? (
              <p className="text-base text-text-secondary mt-1 italic">
                Each box shows the middle 50% of route-level load factors for that year. The line inside each box marks the median.
                Whiskers extend to the most extreme non-outlier routes; red dots show statistical outliers (beyond 1.5&times;IQR from Q1/Q3).
                Only routes with 100+ annual seats are included.
              </p>
            ) : null}
            headerRight={
              <div className="flex rounded-md overflow-hidden border border-gray-300">
                <button
                  onClick={() => setLfView('line')}
                  className={`px-3 py-1 text-base font-medium transition-colors ${lfView === 'line' ? 'bg-brand-blue text-white' : 'bg-white text-text-primary hover:bg-gray-100'}`}
                >
                  Line Chart
                </button>
                <button
                  onClick={() => setLfView('box')}
                  className={`px-3 py-1 text-base font-medium transition-colors ${lfView === 'box' ? 'bg-brand-blue text-white' : 'bg-white text-text-primary hover:bg-gray-100'}`}
                >
                  Box Chart
                </button>
              </div>
            }
          >
            {lfView === 'line'
              ? <LineChart data={loadFactorTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={(v) => `${v}%`} annotations={COVID_ANNOTATION} />
              : <BoxPlotChart data={loadFactorDistribution} xKey="year" formatValue={(v) => `${v}%`} annotations={COVID_ANNOTATION} animate />}
          </ChartCard>
        </div>
      </SectionBlock>
    </DashboardLayout>
  )
}
