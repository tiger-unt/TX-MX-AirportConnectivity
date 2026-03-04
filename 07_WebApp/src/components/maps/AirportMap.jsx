/**
 * ── AirportMap.jsx ──────────────────────────────────────────────────────
 * Reusable Leaflet map showing airport markers and route arcs.
 *
 * Props:
 *   airports      — Array of { iata, name, city, country, lat, lng, volume, region? }
 *                   region — optional state/country name shown in popup after the city
 *                   BTS city names include a trailing ", ST" or ", Country" suffix.
 *                   When region is provided the component strips that suffix and shows
 *                   "City, Region" to avoid redundancy like "Abilene, TX, Texas".
 *   routes        — Array of { origin, dest, originLat, originLng, destLat, destLng, value, label }
 *   topN          — Number of top routes to show by default (default 15)
 *   selectedAirport / onAirportSelect — controlled selection state
 *   highlightAirports — Set of IATA codes to render with a thick white halo (e.g. border airports)
 *   hoveredAirport — IATA code of externally hovered airport (e.g. from sidebar card)
 *   fixedRadius   — When set, all markers use this radius instead of volume-based scaling
 *   legendItems   — Array of legend entries to show; each { color, borderColor?, label }
 *                   If omitted, default U.S./Mexico/Other(/Border) legends are shown
 *   height        — CSS height string (default '480px')
 *   center        — [lat, lng] (default [25.5, -99.5])
 *   zoom          — initial zoom (default 5)
 *   formatValue   — Function to format numeric values in popups (default toLocaleString)
 *   metricLabel   — Unit noun shown in popups, e.g. 'passengers', 'freight' (default 'passengers')
 *   hideVolume    — When true, popup only shows name + city (no volume/metric line)
 */
import { useMemo, useCallback, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet'
import { greatCircleArc } from '@/lib/airportUtils'
import 'leaflet/dist/leaflet.css'

const COLORS = {
  us: '#0056a9',
  texas: '#0056a9',
  usOther: '#94c4de',
  mx: '#df5c16',
  other: '#5a7a7a',
  arc: '#0056a9',
  arcHover: '#df5c16',
}

/* Darker stroke for each category so dots pop against the light basemap */
const STROKE = {
  us: '#003d75',
  texas: '#003d75',
  usOther: '#6d9bb8',
  mx: '#a84410',
  other: '#3a5252',
}

/**
 * Format city + region for display.
 * BTS city names end with ", ST" or ", Country" (e.g. "Abilene, TX" or "Cancun, Mexico").
 * When a region is provided, strip that trailing suffix and replace it with the full
 * region name to avoid redundancy like "Abilene, TX, Texas".
 */
function formatCityRegion(city, region) {
  if (!region) return city || ''
  // Strip the trailing ", XX" or ", Country" from BTS city name
  const bare = city ? city.replace(/,\s*[^,]+$/, '') : ''
  return `${bare}, ${region}`
}

function radiusScale(volume, maxVolume) {
  if (!maxVolume || !volume) return 4
  return Math.max(4, Math.min(20, 4 + 16 * Math.sqrt(volume / maxVolume)))
}

function markerColor(country) {
  if (!country) return COLORS.other
  const c = country.toLowerCase()
  if (c === 'texas') return COLORS.texas
  if (c === 'mexico') return COLORS.mx
  if (c === 'united states') return COLORS.us
  if (c === 'us other') return COLORS.usOther
  return COLORS.other
}

function markerStroke(country) {
  if (!country) return STROKE.other
  const c = country.toLowerCase()
  if (c === 'texas') return STROKE.texas
  if (c === 'mexico') return STROKE.mx
  if (c === 'united states') return STROKE.us
  if (c === 'us other') return STROKE.usOther
  return STROKE.other
}

function MapClickHandler({ onReset }) {
  useMapEvents({
    click: () => onReset?.(),
  })
  return null
}

/** Disables scroll-wheel zoom until the user clicks on the map; re-disables on mouseout */
function ScrollWheelGuard({ onActiveChange }) {
  const map = useMap()
  useMapEvents({
    click: () => {
      map.scrollWheelZoom.enable()
      onActiveChange?.(true)
    },
    mouseout: () => {
      map.scrollWheelZoom.disable()
      onActiveChange?.(false)
    },
  })
  return null
}

/** Auto-fits map bounds to show all airports with padding */
function FitBoundsToAirports({ airports, padding = [30, 30] }) {
  const map = useMap()
  useEffect(() => {
    const pts = airports
      ?.filter((a) => a.lat != null && a.lng != null)
      .map((a) => [a.lat, a.lng])
    if (pts && pts.length > 1) {
      map.fitBounds(pts, { padding })
    }
  }, [map, airports, padding])
  return null
}

/** Invalidates Leaflet map size when container dimensions change (e.g. fullscreen toggle) */
function MapResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100)
    const observer = new ResizeObserver(() => map.invalidateSize())
    const container = map.getContainer()
    if (container.parentElement) {
      observer.observe(container.parentElement)
    }
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [map])
  return null
}

