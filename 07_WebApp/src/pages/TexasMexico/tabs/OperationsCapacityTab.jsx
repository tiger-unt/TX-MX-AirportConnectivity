import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import DonutChart from '@/components/charts/DonutChart'
import { fmtCompact } from '@/lib/aviationHelpers'
import { CHART_COLORS } from '@/lib/chartColors'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function OperationsCapacityTab({
  seatTrend, depTrend, adherenceData,
  loadFactorTrend, loadFactorByRoute,
  serviceClassShare, serviceClassTrend,
  aircraftGroupShare, aircraftGroupTrend,
}) {
  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="max-w-3xl">
          <p className="text-base text-text-secondary leading-relaxed">
            Beyond passenger counts, operational metrics reveal how efficiently airlines serve
            the Texas&ndash;Mexico corridor. Seat capacity, schedule adherence, and load factors
            indicate whether supply matches demand &mdash; while service class and aircraft mix
            show the types of operations and fleet deployed on these routes.
          </p>
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
            <BarChart data={loadFactorByRoute.top} xKey="label" yKey="value" horizontal formatValue={(v) => `${v}%`} color={CHART_COLORS[0]} />
          </ChartCard>
          <ChartCard
            title="Lowest Load Factor Routes"
            subtitle="Bottom 10 routes (min 100 seats)"
            downloadData={{ summary: { data: loadFactorByRoute.bottom, filename: 'tx-mx-low-load-factor' } }}
          >
            <BarChart data={loadFactorByRoute.bottom} xKey="label" yKey="value" horizontal formatValue={(v) => `${v}%`} color={CHART_COLORS[8]} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Service Class Breakdown */}
      <SectionBlock alt>
        <div className="max-w-5xl mx-auto mb-4">
          <h3 className="text-xl font-bold text-text-primary mb-1">Service Class Breakdown</h3>
          <p className="text-base text-text-secondary">Charter, cargo-only, and scheduled service operations on Texas&ndash;Mexico routes.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Flight Share by Service Class"
            subtitle="Departures performed by class (all filtered years)"
            downloadData={{ summary: { data: serviceClassShare, filename: 'tx-mx-service-class-share' } }}
          >
            <DonutChart data={serviceClassShare} formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Flights by Service Class Over Time"
            subtitle="Departures performed by class and year"
            downloadData={{ summary: { data: serviceClassTrend, filename: 'tx-mx-service-class-trend' } }}
          >
            <LineChart data={serviceClassTrend} xKey="year" yKey="value" seriesKey="Class" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Aircraft Mix */}
      <SectionBlock>
        <div className="max-w-5xl mx-auto mb-4">
          <h3 className="text-xl font-bold text-text-primary mb-1">Aircraft Mix</h3>
          <p className="text-base text-text-secondary">Types of aircraft serving Texas&ndash;Mexico routes, by BTS aircraft group classification.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Departures by Aircraft Group"
            subtitle="Share of flights by aircraft type (all filtered years)"
            downloadData={{ summary: { data: aircraftGroupShare, filename: 'tx-mx-aircraft-group-share' } }}
          >
            <DonutChart data={aircraftGroupShare} formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Aircraft Group Trends"
            subtitle="Departures by aircraft group over time"
            downloadData={{ summary: { data: aircraftGroupTrend, filename: 'tx-mx-aircraft-group-trend' } }}
          >
            <LineChart data={aircraftGroupTrend} xKey="year" yKey="value" seriesKey="Aircraft" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
