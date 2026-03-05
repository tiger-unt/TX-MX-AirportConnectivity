import { useMemo } from 'react'

const PLANE_R = 16 // plane bounding radius at scale 1.0
const PLANE_PATH =
  'M0-16 C1.2-16 1.8-14.4 1.8-11.2 L1.8 0 L13.2 8 L13.2 11.2 L1.8 5.6 L1.8 20 L5.4 24 L5.4 26.4 L0 23.2 L-5.4 26.4 L-5.4 24 L-1.8 20 L-1.8 5.6 L-13.2 11.2 L-13.2 8 L-1.8 0 L-1.8-11.2 C-1.8-14.4-1.2-16 0-16Z'

/**
 * Stardust airplane background overlay for hero banners.
 * Renders a field of tiny scattered airplane silhouettes with optional jet trails.
 * Uses a seeded PRNG + jittered grid for deterministic, non-overlapping placement.
 *
 * @param {number} seed - PRNG seed for unique pattern per page
 */
export default function HeroStardust({ seed = 7 }) {
  const planes = useMemo(() => {
    let s = seed
    const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }

    const W = 2400, H = 200
    const GAP = 3
    const cellSize = 24
    const cols = Math.floor(W / cellSize)
    const rows = Math.floor(H / cellSize)
    const cellW = W / cols, cellH = H / rows
    const result = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.12) continue
        const maxScale = (Math.min(cellW, cellH) / 2 - GAP) / PLANE_R
        const t = rand()
        const scale = t < 0.70 ? 0.10 + rand() * 0.12
                    : t < 0.92 ? 0.22 + rand() * 0.15
                    :            0.37 + rand() * (maxScale - 0.37)
        const pad = PLANE_R * scale + GAP
        const xRange = cellW - 2 * pad
        const yRange = cellH - 2 * pad
        if (xRange <= 0 || yRange <= 0) continue
        const x = c * cellW + pad + rand() * xRange
        const y = r * cellH + pad + rand() * yRange
        const rotation = Math.floor(rand() * 360)
        const opacity = t < 0.70 ? 0.04 + rand() * 0.05
                      : t < 0.92 ? 0.07 + rand() * 0.07
                      :            0.12 + rand() * 0.10
        const trail = t >= 0.70 && rand() < 0.15
          ? 20 + Math.floor(rand() * 40)
          : 0
        result.push({ x: Math.round(x), y: Math.round(y), scale: +scale.toFixed(2), rotation, opacity: +opacity.toFixed(3), trail })
      }
    }
    return result
  }, [seed])

  // Unique IDs so multiple instances don't clash
  const planeId = `plane-${seed}`
  const gradId = `trail-fade-${seed}`

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 2400 200"
      aria-hidden="true"
    >
      <defs>
        <path id={planeId} d={PLANE_PATH} />
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {planes.map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          {p.trail > 0 && (
            <rect
              x={-1}
              y={0}
              width={2}
              height={p.trail}
              rx={1}
              fill={`url(#${gradId})`}
              opacity={0.15}
              transform={`rotate(${p.rotation}) translate(0,${PLANE_R * p.scale})`}
            />
          )}
          <g transform={`rotate(${p.rotation}) scale(${p.scale})`}>
            <use href={`#${planeId}`} fill="white" opacity={p.opacity} />
          </g>
        </g>
      ))}
    </svg>
  )
}
