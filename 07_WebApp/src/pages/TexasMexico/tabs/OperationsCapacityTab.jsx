import { useMemo } from 'react'
import { Users, Plane } from 'lucide-react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InsightCallout from '@/components/ui/InsightCallout'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import LollipopChart from '@/components/charts/LollipopChart'

import StackedBarChart from '@/components/charts/StackedBarChart'
import { fmtCompact, fmtLbs } from '@/lib/aviationHelpers'
import { CHART_COLORS } from '@/lib/chartColors'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function OperationsCapacityTab({
  seatTrend, depTrend, adherenceData,
  loadFactorTrend, loadFactorByRoute,
  serviceClassShare, serviceClassTrend, serviceClassTrendWide,
  aircraftMixInsight, aircraftFreightByYear, aircraftFreightIntensity,
  nonNbCargoCarriers, nonNbDepTrend,
}) {
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
            the Texas&ndash;Mexico corridor. Seat capacity, schedule adherence, and load factors
            indicate whether supply matches demand &mdash; while service class and aircraft mix
            show the types of operations and fleet deployed on these routes.
          </p>
          {loadFactorInsight && (
            <InsightCallout
              finding={`Average load factor on Texas\u2013Mexico routes was ${loadFactorInsight.avg}% in ${loadFactorInsight.year}.`}
              context="Load factors above 80% typically signal that airlines are operating near capacity."
              variant="default"
              icon={Users}
            />
          )}
        </div>
      </SectionBlock>

      {/* Seat Capacity, Departures, Adherence (3-column) */}
      <SectionBlock alt>
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
            <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only &mdash; foreign carriers are not required to report schedule data to BTS.</p>
          </ChartCard>
          <ChartCard
            title="Schedule Adherence"
            subtitle="Departure-weighted: performed vs scheduled (Class F, scheduled service)"
            downloadData={{ summary: { data: adherenceData, filename: 'tx-mx-schedule-adherence' } }}
          >
            <BarChart data={adherenceData} xKey="label" yKey="value" horizontal color={CHART_COLORS[2]} formatValue={(v) => `${v.toFixed(1)}%`} maxBars={10} animate />
            <p className="text-base text-text-secondary mt-3 italic">Note: U.S. carriers only &mdash; foreign carriers are not required to report schedule data to BTS.</p>
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Load Factor Analysis */}
      <SectionBlock>
        <ChartCard
          title="Load Factor Trends"
          subtitle="Passengers &divide; Seats (%) by year and direction"
          downloadData={{ summary: { data: loadFactorTrend, filename: 'tx-mx-load-factor-trend' } }}
        >
          <LineChart data={loadFactorTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={(v) => `${v}%`} annotations={COVID_ANNOTATION} />
        </ChartCard>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <ChartCard
            title="Highest Load Factor Routes"
            subtitle="Top 10 routes by passenger/seat ratio"
            downloadData={{ summary: { data: loadFactorByRoute.top, filename: 'tx-mx-top-load-factor' } }}
          >
            <LollipopChart data={loadFactorByRoute.top} xKey="label" yKey="value" formatValue={(v) => `${v}%`} color={CHART_COLORS[0]} />
          </ChartCard>
          <ChartCard
            title="Lowest Load Factor Routes"
            subtitle="Bottom 10 routes (min 100 seats)"
            downloadData={{ summary: { data: loadFactorByRoute.bottom, filename: 'tx-mx-low-load-factor' } }}
          >
            <LollipopChart data={loadFactorByRoute.bottom} xKey="label" yKey="value" formatValue={(v) => `${v}%`} color={CHART_COLORS[8]} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Service Class Breakdown */}
      <SectionBlock alt>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-text-primary mb-1">Service Class Breakdown</h3>
          <p className="text-base text-text-secondary">Charter, cargo-only, and scheduled service operations on Texas&ndash;Mexico routes.</p>
        </div>
        <ChartCard
          title="Flight Share by Service Class"
          subtitle="Departures performed by class (all filtered years)"
          downloadData={{ summary: { data: serviceClassShare, filename: 'tx-mx-service-class-share' } }}
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
                downloadData={{ summary: { data: classData, filename: `tx-mx-${cls.replace(/\s+/g, '-').toLowerCase()}` } }}
              >
                <LineChart data={classData} xKey="year" yKey="value" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
              </ChartCard>
            )
          })}
        </div>
      </SectionBlock>

      {/* Aircraft Mix */}
      <SectionBlock>
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
              finding={`Narrow-Body jets account for ${aircraftMixInsight.nbDepPct}% of departures but carry only ${aircraftMixInsight.nbFreightPct}% of freight \u2014 wide-body and specialty aircraft handle ${aircraftMixInsight.nonNbFreightPct}% of all cargo despite just ${aircraftMixInsight.nonNbDepPct}% of flights.`}
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
            downloadData={{ summary: { data: aircraftFreightIntensity, filename: 'tx-mx-aircraft-freight-intensity' } }}
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
            downloadData={{ summary: { data: nonNbCargoCarriers, filename: 'tx-mx-non-nb-cargo-carriers' } }}
          >
            <BarChart data={nonNbCargoCarriers} xKey="label" yKey="value" horizontal formatValue={fmtLbs} color={CHART_COLORS[4]} />
          </ChartCard>
        </div>

        <div className="mt-5">
          <ChartCard
            title="Non-Narrow-Body Departure Trends"
            subtitle="Departures by aircraft type over time (narrow-body excluded)"
            downloadData={{ summary: { data: nonNbDepTrend, filename: 'tx-mx-non-nb-departure-trends' } }}
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
