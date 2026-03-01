/**
 * ── AirportMap.jsx ──────────────────────────────────────────────────────
 * Reusable Leaflet map showing airport markers and route arcs.
 *
 * Props:
 *   airports      — Array of { iata, name, city, country, lat, lng, volume }
 *   routes        — Array of { origin, dest, originLat, originLng, destLat, destLng, passengers, label }
 *   topN          — Number of top routes to show by default (default 15)
 *   selectedAirport / onAirportSelect — controlled selection state
 *   height        — CSS height string (default '480px')
 *   center        — [lat, lng] (default [25.5, -99.5])
 *   zoom          — initial zoom (default 5)
 */
import { useMemo, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet'
import { greatCircleArc } from '@/lib/airportUtils'
import 'leaflet/dist/leaflet.css'

const COLORS = {
  us: '#0056a9',
  mx: '#df5c16',
  other: '#c5bbaa',
  arc: '#0056a9',
  arcHover: '#df5c16',
}

function radiusScale(volume, maxVolume) {
  if (!maxVolume || !volume) return 4
  return Math.max(4, Math.min(20, 4 + 16 * Math.sqrt(volume / maxVolume)))
}

function markerColor(country) {
  if (!country) return COLORS.other
  const c = country.toLowerCase()
  if (c === 'mexico') return COLORS.mx
  if (c === 'united states') return COLORS.us
  return COLORS.other
}

function MapClickHandler({ onReset }) {
  useMapEvents({
    click: () => onReset?.(),
  })
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

function ResetZoomButton({ center, zoom, onReset }) {
  const map = useMap()
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    map.setView(center, zoom)
    onReset?.()
  }, [map, center, zoom, onReset])

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control" style={{ marginTop: 10, marginRight: 10 }}>
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
  height = '480px',
  center = [25.5, -99.5],
  zoom = 5,
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

  return (
    <div
      style={{ minHeight: height, width: '100%' }}
      className="airport-map-container h-full flex flex-col rounded-lg overflow-hidden border border-border-light"
    >
      {/* Map wrapper — flex-1 fills remaining space; absolute-positioned MapContainer inside */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler onReset={handleReset} />
          <ResetZoomButton center={center} zoom={zoom} onReset={handleReset} />
          <MapResizeHandler />

          {/* Route arcs */}
          {arcs.map((arc, i) => (
            <Polyline
              key={`arc-${arc.origin}-${arc.dest}-${i}`}
              positions={arc.positions}
              pathOptions={{
                color: selectedAirport ? COLORS.arcHover : COLORS.arc,
                weight: 2,
                opacity: 0.5,
                dashArray: selectedAirport ? undefined : '6 4',
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{arc.label}</strong>
                  <br />
                  {arc.passengers?.toLocaleString()} passengers
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Airport markers */}
          {airports
            .filter((a) => a.lat != null && a.lng != null)
            .map((a) => {
              const isSelected = selectedAirport === a.iata
              const r = radiusScale(a.volume, maxVolume)
              return (
                <CircleMarker
                  key={a.iata}
                  center={[a.lat, a.lng]}
                  radius={isSelected ? r + 3 : r}
                  pathOptions={{
                    fillColor: markerColor(a.country),
                    color: isSelected ? '#fff' : markerColor(a.country),
                    weight: isSelected ? 3 : 1,
                    opacity: 0.9,
                    fillOpacity: isSelected ? 1 : 0.7,
                  }}
                  eventHandlers={{
                    click: () => handleAirportClick(a.iata),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{a.name}</strong>
                      <br />
                      {a.city}
                      <br />
                      {a.volume?.toLocaleString()} passengers
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
        </MapContainer>
      </div>

      {/* Legend — flex-shrink-0 keeps it at natural height; inline height overrides fullscreen CSS */}
      <div
        className="flex items-center gap-4 px-3 py-2 bg-white/90 text-xs text-text-secondary border-t border-border-light flex-shrink-0"
        style={{ height: 'auto' }}
      >
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
        <span className="ml-auto text-xs">Click airport to explore connections</span>
      </div>
    </div>
  )
}
