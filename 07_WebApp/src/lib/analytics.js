/**
 * analytics.js — Centralized Google Analytics 4 event helpers
 * -----------------------------------------------------------
 * Thin wrappers around window.gtag() so tracking calls are
 * consistent and easy to grep for across the codebase.
 * All functions are no-ops when GA4 is not loaded.
 */

function gtag(...args) {
  if (window.gtag) window.gtag(...args)
}

/** Page-title map for hash-based routes */
const PAGE_TITLES = {
  '/': 'Overview',
  '/texas-domestic': 'Texas Domestic',
  '/texas-international': 'Texas International',
  '/us-mexico': 'U.S.–Mexico',
  '/texas-mexico': 'Texas–Mexico',
  '/about-data': 'About the Data',
}

const SITE_TITLE = 'Airport Connectivity Dashboard | TxDOT'

/**
 * Send a page_view event and update the document title.
 * Called from ScrollToTop on every route change.
 */
export function trackPageView(pathname) {
  const pageTitle = PAGE_TITLES[pathname] || 'Page'
  document.title = `${pageTitle} – ${SITE_TITLE}`
  gtag('event', 'page_view', {
    page_path: pathname,
    page_title: document.title,
  })
}

/** Track tab switches (e.g. Texas–Mexico sub-tabs) */
export function trackTabSwitch(tabKey, tabLabel, pagePath) {
  gtag('event', 'tab_switch', {
    tab_key: tabKey,
    tab_label: tabLabel,
    page_path: pagePath,
  })
}

/** Track filter changes */
export function trackFilter(filterKey, filterValue) {
  // Normalize arrays to comma-separated strings for GA4
  const value = Array.isArray(filterValue)
    ? filterValue.join(', ')
    : filterValue || '(all)'
  gtag('event', 'filter_change', {
    filter_key: filterKey,
    filter_value: value,
  })
}

/** Track filter reset (clear all) */
export function trackFilterReset() {
  gtag('event', 'filter_reset')
}

/** Track CSV download */
export function trackDownload(chartTitle, downloadType) {
  gtag('event', 'download_csv', {
    chart_title: chartTitle || '(page-level)',
    download_type: downloadType,
  })
}

/** Track PNG export */
export function trackExportPng(chartTitle) {
  gtag('event', 'export_png', {
    chart_title: chartTitle || 'chart',
  })
}

/** Track fullscreen toggle */
export function trackFullscreen(chartTitle) {
  gtag('event', 'fullscreen_chart', {
    chart_title: chartTitle || 'chart',
  })
}

/** Track map airport click */
export function trackMapClick(airportCode, action) {
  gtag('event', 'map_airport_click', {
    airport_code: airportCode,
    action: action,
  })
}
