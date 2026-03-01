import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ArrowRightLeft, Route, Calendar, Plane, Globe, ArrowRight } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, isTxOrigin, isTxMx, isTxDomestic, isTxIntl, isUsToMx, isMxToUs } from '@/lib/aviationHelpers'
import StatCard from '@/components/ui/StatCard'

export default function OverviewPage() {
  const { marketData, loading } = useAviationStore()
  const navigate = useNavigate()

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
      statLabel: `${latestYear} passengers`,
      Icon: Plane,
    },
    {
      path: '/texas-international',
      title: 'Texas International',
      desc: "Texas's air connections to the world",
      stat: pageStats.intl,
      statLabel: `${latestYear} passengers`,
      Icon: Globe,
    },
    {
      path: '/us-mexico',
      title: 'U.S.–Mexico',
      desc: 'National perspective on cross-border air traffic',
      stat: pageStats.usMx,
      statLabel: `${latestYear} passengers`,
      Icon: ArrowRightLeft,
    },
    {
      path: '/texas-mexico',
      title: 'Texas–Mexico',
      desc: 'Comprehensive Texas–Mexico market and segment analysis',
      stat: pageStats.txMx,
      statLabel: `${latestYear} passengers`,
      Icon: Route,
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

        {/* About the Data + Methodology */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
            <h3 className="text-lg font-bold text-text-primary mb-3">About the Data</h3>
            <ul className="space-y-2 text-base text-text-secondary">
              <li><strong>Source:</strong> BTS T-100 International Air Carrier Statistics</li>
              <li><strong>Scope:</strong> All Texas airports, all U.S. states to/from Mexico</li>
              <li><strong>Period:</strong> {minYear}–{latestYear}</li>
              <li><strong>Provider:</strong> Bureau of Transportation Statistics (U.S. DOT)</li>
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
            <h3 className="text-lg font-bold text-text-primary mb-3">Methodology</h3>
            <ul className="space-y-2 text-base text-text-secondary">
              <li><strong>Market data:</strong> Passenger journeys counted once per origin–destination pair</li>
              <li><strong>Segment data:</strong> Individual flight legs with operational metrics (seats, departures, payload, air time)</li>
              <li><strong>Processing:</strong> Aggregated by year, carrier, and airport pair with bidirectional analysis</li>
            </ul>
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
                    <p className="text-sm text-text-secondary mt-1">{p.desc}</p>
                    <p className="text-sm font-semibold text-brand-blue mt-2">
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
