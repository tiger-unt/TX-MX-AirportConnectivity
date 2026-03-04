import { useAviationStore } from '@/stores/aviationStore'
import { fmtCompact, fmtLbs, isTxMx, isUsToMx, isMxToUs, isTxDomestic, isTxIntl, BORDER_AIRPORTS } from '@/lib/aviationHelpers'

/**
 * Mock AI responder — computes real answers from BTS aviation data.
 * When a real backend is ready, replace the body of this function with
 * a fetch('/api/chat', ...) call. The signature stays the same.
 */
export async function sendChatMessage(question, pageContext, history, onChunk) {
  const answer = generateMockAnswer(question, pageContext)
  await streamText(answer, onChunk)
}

/**
 * Returns 2–3 contextual follow-up questions based on what was just asked.
 */
export function getFollowUpSuggestions(question) {
  const q = question.toLowerCase()

  if (matchesAny(q, ['total passenger', 'how many passenger', 'passenger count'])) {
    return [
      'How has this changed over time?',
      'Which airports have the most passengers?',
      'What are the top routes?',
    ]
  }
  if (matchesAny(q, ['top route', 'busiest route', 'most popular route'])) {
    return [
      'Which airlines fly these routes?',
      'How much freight moves on these routes?',
      'How have the top routes changed over time?',
    ]
  }
  if (matchesAny(q, ['airport', 'busiest airport'])) {
    return [
      'What are the top routes from this airport?',
      'How many airlines serve this airport?',
      'How has passenger traffic changed over time?',
    ]
  }
  if (matchesAny(q, ['freight', 'cargo', 'mail'])) {
    return [
      'Which airports handle the most freight?',
      'How has freight volume changed over time?',
      'What is the freight vs passenger comparison?',
    ]
  }
  if (matchesAny(q, ['airline', 'carrier'])) {
    return [
      'Which routes does this airline serve?',
      'What is the carrier market share?',
      'How many passengers do the top carriers fly?',
    ]
  }
  if (matchesAny(q, ['border', 'el paso', 'laredo', 'mcallen', 'harlingen', 'brownsville'])) {
    return [
      'How do border airports compare to non-border?',
      'What are the top Mexico destinations from border airports?',
      'How has border airport traffic changed over time?',
    ]
  }
  if (matchesAny(q, ['trend', 'over time', 'growth', 'change', 'covid'])) {
    return [
      'What was the passenger count in the latest year?',
      'Which routes grew the most?',
      'How did COVID affect air travel?',
    ]
  }
  if (matchesAny(q, ['mexico', 'international'])) {
    return [
      'Which Texas airports fly to Mexico?',
      'What are the top Mexico destinations?',
      'How much freight goes to Mexico?',
    ]
  }

  return [
    'How many passengers flew Texas–Mexico routes?',
    'What are the busiest airports?',
    'Which airlines have the most flights?',
  ]
}

// ---------------------------------------------------------------------------
// Streaming helper — simulates LLM token-by-token output
// ---------------------------------------------------------------------------

async function streamText(text, onChunk, delayMs = 12) {
  for (const char of text) {
    onChunk(char)
    await new Promise((r) => setTimeout(r, delayMs))
  }
}

// ---------------------------------------------------------------------------
// Mock answer generator — uses real data from the Zustand store
// ---------------------------------------------------------------------------

