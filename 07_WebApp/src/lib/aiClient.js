import { useTradeStore } from '@/stores/tradeStore'
import { formatCurrency } from '@/lib/chartColors'

/**
 * Mock AI responder — computes real answers from dashboard data.
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

  if (/\btotal\b/.test(q) && /\btrade\b/.test(q)) {
    return [
      'How has this changed over time?',
      'What are the top states by trade?',
      'Break this down by transportation mode',
    ]
  }
  if (matchesAny(q, ['top state', 'which state', 'biggest state', 'most trade'])) {
    return [
      'Tell me more about Texas trade',
      'What are the top commodities?',
      'How has state trade changed over time?',
    ]
  }
  if (matchesAny(q, ['commodit', 'product'])) {
    return [
      'Which commodities go by truck?',
      'What was the total trade in 2024?',
      'Show me the top border ports',
    ]
  }
  if (matchesAny(q, ['port', 'border', 'laredo', 'el paso', 'pharr'])) {
    return [
      'How has Laredo trade changed over time?',
      'What about El Paso?',
      'What are the top commodities at this port?',
    ]
  }
  if (matchesAny(q, ['truck', 'rail', 'vessel', 'air', 'mode', 'transport'])) {
    return [
      'What are the top commodities by truck?',
      'How has mode share changed over time?',
      'Which border ports handle the most rail trade?',
    ]
  }
  if (matchesAny(q, ['trend', 'over time', 'growth', 'change'])) {
    return [
      'What was the total trade in 2024?',
      'Which state had the biggest growth?',
      'Show the export vs import balance',
    ]
  }
  if (matchesAny(q, ['export', 'import', 'balance', 'deficit', 'surplus'])) {
    return [
      'How has the balance changed over time?',
      'Which states export the most?',
      'What are the top export commodities?',
    ]
  }
  if (matchesAny(q, ['texas', 'tx'])) {
    return [
      'Which border ports are in Texas?',
      'What does Texas export the most?',
      'How has Texas trade changed over time?',
    ]
  }

  return [
    'What was the total U.S.\u2013Mexico trade in 2024?',
    'Which state trades the most with Mexico?',
    'Show me the top border ports',
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
  const store = useTradeStore.getState()
  const q = question.toLowerCase()

  // Pick the right dataset based on question keywords + current page
  const data = pickDataset(q, pageContext, store)
  if (!data || data.length === 0) {
    return "I don't have enough data loaded yet to answer that question. Please wait for the dashboard to finish loading and try again."
  }

  // Merge active page filters with any year/filters mentioned in the question
  const questionFilters = extractFiltersFromQuestion(q)
  const mergedFilters = { ...pageContext.activeFilters }
  for (const [key, val] of Object.entries(questionFilters)) {
    if (val) mergedFilters[key] = val
  }
  const filtered = applyFilters(data, mergedFilters)

  // Build a context object with merged filters for answer functions
  const ctx = { ...pageContext, activeFilters: mergedFilters }

  // Route to the appropriate answer generator
  if (matchesAny(q, ['total trade', 'total value', 'how much trade', 'overall trade', 'grand total']) ||
      (/\btotal\b/.test(q) && /\btrade\b/.test(q))) {
    return answerTotalTrade(filtered, ctx)
  }
  if (matchesAny(q, ['top state', 'which state', 'biggest state', 'leading state']) ||
      (/\bmost\b/.test(q) && /\btrade\b/.test(q) && /\bstate\b/.test(q))) {
    return answerTopStates(filtered, store)
  }
  if (matchesAny(q, ['top commodit', 'which commodit', 'biggest commodit', 'leading commodit', 'most traded'])) {
    return answerTopCommodities(filtered, store)
  }
  if (matchesAny(q, ['top port', 'which port', 'biggest port', 'leading port', 'busiest port'])) {
    return answerTopPorts(store)
  }
  if (matchesAny(q, ['laredo'])) {
    return answerPortDetail('Laredo', store)
  }
  if (matchesAny(q, ['el paso'])) {
    return answerPortDetail('El Paso + Ysleta', store)
  }
  if (matchesAny(q, ['truck', 'rail', 'vessel', 'air', 'mode', 'transport'])) {
    return answerByMode(filtered)
  }
  if (matchesAny(q, ['export', 'import', 'balance', 'deficit', 'surplus'])) {
    return answerTradeBalance(filtered, ctx)
  }
  if (matchesAny(q, ['trend', 'over time', 'year over year', 'growth', 'change', 'increase', 'decrease'])) {
    return answerTrend(filtered)
  }
  if (matchesAny(q, ['texas', 'tx'])) {
    return answerTexas(store)
  }

  // Fallback — give a general summary of the current view
  return answerGeneralSummary(filtered, ctx)
}

// ---------------------------------------------------------------------------
// Dataset selection
// ---------------------------------------------------------------------------

function pickDataset(q, pageContext, store) {
  // Keyword overrides
  if (matchesAny(q, ['port', 'border', 'laredo', 'el paso', 'pharr', 'eagle pass', 'brownsville'])) {
    return store.txBorderPorts
  }
  if (matchesAny(q, ['state', 'california', 'michigan', 'illinois', 'ohio', 'new york'])) {
    return store.btsUsState
  }

  // Default to current page's dataset
  const datasetMap = {
    usAggregated: store.usAggregated,
    btsUsState: store.btsUsState,
    txBorderPorts: store.txBorderPorts,
    masterData: store.masterData,
  }
  return datasetMap[pageContext.datasetKey] || store.usAggregated
}

// ---------------------------------------------------------------------------
// Filter helper
// ---------------------------------------------------------------------------

function applyFilters(data, filters) {
  if (!filters) return data
  return data.filter((d) => {
    if (filters.year && d.Year !== +filters.year) return false
    if (filters.tradeType && d.TradeType !== filters.tradeType) return false
    if (filters.mode && d.Mode !== filters.mode) return false
    if (filters.state && d.State !== filters.state) return false
    if (filters.commodityGroup && d.CommodityGroup !== filters.commodityGroup) return false
    if (filters.port && d.POE !== filters.port) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Answer generators
// ---------------------------------------------------------------------------

function answerTotalTrade(data, ctx) {
  const total = sumTradeValue(data)
  const exports = sumTradeValue(data.filter((d) => d.TradeType === 'Export'))
  const imports = sumTradeValue(data.filter((d) => d.TradeType === 'Import'))
  const filterDesc = describeFilters(ctx.activeFilters)

  return `Based on the ${ctx.currentPage} data${filterDesc}, the total U.S.–Mexico trade is ${formatCurrency(total)}.\n\n` +
    `• Exports: ${formatCurrency(exports)}\n` +
    `• Imports: ${formatCurrency(imports)}\n\n` +
    `The trade balance shows a ${exports > imports ? 'surplus' : 'deficit'} of ${formatCurrency(Math.abs(exports - imports))}.`
}

function answerTopStates(data, store) {
  const stateData = store.btsUsState || data
  const byState = groupAndSum(stateData, 'State')
  const top10 = byState.slice(0, 10)

  let response = 'Here are the top 10 states by total trade with Mexico:\n\n'
  top10.forEach((s, i) => {
    response += `${i + 1}. ${s.label} — ${formatCurrency(s.value)}\n`
  })
  return response
}

function answerTopCommodities(data, store) {
  const commData = store.usAggregated || data
  const byComm = groupAndSum(commData, 'CommodityGroup')
  const top10 = byComm.slice(0, 10)

  let response = 'Here are the top 10 commodity groups in U.S.–Mexico trade:\n\n'
  top10.forEach((c, i) => {
    response += `${i + 1}. ${c.label} — ${formatCurrency(c.value)}\n`
  })
  return response
}

function answerTopPorts(store) {
  const portData = store.txBorderPorts
  if (!portData) return 'Border port data is not available.'

  const byPort = groupAndSum(portData, 'POE')
  const top10 = byPort.slice(0, 10)

  let response = 'Here are the top Texas border ports by total trade:\n\n'
  top10.forEach((p, i) => {
    response += `${i + 1}. ${p.label} — ${formatCurrency(p.value)}\n`
  })
  return response
}

function answerPortDetail(portName, store) {
  const portData = store.txBorderPorts
  if (!portData) return 'Border port data is not available.'

  const portRows = portData.filter((d) => d.POE === portName)
  if (portRows.length === 0) return `No data found for port "${portName}".`

  const total = sumTradeValue(portRows)
  const exports = sumTradeValue(portRows.filter((d) => d.TradeType === 'Export'))
  const imports = sumTradeValue(portRows.filter((d) => d.TradeType === 'Import'))
  const byMode = groupAndSum(portRows, 'Mode')
  const years = [...new Set(portRows.map((d) => d.Year))].sort()

  let response = `${portName} port trade summary (${years[0]}–${years[years.length - 1]}):\n\n`
  response += `• Total trade: ${formatCurrency(total)}\n`
  response += `• Exports: ${formatCurrency(exports)}\n`
  response += `• Imports: ${formatCurrency(imports)}\n\n`
  response += 'By transportation mode:\n'
  byMode.forEach((m) => {
    response += `• ${m.label}: ${formatCurrency(m.value)}\n`
  })
  return response
}

function answerByMode(data) {
  const byMode = groupAndSum(data, 'Mode')

  let response = 'Trade breakdown by transportation mode:\n\n'
  const total = byMode.reduce((s, m) => s + m.value, 0)
  byMode.forEach((m) => {
    const pct = total > 0 ? ((m.value / total) * 100).toFixed(1) : '0.0'
    response += `• ${m.label}: ${formatCurrency(m.value)} (${pct}%)\n`
  })
  return response
}

function answerTradeBalance(data, ctx) {
  const exports = sumTradeValue(data.filter((d) => d.TradeType === 'Export'))
  const imports = sumTradeValue(data.filter((d) => d.TradeType === 'Import'))
  const balance = exports - imports
  const filterDesc = describeFilters(ctx.activeFilters)

  return `Trade balance${filterDesc}:\n\n` +
    `• Exports: ${formatCurrency(exports)}\n` +
    `• Imports: ${formatCurrency(imports)}\n` +
    `• Balance: ${balance >= 0 ? '+' : ''}${formatCurrency(Math.abs(balance))} (${balance >= 0 ? 'surplus' : 'deficit'})\n\n` +
    `The U.S. ${balance >= 0 ? 'exports more to' : 'imports more from'} Mexico in this view.`
}

function answerTrend(data) {
  const byYear = new Map()
  data.forEach((d) => {
    if (!d.Year) return
    byYear.set(d.Year, (byYear.get(d.Year) || 0) + (d.TradeValue || 0))
  })

  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0])
  if (years.length < 2) return 'Not enough yearly data to show a trend.'

  let response = 'Year-over-year trade trend:\n\n'
  years.forEach(([year, value], i) => {
    let change = ''
    if (i > 0) {
      const prev = years[i - 1][1]
      const pct = prev > 0 ? (((value - prev) / prev) * 100).toFixed(1) : 'N/A'
      change = ` (${value >= prev ? '+' : ''}${pct}%)`
    }
    response += `• ${year}: ${formatCurrency(value)}${change}\n`
  })

  const first = years[0][1]
  const last = years[years.length - 1][1]
  const overallPct = first > 0 ? (((last - first) / first) * 100).toFixed(1) : 'N/A'
  response += `\nOverall change from ${years[0][0]} to ${years[years.length - 1][0]}: ${overallPct}%`

  return response
}

function answerTexas(store) {
  const stateData = store.btsUsState
  if (!stateData) return 'State-level data is not available.'

  const txRows = stateData.filter((d) => d.State === 'Texas')
  if (txRows.length === 0) return 'No data found for Texas.'

  const total = sumTradeValue(txRows)
  const exports = sumTradeValue(txRows.filter((d) => d.TradeType === 'Export'))
  const imports = sumTradeValue(txRows.filter((d) => d.TradeType === 'Import'))
  const byMode = groupAndSum(txRows, 'Mode')

  // Calculate Texas share of total U.S. trade
  const usTotal = sumTradeValue(stateData)
  const txShare = usTotal > 0 ? ((total / usTotal) * 100).toFixed(1) : 'N/A'

  let response = `Texas is the largest U.S. trading partner with Mexico, accounting for ${txShare}% of total trade.\n\n`
  response += `• Total Texas–Mexico trade: ${formatCurrency(total)}\n`
  response += `• Exports: ${formatCurrency(exports)}\n`
  response += `• Imports: ${formatCurrency(imports)}\n\n`
  response += 'By mode:\n'
  byMode.forEach((m) => {
    response += `• ${m.label}: ${formatCurrency(m.value)}\n`
  })
  return response
}

function answerGeneralSummary(data, ctx) {
  const total = sumTradeValue(data)
  const records = data.length
  const filterDesc = describeFilters(ctx.activeFilters)

  return `You're viewing the ${ctx.currentPage} page${filterDesc}. ` +
    `The current view contains ${records.toLocaleString()} records with a total trade value of ${formatCurrency(total)}.\n\n` +
    'You can ask me about:\n' +
    '• Total trade values and balances\n' +
    '• Top states, commodities, or border ports\n' +
    '• Trade trends over time\n' +
    '• Breakdown by transportation mode\n' +
    '• Specific port details (Laredo, El Paso, etc.)\n' +
    '• Texas trade with Mexico'
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function matchesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw))
}

function sumTradeValue(data) {
  return data.reduce((sum, d) => sum + (d.TradeValue || 0), 0)
}

function groupAndSum(data, key) {
  const map = new Map()
  data.forEach((d) => {
    const label = d[key]
    if (!label) return
    map.set(label, (map.get(label) || 0) + (d.TradeValue || 0))
  })
  return Array.from(map, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value,
  )
}

function describeFilters(filters) {
  if (!filters) return ''
  const parts = []
  if (filters.year) parts.push(`Year: ${filters.year}`)
  if (filters.tradeType) parts.push(filters.tradeType)
  if (filters.mode) parts.push(`Mode: ${filters.mode}`)
  if (filters.state) parts.push(`State: ${filters.state}`)
  if (filters.commodityGroup) parts.push(`Commodity: ${filters.commodityGroup}`)
  if (filters.port) parts.push(`Port: ${filters.port}`)
  return parts.length > 0 ? ` (filtered by ${parts.join(', ')})` : ''
}

function extractFiltersFromQuestion(q) {
  const filters = {}

  // Extract year (4-digit number between 2013-2025)
  const yearMatch = q.match(/\b(201[3-9]|202[0-5])\b/)
  if (yearMatch) filters.year = yearMatch[1]

  // Extract trade type
  if (/\bexports?\b/.test(q) && !/\bimports?\b/.test(q)) filters.tradeType = 'Export'
  if (/\bimports?\b/.test(q) && !/\bexports?\b/.test(q)) filters.tradeType = 'Import'

  // Extract mode
  if (/\btruck\b/.test(q)) filters.mode = 'Truck'
  if (/\brail\b/.test(q)) filters.mode = 'Rail'
  if (/\bvessel\b/.test(q)) filters.mode = 'Vessel'
  if (/\bair\b/.test(q)) filters.mode = 'Air'

  return filters
}
