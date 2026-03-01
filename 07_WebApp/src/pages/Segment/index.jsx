import { Construction } from 'lucide-react'

export default function SegmentPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <Construction size={48} className="mx-auto mb-4 text-brand-blue/40" />
        <h2 className="text-2xl font-bold text-brand-blue">Segment Data</h2>
        <p className="text-text-secondary mt-3">
          Flight segment analysis is coming soon. This page will explore individual
          flight legs between Texas and Mexico, including departures, seat capacity,
          payload, and operational metrics.
        </p>
      </div>
    </div>
  )
}