function generateMockAnswer(question, pageContext) {
  const store = useAviationStore.getState()
  const q = question.toLowerCase()

  if (store.loading || !store.marketData) {
    return "I don't have enough data loaded yet to answer that question. Please wait for the dashboard to finish loading and try again."
  }

  // Pick the right dataset scoped to the current page
  const { market, segment } = pickDataset(pageContext, store)
  if (!market || market.length === 0) {
    return "No data is available for the current view. Try adjusting your filters or navigating to a different page."
  }

  // Merge active page filters with any year mentioned in the question
  const questionFilters = extractFiltersFromQuestion(q)
  const mergedFilters = { ...pageContext.activeFilters, ...questionFilters }
  const filtered = applyFilters(market, mergedFilters)
  const filteredSeg = segment ? applyFilters(segment, mergedFilters) : []

  const ctx = { ...pageContext, activeFilters: mergedFilters }

  // Route to the appropriate answer generator
  if (matchesAny(q, ['total passenger', 'how many passenger', 'passenger count', 'passenger traffic']) ||
      (/\btotal\b/.test(q) && /\bpassenger\b/.test(q))) {
    return answerTotalPassengers(filtered, ctx)
  }
  if (matchesAny(q, ['top route', 'busiest route', 'popular route', 'which route'])) {
    return answerTopRoutes(filtered)
  }
  if (matchesAny(q, ['top airport', 'busiest airport', 'which airport', 'most passenger'])) {
    return answerTopAirports(filtered)
  }
  if (matchesAny(q, ['top airline', 'top carrier', 'which airline', 'which carrier', 'market share', 'biggest airline'])) {
    return answerTopCarriers(filtered)
  }
  if (matchesAny(q, ['freight', 'cargo'])) {
    return answerFreight(filtered, ctx)
  }
  if (matchesAny(q, ['mail'])) {
    return answerMail(filtered, ctx)
  }
  if (matchesAny(q, ['border airport', 'border vs'])) {
    return answerBorderAirports(filtered)
  }
  if (matchesAny(q, ['flight', 'departure', 'how many flight'])) {
    return answerFlights(filteredSeg, ctx)
  }
  if (matchesAny(q, ['seat', 'capacity', 'load factor'])) {
    return answerCapacity(filteredSeg, ctx)
  }
  if (matchesAny(q, ['trend', 'over time', 'year over year', 'growth', 'change', 'increase', 'decrease', 'covid'])) {
    return answerTrend(filtered)
  }
  if (matchesAny(q, ['mexico', 'mx'])) {
    return answerMexico(store)
  }
  if (matchesAny(q, ['domestic', 'within us', 'us destination'])) {
    return answerDomestic(store)
  }
  if (matchesAny(q, ['international', 'intl'])) {
    return answerInternational(store)
  }

  // Specific airport lookup
  const airportMatch = q.match(/\b([A-Z]{3})\b/i)
  if (airportMatch && store.airportIndex?.has(airportMatch[1].toUpperCase())) {
    return answerAirportDetail(airportMatch[1].toUpperCase(), filtered, store)
  }

  // Fallback — general summary of the current view
  return answerGeneralSummary(filtered, filteredSeg, ctx)
}

// ---------------------------------------------------------------------------
// Dataset selection — scope data to the current page's filter predicate
// ---------------------------------------------------------------------------

function pickDataset(pageContext, store) {
  const predicateMap = {
    'Texas-Mexico': isTxMx,
    'US-Mexico': (d) => isUsToMx(d) || isMxToUs(d),
    'Texas Domestic': isTxDomestic,
    'Texas International': isTxIntl,
  }

  const predicate = predicateMap[pageContext.currentPage]
  if (predicate) {
    return {
      market: store.marketData.filter(predicate),
      segment: store.segmentData?.filter(predicate) || [],
    }
  }

  // Overview & About Data — use all data
  return { market: store.marketData, segment: store.segmentData || [] }
}

// ---------------------------------------------------------------------------
// Filter helper
// ---------------------------------------------------------------------------

