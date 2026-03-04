import { MapPin, ArrowRightLeft } from 'lucide-react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InsightCallout from '@/components/ui/InsightCallout'
import DonutChart from '@/components/charts/DonutChart'
import HeatmapTable from '@/components/charts/HeatmapTable'
import AirportMap from '@/components/maps/AirportMap'
import { fmtCompact, fmtLbs, BORDER_AIRPORTS, BORDER_AIRPORT_LIST } from '@/lib/aviationHelpers'

export default function BorderAirportsTab({
  borderMapAirports,
  hoveredBorderAirport, setHoveredBorderAirport,
  borderPaxShare, borderCargoShare, borderInsight,
  odMatrixData, matrixMetric, setMatrixMetric,
  airportIndex,
}) {
  return (
    <>
      {/* Border Airport Introduction */}
      <SectionBlock>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-brand-blue" />
            </div>
            <h3 className="text-xl font-bold text-text-primary">Texas Border Airports</h3>
          </div>
          <p className="text-base text-text-secondary mb-5">
            Six Texas airports located within a TxDOT border district serve a
            unique role in cross-border connectivity &mdash; while most passenger traffic flows through
            major inland hubs like DFW, IAH, and SAT, border airports handle a disproportionate
            share of cargo traffic with Mexico. This section explores how these six airports
            compare to inland hubs and which Mexican destinations they connect to.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden h-full">
                <AirportMap
                  airports={borderMapAirports}
                  routes={[]}
                  topN={0}
                  highlightAirports={BORDER_AIRPORTS}
                  hoveredAirport={hoveredBorderAirport}
                  fixedRadius={6}
                  legendItems={[{ color: '#0056a9', borderColor: '#E8B923', label: 'Border Airport' }]}
                  height="100%"
                  hideVolume
                  fitToAirports
                  locked
                  hintText={null}
                />
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-3">
              {BORDER_AIRPORT_LIST.map((b) => {
                const info = airportIndex?.get(b.code)
                const isHovered = hoveredBorderAirport === b.code
                return (
                  <button
                    key={b.code}
                    type="button"
                    className="flex items-center gap-3 bg-white rounded-lg border px-4 py-3 text-left transition-all duration-150 cursor-pointer"
                    style={{
                      borderColor: isHovered ? '#E8B923' : undefined,
                      boxShadow: isHovered ? '0 0 0 2px rgba(232,185,35,0.3)' : undefined,
                    }}
                    onMouseEnter={() => setHoveredBorderAirport(b.code)}
                    onMouseLeave={() => setHoveredBorderAirport(null)}
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-150"
                      style={{
                        background: '#0056a9',
                        border: '2px solid #E8B923',
                        transform: isHovered ? 'scale(1.4)' : undefined,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-base font-bold text-text-primary leading-tight">{b.code}</p>
                      <p className="text-base text-text-secondary leading-tight">{info?.name || b.city}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </SectionBlock>

      {/* Border vs Non-Border Analysis */}
      <SectionBlock alt>
        {borderInsight && (
          <div className="mb-5">
            <InsightCallout
              finding={`Border airports handle ${borderInsight.paxPct}% of Texas\u2013Mexico passengers but ${borderInsight.cargoPct}% of cargo.`}
              context="The gap between passenger and cargo share highlights the outsized role border airports play in cross-border freight."
              variant="default"
              icon={ArrowRightLeft}
            />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Passenger Share: Border vs Non-Border" subtitle="Texas airports serving Mexico">
            <DonutChart data={borderPaxShare} formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard title="Cargo Share: Border vs Non-Border" subtitle="Texas airports serving Mexico (freight lbs)">
            <DonutChart data={borderCargoShare} formatValue={fmtLbs} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Border Airport Route Matrix */}
      <SectionBlock alt>
        <ChartCard
          title="Border Airport Route Matrix"
          subtitle="TX border airports &harr; Mexico airports"
          headerRight={
            <select
              value={matrixMetric}
              onChange={(e) => setMatrixMetric(e.target.value)}
              className="text-base border border-border rounded-md px-2 py-1 bg-surface-primary"
            >
              <option value="passengers">Passengers</option>
              <option value="freight">Freight (lbs)</option>
            </select>
          }
        >
          <HeatmapTable
            data={odMatrixData}
            formatValue={matrixMetric === 'passengers' ? fmtCompact : fmtLbs}
            airportIndex={airportIndex}
          />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
