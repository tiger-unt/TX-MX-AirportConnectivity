/**
 * ── SITE HEADER ─────────────────────────────────────────────────────────
 *
 * Top-level header displayed on every page. Contains:
 *   - Logo image (left side) — loads from /assets/Logos/ with graceful
 *     error handling (hides if image fails to load)
 *   - Dashboard title (h1) and subtitle text
 *   - "Ask AI" button (right side, desktop only) — opens the AI chat drawer
 *
 * Layout: Uses container-chrome (max-width 1280px centered) for consistent
 * alignment with the MainNav below it.
 *
 * The "Ask AI" button connects to the chatStore. If your project doesn't
 * need an AI chat feature, remove the button and the chatStore import.
 */
import { Sparkles } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'

export default function SiteHeader() {
  const toggle = useChatStore((s) => s.toggle)

  return (
    <header className="bg-white border-b border-border-light">
      <div className="container-chrome flex items-center justify-between py-4 gap-6">
        {/* Logo + Title */}
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}assets/Logos/TxDOT-Logo-Vertical-RGB.svg`}
            alt="TxDOT"
            className="h-12 md:h-14 w-auto flex-shrink-0"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-brand-blue leading-tight truncate">
              Airport Connectivity Dashboard
            </h1>
            <p className="text-base text-text-secondary mt-0.5 truncate">
              TxDOT IAC 2025–26 · UNT System
            </p>
          </div>
        </div>

        {/* Ask AI button */}
        <button
          onClick={toggle}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-brand-blue text-white text-base font-medium
                     hover:bg-brand-blue-dark transition-colors duration-150
                     cursor-pointer flex-shrink-0"
        >
          <Sparkles size={16} />
          Ask AI
        </button>
      </div>
    </header>
  )
}
