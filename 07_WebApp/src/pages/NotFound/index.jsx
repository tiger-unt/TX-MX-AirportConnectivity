import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <h2 className="text-4xl font-bold text-brand-blue mb-2">404</h2>
        <p className="text-xl font-semibold text-text-primary mb-2">
          Page not found
        </p>
        <p className="text-base text-text-secondary mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-base font-medium text-white
                     bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors"
        >
          <Home size={16} />
          Back to Overview
        </Link>
      </div>
    </div>
  )
}
