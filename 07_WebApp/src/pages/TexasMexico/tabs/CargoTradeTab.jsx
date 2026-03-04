import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import DivergingBarChart from '@/components/charts/DivergingBarChart'
import ScatterPlot from '@/components/charts/ScatterPlot'
import { fmtCompact, fmtLbs } from '@/lib/aviationHelpers'
import { CHART_COLORS } from '@/lib/chartColors'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function CargoTradeTab({
  freightTrend, mailTrend,
  freightImbalance, freightPerDep,
  borderSummaryTable,
  scatterScale, setScatterScale,
}) {
  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="max-w-3xl">
          <p className="text-base text-text-secondary leading-relaxed">
            While passengers dominate headlines, air cargo reveals the trade relationship
            between Texas and Mexico. Freight flows are highly asymmetric &mdash; some airports
            are net exporters while others are net importers. This section examines freight and
            mail volumes, trade imbalances, and which routes carry the most cargo per flight.
          </p>
        </div>
      </SectionBlock>

      {/* Freight & Mail Trends (side-by-side) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Freight Volume Trends"
            subtitle="TX\u2192MX exports vs MX\u2192TX imports by year"
            downloadData={{ summary: { data: freightTrend, filename: 'tx-mx-freight-trends' } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Mail Volume Trends"
            subtitle="Bidirectional mail volume by year"
            downloadData={{ summary: { data: mailTrend, filename: 'tx-mx-mail-trends' } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Freight Imbalance */}
      <SectionBlock>
        <ChartCard
          title="TX\u2013MX Freight Imbalance by Airport"
          subtitle="Exports vs Imports in freight lbs per Texas airport"
          downloadData={{ summary: { data: freightImbalance.map((d) => ({ label: d.label, Exports: d.exports, Imports: d.imports })), filename: 'tx-mx-freight-imbalance' } }}
        >
          <DivergingBarChart
            data={freightImbalance}
            leftKey="imports" rightKey="exports"
            leftLabel="Imports (MX \u2192 TX)" rightLabel="Exports (TX \u2192 MX)"
            formatValue={fmtLbs}
          />
        </ChartCard>
      </SectionBlock>

      {/* Freight Intensity */}
      <SectionBlock alt>
        <ChartCard
          title="Freight Intensity by Route"
          subtitle="Average freight per departure (lbs/flight) &mdash; top 10 routes with &ge;10 departures"
          downloadData={{ summary: { data: freightPerDep, filename: 'tx-mx-freight-per-departure' } }}
        >
          <BarChart data={freightPerDep} xKey="label" yKey="value" horizontal formatValue={fmtLbs} color={CHART_COLORS[4]} />
          <p className="text-base text-text-secondary mt-3 italic">Segment-level metric: shows how much cargo each flight actually carries, complementing market-level freight totals.</p>
        </ChartCard>
      </SectionBlock>

      {/* Scatter Plot: Passengers vs Freight */}
      <SectionBlock>
        <ChartCard
          title="Airport Activity: Passengers vs Freight"
          subtitle="Texas airports with Mexico service"
          downloadData={{ summary: { data: borderSummaryTable, filename: 'tx-mx-airport-scatter' } }}
          headerRight={
            <select
              value={scatterScale}
              onChange={(e) => setScatterScale(e.target.value)}
              className="text-base border border-border rounded-md px-2 py-1 bg-surface-primary"
            >
              <option value="symlog">Log Scale</option>
              <option value="linear">Linear Scale</option>
            </select>
          }
        >
          <ScatterPlot
            data={borderSummaryTable}
            xKey="Passengers"
            yKey="Freight"
            labelKey="Code"
            colorKey="Type"
            formatX={fmtCompact}
            formatY={fmtLbs}
            xLabel="Passengers"
            yLabel="Freight (lbs)"
            colorMap={{ Border: CHART_COLORS[0], 'Non-Border': CHART_COLORS[7] }}
            labelThreshold={8}
            scaleType={scatterScale}
          />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