/** Programmatically opens the popup for the selected airport and closes any others */
function PopupController({ selectedAirport, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    map.closePopup()
    if (selectedAirport && markerRefs.current[selectedAirport]) {
      // Small delay lets React-Leaflet finish rendering updated markers
      const timer = setTimeout(() => {
        markerRefs.current[selectedAirport]?.openPopup()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [map, selectedAirport, markerRefs])
  return null
}

/** Captures map instance ref & repositions portal tooltips on map move/zoom */
function TooltipSync({ mapRef, tooltip, setTooltip }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  useEffect(() => {
    if (!tooltip?.latLng) return
    const update = () => {
      const pt = map.latLngToContainerPoint(tooltip.latLng)
      const rect = map.getContainer().getBoundingClientRect()
      setTooltip((prev) =>
        prev?.latLng
          ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y + (prev.offsetY || 0) }
          : null,
      )
    }
    map.on('move zoom', update)
    return () => map.off('move zoom', update)
  }, [map, tooltip?.latLng, tooltip?.offsetY, setTooltip])
  return null
}

function ResetZoomButton({ center, zoom, onReset }) {
  const map = useMap()
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    map.setView(center, zoom)
    onReset?.()
  }, [map, center, zoom, onReset])

  return (
    <div className="leaflet-top leaflet-left" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control" style={{ marginTop: 80, marginLeft: 10 }}>
        <button
          onClick={handleClick}
          title="Reset zoom"
          style={{
            background: '#fff',
            border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 4,
            width: 34,
            height: 34,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            lineHeight: 1,
            color: '#333',
          }}
        >
          ⌂
        </button>
      </div>
    </div>
  )
}

