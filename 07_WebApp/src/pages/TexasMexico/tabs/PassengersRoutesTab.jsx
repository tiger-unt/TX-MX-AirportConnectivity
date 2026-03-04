import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import BarChart from '@/components/charts/BarChart'
import DonutChart from '@/components/charts/DonutChart'
import DataTable from '@/components/ui/DataTable'
import { fmtCompact } from '@/lib/aviationHelpers'
import { formatNumber } from '@/lib/chartColors'

export default function PassengersRoutesTab({
  topRoutes, topTxAirports, topMxAirports, topMxStates,
  carrierMarketShare, topCarriers,
  tableData, tableColumns, filters, latestYear,
}) {
  return (
    <>
      {/* Narrative introduction */}
      <SectionBlock>
        <div className="max-w-3xl">
          <p className="text-base text-text-secondary leading-relaxed">
            Passenger traffic between Texas and Mexico concentrates on a handful of
            hub-to-resort and hub-to-metro routes. Dallas/Fort Worth and Houston Intercontinental
            dominate the Texas side, while Canc&uacute;n and Mexico City lead as Mexican
            destinations. This section explores the key routes, airports, and airlines that
            shape the passenger landscape.
          </p>
        </div>
      </SectionBlock>

      {/* Top 10 Routes */}
      <SectionBlock alt>
        <ChartCard
          title="Top 10 Texas\u2013Mexico Routes"
          subtitle="By total passengers (all filtered years)"
          downloadData={{ summary: { data: topRoutes, filename: 'tx-mx-top-routes' } }}
        >
          <BarChart data={topRoutes} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Top Airports (2-column) */}
      <SectionBlock>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Top Texas Airports for Mexico Traffic"
            subtitle="By total passengers"
            downloadData={{ summary: { data: topTxAirports, filename: 'tx-mx-top-tx-airports' } }}
          >
            <BarChart data={topTxAirports} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Top Mexico Airports for Texas Traffic"
            subtitle="By total passengers"
            downloadData={{ summary: { data: topMxAirports, filename: 'tx-mx-top-mx-airports' } }}
          >
            <BarChart data={topMxAirports} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top Mexico States */}
      <SectionBlock alt>
        <ChartCard
          title="Top Mexico Destinations by State"
          subtitle="Quintana Roo, Jalisco, Nuevo Leon, etc. by passenger volume"
          downloadData={{ summary: { data: topMxStates, filename: 'tx-mx-top-mx-states' } }}
        >
          <BarChart data={topMxStates} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
        </ChartCard>
      </SectionBlock>

      {/* Airlines */}
      <SectionBlock>
        <div className="space-y-5">
          <ChartCard
            title="Carrier Market Share"
            subtitle={`${filters.year.length === 1 ? filters.year[0] : latestYear || '\u2014'} passengers`}
            downloadData={{ summary: { data: carrierMarketShare, filename: 'tx-mx-carrier-share' } }}
          >
            <DonutChart data={carrierMarketShare} formatValue={fmtCompact} />
          </ChartCard>
          <ChartCard
            title="Top Carriers by Passengers"
            subtitle="All filtered data"
            downloadData={{ summary: { data: topCarriers, filename: 'tx-mx-top-carriers' } }}
          >
            <BarChart data={topCarriers} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Route Details Table */}
      <SectionBlock alt>
        <ChartCard
          title="Route Details"
          subtitle={`${formatNumber(tableData.length)} routes (filtered)`}
          downloadData={{ summary: { data: tableData, filename: 'tx-mx-route-details' } }}
        >
          <DataTable columns={tableColumns} data={tableData} />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
