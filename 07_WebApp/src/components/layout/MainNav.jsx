/**
 * ── MAIN NAVIGATION BAR ────────────────────────────────────────────────
 *
 * Responsive navigation bar rendered below the SiteHeader. Provides:
 *   - Desktop: horizontal nav links in a bar (hidden on mobile via md:flex)
 *   - Mobile: hamburger menu toggle with a slide-down nav list
 *   - Active link highlighting via React Router's NavLink component
 *   - Auto-close of mobile menu on route change
 *
 * ── BOILERPLATE: HOW TO ADAPT ───────────────────────────────────────────
 * When adding or removing pages, update the `navItems` array below.
 * Each entry needs:
 *   - label: Display text shown in the nav bar
 *   - path:  URL path that matches the <Route path="..."> in App.jsx
 *
 * Make sure every navItems entry has a corresponding Route in App.jsx
 * and vice versa (except the 404 catch-all route).
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Texas Domestic', path: '/texas-domestic' },
  { label: 'Texas International', path: '/texas-international' },
  { label: 'U.S.–Mexico', path: '/us-mexico' },
  { label: 'Texas–Mexico', path: '/texas-mexico' },
  { label: 'About the Data', path: '/about-data' },
]

export default function MainNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navRef = useRef(null)
  const hamburgerRef = useRef(null)
  const firstLinkRef = useRef(null)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Focus management: move focus into menu on open, restore on close
  const prevOpen = useRef(false)
  useEffect(() => {
    if (mobileOpen && !prevOpen.current) {
      requestAnimationFrame(() => firstLinkRef.current?.focus())
    } else if (!mobileOpen && prevOpen.current) {
      hamburgerRef.current?.focus()
    }
    prevOpen.current = mobileOpen
  }, [mobileOpen])

  return (
    <nav ref={navRef} className="bg-brand-blue relative z-40">
      <div className="container-chrome">
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-0.5 h-12">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 h-full flex items-center text-base font-medium transition-all duration-200
                 ${
                   isActive
                     ? 'bg-brand-blue-dark text-white shadow-inner'
                     : 'text-white/90 hover:bg-brand-blue-dark/60 hover:text-white'
                 }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center justify-between h-12 px-1">
          <span className="text-white text-base font-medium">Navigation</span>
          <button
            ref={hamburgerRef}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-1.5 hover:bg-brand-blue-dark/60 rounded transition-colors"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out
            ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pb-3 space-y-0.5">
            {navItems.map((item, i) => (
              <NavLink
                key={item.path}
                to={item.path}
                ref={i === 0 ? firstLinkRef : undefined}
                className={({ isActive }) =>
                  `block px-4 py-2.5 text-base font-medium transition-colors duration-150
                   ${
                     isActive
                       ? 'bg-brand-blue-dark text-white'
                       : 'text-white/85 hover:bg-brand-blue-dark/50 hover:text-white'
                   }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
