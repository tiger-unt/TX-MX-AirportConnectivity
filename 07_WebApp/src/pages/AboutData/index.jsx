import {
  Database, Filter, ClipboardCheck, FileOutput, Info, BookOpen,
  AlertTriangle, ExternalLink, FileText, Layers, MapPin, ChevronRight
} from 'lucide-react'

const SECTIONS = [
  { id: 'source', label: 'Data Source' },
  { id: 'market-segment', label: 'Market vs. Segment' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'terms', label: 'Key Terms' },
  { id: 'quality', label: 'Data Quality' },
]

export default function AboutDataPage() {
  return (
    <>
      {/* Hero */}
      <div className="gradient-blue text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-balance">
            About the Data
          </h1>
          <p className="text-white/70 mt-3 text-base md:text-lg">
            How BTS T-100 data was collected, cleaned, and prepared for this
            dashboard — and what you should know when interpreting the numbers.
          </p>
        </div>
      </div>

      {/* Quick-jump nav */}
      <nav className="border-b border-border-light bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-1 whitespace-nowrap px-3 py-1.5 rounded-full text-base font-medium text-text-secondary hover:text-brand-blue hover:bg-brand-blue/5 transition-colors cursor-pointer"
            >
              {s.label}
              {i < SECTIONS.length - 1 && (
                <ChevronRight size={14} className="text-text-secondary/40 ml-1" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6">

        {/* ── Data Source ────────────────────────────────────────────────── */}
        <section id="source" className="py-10 scroll-mt-16">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Source</h3>
          <p className="text-base text-text-secondary mb-5">
            All data in this dashboard comes from the Bureau of Transportation Statistics (BTS),
            a division of the U.S. Department of Transportation.
          </p>

          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-brand-blue" />
              <h4 className="text-base font-bold text-text-primary">BTS T-100 Air Carrier Statistics</h4>
            </div>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              The BTS T-100 program collects traffic and capacity information from airlines operating
              flights to, from, or within the United States. Both U.S. and foreign carriers are
              required to report. While the BTS publishes data monthly (with filings
              typically available through late 2025), this dashboard uses complete,
              finalized annual data for the period <strong>2015–2024</strong>.
            </p>
            <p className="text-base text-text-secondary leading-relaxed mb-5">
              For this study, we use <strong>four BTS T-100 tables</strong> from the TranStats portal, covering the
              period <strong>2015&ndash;2024</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Domestic Market', desc: 'Passenger, freight, and mail totals for routes within the U.S.' },
                { label: 'Domestic Segment', desc: 'Flight operations, seat capacity, and departures for U.S. routes.' },
                { label: 'International Market', desc: 'Passenger, freight, and mail totals for routes between the U.S. and other countries.' },
                { label: 'International Segment', desc: 'Flight operations, seat capacity, and departures for international routes.' },
              ].map((t) => (
                <div key={t.label} className="bg-surface-alt rounded-lg p-4">
                  <h5 className="text-base font-semibold text-text-primary mb-1">{t.label}</h5>
                  <p className="text-base text-text-secondary leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FMF&QO_fu146_anzr=Nv4%20Pn44vr45"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline"
              >
                <ExternalLink size={14} />
                Download Market Data (TranStats)
              </a>
              <a
                href="https://transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FMG&QO_fu146_anzr="
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline"
              >
                <ExternalLink size={14} />
                Download Segment Data (TranStats)
              </a>
            </div>
          </div>
        </section>

        {/* ── Market vs Segment Data ─────────────────────────────────────── */}
        <section id="market-segment" className="pb-10 scroll-mt-16">
          <h3 className="text-xl font-bold text-text-primary mb-2">Market vs. Segment Data</h3>
          <p className="text-base text-text-secondary mb-5">
            BTS T-100 produces two complementary datasets. Understanding the difference
            is important for interpreting passenger counts correctly.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} className="text-brand-blue" />
                <h4 className="text-base font-bold text-text-primary">Market Data</h4>
              </div>
              <p className="text-base text-text-secondary leading-relaxed">
                Each passenger is counted <strong>once</strong> for their entire journey,
                regardless of intermediate stops. Market data is the basis for official
                passenger, freight, and mail totals.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={18} className="text-brand-blue" />
                <h4 className="text-base font-bold text-text-primary">Segment Data</h4>
              </div>
              <p className="text-base text-text-secondary leading-relaxed">
                Each passenger is counted on <strong>every flight leg</strong> of their trip.
                Segment counts are typically higher than market counts because connecting
                passengers appear on each leg. Segment data also includes seat capacity,
                departure counts, and aircraft type.
              </p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
            <div className="flex gap-3">
              <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-base text-text-secondary leading-relaxed">
                <strong className="text-text-primary">Example:</strong> 250 people board a flight from
                JFK&nbsp;(A) to BWI&nbsp;(B). At BWI, 200 deplane; the remaining 50 plus 70 new passengers
                continue to MIA&nbsp;(C).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Market column */}
              <div className="bg-white rounded-lg border border-brand-blue/15 overflow-hidden">
                <div className="px-4 py-2 bg-brand-blue/10">
                  <p className="text-base font-bold text-brand-blue">Market Counts</p>
                  <p className="text-base text-text-secondary">Passengers counted once per journey</p>
                </div>
                <div className="divide-y divide-border-light">
                  {[
                    ['JFK', 'BWI', '200', 'deplaned at B'],
                    ['JFK', 'MIA', '50', 'continued to C'],
                    ['BWI', 'MIA', '70', 'boarded at B'],
                  ].map(([from, to, count, note]) => (
                    <div key={from + to} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-base text-text-secondary">
                        <strong className="text-text-primary">{from}</strong>
                        {' '}&rarr;{' '}
                        <strong className="text-text-primary">{to}</strong>
                      </span>
                      <span className="text-base">
                        <strong className="text-brand-blue">{count}</strong>
                        <span className="text-text-secondary ml-1.5">({note})</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-surface-alt">
                    <span className="text-base font-semibold text-text-primary">Total</span>
                    <strong className="text-base text-brand-blue">320</strong>
                  </div>
                </div>
              </div>

              {/* Segment column */}
              <div className="bg-white rounded-lg border border-brand-yellow/25 overflow-hidden">
                <div className="px-4 py-2 bg-brand-yellow/10">
                  <p className="text-base font-bold text-brand-yellow-dark">Segment Counts</p>
                  <p className="text-base text-text-secondary">Passengers counted on every flight leg</p>
                </div>
                <div className="divide-y divide-border-light">
                  {[
                    ['JFK', 'BWI', '250', 'all on board'],
                    ['BWI', 'MIA', '120', '50 continuing + 70 new'],
                  ].map(([from, to, count, note]) => (
                    <div key={from + to} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-base text-text-secondary">
                        <strong className="text-text-primary">{from}</strong>
                        {' '}&rarr;{' '}
                        <strong className="text-text-primary">{to}</strong>
                      </span>
                      <span className="text-base">
                        <strong className="text-brand-yellow-dark">{count}</strong>
                        <span className="text-text-secondary ml-1.5">({note})</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-surface-alt">
                    <span className="text-base font-semibold text-text-primary">Total</span>
                    <strong className="text-base text-brand-yellow-dark">370</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* When to Use Which */}
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mt-6">
            <h4 className="text-base font-bold text-text-primary mb-4">When to Use Which?</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left py-2 pr-4 font-semibold text-text-primary">Analysis Goal</th>
                    <th className="text-center py-2 px-3 font-semibold text-text-primary">Use</th>
                    <th className="text-left py-2 pl-4 font-semibold text-text-primary">Why</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {[
                    ['Total passenger demand between two cities', 'Market', 'Counts each passenger once per journey'],
                    ['Total freight or mail volume on a route', 'Market', 'Journey-level totals show the demand picture'],
                    ['Travel connectivity patterns', 'Market', 'Shows origin-to-destination flows'],
                    ['How many flights were operated on a route', 'Segment', 'Only source with departure counts'],
                    ['Seat capacity and load factor', 'Segment', 'Only source with available seats'],
                    ['Schedule reliability', 'Segment', 'Compares scheduled vs. actually operated flights'],
                    ['Aircraft types serving a route', 'Segment', 'Only source with aircraft information'],
                    ['Charter and cargo-only operations', 'Segment', 'Includes service type and departure details'],
                  ].map(([goal, use, why]) => (
                    <tr key={goal} className="border-b border-border-light/50">
                      <td className="py-2 pr-4">{goal}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-base font-semibold ${
                          use === 'Market'
                            ? 'bg-brand-blue/10 text-brand-blue'
                            : 'bg-brand-yellow/15 text-brand-yellow-dark'
                        }`}>
                          {use}
                        </span>
                      </td>
                      <td className="py-2 pl-4">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Data Limitations ──────────────────────────────────────────── */}
        <section id="limitations" className="pb-10 scroll-mt-16">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Limitations</h3>
          <p className="text-base text-text-secondary mb-5">
            U.S. and foreign airlines have different federal reporting requirements, which creates
            some gaps in the data. These are not errors — they reflect how the reporting system works.
          </p>

          <div className="space-y-3">
            <div className="bg-brand-yellow/8 border border-brand-yellow/20 rounded-xl p-5">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                <p className="text-base text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Schedule data is incomplete:</strong> Foreign
                  airlines (e.g., Aeromexico, Volaris) are not required to report how many flights they{' '}
                  <em>planned</em> to operate — only how many they actually flew. This means schedule
                  adherence analysis is limited to U.S. carriers. The dashboard automatically filters
                  to reliable schedule data where needed.
                </p>
              </div>
            </div>
            <div className="bg-brand-yellow/8 border border-brand-yellow/20 rounded-xl p-5">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                <p className="text-base text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Some metrics are U.S.-carrier only:</strong> Foreign
                  airlines also do not report mail volumes or flight time data. When these fields
                  show as zero for a foreign airline, it means the data was not reported — not that
                  there was no activity.
                </p>
              </div>
            </div>
            <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
              <div className="flex gap-3">
                <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
                <p className="text-base text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Charter and non-scheduled flights:</strong> Charter
                  and other non-scheduled operations don't have planned schedules by definition, so
                  these flights have no scheduled departure data regardless of the airline's nationality.
                </p>
              </div>
            </div>
          </div>

          <p className="text-base text-text-secondary mt-5 italic">
            As a result, <strong className="not-italic">Passengers</strong> and{' '}
            <strong className="not-italic">Freight</strong> are the most reliable metrics for
            comparing U.S. and foreign carriers directly, since both carrier types are required
            to report these figures.
          </p>
        </section>

        {/* ── Data Pipeline ──────────────────────────────────────────────── */}
        <section id="pipeline" className="py-10 scroll-mt-16">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Pipeline</h3>
          <p className="text-base text-text-secondary mb-5">
            From raw federal filings to the visualizations on this dashboard, the data passes through
            several preparation steps to ensure accuracy and consistency.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                Icon: Database,
                title: '1. Collect',
                body: 'Millions of flight records reported by U.S. airlines are gathered from the BTS T-100 database, covering every domestic and international route.',
              },
              {
                Icon: Filter,
                title: '2. Filter',
                body: 'Only flights involving Texas or Mexico are kept, and monthly totals are rolled up into annual summaries by airline and airport pair.',
              },
              {
                Icon: ClipboardCheck,
                title: '3. Clean',
                body: 'Airport names and codes are standardized, data-entry errors are corrected, and duplicate or inactive records are removed.',
              },
              {
                Icon: FileOutput,
                title: '4. Publish',
                body: 'The cleaned data and airport locations are packaged into the datasets that power every chart, map, and table in this dashboard.',
              },
            ].map((step) => (
              <div
                key={step.title}
                className="bg-white rounded-xl border border-border-light shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <step.Icon size={18} className="text-brand-blue" />
                </div>
                <h4 className="text-base font-bold text-text-primary">{step.title}</h4>
                <p className="text-base text-text-secondary leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Key Terms ─────────────────────────────────────────────────── */}
        <section id="terms" className="pb-10 scroll-mt-16">
          <h3 className="text-xl font-bold text-text-primary mb-2">Key Terms</h3>
          <p className="text-base text-text-secondary mb-5">
            A few terms appear throughout the dashboard that are helpful to understand.
          </p>

          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-brand-blue" />
              <h4 className="text-base font-bold text-text-primary">Types of Air Service</h4>
            </div>
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left py-2 pr-4 font-semibold text-text-primary">Service Type</th>
                  <th className="text-left py-2 font-semibold text-text-primary">Description</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-semibold">Scheduled</td><td className="py-2">Regular commercial flights on published timetables — the majority of passenger traffic</td></tr>
                <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-semibold">Cargo</td><td className="py-2">Freight-only operators like FedEx and UPS</td></tr>
                <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-semibold">Charter</td><td className="py-2">Non-scheduled flights arranged for specific groups or purposes</td></tr>
                <tr><td className="py-2 pr-4 font-semibold">Non-scheduled</td><td className="py-2">Other non-scheduled civilian operations (air taxi, on-demand)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
              <div className="flex gap-3">
                <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
                <p className="text-base text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Cross-border routes:</strong> Texas–Mexico routes
                  are served by both U.S. airlines (American, United, Southwest) and Mexican airlines
                  (Aeromexico, Volaris, VivaAerobus). The dashboard combines both to show total traffic.
                  You can also filter by carrier type to compare them separately.
                </p>
              </div>
            </div>
            <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
              <div className="flex gap-3">
                <MapPin size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
                <p className="text-base text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Texas border airports:</strong> Six Texas airports
                  located within a TxDOT border district:{' '}
                  <strong>El Paso</strong>, <strong>Laredo</strong>, <strong>McAllen</strong>,{' '}
                  <strong>Harlingen</strong>, <strong>Brownsville</strong>, and{' '}
                  <strong>Del Rio</strong>. These are highlighted with a gold ring on maps and analyzed
                  separately in the Texas–Mexico section.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Data Quality ──────────────────────────────────────────────── */}
        <section id="quality" className="pb-10 scroll-mt-16">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Quality</h3>
          <p className="text-base text-text-secondary mb-5">
            The Texas–Mexico dataset covers <strong>2015–2024</strong> with data from{' '}
            <strong>89 airlines</strong> across nearly <strong>600 route pairs</strong>.
            Before powering the dashboard, the raw data goes through several quality checks.
          </p>

          {/* TX-MX at a glance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              ['79.2M', 'Passengers'],
              ['852K', 'Flights operated'],
              ['459M lbs', 'Freight'],
              ['21.7M lbs', 'Mail'],
            ].map(([stat, label]) => (
              <div key={label} className="bg-white rounded-xl border border-border-light shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-brand-blue">{stat}</p>
                <p className="text-base text-text-secondary mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* What was cleaned */}
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-6">
            <h4 className="text-base font-bold text-text-primary mb-4">What Was Cleaned</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Airport Names & Codes',
                  body: 'Outdated or incorrect airport codes and city names were standardized across all records.',
                },
                {
                  title: 'Data-Entry Errors',
                  body: 'Obvious errors in departure counts and passenger figures were identified and corrected.',
                },
                {
                  title: 'Duplicate Records',
                  body: 'Exact duplicate entries were removed to prevent double-counting.',
                },
                {
                  title: 'Inactive Routes',
                  body: 'Records where the origin and destination are the same airport were removed as filing artifacts.',
                },
                {
                  title: 'Empty Records',
                  body: 'Entries with no passengers, freight, or mail were filtered out — including repositioning flights with no commercial traffic.',
                },
                {
                  title: 'Schedule Data Flags',
                  body: 'Records where schedule information is unavailable (foreign carriers, charters) are flagged so the dashboard can filter them automatically.',
                },
              ].map((rule) => (
                <div key={rule.title} className="bg-surface-alt rounded-lg p-4">
                  <h5 className="text-base font-semibold text-text-primary mb-1">{rule.title}</h5>
                  <p className="text-base text-text-secondary leading-relaxed">{rule.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
            <div className="flex gap-3">
              <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-base text-text-secondary leading-relaxed">
                <strong className="text-text-primary">Repositioning flights:</strong> Beyond the
                traffic shown in this dashboard, over <strong>1,700 repositioning and empty cargo
                flights</strong> were operated on Texas–Mexico routes during 2015–2024. These are
                real flights that carried no commercial passengers or freight — such as aircraft
                moving between airports for their next assignment. They highlight active cross-border
                aviation infrastructure even on routes with no visible traffic.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
