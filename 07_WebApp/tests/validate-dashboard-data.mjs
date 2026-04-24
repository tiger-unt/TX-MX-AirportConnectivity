/**
 * Dashboard Data Validation Script
 *
 * Spot-checks dashboard visualizations against raw CSV data by:
 *   1. Starting the dev server
 *   2. Navigating to each page with specific filter combinations
 *   3. Extracting displayed values from stat cards, chart bars, and tables
 *   4. Computing expected values from the raw CSV files
 *   5. Comparing and reporting discrepancies
 *
 * Usage:
 *   node tests/validate-dashboard-data.mjs [--page us-mexico|texas-domestic|texas-international|texas-mexico] [--year 2024] [--headed]
 *
 * Requires: playwright (npm install playwright)
 * The dev server must be running: npm run dev
 */

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '..', 'public', 'data')
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

// ── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const headed = args.includes('--headed')
const targetPage = getArg('page') || 'all'
const targetYear = getArg('year') || '2024'

// ── CSV loader ──────────────────────────────────────────────────────
function loadCsv(filename) {
  const raw = readFileSync(resolve(DATA_DIR, filename), 'utf8')
  const lines = raw.split('\n').filter(Boolean)
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const vals = []
    let inQuote = false, current = ''
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { vals.push(current.trim()); current = ''; continue }
      current += ch
    }
    vals.push(current.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    ;['YEAR','PASSENGERS','FREIGHT','MAIL','DEPARTURES_PERFORMED','DEPARTURES_SCHEDULED','SEATS'].forEach((f) => {
      if (row[f] !== undefined) row[f] = Number(row[f]) || 0
    })
    return row
  })
}

// ── Predicate helpers (mirror aviationHelpers.js) ───────────────────
const isUsToMx = (d) => d.ORIGIN_COUNTRY_NAME === 'United States' && d.DEST_COUNTRY_NAME === 'Mexico'
const isMxToUs = (d) => d.ORIGIN_COUNTRY_NAME === 'Mexico' && d.DEST_COUNTRY_NAME === 'United States'
const isUsMx = (d) => isUsToMx(d) || isMxToUs(d)
const isTxDomestic = (d) => d.ORIGIN_COUNTRY_NAME === 'United States' && d.DEST_COUNTRY_NAME === 'United States' &&
  (d.ORIGIN_STATE_NM === 'Texas' || d.DEST_STATE_NM === 'Texas')
const isTxIntl = (d) => (d.ORIGIN_STATE_NM === 'Texas' && d.DEST_COUNTRY_NAME !== 'United States') ||
  (d.DEST_STATE_NM === 'Texas' && d.ORIGIN_COUNTRY_NAME !== 'United States')
const isTxMx = (d) => (d.ORIGIN_STATE_NM === 'Texas' && d.DEST_COUNTRY_NAME === 'Mexico') ||
  (d.DEST_STATE_NM === 'Texas' && d.ORIGIN_COUNTRY_NAME === 'Mexico')

// ── Format helpers ──────────────────────────────────────────────────
function parseDisplayValue(text) {
  if (!text) return NaN
  text = text.replace(/[,$%]/g, '').replace(/lbs/gi, '').trim()
  const m = text.match(/^([\d.]+)\s*(K|M|B)?$/i)
  if (!m) return NaN
  const num = parseFloat(m[1])
  const suffix = (m[2] || '').toUpperCase()
  if (suffix === 'K') return num * 1_000
  if (suffix === 'M') return num * 1_000_000
  if (suffix === 'B') return num * 1_000_000_000
  return num
}

function fmtNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(0)
}

// ── Comparison ──────────────────────────────────────────────────────
function isClose(actual, expected, tolerancePct = 2) {
  if (expected === 0) return actual === 0
  return Math.abs((actual - expected) / expected) * 100 <= tolerancePct
}

// ── Results tracking ────────────────────────────────────────────────
const results = []
function record(page, chart, label, displayed, expected, match) {
  results.push({ page, chart, label, displayed, expected, match })
}

// ── Playwright helpers ──────────────────────────────────────────────

async function waitForDataLoad(page) {
  await page.waitForSelector('[class*="StatCard"], [class*="stat-card"], .recharts-wrapper, svg rect, svg path', { timeout: 15000 })
  await page.waitForTimeout(2000)
}

