import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InsightCallout from '@/components/ui/InsightCallout'
import LineChart from '@/components/charts/LineChart'
import AirportMap from '@/components/maps/AirportMap'
import { fmtCompact, fmtLbs, MAP_METRIC_OPTIONS, BORDER_AIRPORTS } from '@/lib/aviationHelpers'

const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function OverviewTab({
  mapAirports, mapRoutes, mapMetric, setMapMetric, mapMetricConfig,
  selectedAirport, setSelectedAirport,
  paxTrend, flightTrend, freightTrend, mailTrend, latestYear,
}) {
  const covidRecovery = useMemo(() => {
    if (!paxTrend.length || !latestYear) return null
    const row2019 = paxTrend.find((d) => d.year === 2019)
    const rowLatest = paxTrend.find((d) => d.year === latestYear)
    if (!row2019?.value || !rowLatest?.value) return null
    const pct = ((rowLatest.value - row2019.value) / row2019.value * 100).toFixed(1)
    return { pct: Math.abs(pct), direction: rowLatest.value >= row2019.value ? 'above' : 'below' }
  }, [paxTrend, latestYear])

  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-base text-text-secondary leading-relaxed">
            Texas and Mexico share one of the busiest bilateral air corridors in the Americas,
            underpinned by deep economic integration. Cross-border supply chains &mdash; particularly
            in electronics, automotive, and aerospace manufacturing &mdash; depend on reliable air
            connectivity for high-value, time-sensitive shipments. Meanwhile, strong cultural ties
            and tourism drive passenger volumes through major hubs like DFW, IAH, and SAT.
            This overview captures the scale and trajectory of that connectivity &mdash; from
            passenger volumes and flight operations to freight and mail flows &mdash; spanning
            2015 to {latestYear || '\u2026'}.
          </p>
          <p className="text-base text-text-secondary/70 leading-relaxed italic">
            Scope: Texas&ndash;Mexico only, bidirectional. This corridor is also included in the
            broader <a href="#/texas-international" className="text-brand-blue underline hover:text-brand-blue-dark">Texas International</a> totals.
          </p>
          {covidRecovery && (
            <InsightCallout
              finding={`Texas\u2013Mexico passenger traffic in ${latestYear} is ${covidRecovery.pct}% ${covidRecovery.direction} pre-COVID 2019 levels.`}
              variant={covidRecovery.direction === 'above' ? 'highlight' : 'default'}
              icon={TrendingUp}
            />
          )}
        </div>
      </SectionBlock>

      {/* Route Map */}
      <SectionBlock alt>
        <ChartCard
          title="Texas\u2013Mexico Route Map"
          subtitle="Texas and Mexico airports with route arcs"
          headerRight={
            <select
              value={mapMetric}
              onChange={(e) => setMapMetric(e.target.value)}
              className="text-base border border-border rounded-md px-2 py-1 bg-surface-primary"
            >
              {MAP_METRIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          }
        >
          <AirportMap
            airports={mapAirports}
            routes={mapRoutes}
            topN={15}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            formatValue={mapMetricConfig.formatter}
            metricLabel={mapMetricConfig.unit}
            highlightAirports={BORDER_AIRPORTS}
            legendItems={[
              { color: '#0056a9', label: 'Texas' },
              { color: '#df5c16', label: 'Mexico' },
              { color: '#0056a9', borderColor: '#E8B923', label: 'Texas Border' },
            ]}
            center={[25.5, -99.5]}
            zoom={5}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trend Charts (2x2 grid) */}
      <SectionBlock>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartCard
            title="Texas\u2013Mexico Passenger Trends"
            subtitle="Bidirectional passenger flows by year"
            downloadData={{ summary: { data: paxTrend, filename: 'tx-mx-passenger-trends' } }}
          >
            <LineChart data={paxTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
            <p className="text-base text-text-secondary mt-3 italic">Both directions show a sharp 2020 decline. Texas-to-Mexico volumes have consistently exceeded the reverse direction.</p>
          </ChartCard>
          <ChartCard
            title="Texas\u2013Mexico Flight Trends"
            subtitle="Flights operated by year (segment data)"
            downloadData={{ summary: { data: flightTrend, filename: 'tx-mx-flight-trends' } }}
          >
            <LineChart data={flightTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtCompact} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Texas\u2013Mexico Freight Trends"
            subtitle="Bidirectional freight volume by year"
            downloadData={{ summary: { data: freightTrend, filename: 'tx-mx-freight-trends' } }}
          >
            <LineChart data={freightTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
          <ChartCard
            title="Texas\u2013Mexico Mail Trends"
            subtitle="Bidirectional mail volume by year"
            downloadData={{ summary: { data: mailTrend, filename: 'tx-mx-mail-trends' } }}
          >
            <LineChart data={mailTrend} xKey="year" yKey="value" seriesKey="Direction" formatValue={fmtLbs} annotations={COVID_ANNOTATION} />
          </ChartCard>
        </div>
      </SectionBlock>
    </>
  )
}
