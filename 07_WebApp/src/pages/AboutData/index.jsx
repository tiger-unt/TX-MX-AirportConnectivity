import {
  Database, Filter, ClipboardCheck, FileOutput, Info, BookOpen,
  AlertTriangle, CheckCircle2, ArrowDownRight, ArrowRight,
  ExternalLink, FileText, Layers
} from 'lucide-react'

export default function AboutDataPage() {
  return (
    <>
      {/* Hero */}
      <div className="gradient-blue text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-balance">
            About the Data
          </h1>
          <p className="text-white/70 mt-3 text-base md:text-lg max-w-2xl">
            How the BTS T-100 data was extracted, cleaned, and prepared for this
            dashboard — and key structural details you should know when
            interpreting the numbers.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">

        {/* ── Data Source ────────────────────────────────────────────────── */}
        <section className="py-10">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Source</h3>
          <p className="text-sm text-text-secondary mb-5">
            All data in this dashboard comes from the Bureau of Transportation Statistics (BTS),
            a division of the U.S. Department of Transportation.
          </p>

          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-brand-blue" />
              <h4 className="text-base font-bold text-text-primary">BTS T-100 Air Carrier Statistics</h4>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              The T-100 data program collects traffic and capacity information from air carriers operating
              flights to, from, or within the United States. U.S. carriers file under{' '}
              <strong>Schedule T-100</strong> (14 CFR Part 241), while foreign carriers file under{' '}
              <strong>Schedule T-100(f)</strong> (14 CFR Part 217). Data has been available since 1990 and is
              reported monthly, with the most recent data from November 2025.
            </p>
            <p className="text-sm text-text-secondary leading-relaxed mb-5">
              For this study, we use <strong>four data tables</strong> from the TranStats portal, covering the
              period <strong>2015&ndash;2024</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { label: 'T-100 Domestic Market (All Carriers)', desc: 'Passenger, freight, and mail enplanement data for routes within the U.S.' },
                { label: 'T-100 Domestic Segment (All Carriers)', desc: 'Nonstop segment operations with capacity, departures, and flight time data for U.S. routes.' },
                { label: 'T-100 International Market (All Carriers)', desc: 'Enplanement data for routes with at least one U.S. endpoint, including foreign carrier filings.' },
                { label: 'T-100 International Segment (All Carriers)', desc: 'Nonstop segment operations for international routes, from both U.S. and foreign carriers.' },
              ].map((t) => (
                <div key={t.label} className="bg-surface-alt rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-text-primary mb-1">{t.label}</h5>
                  <p className="text-xs text-text-secondary leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FMF&QO_fu146_anzr=Nv4%20Pn44vr45"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
              >
                <ExternalLink size={14} />
                Download Market Data (TranStats)
              </a>
              <a
                href="https://transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FMG&QO_fu146_anzr="
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
              >
                <ExternalLink size={14} />
                Download Segment Data (TranStats)
              </a>
            </div>
          </div>
        </section>

        {/* ── Market vs Segment Data ─────────────────────────────────────── */}
        <section className="pb-10">
          <h3 className="text-xl font-bold text-text-primary mb-2">Market vs. Segment Data</h3>
          <p className="text-sm text-text-secondary mb-5">
            The BTS T-100 program produces two complementary datasets. Understanding the difference
            is essential for interpreting passenger counts correctly.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} className="text-brand-blue" />
                <h4 className="text-base font-bold text-text-primary">Market Data</h4>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                A passenger is <strong>"enplaned"</strong> and counted <strong>once</strong> as long as
                they remain on the same flight number, regardless of intermediate stops.
                Market data is what BTS uses for official passenger, freight, and mail totals.
              </p>
              <p className="text-xs text-text-secondary">
                <strong>Key fields:</strong> Passengers, Freight, Mail, Distance
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={18} className="text-brand-blue" />
                <h4 className="text-base font-bold text-text-primary">Segment Data</h4>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                A passenger is <strong>"transported"</strong> and counted for{' '}
                <strong>each up-and-down leg</strong> of their trip. Segment counts tend to be higher
                than market counts because connecting passengers are counted on every leg.
              </p>
              <p className="text-xs text-text-secondary">
                <strong>Key fields:</strong> Passengers, Freight, Mail, Distance, Departures Scheduled,
                Departures Performed, Seats, Payload, Ramp-to-Ramp Time, Air Time
              </p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
            <div className="flex gap-3">
              <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary leading-relaxed">
                <strong className="text-text-primary">Example:</strong> 250 people board a flight from
                JFK (A) to BWI (B). At BWI, 200 deplane; the remaining 50 plus 70 new passengers
                continue to MIA (C).
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="font-semibold text-text-primary mb-1">Market counts:</p>
                    <ul className="space-y-0.5 text-xs">
                      <li>A &rarr; B: <strong>200</strong> (deplaned at B)</li>
                      <li>A &rarr; C: <strong>50</strong> (continued to C)</li>
                      <li>B &rarr; C: <strong>70</strong> (boarded at B)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">Segment counts:</p>
                    <ul className="space-y-0.5 text-xs">
                      <li>A &rarr; B: <strong>250</strong> (all on board)</li>
                      <li>B &rarr; C: <strong>120</strong> (50 continuing + 70 new)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Data Limitations: T-100 vs T-100(f) ────────────────────────── */}
        <section className="pb-10">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Limitations</h3>
          <p className="text-sm text-text-secondary mb-5">
            U.S. carriers (T-100) and foreign carriers (T-100(f)) have different reporting requirements.
            This creates structural gaps in certain fields for foreign carrier records.
          </p>

          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-6">
            <h4 className="text-base font-bold text-text-primary mb-4">
              T-100 vs. T-100(f) Reporting Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left py-2 pr-4 font-semibold text-text-primary">Field</th>
                    <th className="text-center py-2 px-3 font-semibold text-text-primary">T-100 (U.S.)</th>
                    <th className="text-center py-2 px-3 font-semibold text-text-primary">T-100(f) (Foreign)</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {[
                    ['Departures Performed', true, true],
                    ['Passengers', true, true],
                    ['Freight', true, true],
                    ['Available Seats', true, true],
                    ['Available Capacity', true, true],
                    ['Departures Scheduled', true, false],
                    ['Mail', true, false],
                    ['Ramp-to-Ramp Time', true, false],
                    ['Airborne Time', true, false],
                  ].map(([field, us, foreign]) => (
                    <tr key={field} className="border-b border-border-light/50">
                      <td className="py-2 pr-4">{field}</td>
                      <td className="py-2 px-3 text-center">
                        {us
                          ? <span className="text-brand-green font-semibold">Yes</span>
                          : <span className="text-brand-red font-semibold">No</span>
                        }
                      </td>
                      <td className="py-2 px-3 text-center">
                        {foreign
                          ? <span className="text-brand-green font-semibold">Yes</span>
                          : <span className="text-brand-red font-semibold">No</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-brand-yellow/8 border border-brand-yellow/20 rounded-xl p-5">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Scheduled departures gap:</strong> Foreign carriers
                  (DATA_SOURCE = IF, DF) do not report DEPARTURES_SCHEDULED under T-100(f) regulations.
                  All foreign carrier segment records have this field as 0. Schedule adherence analysis
                  should be limited to U.S. carrier records only.
                </p>
              </div>
            </div>
            <div className="bg-brand-yellow/8 border border-brand-yellow/20 rounded-xl p-5">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Missing operational metrics:</strong> Foreign carriers
                  also do not report Ramp-to-Ramp time, Airborne time, or Mail volumes. These fields are
                  zero for all IF/DF records — not because there is no mail or flight time, but because
                  foreign carriers are not required to report them.
                </p>
              </div>
            </div>
            <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
              <div className="flex gap-3">
                <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Non-scheduled service:</strong> Records with
                  CLASS = L (charter) or P (non-scheduled civilian) have DEPARTURES_SCHEDULED = 0 by
                  definition, regardless of carrier nationality. For schedule analysis, filter to{' '}
                  <code className="bg-surface-alt px-1 py-0.5 rounded text-xs">CLASS = 'F' AND DEPARTURES_SCHEDULED &gt; 0</code>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Data Pipeline ──────────────────────────────────────────────── */}
        <section className="py-10">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Pipeline</h3>
          <p className="text-sm text-text-secondary mb-5">
            From raw BTS filings to the visualizations on this dashboard, the data passes through a
            multi-step extraction and cleaning pipeline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                Icon: Database,
                title: '1. Source Database',
                body: 'BTS T-100 Air Carrier Statistics loaded into a local SQLite database (~4.5 GB). Contains ~8.3 M market records and ~11.4 M segment records covering all U.S. carriers.',
              },
              {
                Icon: Filter,
                title: '2. Extraction & Filtering',
                body: 'SQL queries extract Texas and Mexico origin/destination records for the study period, aggregating monthly filings into annual totals by carrier and airport pair.',
              },
              {
                Icon: ClipboardCheck,
                title: '3. Data Cleaning',
                body: 'Rule-based corrections fix airport codes, city names, and state labels. Outlier departures are capped, duplicate rows removed, and zero-activity records filtered out.',
              },
              {
                Icon: FileOutput,
                title: '4. Output',
                body: 'Cleaned market and segment CSVs plus a GeoJSON airport reference file are produced — these are the datasets powering every chart and map in this dashboard.',
              },
            ].map((step) => (
              <div
                key={step.title}
                className="bg-white rounded-xl border border-border-light shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <step.Icon size={18} className="text-brand-blue" />
                </div>
                <h4 className="text-sm font-bold text-text-primary">{step.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BTS Data Glossary ──────────────────────────────────────────── */}
        <section className="pb-10">
          <h3 className="text-xl font-bold text-text-primary mb-2">BTS Data Glossary</h3>
          <p className="text-sm text-text-secondary mb-5">
            Two categorical fields — <strong>CLASS</strong> and <strong>DATA_SOURCE</strong> — are
            key to understanding the structure of BTS T-100 data.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CLASS table */}
            <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-brand-blue" />
                <h4 className="text-base font-bold text-text-primary">CLASS — Type of Air Service</h4>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left py-2 pr-4 font-semibold text-text-primary">Code</th>
                    <th className="text-left py-2 font-semibold text-text-primary">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-mono font-semibold">F</td><td className="py-2">Scheduled (regular commercial flights)</td></tr>
                  <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-mono font-semibold">G</td><td className="py-2">Cargo (freight operators like FedEx, UPS)</td></tr>
                  <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-mono font-semibold">L</td><td className="py-2">Charter (non-scheduled charter flights)</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-semibold">P</td><td className="py-2">Non-scheduled civilian (other non-scheduled ops)</td></tr>
                </tbody>
              </table>
              <p className="text-xs text-text-secondary mt-3">
                <strong>Class F</strong> dominates passenger traffic. <strong>Class G</strong> covers
                freight-only carriers. <strong>Class L</strong> appears on lower-volume routes.
              </p>
            </div>

            {/* DATA_SOURCE table */}
            <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-brand-blue" />
                <h4 className="text-base font-bold text-text-primary">DATA_SOURCE — BTS Reporting Form</h4>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left py-2 pr-4 font-semibold text-text-primary">Code</th>
                    <th className="text-left py-2 font-semibold text-text-primary">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-mono font-semibold">DU</td><td className="py-2">Domestic route, U.S. carrier (T-100)</td></tr>
                  <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-mono font-semibold">IU</td><td className="py-2">International route, U.S. carrier (T-100)</td></tr>
                  <tr className="border-b border-border-light/50"><td className="py-2 pr-4 font-mono font-semibold">DF</td><td className="py-2">Domestic route, Foreign carrier (T-100(f))</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-semibold">IF</td><td className="py-2">International route, Foreign carrier (T-100(f))</td></tr>
                </tbody>
              </table>
              <p className="text-xs text-text-secondary mt-3">
                First letter: <strong>D</strong>omestic route vs <strong>I</strong>nternational route.
                Second letter: <strong>U</strong>.S. carrier vs <strong>F</strong>oreign carrier.
                U.S. carriers file T-100 (DU/IU); foreign carriers file T-100(f) (DF/IF).
              </p>
            </div>
          </div>

          <div className="mt-4 bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
            <div className="flex gap-3">
              <Info size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary leading-relaxed">
                <strong className="text-text-primary">Cross-border note:</strong> Texas-to-Mexico routes
                can have <strong>both IU and IF records</strong> — U.S. carriers (e.g., American, United)
                file as IU while foreign carriers (e.g., Aeromexico, Volaris) file as IF.
                To get total traffic on a route, aggregate across both data sources.
                To compare U.S. vs. foreign carrier activity, keep them separate.
              </p>
            </div>
          </div>
        </section>

        {/* ── Data Quality & Cleaning Insights ───────────────────────────── */}
        <section className="pb-10">
          <h3 className="text-xl font-bold text-text-primary mb-2">Data Quality Insights</h3>
          <p className="text-sm text-text-secondary mb-5">
            Raw BTS data contains structural patterns that may appear anomalous but are explainable.
            Understanding these is critical for accurate analysis.
          </p>

          {/* Departures Performed vs Scheduled */}
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-6">
            <h4 className="text-base font-bold text-text-primary mb-4">
              Departures Performed vs. Scheduled — The Big Picture
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left py-2 pr-4 font-semibold text-text-primary">Category</th>
                      <th className="text-right py-2 pr-4 font-semibold text-text-primary">Records</th>
                      <th className="text-right py-2 font-semibold text-text-primary">% of 11.4M</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    <tr className="border-b border-border-light/50">
                      <td className="py-2 pr-4">Performed = Scheduled</td>
                      <td className="py-2 pr-4 text-right font-mono">5,297,023</td>
                      <td className="py-2 text-right font-mono">46.5%</td>
                    </tr>
                    <tr className="border-b border-border-light/50">
                      <td className="py-2 pr-4">Performed &gt; Scheduled</td>
                      <td className="py-2 pr-4 text-right font-mono">4,236,023</td>
                      <td className="py-2 text-right font-mono">37.1%</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Performed &lt; Scheduled</td>
                      <td className="py-2 pr-4 text-right font-mono">1,868,765</td>
                      <td className="py-2 text-right font-mono">16.4%</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-sm text-text-secondary leading-relaxed">
                  At first glance, 37% of records showing more performed than scheduled departures looks
                  alarming — but most of it is explainable by structural data reasons, not data errors.
                </p>
              </div>

              <div>
                <h5 className="text-sm font-bold text-text-primary mb-3">
                  Why DEPARTURES_SCHEDULED = 0 for ~3.9M records
                </h5>
                <ul className="space-y-3 text-sm text-text-secondary">
                  <li className="flex gap-2">
                    <AlertTriangle size={16} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-text-primary">Foreign carriers (DATA_SOURCE = IF, DF):</strong>{' '}
                      ~932K records. Airlines like Aeromexico, Volaris, and VivaAerobus are <em>not required</em> to
                      report scheduled departures — they only report what they actually flew. All 15,091 IF records
                      in TX-Mexico data have DEPARTURES_SCHEDULED&nbsp;=&nbsp;0.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <AlertTriangle size={16} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-text-primary">Non-scheduled service (CLASS = L, P):</strong>{' '}
                      ~22,051 records in TX-Mexico. Charter and small/commuter carriers don't file schedules
                      by definition, so scheduled&nbsp;=&nbsp;0 is correct.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <AlertTriangle size={16} className="text-brand-yellow flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-text-primary">Supplemental flights (CLASS = F, DATA_SOURCE = DU):</strong>{' '}
                      Some domestic carriers classified as "F" (scheduled service) still have sched&nbsp;=&nbsp;0.
                      These appear to be supplemental or extra-section flights beyond the published schedule.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* True Scheduled Service */}
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6 mb-6">
            <h4 className="text-base font-bold text-text-primary mb-1">
              For True Scheduled Service (CLASS=F, sched &gt; 0): It's Actually Quite Clean
            </h4>
            <p className="text-sm text-text-secondary mb-4">
              When we filter to only domestic scheduled flights with actual schedule data, the
              performed-vs-scheduled match is strong.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left py-2 pr-4 font-semibold text-text-primary">Diff Bucket</th>
                    <th className="text-right py-2 pr-4 font-semibold text-text-primary">Records</th>
                    <th className="text-right py-2 font-semibold text-text-primary">%</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {[
                    ['Exact match (0)', '4,413,915', '67.2%', true],
                    ['1\u20132 fewer', '1,096,299', '16.7%', false],
                    ['3\u20135 fewer', '393,858', '6.0%', false],
                    ['1\u20132 extra', '200,479', '3.1%', false],
                    ['6\u201310 fewer', '185,050', '2.8%', false],
                    ['11+ fewer', '173,043', '2.6%', false],
                    ['3\u20135 extra', '56,457', '0.9%', false],
                    ['31+ extra', '7,230', '0.1%', false],
                  ].map(([label, records, pct, highlight]) => (
                    <tr key={label} className={`border-b border-border-light/50 ${highlight ? 'bg-brand-blue/5 font-semibold' : ''}`}>
                      <td className="py-2 pr-4">{label}</td>
                      <td className="py-2 pr-4 text-right font-mono">{records}</td>
                      <td className="py-2 text-right font-mono">{pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-brand-green flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">67.2%</strong> of true scheduled service records
                    are an exact match between performed and scheduled departures.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <ArrowDownRight size={18} className="text-brand-blue flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Performed &lt; Scheduled (28.4%)</strong> represents
                    normal flight cancellations — airlines scheduled flights but didn't operate all of them.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <ArrowRight size={18} className="text-brand-green flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Performed &gt; Scheduled (4.7%)</strong> indicates
                    extra-section flights, schedule changes mid-month, or charter additions to scheduled routes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cleaning rules applied */}
          <div className="bg-white rounded-xl border border-border-light shadow-sm p-6">
            <h4 className="text-base font-bold text-text-primary mb-4">Cleaning Rules Applied</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Airport Code & Name Corrections',
                  body: 'Rule-based updates fix incorrect IATA codes, city names, and state labels using a curated correction table applied to both origin and destination fields.',
                },
                {
                  title: 'Scheduled Departure Outliers',
                  body: 'Records where scheduled departures exceed performed by more than 100\u00d7 are identified as data-entry errors and capped at the performed value.',
                },
                {
                  title: 'Passengers Exceed Seats',
                  body: 'Segment records where reported passengers exceed available seats are capped — a known BTS reporting artifact in some carrier filings.',
                },
                {
                  title: 'Zero-Distance & Self-Routes',
                  body: 'Records where origin equals destination with zero distance are removed — these are filing artifacts, not real routes.',
                },
                {
                  title: 'Zero-Activity Records',
                  body: 'Rows with no passengers, freight, or mail are filtered out — they represent filed but empty route placeholders.',
                },
                {
                  title: 'Duplicate Row Removal',
                  body: 'Exact duplicate records are deduplicated to prevent double-counting in aggregations.',
                },
              ].map((rule) => (
                <div key={rule.title} className="bg-surface-alt rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-text-primary mb-1">{rule.title}</h5>
                  <p className="text-sm text-text-secondary leading-relaxed">{rule.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
