import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRightLeft, Route, Plane, Globe, ArrowRight,
  Building2, Database, TrendingUp, Layers,
  Users, PlaneTakeoff, Package, Mail, Download
} from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import {
  fmtCompact, fmtLbs, isTxMx, isTxToMx, isMxToTx,
  isTxDomestic, isTxIntl, isUsToMx, isMxToUs,
  MAP_METRIC_OPTIONS, BORDER_AIRPORTS,
} from '@/lib/aviationHelpers'
import { aggregateRoutes, aggregateAirportVolumes } from '@/lib/airportUtils'
import InsightCallout from '@/components/ui/InsightCallout'
import AirportMap from '@/components/maps/AirportMap'
import HeroStardust from '@/components/ui/HeroStardust'
import { downloadCsv } from '@/lib/downloadCsv'
import { PAGE_MARKET_COLS, PAGE_SEGMENT_COLS } from '@/lib/downloadColumns'

export default function OverviewPage() {
  const { marketData, segmentData, airportIndex, loading } = useAviationStore()
  const navigate = useNavigate()

  const latestYear = useMemo(() => {
    if (!marketData?.length) return null
    return Math.max(...marketData.map((d) => d.YEAR).filter(Number.isFinite))
  }, [marketData])

  const minYear = useMemo(() => {
    if (!marketData?.length) return null
    return Math.min(...marketData.map((d) => d.YEAR).filter(Number.isFinite))
  }, [marketData])

  /* page stats (for nav cards) — passengers, freight, mail from market; flights from segment */
  const pageStats = useMemo(() => {
    if (!marketData?.length || !latestYear) return {}
    const mkt = marketData.filter((d) => d.YEAR === latestYear)
    const seg = segmentData?.length
      ? segmentData.filter((d) => d.YEAR === latestYear)
      : []

    const sum = (rows, field) => rows.reduce((s, d) => s + (d[field] || 0), 0)

    const filters = {
      domestic: (d) => isTxDomestic(d),
      intl: (d) => isTxIntl(d),
      usMx: (d) => isUsToMx(d) || isMxToUs(d),
      txMx: (d) => isTxMx(d),
    }

    const stats = {}
    for (const [key, pred] of Object.entries(filters)) {
      const mktRows = mkt.filter(pred)
      const segRows = seg.filter(pred)
      stats[key] = {
        passengers: sum(mktRows, 'PASSENGERS'),
        flights: sum(segRows, 'DEPARTURES_PERFORMED'),
        freight: sum(mktRows, 'FREIGHT'),
        mail: sum(mktRows, 'MAIL'),
      }
    }
    return stats
  }, [marketData, segmentData, latestYear])

  const allTxMx = useMemo(() => {
    if (!marketData?.length) return []
    return marketData.filter(isTxMx)
  }, [marketData])

  /* ── homepage map ────────────────────────────────────────────────── */
  const [mapMetric, setMapMetric] = useState('PASSENGERS')
  const [selectedAirport, setSelectedAirport] = useState(null)
  const mapMetricConfig = MAP_METRIC_OPTIONS.find((m) => m.value === mapMetric)

  const mapDataSource = useMemo(() => {
    if (!latestYear) return []
    const source = mapMetricConfig.source === 'segment'
      ? (segmentData || []).filter((d) => d.YEAR === latestYear && isTxMx(d))
      : allTxMx.filter((d) => d.YEAR === latestYear)
    return source
  }, [allTxMx, segmentData, latestYear, mapMetricConfig.source])

  const mapRoutes = useMemo(
    () => aggregateRoutes(mapDataSource, airportIndex, mapMetricConfig.field),
    [mapDataSource, airportIndex, mapMetricConfig.field]
  )

  const mapAirports = useMemo(() => {
    if (!mapDataSource.length || !airportIndex) return []
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
          lat: info.lat,
          lng: info.lng,
          volume: volumes.get(code) || 0,
        })
      }
    }
    return airports
  }, [mapDataSource, airportIndex, mapMetricConfig.field])

  /* ── storytelling insights ───────────────────────────────────────── */

  /* Texas Domestic: scale + state reach */
  const domesticScale = useMemo(() => {
    if (!marketData?.length || !latestYear) return null
    const latest = marketData.filter((d) => d.YEAR === latestYear && isTxDomestic(d))
    const pax = latest.reduce((s, d) => s + d.PASSENGERS, 0)
    const states = new Set(
      latest.map((d) =>
        d.ORIGIN_STATE_NM === 'Texas' ? d.DEST_STATE_NM : d.ORIGIN_STATE_NM
      )
    ).size
    return pax ? { pax: fmtCompact(pax), states } : null
  }, [marketData, latestYear])

  /* Texas International: Mexico's share */
  const mexicoIntlShare = useMemo(() => {
    if (!marketData?.length || !latestYear) return null
    const latest = marketData.filter((d) => d.YEAR === latestYear && isTxIntl(d))
    const totalPax = latest.reduce((s, d) => s + d.PASSENGERS, 0)
    const mxPax = latest.filter((d) =>
      d.DEST_COUNTRY_NAME === 'Mexico' || d.ORIGIN_COUNTRY_NAME === 'Mexico'
    ).reduce((s, d) => s + d.PASSENGERS, 0)
    if (!totalPax) return null
    return { pct: (mxPax / totalPax * 100).toFixed(0) }
  }, [marketData, latestYear])

  /* Texas International: long-term growth */
  const intlGrowth = useMemo(() => {
    if (!marketData?.length || !latestYear || !minYear) return null
    const paxEarliest = marketData.filter((d) => d.YEAR === minYear && isTxIntl(d))
      .reduce((s, d) => s + d.PASSENGERS, 0)
    const paxLatest = marketData.filter((d) => d.YEAR === latestYear && isTxIntl(d))
      .reduce((s, d) => s + d.PASSENGERS, 0)
    if (!paxEarliest) return null
    const pct = Math.abs((paxLatest - paxEarliest) / paxEarliest * 100).toFixed(0)
    return { pct, direction: paxLatest >= paxEarliest ? 'grown' : 'declined' }
  }, [marketData, latestYear, minYear])

  /* U.S.-Mexico: Texas's national share */
  const txNationalShare = useMemo(() => {
    if (!marketData?.length || !latestYear) return null
    const latest = marketData.filter((d) => d.YEAR === latestYear)
    const usMxLatest = latest.filter((d) => isUsToMx(d) || isMxToUs(d))
    const txPax = usMxLatest
      .filter((d) => d.ORIGIN_STATE_NM === 'Texas' || d.DEST_STATE_NM === 'Texas')
      .reduce((s, d) => s + d.PASSENGERS, 0)
    const totalPax = usMxLatest.reduce((s, d) => s + d.PASSENGERS, 0)
    return totalPax ? (txPax / totalPax * 100).toFixed(0) : null
  }, [marketData, latestYear])

  /* TX-MX: hub concentration */
  const hubConcentration = useMemo(() => {
    if (!allTxMx.length || !latestYear) return null
    const latest = allTxMx.filter((d) => d.YEAR === latestYear)
    const byAirport = new Map()
    latest.forEach((d) => {
      const txCode = isTxToMx(d) ? d.ORIGIN : d.DEST
      byAirport.set(txCode, (byAirport.get(txCode) || 0) + d.PASSENGERS)
    })
    const sorted = [...byAirport.entries()].sort((a, b) => b[1] - a[1])
    const top2 = sorted.slice(0, 2)
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    if (!total || top2.length < 2) return null
    const share = ((top2[0][1] + top2[1][1]) / total * 100).toFixed(0)
    return { share, airports: [top2[0][0], top2[1][0]] }
  }, [allTxMx, latestYear])

  /* TX-MX: COVID recovery */
  const covidRecovery = useMemo(() => {
    if (!allTxMx.length || !latestYear) return null
    const pax2019 = allTxMx.filter((d) => d.YEAR === 2019).reduce((s, d) => s + d.PASSENGERS, 0)
    const paxLatest = allTxMx.filter((d) => d.YEAR === latestYear).reduce((s, d) => s + d.PASSENGERS, 0)
    if (!pax2019) return null
    const pct = ((paxLatest - pax2019) / pax2019 * 100).toFixed(1)
    return { pct: Math.abs(pct), direction: paxLatest >= pax2019 ? 'above' : 'below', year: latestYear }
  }, [allTxMx, latestYear])

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

  const metricDefs = [
    { key: 'flights',    label: 'flights',    Icon: PlaneTakeoff, fmt: fmtCompact },
    { key: 'passengers', label: 'passengers', Icon: Users,        fmt: fmtCompact },
    { key: 'freight',    label: 'freight',    Icon: Package,      fmt: fmtLbs },
    { key: 'mail',       label: 'mail',       Icon: Mail,         fmt: fmtLbs },
  ]

  const pages = [
    {
      path: '/texas-domestic',
      title: 'Texas Domestic',
      depth: 'Context',
      desc: 'Domestic flights between Texas and other U.S. states — setting the baseline for Texas as an aviation hub.',
      stats: pageStats.domestic,
      Icon: Plane,
      intensity: 1,
    },
    {
      path: '/texas-international',
      title: 'Texas International',
      depth: 'Context',
      desc: "International flights from Texas to all destination countries — showing where Mexico ranks among Texas's global air connections.",
      stats: pageStats.intl,
      Icon: Globe,
      intensity: 1,
    },
    {
      path: '/us-mexico',
      title: 'U.S.–Mexico',
      depth: 'Comparison',
      desc: 'All U.S.–Mexico air traffic at the national level — establishing how Texas compares to other states in the cross-border corridor.',
      stats: pageStats.usMx,
      Icon: ArrowRightLeft,
      intensity: 2,
    },
    {
      path: '/texas-mexico',
      title: 'Texas–Mexico',
      depth: 'Deep Dive',
      desc: 'Comprehensive analysis of the Texas–Mexico air market — passengers & routes, operations & capacity, cargo & trade, and border airports.',
      stats: pageStats.txMx,
      Icon: Route,
      intensity: 3,
    },
  ]

  return (
    <>
      {/* Hero */}
      <div className="gradient-blue text-white relative overflow-visible">
        <HeroStardust seed={7} animate tall />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
            Airport Connectivity Dashboard
          </h2>
          <p className="text-white/80 mt-3 text-base md:text-lg max-w-3xl">
            A data-driven exploration of air connectivity between Texas, Mexico, and the broader
            United States — built on BTS T-100 Air Carrier Statistics
            {minYear && latestYear ? ` (${minYear}–${latestYear})` : ''}.
          </p>
        </div>

      {/* ── TX-MX Route Map ───────────────────────────────────────────────────── */}
      {!loading && mapAirports.length > 0 && (
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Texas–Mexico Route Network ({latestYear})
                </h3>
                <p className="text-white/70 text-base mt-0.5">
                  Top routes and airport volumes — click an airport to explore its connections
                </p>
              </div>
              <select
                value={mapMetric}
                onChange={(e) => setMapMetric(e.target.value)}
                className="text-base border border-white/30 rounded-md px-2 py-1 bg-white/10 text-white"
              >
                {MAP_METRIC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-text-primary">{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl overflow-hidden ring-1 ring-white/20">
              <AirportMap
                airports={mapAirports}
                routes={mapRoutes}
                topN={15}
                selectedAirport={selectedAirport}
                onAirportSelect={setSelectedAirport}
                formatValue={mapMetricConfig.formatter}
                metricLabel={mapMetricConfig.unit}
                highlightAirports={BORDER_AIRPORTS}
                legendItems={[
                  { color: '#0056a9', label: 'U.S.' },
                  { color: '#df5c16', label: 'Mexico' },
                  { color: '#0056a9', borderColor: '#E8B923', label: 'Texas Border' },
                ]}
                center={[25.5, -99.5]}
                zoom={5}
                height="500px"
              />
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Our Approach ─────────────────────────────────────────────── */}
        <section className="py-8 pb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <Layers size={20} className="text-brand-blue" />
            <h3 className="text-xl font-bold text-text-primary">Our Approach</h3>
          </div>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            This dashboard draws on the complete BTS T-100 Air Carrier Statistics dataset — which covers
            every flight operating in and out of United States airports. From that universe of data, we extracted a focused
            subset: all air traffic originating from or destined to Texas, as well as all flights connected to Mexico,
            spanning {minYear && latestYear ? `${minYear} through ${latestYear}` : 'the past decade'}.
            This targeted dataset is the foundation for every visualization across the dashboard.
          </p>
          <p className="text-base text-text-secondary leading-relaxed mb-5">
            The analysis is organized in layers of increasing depth, narrowing from broad context to the core
            Texas–Mexico corridor. Use the filter bar on any page to slice the data by year, carrier, direction, or
            route. <span className="font-semibold text-brand-blue">Click a card below to explore that layer.</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pages.map((p) => (
              <button
                key={p.path}
                onClick={() => navigate(p.path)}
                className={`text-left relative rounded-xl border p-4 flex flex-col
                           hover:shadow-md hover:-translate-y-0.5
                           transition-all duration-200 group cursor-pointer ${
                  p.intensity === 3
                    ? 'bg-brand-blue/8 border-brand-blue/30 hover:border-brand-blue/50'
                    : p.intensity === 2
                      ? 'bg-brand-blue/4 border-brand-blue/20 hover:border-brand-blue/40'
                      : 'bg-white border-border-light hover:border-brand-blue/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <p.Icon size={16} className="text-brand-blue" />
                  <span className="text-base font-bold text-text-primary">{p.title}</span>
                  <ArrowRight size={14} className="text-text-secondary group-hover:text-brand-blue transition-colors" />
                </div>
                <span className={`inline-block text-[13px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded mb-2 ${
                  p.intensity === 3
                    ? 'bg-brand-blue/15 text-brand-blue'
                    : p.intensity === 2
                      ? 'bg-brand-blue/10 text-brand-blue/80'
                      : 'bg-gray-100 text-text-secondary'
                }`}>
                  {p.depth}
                </span>
                <p className="text-base text-text-secondary leading-relaxed mb-3 flex-1">{p.desc}</p>
                {p.stats && (
                  <div className="mt-auto space-y-0.5">
                    <p className="text-base text-text-secondary font-medium mb-1">In {latestYear}</p>
                    {metricDefs.map((m) => (
                      <div key={m.key} className="flex items-center gap-1.5">
                        <m.Icon size={13} className="text-brand-blue/60 flex-shrink-0" />
                        <span className="text-base font-semibold text-brand-blue">
                          {m.fmt(p.stats[m.key])}
                        </span>
                        <span className="text-base text-text-secondary">{m.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

        </section>

        {/* ── Key Findings ──────────────────────────────────────────── */}
        <section className="pb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp size={20} className="text-brand-blue" />
            <h3 className="text-xl font-bold text-text-primary">Key Findings</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Domestic — scale + state reach */}
            {domesticScale && (
              <InsightCallout
                finding={`Texas airports handled ${domesticScale.pax} domestic passengers in ${latestYear}, connecting to ${domesticScale.states} U.S. states and territories.`}
                context={<>Texas is one of the largest domestic aviation markets in the country. <Link to="/texas-domestic" className="font-semibold text-brand-blue hover:underline">Explore Texas Domestic →</Link></>}
                icon={Plane}
              />
            )}
            {/* 2. International — Mexico's share */}
            {mexicoIntlShare && (
              <InsightCallout
                finding={`Mexico accounts for ${mexicoIntlShare.pct}% of Texas's international passenger traffic — the top destination country by a wide margin.`}
                context={<>No other country comes close in volume, reflecting deep economic and cultural ties. <Link to="/texas-international" className="font-semibold text-brand-blue hover:underline">Explore Texas International →</Link></>}
                icon={Globe}
              />
            )}
            {/* 3. International — long-term growth */}
            {intlGrowth && (
              <InsightCallout
                finding={`Texas international passenger traffic has ${intlGrowth.direction} ${intlGrowth.pct}% between ${minYear} and ${latestYear}.`}
                context={<>Long-term growth in international air service reflects Texas's expanding global connections. <Link to="/texas-international" className="font-semibold text-brand-blue hover:underline">Explore Texas International →</Link></>}
                variant={intlGrowth.direction === 'grown' ? 'highlight' : 'default'}
                icon={TrendingUp}
              />
            )}
            {/* 4. US-Mexico — Texas's national share */}
            {txNationalShare && (
              <InsightCallout
                finding={`Texas accounts for approximately ${txNationalShare}% of all U.S.–Mexico air passengers, more than any other state.`}
                context={<>Texas dominates the national cross-border air corridor. <Link to="/us-mexico" className="font-semibold text-brand-blue hover:underline">Explore U.S.–Mexico →</Link></>}
                icon={ArrowRightLeft}
              />
            )}
            {/* 5. TX-MX — hub concentration */}
            {hubConcentration && (
              <InsightCallout
                finding={`${hubConcentration.airports[0]} and ${hubConcentration.airports[1]} together handle ${hubConcentration.share}% of all Texas–Mexico passenger traffic (${latestYear}).`}
                context={<>Two airports dominate Texas's side of the corridor — disruptions at either hub have outsized effects. <Link to="/texas-mexico" className="font-semibold text-brand-blue hover:underline">Explore Texas–Mexico →</Link></>}
                variant="warning"
                icon={Building2}
              />
            )}
            {/* 6. TX-MX — COVID recovery */}
            {covidRecovery && (
              <InsightCallout
                finding={`Texas–Mexico passenger traffic in ${covidRecovery.year} is ${covidRecovery.pct}% ${covidRecovery.direction} pre-COVID 2019 levels.`}
                context="The corridor's recovery trajectory is visible in the trend charts on the Texas–Mexico page."
                variant={covidRecovery.direction === 'above' ? 'highlight' : 'default'}
                icon={TrendingUp}
              />
            )}
          </div>
        </section>
      </div>

      {/* ── Data Source (pre-footer) ────────────────────────────────── */}
      <section className="bg-surface-alt border-t border-border-light mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2.5 mb-4">
            <Database size={20} className="text-text-secondary" />
            <h3 className="text-xl font-bold text-text-primary">Data Source</h3>
          </div>
          <p className="text-base text-text-secondary leading-relaxed mb-3">
            All data in this dashboard comes from the{' '}
            <strong className="text-text-primary">Bureau of Transportation Statistics (BTS) T-100 Air Carrier Statistics</strong> — a
            federally mandated reporting program that captures traffic data for every certificated air carrier
            operating to, from, or within the United States. The dataset includes two complementary views:{' '}
            <strong className="text-text-primary">market data</strong> (each passenger journey counted once) and{' '}
            <strong className="text-text-primary">segment data</strong> (each flight leg recorded separately with operational details).
            Both U.S. carriers (T-100) and foreign carriers operating to/from the U.S. (T-100(f)) are included.
          </p>
          <p className="text-base font-semibold text-text-primary mt-4 mb-2">Download Processed Data</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => downloadCsv(marketData, 'BTS_T-100_Market_Data', PAGE_MARKET_COLS)}
              disabled={!marketData?.length}
              className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={14} />
              Market Data (CSV)
            </button>
            <button
              onClick={() => downloadCsv(segmentData, 'BTS_T-100_Segment_Data', PAGE_SEGMENT_COLS)}
              disabled={!segmentData?.length}
              className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={14} />
              Segment Data (CSV)
            </button>
          </div>
          <Link
            to="/about-data"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline mt-4"
          >
            Data details, methodology & limitations
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  )
}
