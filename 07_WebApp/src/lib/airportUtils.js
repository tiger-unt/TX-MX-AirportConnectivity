/**
 * ── airportUtils.js ─────────────────────────────────────────────────────
 * GeoJSON airport index, row enrichment, aggregation, and arc utilities.
 * Used to enrich CSV data with airport display names and coordinates.
 */

/**
 * Parse GeoJSON FeatureCollection into a Map<IATA, { name, lat, lng }>
 * GeoJSON properties: AIRPORT, DISPLAY_AIRPORT_NAME, LATITUDE, LONGITUDE
 */
export function buildAirportIndex(geojson) {
  const index = new Map()
  if (!geojson?.features) return index
  for (const f of geojson.features) {
    const p = f.properties
    if (!p?.AIRPORT) continue
    index.set(p.AIRPORT, {
      name: p.DISPLAY_AIRPORT_NAME || p.AIRPORT,
      lat: p.LATITUDE ?? f.geometry?.coordinates?.[1] ?? null,
      lng: p.LONGITUDE ?? f.geometry?.coordinates?.[0] ?? null,
    })
  }
  return index
}

/**
 * Enrich a single market/segment row with airport names and coordinates.
 * Mutates the row in place for performance (called on 90K+ rows).
 */
export function enrichRow(row, airportIndex) {
  const orig = airportIndex.get(row.ORIGIN)
  const dest = airportIndex.get(row.DEST)

  row.ORIGIN_AIRPORT_NAME = orig?.name || row.ORIGIN
  row.DEST_AIRPORT_NAME = dest?.name || row.DEST
  row.ORIGIN_FULL_LABEL = orig?.name || row.ORIGIN
  row.DEST_FULL_LABEL = dest?.name || row.DEST
  row.ORIGIN_LAT = orig?.lat ?? null
  row.ORIGIN_LNG = orig?.lng ?? null
  row.DEST_LAT = dest?.lat ?? null
  row.DEST_LNG = dest?.lng ?? null
}

/**
 * Aggregate routes: group by O-D pair, sum the given field, attach coords.
 * Returns array sorted by value descending.
 * @param {string} [field='PASSENGERS'] — the numeric column to sum
 */
export function aggregateRoutes(data, airportIndex, field = 'PASSENGERS') {
  const byRoute = new Map()
  for (const d of data) {
    const key = `${d.ORIGIN}-${d.DEST}`
    if (!byRoute.has(key)) {
      const orig = airportIndex?.get(d.ORIGIN)
      const dest = airportIndex?.get(d.DEST)
      byRoute.set(key, {
        origin: d.ORIGIN,
        dest: d.DEST,
        originName: d.ORIGIN_FULL_LABEL || d.ORIGIN,
        destName: d.DEST_FULL_LABEL || d.DEST,
        label: `${d.ORIGIN_FULL_LABEL || d.ORIGIN}–${d.DEST_FULL_LABEL || d.DEST}`,
        value: 0,
        originLat: orig?.lat ?? d.ORIGIN_LAT ?? null,
        originLng: orig?.lng ?? d.ORIGIN_LNG ?? null,
        destLat: dest?.lat ?? d.DEST_LAT ?? null,
        destLng: dest?.lng ?? d.DEST_LNG ?? null,
      })
    }
    byRoute.get(key).value += d[field]
  }
  return Array.from(byRoute.values()).sort((a, b) => b.value - a.value)
}

/**
 * Sum a metric per IATA code (as origin + as destination).
 * Returns Map<IATA, number>.
 * @param {string} [field='PASSENGERS'] — the numeric column to sum
 */
export function aggregateAirportVolumes(data, field = 'PASSENGERS') {
  const volumes = new Map()
  for (const d of data) {
    volumes.set(d.ORIGIN, (volumes.get(d.ORIGIN) || 0) + d[field])
    volumes.set(d.DEST, (volumes.get(d.DEST) || 0) + d[field])
  }
  return volumes
}

/**
 * Generate points along a great-circle arc for curved map lines.
 * Returns array of [lat, lng] pairs.
 */
export function greatCircleArc([lat1, lng1], [lat2, lng2], n = 50) {
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI

  const phi1 = toRad(lat1)
  const lam1 = toRad(lng1)
  const phi2 = toRad(lat2)
  const lam2 = toRad(lng2)

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((phi2 - phi1) / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin((lam2 - lam1) / 2) ** 2
    )
  )

  if (d < 1e-10) return [[lat1, lng1], [lat2, lng2]]

  const points = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2)
    const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2)
    const z = A * Math.sin(phi1) + B * Math.sin(phi2)
    points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))])
  }
  return points
}