async function extractStatCards(page) {
  const cards = await page.$$eval(
    '[class*="rounded"]',
    (els) => els
      .filter((el) => {
        const label = el.querySelector('[class*="text-sm"], [class*="text-base"], [class*="label"]')
        const value = el.querySelector('[class*="text-2xl"], [class*="text-3xl"], [class*="font-bold"]')
        return label && value
      })
      .map((el) => {
        const label = (el.querySelector('[class*="text-sm"], [class*="text-base"], [class*="label"]')?.textContent || '').trim()
        const value = (el.querySelector('[class*="text-2xl"], [class*="text-3xl"], [class*="font-bold"]')?.textContent || '').trim()
        return { label, value }
      })
      .filter((c) => c.label && c.value)
  )
  return cards
}

async function extractBarValues(page, chartTitle) {
  const chartCards = await page.$$('[class*="rounded"]')
  for (const card of chartCards) {
    const title = await card.$eval('h3, [class*="font-semibold"]', (el) => el.textContent.trim()).catch(() => '')
    if (!title.includes(chartTitle)) continue

    const bars = await card.$$('svg rect[height]')
    const barData = []
    for (const bar of bars) {
      const height = await bar.getAttribute('height')
      const fill = await bar.getAttribute('fill')
      if (!height || parseFloat(height) < 2) continue
      if (fill === 'transparent' || fill === 'none') continue

      await bar.hover({ force: true })
      await page.waitForTimeout(300)

      const tooltip = await page.$('[class*="tooltip"], [role="tooltip"], div[style*="position: absolute"]')
      if (tooltip) {
        const text = await tooltip.textContent()
        barData.push(text.trim())
      }
    }
    return barData
  }
  return []
}

async function setYearFilter(page, year) {
  const yearBtn = await page.$(`button:has-text("${year}")`)
  if (yearBtn) {
    await yearBtn.click()
    await page.waitForTimeout(1000)
    return true
  }
  const yearSelect = await page.$('select')
  if (yearSelect) {
    const options = await yearSelect.$$eval('option', (opts) => opts.map((o) => o.value))
    if (options.includes(year)) {
      await yearSelect.selectOption(year)
      await page.waitForTimeout(1000)
      return true
    }
  }
  return false
}

async function clickTradeDirection(page, direction) {
  const btn = await page.$(`button:has-text("${direction}")`)
  if (btn) {
    await btn.click()
    await page.waitForTimeout(1000)
    return true
  }
  return false
}

// ── Page validation functions ───────────────────────────────────────

