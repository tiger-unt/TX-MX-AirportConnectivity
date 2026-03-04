import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users, ArrowRightLeft, Route, Calendar, Plane, Globe, ArrowRight,
  Building2, PlaneTakeoff, MapPin, Database, TrendingUp
} from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import {
  fmtCompact, isTxOrigin, isTxMx, isTxToMx, isMxToTx,
  isTxDomestic, isTxIntl, isUsToMx, isMxToUs,
  BORDER_AIRPORTS, BORDER_AIRPORT_LIST
} from '@/lib/aviationHelpers'
import { aggregateAirportVolumes, aggregateRoutes } from '@/lib/airportUtils'
import StatCard from '@/components/ui/StatCard'
import InsightCallout from '@/components/ui/InsightCallout'
import AirportMap from '@/components/maps/AirportMap'

export default function OverviewPage() {
  const { marketData, airportIndex, loading } = useAviationStore()
  const navigate = useNavigate()
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [hoveredBorderAirport, setHoveredBorderAirport] = useState(null)

  const latestYear = useMemo(() => {
    if (!marketData?.length) return null
    return Math.max(...marketData.map((d) => d.YEAR).filter(Number.isFinite))
  }, [marketData])

  const minYear = useMemo(() => {
    if (!marketData?.length) return null
    return Math.min(...marketData.map((d) => d.YEAR).filter(Number.isFinite))
  }, [marketData])

  const stats = useMemo(() => {
    if (!marketData?.length || !latestYear) return null
    const latest = marketData.filter((d) => d.YEAR === latestYear)
    const txPax = latest.filter(isTxOrigin).reduce((s, d) => s + d.PASSENGERS, 0)
    const txMxPax = latest.filter(isTxMx).reduce((s, d) => s + d.PASSENGERS, 0)
    const txMxRoutes = new Set(
      latest.filter(isTxMx).map((d) => `${d.ORIGIN}-${d.DEST}`)
    ).size
    return { txPax, txMxPax, txMxRoutes }
  }, [marketData, latestYear])

  /* preview stats per page (for nav cards) */
  const pageStats = useMemo(() => {
    if (!marketData?.length || !latestYear) return {}
    const latest = marketData.filter((d) => d.YEAR === latestYear)
    return {
      domestic: fmtCompact(latest.filter(isTxDomestic).reduce((s, d) => s + d.PASSENGERS, 0)),
      intl: fmtCompact(latest.filter(isTxIntl).reduce((s, d) => s + d.PASSENGERS, 0)),
      usMx: fmtCompact(latest.filter((d) => isUsToMx(d) || isMxToUs(d)).reduce((s, d) => s + d.PASSENGERS, 0)),
      txMx: fmtCompact(latest.filter(isTxMx).reduce((s, d) => s + d.PASSENGERS, 0)),
    }
  }, [marketData, latestYear])

  /* ── TX-MX data for map + summary ──────────────────────────────── */
  const allTxMx = useMemo(() => {
    if (!marketData?.length) return []
    return marketData.filter(isTxMx)
  }, [marketData])

  const mapRoutes = useMemo(() => {
    if (!allTxMx.length || !latestYear || !airportIndex) return []
    const latest = allTxMx.filter((d) => d.YEAR === latestYear)
    return aggregateRoutes(latest, airportIndex)
  }, [allTxMx, latestYear, airportIndex])

  const mapAirports = useMemo(() => {
    if (!allTxMx.length || !latestYear || !airportIndex) return []
    const latest = allTxMx.filter((d) => d.YEAR === latestYear)
    const volumes = aggregateAirportVolumes(latest)
    const seen = new Set()
    const airports = []
    for (const d of latest) {
      for (const code of [d.ORIGIN, d.DEST]) {
        if (seen.has(code)) continue
        seen.add(code)
        const info = airportIndex.get(code)
        if (!info?.lat) continue
        const isOrigin = code === d.ORIGIN
        airports.push({
          iata: code,
          name: info.name,
          city: isOrigin ? d.ORIGIN_CITY_NAME : d.DEST_CITY_NAME,
          country: isOrigin ? d.ORIGIN_COUNTRY_NAME : d.DEST_COUNTRY_NAME,
          lat: info.lat,
          lng: info.lng,
          volume: volumes.get(code) || 0,
        })
      }
    }
    return airports
  }, [allTxMx, latestYear, airportIndex])

  const summaryStats = useMemo(() => {
    if (!allTxMx.length || !latestYear) return null
    const latest = allTxMx.filter((d) => d.YEAR === latestYear)
    const airlines = new Set(latest.map((d) => d.CARRIER_NAME)).size
    const txAirports = new Set(
      latest.filter(isTxToMx).map((d) => d.ORIGIN)
        .concat(latest.filter(isMxToTx).map((d) => d.DEST))
    ).size
    const mxAirports = new Set(
      latest.filter(isTxToMx).map((d) => d.DEST)
        .concat(latest.filter(isMxToTx).map((d) => d.ORIGIN))
    ).size
    const totalPax = latest.reduce((s, d) => s + d.PASSENGERS, 0)
    const routes = new Set(latest.map((d) => `${d.ORIGIN}-${d.DEST}`)).size

    return { airlines, txAirports, mxAirports, totalPax, routes }
  }, [allTxMx, latestYear])

  /* ── storytelling insights ───────────────────────────────────────── */
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

  const covidRecovery = useMemo(() => {
    if (!allTxMx.length || !latestYear) return null
    const pax2019 = allTxMx.filter((d) => d.YEAR === 2019).reduce((s, d) => s + d.PASSENGERS, 0)
    const paxLatest = allTxMx.filter((d) => d.YEAR === latestYear).reduce((s, d) => s + d.PASSENGERS, 0)
    if (!pax2019) return null
    const pct = ((paxLatest - pax2019) / pax2019 * 100).toFixed(1)
    return { pct: Math.abs(pct), direction: paxLatest >= pax2019 ? 'above' : 'below', year: latestYear }
  }, [allTxMx, latestYear])

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

  const pages = [
    {
      path: '/texas-domestic',
      title: 'Texas Domestic',
      desc: 'Air connections between Texas and other U.S. states',
      stat: pageStats.domestic,
      statLabel: `passengers (${latestYear})`,
      Icon: Plane,
    },
    {
      path: '/texas-international',
      title: 'Texas International',
      desc: "Texas's air connections to the world",
      stat: pageStats.intl,
      statLabel: `passengers (${latestYear})`,
      Icon: Globe,
    },
    {
      path: '/us-mexico',
      title: 'U.S.–Mexico',
      desc: 'National perspective on cross-border air traffic',
      stat: pageStats.usMx,
      statLabel: `passengers (${latestYear})`,
      Icon: ArrowRightLeft,
    },
    {
      path: '/texas-mexico',
      title: 'Texas–Mexico',
      desc: 'Comprehensive Texas–Mexico market and segment analysis',
      stat: pageStats.txMx,
      statLabel: `passengers (${latestYear})`,
      Icon: Route,
    },
  ]

  const highlights = [
    {
      Icon: PlaneTakeoff,
      label: 'Airlines Serving TX–MX',
      value: summaryStats ? String(summaryStats.airlines) : '\u2014',
    },
    {
      Icon: Building2,
      label: 'Texas Airports',
      value: summaryStats ? String(summaryStats.txAirports) : '\u2014',
    },
    {
      Icon: MapPin,
      label: 'Mexico Airports',
      value: summaryStats ? String(summaryStats.mxAirports) : '\u2014',
    },
    {
      Icon: Users,
      label: 'Passengers',
      value: summaryStats ? fmtCompact(summaryStats.totalPax) : '\u2014',
    },
    {
      Icon: Route,
      label: 'Active Routes',
      value: summaryStats ? String(summaryStats.routes) : '\u2014',
    },
  ]

  return (
    <>
      {/* Hero */}
      <div className="gradient-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-balance">
            Airport Connectivity Dashboard
          </h1>
          <p className="text-white/70 mt-3 text-base md:text-lg">
            Exploring air connectivity between Texas, Mexico, and the broader U.S.
            using BTS T-100 Air Carrier Statistics.
          </p>
          <p className="text-white/50 mt-4 text-base border-l-2 border-white/30 pl-4 leading-relaxed">
            How has air connectivity between Texas and Mexico evolved over
            {minYear && latestYear ? ` ${minYear}\u2013${latestYear}` : ' the past decade'},
            and which airports, routes, and carriers drive that relationship?
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Summary Stats */}
        <section className="py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={`Texas Passengers (${latestYear || '\u2014'})`}
              value={stats ? fmtCompact(stats.txPax) : '\u2014'}
              highlight variant="primary" icon={Users} delay={0}
            />
            <StatCard
              label={`Texas–Mexico Passengers (${latestYear || '\u2014'})`}
              value={stats ? fmtCompact(stats.txMxPax) : '\u2014'}
              highlight icon={ArrowRightLeft} delay={100}
            />
            <StatCard
              label={`Active Texas–Mexico Routes (${latestYear || '\u2014'})`}
              value={stats ? String(stats.txMxRoutes) : '\u2014'}
              highlight icon={Route} delay={200}
            />
            <StatCard
              label="Data Coverage"
              value={minYear && latestYear ? `${minYear}–${latestYear}` : '\u2014'}
              highlight icon={Calendar} delay={300}
            />
          </div>
        </section>

        {/* ── Map + Summary Sidebar ──────────────────────────────────── */}
        <section className="pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Map */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden h-full flex flex-col">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-lg font-bold text-text-primary">Airports Analyzed</h3>
                  <p className="text-base text-text-secondary mt-0.5">
                    Texas and Mexico airports in the TX–MX air connectivity dataset ({latestYear})
                  </p>
                </div>
                <div className="flex-1 min-h-[380px]">
                  <AirportMap
                    airports={mapAirports}
                    routes={mapRoutes}
                    topN={0}
                    selectedAirport={selectedAirport}
                    onAirportSelect={setSelectedAirport}
                    highlightAirports={BORDER_AIRPORTS}
                    hoveredAirport={hoveredBorderAirport}
                    legendItems={[
                      { color: '#0056a9', label: 'Texas' },
                      { color: '#df5c16', label: 'Mexico' },
                      { color: '#0056a9', borderColor: '#E8B923', label: 'Texas Border' },
                    ]}
                    height="100%"
                    center={[25.5, -99.5]}
                    zoom={5}
                    metricLabel={`passengers (${latestYear})`}
                    formatValue={fmtCompact}
                  />
                </div>
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
                <h3 className="text-lg font-bold text-text-primary mb-4">At a Glance ({latestYear})</h3>
                <div className="space-y-3">
                  {highlights.map((h) => (
                    <div key={h.label} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <h.Icon size={16} className="text-brand-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-text-secondary leading-tight">{h.label}</p>
                        <p className="text-base font-bold text-text-primary">{h.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-brand-blue" />
                  <h4 className="text-base font-bold text-text-primary">Border Airports</h4>
                </div>
                <p className="text-base text-text-secondary leading-relaxed mb-3">
                  Six Texas airports located within a TxDOT border district play a key role in
                  cross-border connectivity, highlighted on the map with a gold ring.
                </p>
                <div className="flex flex-wrap gap-2">
                  {BORDER_AIRPORT_LIST.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors duration-150 cursor-pointer
                        ${hoveredBorderAirport === b.code || selectedAirport === b.code
                          ? 'bg-brand-blue/15 border border-brand-blue/40'
                          : 'bg-brand-blue/5 border border-brand-blue/15 hover:bg-brand-blue/10'}`}
                      onMouseEnter={() => setHoveredBorderAirport(b.code)}
                      onMouseLeave={() => setHoveredBorderAirport(null)}
                      onClick={() => setSelectedAirport(selectedAirport === b.code ? null : b.code)}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: '#0056a9', border: '1.5px solid #E8B923' }}
                      />
                      <span className="text-base font-semibold text-brand-blue">{b.code}</span>
                      <span className="text-base text-text-secondary">{b.city}</span>
                    </button>
                  ))}
                </div>
                <Link
                  to="/texas-mexico"
                  className="inline-flex items-center gap-1.5 mt-3 text-base font-semibold text-brand-blue hover:underline"
                >
                  Border airport analysis
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={16} className="text-brand-blue" />
                  <h4 className="text-base font-bold text-text-primary">Data Source</h4>
                </div>
                <p className="text-base text-text-secondary leading-relaxed">
                  Bureau of Transportation Statistics (BTS) T-100 Air Carrier Statistics,
                  covering both <strong>market data</strong> (passenger journeys) and{' '}
                  <strong>segment data</strong> (individual flight legs). Includes reports
                  from U.S. carriers (T-100) and foreign carriers (T-100(f)).
                </p>
                <Link
                  to="/about-data"
                  className="inline-flex items-center gap-1.5 mt-3 text-base font-semibold text-brand-blue hover:underline"
                >
                  Data details, methodology & limitations
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Key Findings */}
        {(hubConcentration || covidRecovery || txNationalShare) && (
          <section className="pb-8">
            <h3 className="text-xl font-bold text-text-primary mb-5">Key Findings</h3>
            <div className="space-y-4">
              {hubConcentration && (
                <InsightCallout
                  finding={`${hubConcentration.airports[0]} and ${hubConcentration.airports[1]} together handle ${hubConcentration.share}% of all Texas\u2013Mexico passenger traffic (${latestYear}).`}
                  context="Two airports dominate Texas's side of the corridor. Disruptions at either hub have outsized effects on cross-border connectivity."
                  variant="warning"
                  icon={Building2}
                />
              )}
              {covidRecovery && (
                <InsightCallout
                  finding={`Texas\u2013Mexico passenger traffic in ${covidRecovery.year} is ${covidRecovery.pct}% ${covidRecovery.direction} pre-COVID 2019 levels.`}
                  context="The corridor's recovery trajectory is visible in the trend charts on the Texas\u2013Mexico page."
                  variant={covidRecovery.direction === 'above' ? 'highlight' : 'default'}
                  icon={TrendingUp}
                />
              )}
              {txNationalShare && (
                <InsightCallout
                  finding={`Texas accounts for approximately ${txNationalShare}% of all U.S.\u2013Mexico air passengers, more than any other state.`}
                  context="Explore Texas's rank against all other states on the U.S.\u2013Mexico page."
                  variant="default"
                  icon={MapPin}
                />
              )}
            </div>
            <Link
              to="/texas-mexico"
              className="inline-flex items-center gap-1.5 mt-5 text-base font-semibold text-brand-blue hover:underline"
            >
              Full Texas–Mexico analysis
              <ArrowRight size={14} />
            </Link>
          </section>
        )}

        {/* Explore Pages */}
        <section className="pb-10">
          <h3 className="text-xl font-bold text-text-primary mb-5">Explore the Data</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pages.map((p) => (
              <button
                key={p.path}
                onClick={() => navigate(p.path)}
                className="text-left bg-white rounded-xl border border-border-light shadow-sm p-6
                           hover:shadow-md hover:border-brand-blue/30 hover:-translate-y-0.5
                           transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                    <p.Icon size={20} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-text-primary">{p.title}</h4>
                      <ArrowRight size={14} className="text-text-secondary group-hover:text-brand-blue transition-colors" />
                    </div>
                    <p className="text-base text-text-secondary mt-1">{p.desc}</p>
                    <p className="text-base font-semibold text-brand-blue mt-2">
                      {p.stat} <span className="font-normal text-text-secondary">{p.statLabel}</span>
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
