import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useAviationStore } from '@/stores/aviationStore'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import PageTransition from '@/components/ui/PageTransition'
import PageWrapper from '@/components/layout/PageWrapper'
import OverviewPage from '@/pages/Overview'
import TexasDomesticPage from '@/pages/TexasDomestic'
import TexasInternationalPage from '@/pages/TexasInternational'
import USMexicoPage from '@/pages/USMexico'
import TexasMexicoPage from '@/pages/TexasMexico'
import AboutDataPage from '@/pages/AboutData'
import NotFoundPage from '@/pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Send page view to Google Analytics for hash-based routing
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_title: document.title,
      })
    }
  }, [pathname])
  return null
}

/** Shown when loadData() fails (missing CSV, network error, etc.) */
function DataLoadError({ error, onRetry, retrying }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg px-6">
        <AlertTriangle size={48} className="text-brand-orange mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Unable to load data
        </h2>
        <p className="text-base text-text-secondary mb-2">
          The dashboard could not load its data files. This may be a temporary
          network issue or the data files may be missing from the server.
        </p>
        <p className="text-base text-text-secondary/70 mb-6 font-mono break-all">
          {error}
        </p>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium text-white
                     bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const loadData = useAviationStore((s) => s.loadData)
  const loading = useAviationStore((s) => s.loading)
  const error = useAviationStore((s) => s.error)

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <PageWrapper>
      <ScrollToTop />
      {error ? (
        <DataLoadError error={error} onRetry={loadData} retrying={loading} />
      ) : (
        <ErrorBoundary onRetry={loadData}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/texas-domestic" element={<TexasDomesticPage />} />
              <Route path="/texas-international" element={<TexasInternationalPage />} />
              <Route path="/us-mexico" element={<USMexicoPage />} />
              <Route path="/texas-mexico" element={<TexasMexicoPage />} />
              <Route path="/about-data" element={<AboutDataPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageTransition>
        </ErrorBoundary>
      )}
    </PageWrapper>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
