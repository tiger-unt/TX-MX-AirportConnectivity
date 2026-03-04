import { useAviationStore } from '@/stores/aviationStore'

const PAGE_MAP = {
  '/': { dataset: 'market', label: 'Overview' },
  '/texas-domestic': { dataset: 'market', label: 'Texas Domestic' },
  '/texas-international': { dataset: 'market', label: 'Texas International' },
  '/us-mexico': { dataset: 'market', label: 'US-Mexico' },
  '/texas-mexico': { dataset: 'market', label: 'Texas-Mexico' },
  '/about-data': { dataset: 'market', label: 'About Data' },
}

export function gatherPageContext() {
  const state = useAviationStore.getState()
  const hash = window.location.hash.replace('#', '') || '/'
  const page = PAGE_MAP[hash] || PAGE_MAP['/']

  return {
    currentPage: page.label,
    currentPath: hash,
    datasetKey: page.dataset,
    activeFilters: { ...state.filters },
    dataLoaded: !state.loading,
  }
}
