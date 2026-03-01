/**
 * visual-check.js — Playwright-based visual & functional check for all dashboard pages.
 *
 * Usage:  node scripts/visual-check.js [baseUrl] [--screenshots]
 *
 * Defaults:
 *   baseUrl      http://localhost:5173
 *   --screenshots  Save PNGs to scripts/screenshots/
 *
 * Checks performed per route:
 *   • Page loads without JS errors (pageerror events)
 *   • React error-boundary warnings in console
 *   • Body has meaningful content (> 50 chars)
 *   • Expected text appears on the page
 *   • Sidebar (aside) is present on data pages
 *   • No broken images (naturalWidth === 0)
 *   • No network request failures (4xx/5xx on same origin)
 *   • Optional: saves a full-page screenshot
 */

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import process from 'process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const baseArg = argv.find((arg) => !arg.startsWith('--'))
const outDirIndex = argv.indexOf('--out-dir')
const outDirArg = outDirIndex >= 0 ? argv[outDirIndex + 1] : null

const BASE = baseArg || 'http://localhost:5173'
const SAVE_SCREENSHOTS = argv.includes('--screenshots')
const OUT_DIR = outDirArg ? path.resolve(outDirArg) : path.join(__dirname, 'screenshots')

const ROUTES = [
  { path: '/',                expect: 'U.S.–Mexico Trade Dashboard', hasSidebar: false },
  { path: '/trade-by-state',  expect: 'U.S. Trade by State',        hasSidebar: true  },
  { path: '/commodities',     expect: 'Trade by Commodity',          hasSidebar: true  },
  { path: '/trade-by-mode',   expect: 'Transportation Mode',         hasSidebar: true  },
  { path: '/border-ports',    expect: 'Border Ports',                hasSidebar: true  },
]

;
(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  if (SAVE_SCREENSHOTS) {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  let totalPass = 0
  let totalFail = 0
  const results = []

  for (const route of ROUTES) {
    const page = await context.newPage()
    const pageErrors = []
    const consoleWarnings = []
    const failedRequests = []

    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        consoleWarnings.push(msg.text())
      }
    })
    page.on('response', res => {
      const url = res.url()
      if (url.startsWith(BASE) && res.status() >= 400) {
        failedRequests.push(`${res.status()} ${url}`)
      }
    })

    const checks = []
    const pass = (label) => { checks.push({ ok: true, label }); totalPass++ }
    const fail = (label, detail) => { checks.push({ ok: false, label, detail }); totalFail++ }

    try {
      await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 15000 })
      // Extra wait for async data + D3 renders
      await page.waitForTimeout(2500)

      // 1. JS errors
      if (pageErrors.length === 0) pass('No JS errors')
      else fail('JS errors', pageErrors.join('; '))

      // 2. React error boundary warnings
      const reactErrors = consoleWarnings.filter(w => w.includes('error boundary') || w.includes('An error occurred'))
      if (reactErrors.length === 0) pass('No React render errors')
      else fail('React render errors', reactErrors.join('; '))

      // 3. Page has content
      const bodyText = await page.textContent('body')
      if (bodyText.length > 50) pass(`Page has content (${bodyText.length} chars)`)
      else fail('Page empty or minimal', `Only ${bodyText.length} chars`)

      // 4. Expected text
      if (bodyText.includes(route.expect)) pass(`Contains "${route.expect}"`)
      else fail(`Missing expected text "${route.expect}"`)

      // 5. Sidebar
      const sidebarCount = await page.locator('aside').count()
      if (route.hasSidebar) {
        if (sidebarCount > 0) pass('Sidebar present')
        else fail('Sidebar missing')
      } else {
        pass('Sidebar N/A (home)')
      }

      // 6. Nav links
      const navLinks = await page.locator('nav a').count()
      if (navLinks >= 5) pass(`Nav has ${navLinks} links`)
      else fail('Nav links missing', `Only ${navLinks} found`)

      // 7. Broken images
      const brokenImgs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          .filter(img => img.complete && img.naturalWidth === 0)
          .map(img => img.src)
      })
      if (brokenImgs.length === 0) pass('No broken images')
      else fail('Broken images', brokenImgs.join(', '))

      // 8. Failed network requests
      if (failedRequests.length === 0) pass('No failed network requests')
      else fail('Failed requests', failedRequests.join('; '))

      // 9. Charts rendered (SVGs with content)
      if (route.path !== '/') {
        const svgCount = await page.locator('svg').count()
        if (svgCount >= 2) pass(`${svgCount} SVG charts rendered`)
        else fail('Few/no charts rendered', `Only ${svgCount} SVGs`)
      }

      // Screenshot
      if (SAVE_SCREENSHOTS) {
        const name = route.path === '/' ? 'home' : route.path.replace(/\//g, '')
        await page.screenshot({
          path: path.join(OUT_DIR, `${name}.png`),
          fullPage: true,
        })
        pass(`Screenshot saved: ${name}.png`)
      }

    } catch (err) {
      fail('Page load failed', err.message)
    }

    results.push({ route: route.path, checks })
    await page.close()
  }

  // --- Report ---
  console.log('\n========================================')
  console.log('  VISUAL CHECK REPORT')
  console.log('========================================\n')

  for (const r of results) {
    const fails = r.checks.filter(c => !c.ok)
    const icon = fails.length === 0 ? 'PASS' : 'FAIL'
    console.log(`${icon}  ${r.route}`)
    for (const c of r.checks) {
      const mark = c.ok ? '  [ok]' : '  [FAIL]'
      console.log(`${mark} ${c.label}${c.detail ? ' — ' + c.detail : ''}`)
    }
    console.log('')
  }

  console.log('----------------------------------------')
  console.log(`  Total: ${totalPass} passed, ${totalFail} failed`)
  console.log('----------------------------------------\n')

  await browser.close()
  process.exit(totalFail > 0 ? 1 : 0)
})().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(2)
})
