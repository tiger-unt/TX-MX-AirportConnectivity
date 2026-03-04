import { useState, useEffect, useRef, useMemo } from 'react'
import { MapPin, ArrowRightLeft, Info, Zap, TrendingUp, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import InsightCallout from '@/components/ui/InsightCallout'
import DonutChart from '@/components/charts/DonutChart'
import HeatmapTable from '@/components/charts/HeatmapTable'
import BarChartRace from '@/components/charts/BarChartRace'
import AirportMap from '@/components/maps/AirportMap'
import { fmtCompact, fmtLbs, isEmptyOrAllZero, BORDER_AIRPORTS, BORDER_AIRPORT_LIST } from '@/lib/aviationHelpers'
import { CHART_COLORS } from '@/lib/chartColors'

/* ── stable color map for border airports ─────────────────────────────── */
const ORIGIN_COLORS = Object.fromEntries(
  BORDER_AIRPORT_LIST.map((a, i) => [a.code, CHART_COLORS[i % CHART_COLORS.length]])
)

export default function BorderAirportsTab({
  borderMapAirports,
  hoveredBorderAirport, setHoveredBorderAirport,
  borderPaxShare, borderCargoShare, borderInsight,
  odMatrixData, matrixMetric, setMatrixMetric,
  airportIndex,
  routeEvolutionData,
}) {
  /* ── playback state ──────────────────────────────────────────────────── */
  const { years = [], mapFrames = [], raceFrames = [], globalMax = 0 } = routeEvolutionData || {}
  const [currentYearIdx, setCurrentYearIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef(null)

  const currentYear = years[currentYearIdx] ?? null
  const currentMapFrame = mapFrames[currentYearIdx]
  const currentRaceFrame = raceFrames[currentYearIdx]

  // Reset index if years change (e.g. filter change shrinks available years)
  useEffect(() => {
    if (currentYearIdx >= years.length && years.length > 0) {
      setCurrentYearIdx(0)
    }
  }, [years, currentYearIdx])

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || !years.length) return
    timerRef.current = setInterval(() => {
      setCurrentYearIdx((prev) => {
        if (prev >= years.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 2000)
    return () => clearInterval(timerRef.current)
  }, [isPlaying, years])

  const handlePlayPause = () => {
    if (!years.length) return
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      // If at end, restart from beginning
      if (currentYearIdx >= years.length - 1) setCurrentYearIdx(0)
      setIsPlaying(true)
    }
  }

  const handleSkipBack = () => {
    setIsPlaying(false)
    setCurrentYearIdx((p) => Math.max(0, p - 1))
  }

  const handleSkipForward = () => {
    setIsPlaying(false)
    setCurrentYearIdx((p) => Math.min(years.length - 1, p + 1))
  }

  const fmt = matrixMetric === 'passengers' ? fmtCompact : fmtLbs
  const metricUnit = matrixMetric === 'passengers' ? 'passengers' : 'freight (lbs)'

  /* ── route count insight for animation ──────────────────────────────── */
  const evolutionInsight = useMemo(() => {
    if (!raceFrames.length) return null
    const first = raceFrames[0]
    const last = raceFrames[raceFrames.length - 1]
    return {
      firstYear: first.year,
      lastYear: last.year,
      firstCount: first.routes.length,
      lastCount: last.routes.length,
    }
  }, [raceFrames])

  const hasEvolution = years.length > 0

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
          <p className="text-base text-text-secondary mb-3">
            Six Texas airports located within a TxDOT border district serve a
            unique role in cross-border connectivity. While most passenger traffic flows through
            major inland hubs like DFW, IAH, and SAT, border airports handle a disproportionate
            share of cargo traffic with Mexico. Their cargo patterns tend to be sporadic rather
            than steady &mdash; characterized by irregular spikes that may reflect &ldquo;emergency
            supply chain&rdquo; usage, where air becomes the last-resort option for urgent,
            high-value shipments when surface transport cannot meet delivery timelines.
          </p>
          <p className="text-base text-text-secondary/70 mb-5 italic">
            Note: these statistics cover direct flights only. Because many border-region
            travelers connect through major hubs (DFW, IAH), actual demand for travel between
            the Texas border region and Mexico is likely higher than what direct-flight data shows.
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
          <div className="space-y-3 mb-5">
            <InsightCallout
              finding={`Border airports handle ${borderInsight.paxPct}% of Texas–Mexico passengers but ${borderInsight.cargoPct}% of cargo.`}
              context="The gap between passenger and cargo share highlights the outsized role border airports play in cross-border freight."
              variant="default"
              icon={ArrowRightLeft}
            />
            <InsightCallout
              finding="During COVID-19, some border airports saw passenger departures spike even as major hubs plummeted."
              context="U.S.–Mexico land border crossings were closed to non-essential travel from March 2020 to November 2021, but air travel remained open — making border airports a critical alternative for cross-border movement during the pandemic."
              variant="warning"
              icon={Info}
            />
            <InsightCallout
              finding="Laredo (LRD) operates a Unified Cargo Processing program with joint U.S.–Mexico customs inspection."
              context="Since 2013, cargo inspected jointly at LRD receives expedited clearance at eight Mexican airports — eliminating redundant inspections and reducing transit times for industries like automotive, aerospace, and electronics."
              variant="highlight"
              icon={Zap}
            />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Passenger Share: Border vs Non-Border" subtitle="Texas airports serving Mexico" emptyState={isEmptyOrAllZero(borderPaxShare) ? 'No passenger data for the current filter selection. Cargo (Class G) flights do not carry passengers.' : null}>
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

      {/* Route Network Evolution (animated) */}
      {hasEvolution && (
        <SectionBlock alt>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-brand-blue" />
            </div>
            <h3 className="text-xl font-bold text-text-primary">Route Network Evolution</h3>
          </div>
          <p className="text-base text-text-secondary mb-3">
            Border airport routes to Mexico change significantly from year to year &mdash;
            some routes persist while others appear or vanish as airlines adjust
            service. Use the playback controls below to animate through {years[0]}–{years[years.length - 1]} and
            watch the network evolve.
          </p>
          {evolutionInsight && (
            <div className="mb-5">
              <InsightCallout
                finding={`In ${evolutionInsight.firstYear}, border airports served ${evolutionInsight.firstCount} distinct Mexico route${evolutionInsight.firstCount !== 1 ? 's' : ''}. By ${evolutionInsight.lastYear}, that number ${evolutionInsight.lastCount > evolutionInsight.firstCount ? 'grew' : evolutionInsight.lastCount < evolutionInsight.firstCount ? 'shrank' : 'remained at'} to ${evolutionInsight.lastCount}.`}
                context="Route counts reflect unique airport-pair connections regardless of direction or carrier."
                icon={TrendingUp}
              />
            </div>
          )}

          {/* ── Playback controls ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-5 bg-white rounded-xl border border-border-light px-4 py-3 shadow-sm">
            {/* Transport buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSkipBack}
                disabled={currentYearIdx <= 0}
                className="p-2 rounded-lg hover:bg-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous year"
              >
                <SkipBack size={18} className="text-text-primary" />
              </button>
              <button
                type="button"
                onClick={handlePlayPause}
                className="p-2 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                type="button"
                onClick={handleSkipForward}
                disabled={currentYearIdx >= years.length - 1}
                className="p-2 rounded-lg hover:bg-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next year"
              >
                <SkipForward size={18} className="text-text-primary" />
              </button>
            </div>

            {/* Year slider */}
            <div className="flex-1 min-w-[200px] flex items-center gap-3">
              <span className="text-base text-text-secondary whitespace-nowrap">{years[0]}</span>
              <input
                type="range"
                min={0}
                max={years.length - 1}
                value={currentYearIdx}
                onChange={(e) => {
                  setIsPlaying(false)
                  setCurrentYearIdx(Number(e.target.value))
                }}
                className="flex-1 accent-brand-blue cursor-pointer"
                style={{ height: '6px' }}
              />
              <span className="text-base text-text-secondary whitespace-nowrap">{years[years.length - 1]}</span>
            </div>

            {/* Current year display */}
            <div className="text-2xl font-bold text-brand-blue tabular-nums min-w-[60px] text-center">
              {currentYear}
            </div>

            {/* Metric selector */}
            <select
              value={matrixMetric}
              onChange={(e) => setMatrixMetric(e.target.value)}
              className="text-base border border-border rounded-md px-2 py-1 bg-surface-primary"
            >
              <option value="passengers">Passengers</option>
              <option value="freight">Freight (lbs)</option>
            </select>
          </div>

          {/* ── Side-by-side: Route Map + Bar Chart Race ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="Border Airport Route Map"
              subtitle={`Year ${currentYear} – ${metricUnit}`}
            >
              <AirportMap
                airports={currentMapFrame?.airports || []}
                routes={currentMapFrame?.routes || []}
                topN={99}
                highlightAirports={BORDER_AIRPORTS}
                formatValue={fmt}
                metricLabel={metricUnit}
                height="480px"
                center={[25.5, -99.5]}
                zoom={5}
                hintText={null}
                legendItems={[]}
              />
            </ChartCard>

            <ChartCard
              title="Top Border Airport Routes"
              subtitle={`Year ${currentYear} – ${metricUnit}`}
            >
              <BarChartRace
                frames={raceFrames}
                currentYear={currentYear}
                globalMax={globalMax}
                maxBars={10}
                formatValue={fmt}
                originColors={ORIGIN_COLORS}
                fillContainer
              />
            </ChartCard>
          </div>

          {/* ── Shared color legend ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-3 py-2">
            {BORDER_AIRPORT_LIST.map((b) => {
              const name = airportIndex?.get(b.code)?.name
              return (
                <div key={b.code} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: ORIGIN_COLORS[b.code] }}
                  />
                  <span className="text-base text-text-secondary">{name ? `${b.code} – ${name}` : b.code}</span>
                </div>
              )
            })}
          </div>
        </SectionBlock>
      )}
    </>
  )
}
