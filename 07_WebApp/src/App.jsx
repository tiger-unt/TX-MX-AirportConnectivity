import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAviationStore } from '@/stores/aviationStore'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import PageWrapper from '@/components/layout/PageWrapper'
import OverviewPage from '@/pages/Overview'
import MarketPage from '@/pages/Market'
import SegmentPage from '@/pages/Segment'
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
          <Route path="/market" element={<MarketPage />} />
          <Route path="/segment" element={<SegmentPage />} />
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