function applyFilters(data, filters) {
  if (!filters) return data
  return data.filter((d) => {
    if (filters.year?.length && !filters.year.includes(d.YEAR) && !filters.year.includes(String(d.YEAR))) return false
    if (filters.carrier?.length && !filters.carrier.includes(d.CARRIER_NAME)) return false
    if (filters.originAirport?.length && !filters.originAirport.includes(d.ORIGIN)) return false
    if (filters.destAirport?.length && !filters.destAirport.includes(d.DEST)) return false
    if (filters.originState?.length && !filters.originState.includes(d.ORIGIN_STATE_NM)) return false
    if (filters.destState?.length && !filters.destState.includes(d.DEST_STATE_NM)) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Answer generators
// ---------------------------------------------------------------------------

function answerTotalPassengers(data, ctx) {
  const total = sumField(data, 'PASSENGERS')
  const years = uniqueYears(data)
  const filterDesc = describeFilters(ctx.activeFilters)

  let response = `Based on the ${ctx.currentPage} data${filterDesc}, the total passenger count is ${fmtCompact(total)}`
  if (years.length > 1) {
    response += ` (${years[0]}–${years[years.length - 1]})`
  } else if (years.length === 1) {
    response += ` (${years[0]})`
  }
  response += '.\n\n'

  // Year breakdown if multiple years
  if (years.length > 1 && years.length <= 12) {
    const byYear = groupAndSum(data, 'YEAR', 'PASSENGERS')
    response += 'By year:\n'
    byYear.forEach((y) => {
      response += `• ${y.label}: ${fmtCompact(y.value)}\n`
    })
  }
  return response
}

function answerTopRoutes(data) {
  const routeMap = new Map()
  data.forEach((d) => {
    const key = `${d.ORIGIN}–${d.DEST}`
    const label = `${d.ORIGIN_CITY_NAME || d.ORIGIN} → ${d.DEST_CITY_NAME || d.DEST}`
    const cur = routeMap.get(key) || { label, value: 0 }
    cur.value += d.PASSENGERS || 0
    routeMap.set(key, cur)
  })
  const top10 = Array.from(routeMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  let response = 'Top 10 routes by passengers:\n\n'
  top10.forEach((r, i) => {
    response += `${i + 1}. ${r.label} — ${fmtCompact(r.value)} passengers\n`
  })
  return response
}

function answerTopAirports(data) {
  const airportMap = new Map()
  data.forEach((d) => {
    // Count origin side
    const oLabel = d.ORIGIN_CITY_NAME ? `${d.ORIGIN} (${d.ORIGIN_CITY_NAME})` : d.ORIGIN
    const o = airportMap.get(d.ORIGIN) || { label: oLabel, value: 0 }
    o.value += d.PASSENGERS || 0
    airportMap.set(d.ORIGIN, o)
    // Count dest side
    const dLabel = d.DEST_CITY_NAME ? `${d.DEST} (${d.DEST_CITY_NAME})` : d.DEST
    const dest = airportMap.get(d.DEST) || { label: dLabel, value: 0 }
    dest.value += d.PASSENGERS || 0
    airportMap.set(d.DEST, dest)
  })

  const top10 = Array.from(airportMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  let response = 'Top 10 airports by passenger volume:\n\n'
  top10.forEach((a, i) => {
    response += `${i + 1}. ${a.label} — ${fmtCompact(a.value)} passengers\n`
  })
  return response
}

function answerTopCarriers(data) {
  const byCarrier = groupAndSum(data, 'CARRIER_NAME', 'PASSENGERS')
  const top10 = byCarrier.slice(0, 10)
  const total = sumField(data, 'PASSENGERS')

  let response = 'Top airlines by passengers:\n\n'
  top10.forEach((c, i) => {
    const pct = total > 0 ? ((c.value / total) * 100).toFixed(1) : '0.0'
    response += `${i + 1}. ${c.label} — ${fmtCompact(c.value)} (${pct}%)\n`
  })
  return response
}

function answerFreight(data, ctx) {
  const total = sumField(data, 'FREIGHT')
  const filterDesc = describeFilters(ctx.activeFilters)

  let response = `Total freight${filterDesc}: ${fmtLbs(total)}.\n\n`

  const byAirport = new Map()
  data.forEach((d) => {
    const o = byAirport.get(d.ORIGIN) || { label: d.ORIGIN_CITY_NAME || d.ORIGIN, value: 0 }
    o.value += d.FREIGHT || 0
    byAirport.set(d.ORIGIN, o)
  })
  const top5 = Array.from(byAirport.values()).sort((a, b) => b.value - a.value).slice(0, 5)

  response += 'Top 5 origin airports by freight:\n'
  top5.forEach((a, i) => {
    response += `${i + 1}. ${a.label} — ${fmtLbs(a.value)}\n`
  })
  return response
}

function answerMail(data, ctx) {
  const total = sumField(data, 'MAIL')
  const filterDesc = describeFilters(ctx.activeFilters)
  return `Total mail${filterDesc}: ${fmtLbs(total)}.`
}

function answerBorderAirports(data) {
  const borderData = data.filter((d) => BORDER_AIRPORTS.has(d.ORIGIN) || BORDER_AIRPORTS.has(d.DEST))
  const nonBorder = data.filter((d) => !BORDER_AIRPORTS.has(d.ORIGIN) && !BORDER_AIRPORTS.has(d.DEST))

  const borderPax = sumField(borderData, 'PASSENGERS')
  const nonBorderPax = sumField(nonBorder, 'PASSENGERS')
  const total = borderPax + nonBorderPax
  const borderPct = total > 0 ? ((borderPax / total) * 100).toFixed(1) : '0'

  let response = `Border airports account for ${borderPct}% of passengers (${fmtCompact(borderPax)} of ${fmtCompact(total)}).\n\n`
  response += 'Border airports: ELP (El Paso), LRD (Laredo), MFE (McAllen), HRL (Harlingen), BRO (Brownsville), DRT (Del Rio).\n\n'

  // Per-airport breakdown
  const byAirport = new Map()
  borderData.forEach((d) => {
    const codes = []
    if (BORDER_AIRPORTS.has(d.ORIGIN)) codes.push(d.ORIGIN)
    if (BORDER_AIRPORTS.has(d.DEST)) codes.push(d.DEST)
    codes.forEach((code) => {
      byAirport.set(code, (byAirport.get(code) || 0) + (d.PASSENGERS || 0))
    })
  })
  const sorted = Array.from(byAirport.entries()).sort((a, b) => b[1] - a[1])
  response += 'By border airport:\n'
  sorted.forEach(([code, pax]) => {
    response += `• ${code}: ${fmtCompact(pax)} passengers\n`
  })
  return response
}

function answerFlights(segmentData, ctx) {
  if (!segmentData?.length) return 'Flight data (segment) is not available for this view.'
  const total = sumField(segmentData, 'DEPARTURES_PERFORMED')
  const filterDesc = describeFilters(ctx.activeFilters)
  return `Total departures performed${filterDesc}: ${fmtCompact(total)} flights.`
}

function answerCapacity(segmentData, ctx) {
  if (!segmentData?.length) return 'Capacity data (segment) is not available for this view.'
  const seats = sumField(segmentData, 'SEATS')
  const pax = sumField(segmentData, 'PASSENGERS')
  const loadFactor = seats > 0 ? ((pax / seats) * 100).toFixed(1) : 'N/A'
  const filterDesc = describeFilters(ctx.activeFilters)

  return `Capacity${filterDesc}:\n\n` +
    `• Total seats: ${fmtCompact(seats)}\n` +
    `• Total passengers: ${fmtCompact(pax)}\n` +
    `• Load factor: ${loadFactor}%`
}

function answerTrend(data) {
  const byYear = groupAndSum(data, 'YEAR', 'PASSENGERS')
  if (byYear.length < 2) return 'Not enough yearly data to show a trend.'

  let response = 'Passenger trend by year:\n\n'
  byYear.forEach((y, i) => {
    let change = ''
    if (i > 0) {
      const prev = byYear[i - 1].value
      const pct = prev > 0 ? (((y.value - prev) / prev) * 100).toFixed(1) : 'N/A'
      change = ` (${y.value >= prev ? '+' : ''}${pct}%)`
    }
    response += `• ${y.label}: ${fmtCompact(y.value)}${change}\n`
  })

  const first = byYear[0].value
  const last = byYear[byYear.length - 1].value
  const overallPct = first > 0 ? (((last - first) / first) * 100).toFixed(1) : 'N/A'
  response += `\nOverall change from ${byYear[0].label} to ${byYear[byYear.length - 1].label}: ${overallPct}%`
  return response
}

function answerMexico(store) {
  const txMx = store.marketData.filter(isTxMx)
  const total = sumField(txMx, 'PASSENGERS')
  const freight = sumField(txMx, 'FREIGHT')
  const years = uniqueYears(txMx)

  let response = `Texas–Mexico air connectivity (${years[0]}–${years[years.length - 1]}):\n\n`
  response += `• Total passengers: ${fmtCompact(total)}\n`
  response += `• Total freight: ${fmtLbs(freight)}\n\n`

  const byDest = groupAndSum(txMx.filter((d) => d.DEST_COUNTRY_NAME === 'Mexico'), 'DEST_CITY_NAME', 'PASSENGERS')
  response += 'Top Mexico destinations from Texas:\n'
  byDest.slice(0, 5).forEach((d, i) => {
    response += `${i + 1}. ${d.label} — ${fmtCompact(d.value)} passengers\n`
  })
  return response
}

function answerDomestic(store) {
  const dom = store.marketData.filter(isTxDomestic)
  const total = sumField(dom, 'PASSENGERS')
  const years = uniqueYears(dom)

  let response = `Texas domestic air connectivity (${years[0]}–${years[years.length - 1]}):\n\n`
  response += `• Total passengers: ${fmtCompact(total)}\n\n`

  const byDest = groupAndSum(dom, 'DEST_CITY_NAME', 'PASSENGERS')
  response += 'Top destination cities:\n'
  byDest.slice(0, 5).forEach((d, i) => {
    response += `${i + 1}. ${d.label} — ${fmtCompact(d.value)} passengers\n`
  })
  return response
}

function answerInternational(store) {
  const intl = store.marketData.filter(isTxIntl)
  const total = sumField(intl, 'PASSENGERS')
  const years = uniqueYears(intl)

  let response = `Texas international air connectivity (${years[0]}–${years[years.length - 1]}):\n\n`
  response += `• Total passengers: ${fmtCompact(total)}\n\n`

  const byCountry = groupAndSum(intl, 'DEST_COUNTRY_NAME', 'PASSENGERS')
  response += 'Top destination countries:\n'
  byCountry.slice(0, 5).forEach((d, i) => {
    response += `${i + 1}. ${d.label} — ${fmtCompact(d.value)} passengers\n`
  })
  return response
}

function answerAirportDetail(code, data, store) {
  const info = store.airportIndex?.get(code)
  const name = info?.name || code

  const asOrigin = data.filter((d) => d.ORIGIN === code)
  const asDest = data.filter((d) => d.DEST === code)
  const paxOut = sumField(asOrigin, 'PASSENGERS')
  const paxIn = sumField(asDest, 'PASSENGERS')
  const freightOut = sumField(asOrigin, 'FREIGHT')

  let response = `${name} (${code}):\n\n`
  response += `• Outbound passengers: ${fmtCompact(paxOut)}\n`
  response += `• Inbound passengers: ${fmtCompact(paxIn)}\n`
  response += `• Outbound freight: ${fmtLbs(freightOut)}\n\n`

  const destinations = groupAndSum(asOrigin, 'DEST_CITY_NAME', 'PASSENGERS')
  if (destinations.length > 0) {
    response += 'Top destinations:\n'
    destinations.slice(0, 5).forEach((d, i) => {
      response += `${i + 1}. ${d.label} — ${fmtCompact(d.value)} passengers\n`
    })
  }
  return response
}

function answerGeneralSummary(market, segment, ctx) {
  const pax = sumField(market, 'PASSENGERS')
  const freight = sumField(market, 'FREIGHT')
  const routes = new Set(market.map((d) => `${d.ORIGIN}-${d.DEST}`)).size
  const filterDesc = describeFilters(ctx.activeFilters)

  let response = `You're viewing the ${ctx.currentPage} page${filterDesc}.\n\n`
  response += `• ${fmtCompact(pax)} passengers across ${routes.toLocaleString()} routes\n`
  response += `• ${fmtLbs(freight)} of freight\n\n`
  response += 'You can ask me about:\n'
  response += '• Passenger counts and trends over time\n'
  response += '• Top routes, airports, or airlines\n'
  response += '• Freight and mail volumes\n'
  response += '• Border airport analysis\n'
  response += '• Flight counts and seat capacity\n'
  response += '• Specific airports (e.g., "Tell me about DFW")'
  return response
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function matchesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw))
}

function sumField(data, field) {
  return data.reduce((sum, d) => sum + (d[field] || 0), 0)
}

function groupAndSum(data, key, valueField) {
  const map = new Map()
  data.forEach((d) => {
    const label = d[key]
    if (label == null) return
    map.set(label, (map.get(label) || 0) + (d[valueField] || 0))
  })
  return Array.from(map, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value,
  )
}

function uniqueYears(data) {
  return [...new Set(data.map((d) => d.YEAR).filter(Boolean))].sort((a, b) => a - b)
}

function describeFilters(filters) {
  if (!filters) return ''
  const parts = []
  if (filters.year?.length) parts.push(`Year: ${filters.year.join(', ')}`)
  if (filters.direction) parts.push(`Direction: ${filters.direction}`)
  if (filters.carrier?.length) parts.push(`Carrier: ${filters.carrier.join(', ')}`)
  if (filters.originAirport?.length) parts.push(`Origin: ${filters.originAirport.join(', ')}`)
  if (filters.destAirport?.length) parts.push(`Dest: ${filters.destAirport.join(', ')}`)
  return parts.length > 0 ? ` (filtered by ${parts.join('; ')})` : ''
}

function extractFiltersFromQuestion(q) {
  const filters = {}

  // Extract year (4-digit number between 2015-2025)
  const yearMatch = q.match(/\b(201[5-9]|202[0-5])\b/)
  if (yearMatch) filters.year = [parseInt(yearMatch[1], 10)]

  return filters
}
