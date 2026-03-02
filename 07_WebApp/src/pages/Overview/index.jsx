import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users, ArrowRightLeft, Route, Calendar, Plane, Globe, ArrowRight,
  Building2, PlaneTakeoff, MapPin, Database
} from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import {
  fmtCompact, isTxOrigin, isTxMx, isTxToMx, isMxToTx,
  isTxDomestic, isTxIntl, isUsToMx, isMxToUs
} from '@/lib/aviationHelpers'
import { aggregateAirportVolumes } from '@/lib/airportUtils'
import StatCard from '@/components/ui/StatCard'
import AirportMap from '@/components/maps/AirportMap'

export default function OverviewPage() {
  const { marketData, airportIndex, loading } = useAviationStore()
  const navigate = useNavigate()
  const [selectedAirport, setSelectedAirport] = useState(null)

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
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-balance">
            Texas–Mexico Air Connectivity Dashboard
          </h1>
          <p className="text-white/70 mt-3 text-base md:text-lg max-w-2xl">
            TxDOT IAC 2025–26 research project, UNT System. Comprehensive analysis
            of air connectivity between Texas, Mexico, and the broader U.S. using BTS
            T-100 Air Carrier Statistics.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {/* Summary Stats */}
        <section className="py-10">
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
              label="Active Texas–Mexico Routes"
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
        <section className="pb-10">
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
                    routes={[]}
                    topN={0}
                    selectedAirport={selectedAirport}
                    onAirportSelect={setSelectedAirport}
                    height="100%"
                    center={[25.5, -99.5]}
                    zoom={5}
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

        {/* Explore Pages */}
        <section className="pb-14">
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
