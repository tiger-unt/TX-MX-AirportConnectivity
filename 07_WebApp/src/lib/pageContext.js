import { useTradeStore } from '@/stores/tradeStore'

const PAGE_MAP = {
  '/': { dataset: 'usAggregated', label: 'Overview' },
  '/trade-by-state': { dataset: 'btsUsState', label: 'Trade by State' },
  '/commodities': { dataset: 'usAggregated', label: 'Trade by Commodity' },
  '/trade-by-mode': { dataset: 'usAggregated', label: 'Trade by Mode' },
  '/border-ports': { dataset: 'txBorderPorts', label: 'TX Border Ports' },
}

export function gatherPageContext() {
  const state = useTradeStore.getState()
  const path = window.location.pathname
  const page = PAGE_MAP[path] || PAGE_MAP['/']

  return {
    currentPage: page.label,
    currentPath: path,
    datasetKey: page.dataset,
    activeFilters: { ...state.filters },
    dataLoaded: !state.loading,
  }
}
