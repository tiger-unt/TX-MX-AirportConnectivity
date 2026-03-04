# Web App Review: Storytelling and Data Visualization Risks

## Findings (Bugs/Risks First)

- **High — Cross-page `direction` filter can become stale/misleading**
  - `direction` is a single string in global store, but pruning only handles array filters. If you select `TX_TO_US` on one page, then switch to a page expecting `TX_TO_INTL`, data may be unfiltered while the UI still shows an active direction tag (sometimes mislabeled).

```js
// 07_WebApp/src/lib/useCascadingFilters.js
for (const [key, extractor] of Object.entries(exts)) {
  const selected = filters[key]
  if (!Array.isArray(selected) || !selected.length) continue
  if (!pools[key]) continue
  const validSet = new Set(pools[key].map(extractor).filter(Boolean))
  const pruned = selected.filter((v) => validSet.has(v))
  if (pruned.length !== selected.length) {
    updates[key] = pruned
  }
}
```

```js
// 07_WebApp/src/pages/TexasInternational/index.jsx
if (filters.direction === 'TX_TO_INTL') data = data.filter(isTxToIntl)
if (filters.direction === 'INTL_TO_TX') data = data.filter(isIntlToTx)
```

```js
// 07_WebApp/src/pages/TexasInternational/index.jsx
label: filters.direction === 'TX_TO_INTL' ? 'Texas → International' : 'International → Texas',
onRemove: () => setFilter('direction', ''),
```

---

- **High — Texas Domestic “destination” story is inconsistent with the data logic**
  - The page copy says “Texas and other U.S. states,” but predicates include all U.S. destinations (including Texas), and “Top Destination States from Texas” uses `DEST_STATE_NM` on bidirectional data, which can over-emphasize Texas.

```js
// 07_WebApp/src/lib/aviationHelpers.js
export const isTxToUs = (d) =>
  isTxOrigin(d) && d.DEST_COUNTRY_NAME === 'United States'

export const isUsToTx = (d) =>
  isTxDest(d) && d.ORIGIN_COUNTRY_NAME === 'United States'

export const isTxDomestic = (d) => isTxToUs(d) || isUsToTx(d)
```

```js
// 07_WebApp/src/pages/TexasDomestic/index.jsx
const byState = new Map()
filtered.forEach((d) => {
  if (!d.DEST_STATE_NM) return
  byState.set(d.DEST_STATE_NM, (byState.get(d.DEST_STATE_NM) || 0) + d.PASSENGERS)
})
```

```js
// 07_WebApp/src/pages/TexasDomestic/index.jsx
title="Top Destination States from Texas"
subtitle="Total passengers (all filtered years)"
...
<BarChart data={topStates} xKey="label" yKey="value" horizontal formatValue={fmtCompact} />
```

  - CSV sanity check: in 2024, bidirectional `DEST_STATE_NM` ranking is dominated by Texas (`103,735,415`), which can distort “from Texas” interpretation.

---

- **Medium — Scatter bubble size uses mixed units (`Passengers + Freight`)**
  - Bubble size is currently a sum of people + pounds, which is not physically meaningful and heavily dominated by freight-heavy airports.

```js
// 07_WebApp/src/pages/TexasMexico/index.jsx
return Array.from(byAirport.values())
  .map((r) => ({
    ...
    TotalActivity: r.Passengers + r.Freight,
  }))
```

```js
// 07_WebApp/src/pages/TexasMexico/tabs/CargoTradeTab.jsx
<ScatterPlot
  data={borderSummaryTable}
  xKey="Passengers"
  yKey="Freight"
  ...
  sizeKey="TotalActivity"
```

  - Data check confirms distortion: some airports have freight/passenger ratios in the hundreds to >1000x, so bubble area mostly tracks freight, not “total activity.”

---

- **Medium — Schedule adherence percentages are row-weighted, not departure-weighted**
  - The chart labels imply departure-level adherence, but the function computes percentages by record count.

```js
// 07_WebApp/src/lib/aviationHelpers.js
const total = scheduled.length
...
for (const d of scheduled) {
  const diff = d.DEPARTURES_PERFORMED - d.DEPARTURES_SCHEDULED
  if (diff === 0) buckets['Exact match']++
  ...
}
return Object.entries(buckets)
  .map(([label, count]) => ({ label, value: +((count / total) * 100).toFixed(1) }))
```

```js
// 07_WebApp/src/pages/TexasMexico/tabs/OperationsCapacityTab.jsx
title="Schedule Adherence"
subtitle="Performed vs scheduled departures (Class F, scheduled service)"
```

  - Quick TX-MX segment check showed large divergence between record-% and departure-weighted-% (for example, “Exact match” share differs substantially).

---

- **Low — Narrative duplication**
  - `Passengers vs Freight` scatter appears in both `CargoTradeTab` and `BorderAirportsTab` with nearly identical setup, which dilutes story progression.

## Storytelling / Organization Improvements

- **Tighten chapter intent per tab**
  - Keep one “hero insight” chart per tab and move supporting diagnostics below it; this improves scanability and reduces cognitive load.
- **Remove/reframe duplicated scatter**
  - Keep it in one tab, and in the other replace with a complementary view (for example, border-only trend, corridor concentration, or rank-change chart).
- **Make direction framing explicit in every section**
  - If both directions are included, label as “bidirectional totals”; if directional, encode left/right consistently (not just in legends).
- **Add “so what” callouts above chart groups**
  - 1–2 sentence key takeaway cards (dynamic with filters) improve narrative clarity for non-technical audiences.
- **Standardize metric semantics in subtitles**
  - Explicitly state whether each chart is row-based, departure-weighted, market, or segment to avoid interpretation drift.

## Residual Risks / Gaps

- No automated tests around filter semantics and aggregation helpers (`useCascadingFilters`, counterpart-state logic, adherence calculations), so these issues are easy to reintroduce.
- Build is successful (`vite build` passes), so these are logic/story correctness issues rather than compile/runtime breaks.

## Suggested Fix Pass

1. Direction filter sanitization across page transitions.
2. Domestic counterpart-state logic for state ranking.
3. Bubble size normalization (single-unit or normalized index).
4. Explicit choice between row-weighted vs departure-weighted adherence reporting.
