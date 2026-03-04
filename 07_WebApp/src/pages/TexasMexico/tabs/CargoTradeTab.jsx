import { useMemo } from 'react'
import { Package, TrendingUp } from 'lucide-react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InsightCallout from '@/components/ui/InsightCallout'
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
  classGFreightUtilTrend, classGFreightUtilByRoute, classGStats,
}) {
  const imbalanceInsight = useMemo(() => {
    if (!freightImbalance?.length) return null
    // Find the airport with the largest absolute imbalance
    let maxDiff = 0, maxAirport = null, maxType = ''
    freightImbalance.forEach((d) => {
      const diff = Math.abs((d.exports || 0) - (d.imports || 0))
      if (diff > maxDiff) {
        maxDiff = diff
        maxAirport = d.label
        maxType = (d.exports || 0) > (d.imports || 0) ? 'net exporter' : 'net importer'
      }
    })
    return maxAirport ? { airport: maxAirport, type: maxType } : null
  }, [freightImbalance])

  const satInsight = useMemo(() => {
    if (!freightImbalance?.length) return null
    const totalCargo = freightImbalance.reduce((s, d) => s + (d.exports || 0) + (d.imports || 0), 0)
    const sat = freightImbalance.find((d) => d.label?.includes('SAT') || d.label?.includes('San Antonio'))
    if (!sat || !totalCargo) return null
    const satCargo = (sat.exports || 0) + (sat.imports || 0)
    const pct = (satCargo / totalCargo * 100).toFixed(0)
    return Number(pct) >= 20 ? { pct } : null
  }, [freightImbalance])

  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-base text-text-secondary leading-relaxed">
            While passengers dominate headlines, air cargo reveals the underlying trade
            relationship between Texas and Mexico. Cross-border supply chains &mdash; particularly
            maquiladora assembly operations in electronics, automotive, and aerospace &mdash; rely
            on air freight for high-value, time-sensitive components. Top commodities moving by
            air include electrical machinery, aircraft parts, and precision instruments. Despite
            this, Texas ranks far lower nationally in air cargo than in passengers: most
            cross-border freight moves overland because Texas is close enough to Mexico for
            trucking to outcompete air transport in cost and time. The air cargo that does move
            tends to reflect urgent or high-value supply chain needs rather than steady bulk flows.
          </p>
          {imbalanceInsight && (
            <InsightCallout
              finding={`${imbalanceInsight.airport} is the largest ${imbalanceInsight.type} of air freight on the Texas–Mexico corridor.`}
              context="The diverging bar chart below shows the export/import balance for each Texas airport."
              variant="default"
              icon={Package}
            />
          )}
          {satInsight && (
            <InsightCallout
              finding={`San Antonio (SAT) handles roughly ${satInsight.pct}% of all Texas–Mexico air cargo by weight — more than DFW or IAH.`}
              context="SAT is not a border airport, yet its cargo volume exceeds all other Texas airports on this corridor. This concentration likely reflects specific industry logistics arrangements rather than geographic proximity to the border."
              variant="warning"
              icon={TrendingUp}
            />
          )}
        </div>
      </SectionBlock>

      {/* Freight & Mail Trends (side-by-side) */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Freight Volume Trends"
            subtitle="TX→MX exports vs MX→TX imports by year"
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
          title="TX–MX Freight Imbalance by Airport"
          subtitle="Exports vs Imports in freight lbs per Texas airport"
          downloadData={{ summary: { data: freightImbalance.map((d) => ({ label: d.label, Exports: d.exports, Imports: d.imports })), filename: 'tx-mx-freight-imbalance' } }}
          footnote={<p className="text-base text-text-secondary mt-1 italic">Airports with larger bars on the right ship more freight to Mexico; those extending left receive more. This asymmetry is analogous to "deadheading" in trucking — cargo flights often move loaded in one direction and return empty, which increases per-unit transportation costs and influences the economic viability of air versus surface freight.</p>}
        >
          <DivergingBarChart
            data={freightImbalance}
            leftKey="imports" rightKey="exports"
            leftLabel="Imports (MX → TX)" rightLabel="Exports (TX → MX)"
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
          footnote={<p className="text-base text-text-secondary mt-1 italic">Segment-level metric: shows how much cargo each flight actually carries. Routes with irregular, high-intensity spikes may reflect "emergency supply chain" usage — airports serving as last-resort modal options for urgent, high-value shipments when surface transport cannot meet delivery timelines.</p>}
        >
          <BarChart data={freightPerDep} xKey="label" yKey="value" horizontal formatValue={fmtLbs} color={CHART_COLORS[4]} />
        </ChartCard>
      </SectionBlock>

      {/* All-Cargo (Class G) Freight Payload Utilization */}
      {classGFreightUtilTrend?.length > 0 && (
        <SectionBlock>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-text-primary mb-1">All-Cargo Flight Payload Utilization (Class G)</h3>
            <p className="text-base text-text-secondary">
              How efficiently dedicated freighter aircraft use their weight-carrying capacity on
              Texas&ndash;Mexico routes. Unlike mixed passenger-cargo flights, all-cargo (Class G)
              operations exist solely to transport freight and mail &mdash; making their payload
              utilization a direct measure of cargo loading efficiency.
            </p>
          </div>

          {classGStats && (
            <div className="mb-5">
              <InsightCallout
                finding={`Dedicated all-cargo flights on the Texas–Mexico corridor average ${classGStats.avgUtil}% freight payload utilization across ${fmtCompact(classGStats.totalDeps)} departures operated by ${classGStats.carrierCount} carrier${classGStats.carrierCount !== 1 ? 's' : ''}.`}
                context="Class G (all-cargo/all-mail) flights carry no passengers. Their payload utilization reflects pure freight loading efficiency — how much of the aircraft's weight capacity is filled with cargo."
                variant="default"
                icon={Package}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="Freight Payload Utilization Trend"
              subtitle="(Freight + Mail) ÷ Payload Capacity (%) — Class G flights only"
              downloadData={{ summary: { data: classGFreightUtilTrend, filename: 'tx-mx-class-g-freight-util-trend' } }}
            >
              <LineChart data={classGFreightUtilTrend} xKey="year" yKey="value" formatValue={(v) => `${v}%`} annotations={COVID_ANNOTATION} />
            </ChartCard>

            <ChartCard
              title="Top Routes by Freight Payload Utilization"
              subtitle="Class G routes with ≥5 departures — (Freight + Mail) ÷ Payload (%)"
              downloadData={{ summary: { data: classGFreightUtilByRoute, filename: 'tx-mx-class-g-freight-util-by-route' } }}
            >
              <BarChart
                data={classGFreightUtilByRoute}
                xKey="label"
                yKey="value"
                horizontal
                formatValue={(v) => `${v}%`}
                labelAccessor={(d) => `${d.value}%  ·  ${d.deps} departures`}
                color={CHART_COLORS[4]}
              />
            </ChartCard>
          </div>

          {/* Detailed methodology notes — placed outside the grid to avoid LineChart height feedback loop */}
          <div className="mt-5 space-y-3">
            <p className="text-base text-text-secondary italic">
              <strong>What the trend chart shows:</strong> The percentage of total payload capacity filled with
              freight and mail on dedicated cargo flights (BTS Service Class G &mdash; all-cargo and
              all-mail operations). This isolates pure cargo loading efficiency without the
              confounding effect of passenger weight.
            </p>
            <p className="text-base text-text-secondary italic">
              <strong>Formula:</strong> (Freight lbs + Mail lbs) &divide; Payload Capacity lbs &times; 100%.
              Payload capacity is the aircraft's maximum revenue payload as reported to BTS &mdash; the
              total weight the aircraft can carry beyond its operating empty weight.
            </p>
            <p className="text-base text-text-secondary italic">
              <strong>Why it matters:</strong> Low utilization (&lt;40%) on cargo flights suggests
              either repositioning flights (deadhead legs returning empty), imbalanced trade flows
              (more cargo in one direction), or scheduled service maintaining frequency even when
              demand is thin. High utilization (&gt;70%) indicates strong, consistent cargo demand
              filling available capacity.
            </p>
            <p className="text-base text-text-secondary italic">
              <strong>Route rankings:</strong> Routes are ranked by how fully loaded their dedicated cargo flights are. The departure
              count alongside each bar provides context &mdash; a high utilization rate on a route
              with hundreds of departures signals sustained, efficient cargo operations, while high
              utilization on just a handful of flights may reflect one-off charter movements.
              Only routes with at least 5 all-cargo departures are shown to filter out statistical noise.
            </p>
          </div>
        </SectionBlock>
      )}

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
            nameKey="Airport"
            colorKey="Type"
            formatX={fmtCompact}
            formatY={fmtLbs}
            xLabel="Passengers"
            yLabel="Freight (lbs)"
            colorMap={{ 'Border Airport': CHART_COLORS[0], 'Non-Border Airport': CHART_COLORS[7] }}
            labelThreshold={8}
            scaleType={scatterScale}
          />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