export default function AirportMap({
  airports = [],
  routes = [],
  topN = 15,
  selectedAirport = null,
  onAirportSelect,
  highlightAirports = null,
  hoveredAirport = null,
  fixedRadius = null,
  legendItems = null,
  height = '480px',
  center = [25.5, -99.5],
  zoom = 5,
  formatValue = (v) => v?.toLocaleString(),
  metricLabel = 'passengers',
  hideVolume = false,
  hintText = 'Click airport to explore connections',
  fitToAirports = false,
  locked = false,
}) {
  const maxVolume = useMemo(
    () => Math.max(1, ...airports.map((a) => a.volume || 0)),
    [airports]
  )

  const displayRoutes = useMemo(() => {
    if (selectedAirport) {
      return routes.filter(
        (r) => r.origin === selectedAirport || r.dest === selectedAirport
      )
    }
    return routes.slice(0, topN)
  }, [routes, selectedAirport, topN])

  const arcs = useMemo(
    () =>
      displayRoutes
        .filter((r) => r.originLat != null && r.destLat != null)
        .map((r) => ({
          ...r,
          positions: greatCircleArc(
            [r.originLat, r.originLng],
            [r.destLat, r.destLng],
            30
          ),
        })),
    [displayRoutes]
  )

  const handleAirportClick = useCallback(
    (iata) => {
      if (!onAirportSelect) return
      onAirportSelect(selectedAirport === iata ? null : iata)
    },
    [onAirportSelect, selectedAirport]
  )

  const handleReset = useCallback(() => {
    onAirportSelect?.(null)
  }, [onAirportSelect])

  const markerRefs = useRef({})
  const mapInstanceRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)

  const handleWheel = useCallback(() => {
    if (!mapActive && !locked) {
      setShowHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 1500)
    }
  }, [mapActive, locked])

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  return (
    <>
    <div
      style={{ minHeight: height, width: '100%' }}
      className="airport-map-container h-full flex flex-col rounded-lg overflow-hidden border border-border-light isolate"
    >
      {/* Map wrapper — flex-1 fills remaining space; absolute-positioned MapContainer inside */}
      <div className="flex-1 relative" style={{ minHeight: 0 }} onWheel={handleWheel}>
        {/* Scroll hint overlay */}
        {showHint && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)', pointerEvents: 'none',
              transition: 'opacity 0.3s',
            }}
          >
            <span
              style={{
                background: 'rgba(0,0,0,0.7)', color: '#fff',
                padding: '8px 16px', borderRadius: 6, fontSize: 16,
              }}
            >
              Click the map to enable zooming
            </span>
          </div>
        )}
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          scrollWheelZoom={false}
          zoomControl={!locked}
          dragging={!locked}
          doubleClickZoom={!locked}
          touchZoom={!locked}
          boxZoom={!locked}
          keyboard={!locked}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler onReset={handleReset} />
          {!locked && <ScrollWheelGuard onActiveChange={setMapActive} />}
          {!locked && <ResetZoomButton center={center} zoom={zoom} onReset={handleReset} />}
          <MapResizeHandler />
          <PopupController selectedAirport={selectedAirport} markerRefs={markerRefs} />
          <TooltipSync mapRef={mapInstanceRef} tooltip={tooltip} setTooltip={setTooltip} />
          {fitToAirports && airports.length > 1 && (
            <FitBoundsToAirports airports={airports} />
          )}

          {/* Route arcs */}
          {arcs.map((arc, i) => (
            <Polyline
              key={`arc-${arc.origin}-${arc.dest}-${i}`}
              positions={arc.positions}
              pathOptions={{
                color: arc.color || (selectedAirport ? COLORS.arcHover : COLORS.arc),
                weight: 2,
                opacity: 0.5,
                dashArray: selectedAirport ? undefined : '6 4',
              }}
              eventHandlers={{
                mouseover: (e) => {
                  setTooltip({
                    content: (<><strong>{arc.label}</strong><br />{formatValue(arc.value)} {metricLabel}</>),
                    x: e.originalEvent.clientX + 12,
                    y: e.originalEvent.clientY - 12,
                    sticky: true,
                  })
                },
                mousemove: (e) => {
                  setTooltip((prev) => prev ? { ...prev, x: e.originalEvent.clientX + 12, y: e.originalEvent.clientY - 12 } : null)
                },
                mouseout: () => setTooltip(null),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{arc.label}</strong>
                  <br />
                  {formatValue(arc.value)} {metricLabel}
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Airport markers */}
          {airports
            .filter((a) => a.lat != null && a.lng != null)
            .map((a) => {
              const isSelected = selectedAirport === a.iata
              const isHovered = hoveredAirport === a.iata
              const isHighlighted = highlightAirports?.has(a.iata)
              const r = fixedRadius != null ? fixedRadius : radiusScale(a.volume, maxVolume)
              return (
                <CircleMarker
                  key={a.iata}
                  ref={(el) => { if (el) markerRefs.current[a.iata] = el }}
                  center={[a.lat, a.lng]}
                  radius={isSelected ? r + 3 : isHovered ? r + 2 : r}
                  bubblingMouseEvents={false}
                  pathOptions={{
                    fillColor: a.color || markerColor(a.country),
                    color: isSelected ? '#fff' : (isHovered || isHighlighted) ? '#E8B923' : markerStroke(a.country),
                    weight: isSelected ? 3 : isHovered ? 3 : isHighlighted ? 2.5 : 1.5,
                    opacity: 0.9,
                    fillOpacity: isSelected ? 1 : isHovered ? 1 : isHighlighted ? 0.95 : 0.85,
                  }}
                  eventHandlers={{
                    click: () => handleAirportClick(a.iata),
                    mouseover: () => {
                      const map = mapInstanceRef.current
                      if (!map) return
                      const pt = map.latLngToContainerPoint([a.lat, a.lng])
                      const rect = map.getContainer().getBoundingClientRect()
                      setTooltip({
                        content: (<><strong>{a.iata}</strong> — {a.name}{a.region ? ` (${a.region})` : ''}{!hideVolume && (<><br />{formatValue(a.volume)} {metricLabel}</>)}</>),
                        x: rect.left + pt.x,
                        y: rect.top + pt.y - r - 8,
                        latLng: [a.lat, a.lng],
                        offsetY: -r - 8,
                      })
                    },
                    mouseout: () => setTooltip(null),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{a.name}</strong>
                      <br />
                      {formatCityRegion(a.city, a.region)}
                      {!hideVolume && (
                        <>
                          <br />
                          {formatValue(a.volume)} {metricLabel}
                        </>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
        </MapContainer>
      </div>

      {/* Legend — flex-shrink-0 keeps it at natural height; inline height overrides fullscreen CSS */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-white/90 text-base text-text-secondary border-t border-border-light flex-shrink-0"
        style={{ height: 'auto' }}
      >
        {legendItems ? (
          /* Custom legend entries */
          legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: item.color, border: item.borderColor ? `2px solid ${item.borderColor}` : undefined }}
              />
              {item.label}
            </span>
          ))
        ) : (
          /* Default legend entries */
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.us }} />
              U.S.
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.mx }} />
              Mexico
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.other }} />
              Other
            </span>
            {highlightAirports && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: COLORS.us, border: '2px solid #E8B923' }}
                />
                Texas Border
              </span>
            )}
          </>
        )}
        {/* Route line legend entries */}
        {topN > 0 && !selectedAirport && (
          <span className="flex items-center gap-1.5">
            <svg width="24" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="24" y2="5" stroke={COLORS.arc} strokeWidth="2" strokeDasharray="5 3" opacity="0.6" />
            </svg>
            Top {topN} routes
          </span>
        )}
        {selectedAirport && (
          <span className="flex items-center gap-1.5">
            <svg width="24" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="24" y2="5" stroke={COLORS.arcHover} strokeWidth="2" opacity="0.6" />
            </svg>
            Selected airport routes
          </span>
        )}
        {fixedRadius == null && !hideVolume && (
          <span className="flex items-center gap-1.5">
            <svg width="24" height="16" aria-hidden="true" className="flex-shrink-0">
              <circle cx="7" cy="11" r="3" fill="#999" opacity="0.5" />
              <circle cx="17" cy="8" r="6" fill="#999" opacity="0.5" />
            </svg>
            Size = {metricLabel} volume
          </span>
        )}
        {hintText && <span className="ml-auto text-base">{hintText}</span>}
      </div>
    </div>
    {tooltip &&
      createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.sticky ? 'none' : 'translate(-50%, -100%)',
            zIndex: 10000,
            pointerEvents: 'none',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            lineHeight: 1.4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}
        >
          {tooltip.content}
        </div>,
        document.body,
      )}
    </>
  )
}
