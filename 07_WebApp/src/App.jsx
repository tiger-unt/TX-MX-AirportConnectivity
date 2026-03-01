import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAviationStore } from '@/stores/aviationStore'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import PageWrapper from '@/components/layout/PageWrapper'
import OverviewPage from '@/pages/Overview'
import TexasDomesticPage from '@/pages/TexasDomestic'
import TexasInternationalPage from '@/pages/TexasInternational'
import USMexicoPage from '@/pages/USMexico'
import TexasMexicoPage from '@/pages/TexasMexico'
import NotFoundPage from '@/pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function AppContent() {
  const loadData = useAviationStore((s) => s.loadData)

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <PageWrapper>
      <ScrollToTop />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/texas-domestic" element={<TexasDomesticPage />} />
          <Route path="/texas-international" element={<TexasInternationalPage />} />
          <Route path="/us-mexico" element={<USMexicoPage />} />
          <Route path="/texas-mexico" element={<TexasMexicoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
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
