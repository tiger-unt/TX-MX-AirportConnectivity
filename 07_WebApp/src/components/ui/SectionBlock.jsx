/**
 * SectionBlock.jsx — Full-width section wrapper with alternating background
 * --------------------------------------------------------------------------
 * A simple layout primitive that wraps page content in a full-width <section>
 * element with consistent horizontal padding (via `container-main`) and
 * vertical spacing (via `section-padding`).
 *
 * The `alt` prop toggles between a white background (default) and the
 * `bg-surface-alt` light gray, making it easy to create alternating visual
 * bands on a page for content separation.
 *
 * Props
 *   @param {boolean} [alt=false]   — If true, uses the alternate gray background
 *   @param {string}  [className=''] — Additional CSS classes for the outer <section>
 *   @param {ReactNode} children    — Page content to wrap
 *
 * BOILERPLATE NOTE:
 *   This component is fully data-agnostic. No changes are needed when adapting
 *   this boilerplate for a new project or dataset.
 */
export default function SectionBlock({ alt = false, className = '', children }) {
  return (
    <section className={`${alt ? 'bg-surface-alt' : 'bg-white'} ${className}`}>
      <div className="container-main section-padding">
        {children}
      </div>
    </section>
  )
}
