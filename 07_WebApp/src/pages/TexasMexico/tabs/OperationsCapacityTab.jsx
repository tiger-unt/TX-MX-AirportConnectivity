import { useMemo, useState } from 'react'
import { Users, Plane } from 'lucide-react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InsightCallout from '@/components/ui/InsightCallout'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import BoxPlotChart from '@/components/charts/BoxPlotChart'

import StackedBarChart from '@/components/charts/StackedBarChart'
import { fmtCompact, fmtLbs, computeAdherenceData, isEmptyOrAllZero } from '@/lib/aviationHelpers'
import { CHART_COLORS } from '@/lib/chartColors'
import { DL } from '@/lib/downloadColumns'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function OperationsCapacityTab({
  seatTrend, depTrend, filteredSegment,
  loadFactorTrend, loadFactorDistribution,
  payloadUtilTrend,
  serviceClassShare, serviceClassTrend, serviceClassTrendWide,
  aircraftMixInsight, aircraftFreightByYear, aircraftFreightIntensity,
  nonNbCargoCarriers, nonNbDepTrend,
}) {
  /* ── Load Factor chart view toggle ──────────────────────────────────── */
  const [lfView, setLfView] = useState('box')              // 'line' | 'box'

  /* ── Schedule Adherence: local year selector ───────────────────────── */
  const [adherenceYear, setAdherenceYear] = useState('')   // '' = all years

  const adherenceYears = useMemo(() => {
    const years = [...new Set(filteredSegment.map((d) => d.YEAR))].sort((a, b) => a - b)
    return years
  }, [filteredSegment])

  const adherenceData = useMemo(() => {
    const data = adherenceYear
      ? filteredSegment.filter((d) => d.YEAR === Number(adherenceYear))
      : filteredSegment
    return computeAdherenceData(data)
  }, [filteredSegment, adherenceYear])

  const loadFactorInsight = useMemo(() => {
    if (!loadFactorTrend.length) return null
    const latestYear = Math.max(...loadFactorTrend.map((d) => d.year))
    const latestRows = loadFactorTrend.filter((d) => d.year === latestYear)
    if (!latestRows.length) return null
    const avg = latestRows.reduce((s, d) => s + d.value, 0) / latestRows.length
    return { avg: avg.toFixed(1), year: latestYear }
  }, [loadFactorTrend])

  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-base text-text-secondary leading-relaxed">
            Beyond passenger counts, operational metrics reveal how efficiently airlines serve
            the Texas&ndash;Mexico corridor. Seat capacity, schedule adherence, and passenger load factors
            indicate whether supply matches demand &mdash; while service class and aircraft mix
            show the types of operations and fleet deployed on these routes.
          </p>
          {loadFactorInsight && (
            <InsightCallout
              finding={`Average passenger load factor on Texas–Mexico routes was ${loadFactorInsight.avg}% in ${loadFactorInsight.year}.`}
              context="Passenger load factor = Passengers ÷ Seats. Values above 80% typically signal that airlines are operating near capacity."
              variant="default"
              icon={Users}
            />
          )}
        </div>
      </SectionBlock>

      {/* Seat Capacity & Departures (2-column) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartCard
            title="Seat Capacity Trends"
            subtitle="Total seats by year (segment data)"
            downloadData={{ summary: { data: seatTrend, filename: 'tx-mx-seat-trends', columns: DL.seatTrend } }}
            emptyState={isEmptyOrAllZero(seatTrend) ? 'No seat capacity data for the current filter selection. Cargo (Class G) flights do not report seat counts.' : null}
          >
            <LineChart data={seatTrend} xKey="year" yKey="value" formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Departures: Scheduled vs Performed"
            subtitle="Scheduled service by year (Class F, sched > 0)"
            downloadData={{ summary: { data: depTrend, filename: 'tx-mx-dep-trends', columns: DL.depTrendMetric } }}
            emptyState={!depTrend.length ? 'Scheduled vs. performed departures are only available for Class F (Scheduled Service) U.S. carrier flights.' : null}
            footnote={<p className="text-base text-text-secondary mt-1 italic">Note: U.S. carriers only &mdash; foreign carriers are not required to report schedule data to BTS.</p>}
          >
            <LineChart data={depTrend} xKey="year" yKey="value" seriesKey="Metric" formatValue={fmtCompact} />
          </ChartCard>
        </div>
        <div className="mt-5">
          <ChartCard
            title="Schedule Adherence"
            subtitle={`Class F scheduled service, U.S. carriers only — departure-weighted${adherenceYear ? ` (${adherenceYear})` : ''}`}
            downloadData={{ summary: { data: adherenceData, filename: 'tx-mx-schedule-adherence', columns: DL.adherence } }}
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
        </div>
      </SectionBlock>

      {/* Load Factor Analysis */}
      <SectionBlock>
        <ChartCard
          title={lfView === 'line' ? 'Passenger Load Factor Trends' : 'Route-Level Passenger Load Factor Distribution by Year'}
          subtitle={lfView === 'line' ? 'Passengers ÷ Seats (%) by year and direction' : 'Distribution of annual route load factors (routes with 100+ seats)'}
          downloadData={lfView === 'line'
            ? { summary: { data: loadFactorTrend, filename: 'tx-mx-load-factor-trend', columns: DL.loadFactorDir } }
            : { summary: { data: loadFactorDistribution, filename: 'tx-mx-load-factor-distribution', columns: DL.boxPlotPct } }}
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
      </SectionBlock>

      {/* Payload Weight Utilization */}
      <SectionBlock alt>
        <ChartCard
          title="Payload Weight Utilization"
          subtitle="Estimated total carried weight ÷ aircraft payload capacity (%) by year and direction"
          downloadData={{ summary: { data: payloadUtilTrend, filename: 'tx-mx-payload-weight-utilization', columns: DL.payloadUtilDir } }}
        >
          <LineChart data={payloadUtilTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={(v) => `${v}%`} annotations={COVID_ANNOTATION} />
          <div className="mt-4 space-y-2">
            <p className="text-base text-text-secondary italic">
              Payload Weight Utilization estimates how much of each aircraft's total weight-carrying
              capacity is actually used on a given flight. Unlike passenger load factor (which only
              measures seat occupancy), this metric accounts for all revenue-generating weight:
              passengers, air freight, and mail.
            </p>
            <p className="text-base text-text-secondary italic">
              <strong>Formula:</strong> (Passengers &times; 200 lbs + Freight + Mail) &divide; Payload Capacity &times; 100%.
              The 200 lb figure is the FAA standard average passenger weight including carry-on
              baggage. Payload capacity is the maximum weight the aircraft can carry beyond its own
              operating empty weight, as reported by carriers to BTS.
            </p>
            <p className="text-base text-text-secondary italic">
              <strong>Interpretation:</strong> A utilization rate of 60&ndash;70% is typical for mixed passenger-cargo
              operations &mdash; the remaining capacity is consumed by checked baggage weight (not
              individually reported in BTS data) and structural margins airlines maintain for
              operational safety. Values well below 50% may indicate underutilized capacity, while
              values approaching or exceeding 90% suggest aircraft are operating near their maximum
              weight limits.
            </p>
          </div>
        </ChartCard>
      </SectionBlock>

      {/* Service Class Breakdown */}
      <SectionBlock>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-text-primary mb-1">Service Class Breakdown</h3>
          <p className="text-base text-text-secondary">Charter, cargo-only, and scheduled service operations on Texas&ndash;Mexico routes.</p>
        </div>
        <ChartCard
          title="Flight Share by Service Class"
          subtitle="Departures performed by class (all filtered years)"
          downloadData={{ summary: { data: serviceClassShare, filename: 'tx-mx-service-class-share', columns: DL.serviceClass } }}
        >
          <BarChart data={serviceClassShare} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          {serviceClassTrendWide.keys.map((cls) => {
            const classData = serviceClassTrendWide.data
              .map((d) => ({ year: d.year, value: d[cls] || 0 }))
              .filter((d) => d.value > 0)
            if (!classData.length) return null
            return (
              <ChartCard
                key={cls}
                title={cls}
                subtitle="Departures performed by year"
                downloadData={{ summary: { data: classData, filename: `tx-mx-${cls.replace(/\s+/g, '-').toLowerCase()}`, columns: DL.classTrend } }}
              >
                <LineChart data={classData} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
              </ChartCard>
            )
          })}
        </div>
      </SectionBlock>

      {/* Aircraft Mix */}
      <SectionBlock alt>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-text-primary mb-1">Aircraft Mix</h3>
          <p className="text-base text-text-secondary">
            Narrow-body jets dominate Texas&ndash;Mexico departures, but the freight story reveals the
            critical role of wide-body and specialty aircraft in cross-border cargo operations.
          </p>
        </div>

        {aircraftMixInsight && (
          <div className="mb-5">
            <InsightCallout
              finding={`Narrow-Body jets account for ${aircraftMixInsight.nbDepPct}% of departures but carry only ${aircraftMixInsight.nbFreightPct}% of freight — wide-body and specialty aircraft handle ${aircraftMixInsight.nonNbFreightPct}% of all cargo despite just ${aircraftMixInsight.nonNbDepPct}% of flights.`}
              context="Non-narrow-body aircraft serve specialized cargo operations with significantly higher freight loads per departure."
              variant="warning"
              icon={Plane}
            />
          </div>
        )}

        <ChartCard
          title="Freight Volume by Aircraft Group"
          subtitle="Annual freight (lbs) carried by each aircraft type"
          downloadData={{ summary: { data: aircraftFreightByYear.data, filename: 'tx-mx-aircraft-freight-by-year' } }}
        >
          <StackedBarChart data={aircraftFreightByYear.data} xKey="year" stackKeys={aircraftFreightByYear.keys} formatValue={fmtLbs} />
          <p className="text-base text-text-secondary mt-3 italic">
            Unlike departure counts (dominated by narrow-body), freight reveals a more balanced
            picture &mdash; wide-body jets carry disproportionately large cargo loads per flight.
          </p>
        </ChartCard>

        <div className="mt-5">
          <ChartCard
            title="Freight per Departure by Aircraft Type"
            subtitle="Average freight load (lbs/flight) by aircraft group — label shows each type's share of total departures"
            downloadData={{ summary: { data: aircraftFreightIntensity, filename: 'tx-mx-aircraft-freight-intensity', columns: DL.aircraftIntensity } }}
          >
            <BarChart
              data={aircraftFreightIntensity}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={fmtLbs}
              labelAccessor={(d) => `${fmtLbs(d.value)}  ·  ${d.depPct}% of flights`}
              color={CHART_COLORS[2]}
            />
            <p className="text-base text-text-secondary mt-3 italic">
              Wide-body freighters carry over 100&times; more freight per departure than narrow-body jets,
              yet narrow-body jets dominate total flight counts. The departure share shows how rare each aircraft type is on this corridor.
            </p>
          </ChartCard>
        </div>
        <div className="mt-5">
          <ChartCard
            title="Top Cargo Carriers (Non-Narrow-Body)"
            subtitle="Total freight by carriers using wide-body, turboprop, or piston aircraft"
            downloadData={{ summary: { data: nonNbCargoCarriers, filename: 'tx-mx-non-nb-cargo-carriers', columns: DL.nonNbCarriers } }}
          >
            <BarChart data={nonNbCargoCarriers} xKey="label" yKey="value" horizontal formatValue={fmtLbs} color={CHART_COLORS[4]} />
          </ChartCard>
        </div>

        <div className="mt-5">
          <ChartCard
            title="Non-Narrow-Body Departure Trends"
            subtitle="Departures by aircraft type over time (narrow-body excluded)"
            downloadData={{ summary: { data: nonNbDepTrend, filename: 'tx-mx-non-nb-departure-trends', columns: DL.depTrendAircraft } }}
          >
            <LineChart data={nonNbDepTrend} xKey="year" yKey="value" seriesKey="Aircraft" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
            <p className="text-base text-text-secondary mt-3 italic">
              Narrow-body departures (~85K/year) are excluded to reveal the dynamics of the specialized cargo and
              regional fleet &mdash; including turboprop and wide-body freight operations.
            </p>
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