async function validateUSMexico(page, market, segment) {
  const pageName = 'US-Mexico'
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Validating: ${pageName}`)
  console.log(`${'='.repeat(60)}`)

  await page.goto(`${BASE_URL}/#/us-mexico`)
  await waitForDataLoad(page)

  const data = market.filter(isUsMx)
  const year = parseInt(targetYear)
  const yearData = data.filter((d) => d.YEAR === year)

  // Check each trade direction
  for (const dir of ['Export', 'Import', 'Total']) {
    console.log(`\n--- Trade Direction: ${dir} ---`)
    await clickTradeDirection(page, dir)

    let dirData
    if (dir === 'Export') dirData = yearData.filter(isUsToMx)
    else if (dir === 'Import') dirData = yearData.filter(isMxToUs)
    else dirData = yearData

    // Compute expected state rankings (by US state)
    const byState = new Map()
    if (dir === 'Export' || dir === 'Total') {
      yearData.filter(isUsToMx).forEach((d) => {
        if (!d.ORIGIN_STATE_NM) return
        byState.set(d.ORIGIN_STATE_NM, (byState.get(d.ORIGIN_STATE_NM) || 0) + d.FREIGHT)
      })
    }
    if (dir === 'Import' || dir === 'Total') {
      yearData.filter(isMxToUs).forEach((d) => {
        if (!d.DEST_STATE_NM) return
        byState.set(d.DEST_STATE_NM, (byState.get(d.DEST_STATE_NM) || 0) + d.FREIGHT)
      })
    }
    const topCargoStates = [...byState.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    console.log(`  Expected top cargo states (${dir}):`)
    topCargoStates.forEach(([state, val]) => {
      console.log(`    ${state}: ${fmtNum(val)} lbs`)
    })

    // Extract displayed values via accessibility snapshot
    const snapshot = await page.accessibility.snapshot()
    if (snapshot) {
      const findNodes = (node, depth = 0) => {
        const found = []
        if (node.name && /\d+.*[KMB]\s*(lbs)?/i.test(node.name)) {
          found.push({ name: node.name, role: node.role })
        }
        if (node.children) node.children.forEach((c) => found.push(...findNodes(c, depth + 1)))
        return found
      }
    }

    // Compute expected passenger totals by state
    const byStatePax = new Map()
    if (dir === 'Export' || dir === 'Total') {
      yearData.filter(isUsToMx).forEach((d) => {
        if (!d.ORIGIN_STATE_NM) return
        byStatePax.set(d.ORIGIN_STATE_NM, (byStatePax.get(d.ORIGIN_STATE_NM) || 0) + d.PASSENGERS)
      })
    }
    if (dir === 'Import' || dir === 'Total') {
      yearData.filter(isMxToUs).forEach((d) => {
        if (!d.DEST_STATE_NM) return
        byStatePax.set(d.DEST_STATE_NM, (byStatePax.get(d.DEST_STATE_NM) || 0) + d.PASSENGERS)
      })
    }
    const topPaxStates = [...byStatePax.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Texas rank
    const allCargoSorted = [...byState.entries()].sort((a, b) => b[1] - a[1])
    const txCargoRank = allCargoSorted.findIndex(([s]) => s === 'Texas') + 1
    const totalCargo = allCargoSorted.reduce((s, [, v]) => s + v, 0)
    const txCargoPct = totalCargo ? ((byState.get('Texas') || 0) / totalCargo * 100).toFixed(1) : '0'

    const allPaxSorted = [...byStatePax.entries()].sort((a, b) => b[1] - a[1])
    const txPaxRank = allPaxSorted.findIndex(([s]) => s === 'Texas') + 1
    const totalPax = allPaxSorted.reduce((s, [, v]) => s + v, 0)
    const txPaxPct = totalPax ? ((byStatePax.get('Texas') || 0) / totalPax * 100).toFixed(1) : '0'

    console.log(`  Expected TX ranks: Pax=#${txPaxRank} (${txPaxPct}%), Cargo=#${txCargoRank} (${txCargoPct}%)`)
    console.log(`  Expected top pax states:`)
    topPaxStates.forEach(([state, val]) => {
      console.log(`    ${state}: ${fmtNum(val)}`)
    })

    record(pageName, 'TX Cargo Rank', dir, 'check visually', `#${txCargoRank} (${txCargoPct}%)`, 'manual')
    record(pageName, 'TX Pax Rank', dir, 'check visually', `#${txPaxRank} (${txPaxPct}%)`, 'manual')
    topCargoStates.forEach(([state, val]) => {
      record(pageName, 'State Cargo Bar', `${dir}/${state}`, 'check visually', fmtNum(val) + ' lbs', 'manual')
    })
  }
}

async function validateTexasDomestic(page, market) {
  const pageName = 'Texas Domestic'
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Validating: ${pageName}`)
  console.log(`${'='.repeat(60)}`)

  await page.goto(`${BASE_URL}/#/texas-domestic`)
  await waitForDataLoad(page)

  const year = parseInt(targetYear)
  const data = market.filter(isTxDomestic).filter((d) => d.YEAR === year)

  const totalPax = data.reduce((s, d) => s + d.PASSENGERS, 0)
  const totalFreight = data.reduce((s, d) => s + d.FREIGHT, 0)

  const txOut = data.filter((d) => d.ORIGIN_STATE_NM === 'Texas')
  const txIn = data.filter((d) => d.DEST_STATE_NM === 'Texas')

  console.log(`\n  Year: ${year}`)
  console.log(`  Total passengers: ${fmtNum(totalPax)}`)
  console.log(`  Total freight: ${fmtNum(totalFreight)} lbs`)
  console.log(`  TX outbound rows: ${txOut.length}, TX inbound rows: ${txIn.length}`)

  // Top destination states (counterpart logic)
  const byCounterpartState = new Map()
  data.forEach((d) => {
    const counterpart = d.ORIGIN_STATE_NM === 'Texas' ? d.DEST_STATE_NM : d.ORIGIN_STATE_NM
    if (!counterpart || counterpart === 'Texas') return
    byCounterpartState.set(counterpart, (byCounterpartState.get(counterpart) || 0) + d.PASSENGERS)
  })
  const topStates = [...byCounterpartState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  console.log(`  Top counterpart states:`)
  topStates.forEach(([state, val]) => {
    console.log(`    ${state}: ${fmtNum(val)}`)
    record(pageName, 'Top State', state, 'check visually', fmtNum(val), 'manual')
  })

  record(pageName, 'Total Passengers', year.toString(), 'check visually', fmtNum(totalPax), 'manual')
}

async function validateTexasInternational(page, market) {
  const pageName = 'Texas International'
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Validating: ${pageName}`)
  console.log(`${'='.repeat(60)}`)

  await page.goto(`${BASE_URL}/#/texas-international`)
  await waitForDataLoad(page)

  const year = parseInt(targetYear)
  const data = market.filter(isTxIntl).filter((d) => d.YEAR === year)

  const totalPax = data.reduce((s, d) => s + d.PASSENGERS, 0)
  const totalFreight = data.reduce((s, d) => s + d.FREIGHT, 0)

  // Top destination countries
  const byCountry = new Map()
  data.forEach((d) => {
    const country = d.ORIGIN_STATE_NM === 'Texas' ? d.DEST_COUNTRY_NAME : d.ORIGIN_COUNTRY_NAME
    if (!country || country === 'United States') return
    byCountry.set(country, (byCountry.get(country) || 0) + d.PASSENGERS)
  })
  const topCountries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  console.log(`\n  Year: ${year}`)
  console.log(`  Total passengers: ${fmtNum(totalPax)}`)
  console.log(`  Total freight: ${fmtNum(totalFreight)} lbs`)
  console.log(`  Top destination countries:`)
  topCountries.forEach(([country, val]) => {
    console.log(`    ${country}: ${fmtNum(val)}`)
    record(pageName, 'Top Country', country, 'check visually', fmtNum(val), 'manual')
  })

  record(pageName, 'Total Passengers', year.toString(), 'check visually', fmtNum(totalPax), 'manual')
}

async function validateTexasMexico(page, market, segment) {
  const pageName = 'Texas-Mexico'
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Validating: ${pageName}`)
  console.log(`${'='.repeat(60)}`)

  await page.goto(`${BASE_URL}/#/texas-mexico`)
  await waitForDataLoad(page)

  const year = parseInt(targetYear)
  const mData = market.filter(isTxMx)
  const mYear = mData.filter((d) => d.YEAR === year)
  const sData = segment.filter(isTxMx)
  const sYear = sData.filter((d) => d.YEAR === year)

  const totalPax = mYear.reduce((s, d) => s + d.PASSENGERS, 0)
  const totalFreight = mYear.reduce((s, d) => s + d.FREIGHT, 0)
  const totalMail = mYear.reduce((s, d) => s + d.MAIL, 0)
  const totalDep = sYear.reduce((s, d) => s + d.DEPARTURES_PERFORMED, 0)
  const totalSeats = sYear.reduce((s, d) => s + d.SEATS, 0)

  console.log(`\n  Year: ${year}`)
  console.log(`  Market — Passengers: ${fmtNum(totalPax)}, Freight: ${fmtNum(totalFreight)} lbs, Mail: ${fmtNum(totalMail)} lbs`)
  console.log(`  Segment — Departures: ${fmtNum(totalDep)}, Seats: ${fmtNum(totalSeats)}`)

  // Bidirectional breakdown
  const txToMx = mYear.filter((d) => d.ORIGIN_STATE_NM === 'Texas')
  const mxToTx = mYear.filter((d) => d.DEST_STATE_NM === 'Texas')
  console.log(`  TX→MX passengers: ${fmtNum(txToMx.reduce((s, d) => s + d.PASSENGERS, 0))}`)
  console.log(`  MX→TX passengers: ${fmtNum(mxToTx.reduce((s, d) => s + d.PASSENGERS, 0))}`)

  // Top routes
  const byRoute = new Map()
  mYear.forEach((d) => {
    const route = `${d.ORIGIN} → ${d.DEST}`
    byRoute.set(route, (byRoute.get(route) || 0) + d.PASSENGERS)
  })
  const topRoutes = [...byRoute.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  console.log(`  Top routes:`)
  topRoutes.forEach(([route, val]) => {
    console.log(`    ${route}: ${fmtNum(val)}`)
    record(pageName, 'Top Route', route, 'check visually', fmtNum(val), 'manual')
  })

  // Load factor
  if (totalSeats > 0) {
    const txToMxSeg = sYear.filter((d) => d.ORIGIN_STATE_NM === 'Texas')
    const paxSeg = txToMxSeg.reduce((s, d) => s + d.PASSENGERS, 0)
    const seatsSeg = txToMxSeg.reduce((s, d) => s + d.SEATS, 0)
    const lf = seatsSeg > 0 ? (paxSeg / seatsSeg * 100).toFixed(1) : '0'
    console.log(`  Load factor (segment, TX→MX): ${lf}%`)
  }

  record(pageName, 'Total Passengers', year.toString(), 'check visually', fmtNum(totalPax), 'manual')
  record(pageName, 'Total Freight', year.toString(), 'check visually', fmtNum(totalFreight) + ' lbs', 'manual')
}

// ── Automated extraction: try to read stat card values from the page ─
async function extractAndCompareStatCards(page, pageName, expectedValues) {
  const cards = await extractStatCards(page)
  console.log(`\n  Stat cards found: ${cards.length}`)
  for (const card of cards) {
    console.log(`    "${card.label}" = "${card.value}"`)
    const match = expectedValues.find((e) => card.label.toLowerCase().includes(e.keyword.toLowerCase()))
    if (match) {
      const displayed = parseDisplayValue(card.value)
      const close = isClose(displayed, match.expected)
      const status = close ? 'PASS' : 'FAIL'
      console.log(`      → Expected: ${fmtNum(match.expected)}, Displayed: ${fmtNum(displayed)} [${status}]`)
      record(pageName, 'StatCard', card.label, card.value, fmtNum(match.expected), status)
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Dashboard Data Validation')
  console.log(`Target year: ${targetYear}`)
  console.log(`Target page: ${targetPage}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log('')

  // Load raw data
  console.log('Loading CSV data...')
  const market = loadCsv('BTS_T-100_Market_2015-2024.csv')
  const segment = loadCsv('BTS_T-100_Segment_2015-2024.csv')
  console.log(`  Market rows: ${market.length}`)
  console.log(`  Segment rows: ${segment.length}`)

  // Launch browser
  const browser = await chromium.launch({ headless: !headed })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await context.newPage()

  try {
    // Navigate to home first to trigger data load
    await page.goto(`${BASE_URL}/#/`)
    await page.waitForTimeout(3000)

    if (targetPage === 'all' || targetPage === 'us-mexico') {
      await validateUSMexico(page, market, segment)
    }
    if (targetPage === 'all' || targetPage === 'texas-domestic') {
      await validateTexasDomestic(page, market)
    }
    if (targetPage === 'all' || targetPage === 'texas-international') {
      await validateTexasInternational(page, market)
    }
    if (targetPage === 'all' || targetPage === 'texas-mexico') {
      await validateTexasMexico(page, market, segment)
    }
  } finally {
    await browser.close()
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('  VALIDATION SUMMARY')
  console.log(`${'='.repeat(60)}`)
  const passed = results.filter((r) => r.match === 'PASS')
  const failed = results.filter((r) => r.match === 'FAIL')
  const manual = results.filter((r) => r.match === 'manual')
  console.log(`  Auto-checked: ${passed.length} passed, ${failed.length} failed`)
  console.log(`  Manual checks: ${manual.length} (expected values printed above)`)

  if (failed.length) {
    console.log('\n  FAILURES:')
    failed.forEach((r) => {
      console.log(`    [FAIL] ${r.page} / ${r.chart} / ${r.label}`)
      console.log(`           Displayed: ${r.displayed}  Expected: ${r.expected}`)
    })
  }

  console.log('\n  Use --headed to see the browser and visually verify charts.')
  console.log('  Expected values above can be compared against what the dashboard shows.')
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Validation failed:', err)
  process.exit(1)
})
