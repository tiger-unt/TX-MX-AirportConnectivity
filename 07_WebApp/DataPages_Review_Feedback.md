# Data Pages Review & Feedback: Airport Connectivity Dashboard

This document outlines structural, narrative, and design feedback for the four primary data pages: **Texas Domestic**, **Texas International**, **U.S.–Mexico**, and **Texas–Mexico**.

## 1. Global Observations (Applicable to All Data Pages)

**What’s Working Well:**
*   **Filter Persistence:** Resetting stale `direction` filters across page navigations (`useEffect`) is a smart detail that prevents zero-data states when jumping between contexts.
*   **Insight Callouts:** The dynamically computed insights (e.g., COVID recovery percentage, hub concentration, state rankings) are fantastic. They do the analytical heavy lifting for the user.
*   **Consistent Layouts:** The uniform structure (`Hero` → `Intro/Insights` → `KPIs` → `Visualizations`) creates a very predictable and comfortable user experience.

**Areas for Improvement:**
*   **Empty States on Heavy Filtering:** If a user applies aggressive filters (e.g., a specific small carrier + a specific small airport), the charts might render blank or empty. Adding a standard "No data matches these filters" overlay or text for empty charts would improve the UX.
*   **Dynamic Hero Text:** The hero descriptions are static. It would be a nice touch to make them slightly dynamic. If the user filters down to a specific year or carrier, appending something like *"Showing filtered results for [Carrier] in [Year]"* below the main hero text could remind them why the numbers look different.

---

## 2. Texas Domestic (`/texas-domestic`)

*   **Schedule Adherence Fallback:** The "Schedule Adherence" chart explains that it only uses U.S. carriers. Because of cabotage laws, domestic flights are entirely U.S. carriers anyway. However, if a user filters to `Class G` (Cargo) or `Class L/P` (Charter), the schedule adherence chart will be empty. 
    *   *Recommendation:* Wrap the entire "Schedule Adherence" `SectionBlock` in a conditional check so it completely hides itself if the active `serviceClass` filter excludes `F` (Scheduled).
*   **Map Framing:** The `AirportMap` uses a hardcoded `center={[32, -99]}` and `zoom={5}`. For domestic flights reaching Alaska and Hawaii, this cuts them off. 
    *   *Recommendation:* Pass the `fitToAirports={true}` prop (which is built into your `AirportMap` component) so the map automatically frames the lower 48 or extends to AK/HI if those routes are present.

---

## 3. Texas International (`/texas-international`)

*   **Global Map Framing:** Similar to the domestic page, the map is hardcoded to `center={[25, -90]}` and `zoom={4}`. Texas has direct flights to Europe, Asia, and the Middle East, which are entirely off-screen on load.
    *   *Recommendation:* Use `fitToAirports={true}` so the Leaflet map automatically calculates the bounding box of all international destinations and zooms to fit the global network.
*   **Mexico Dominance:** The Donut chart for "Top International Destinations" explicitly calls out Mexico's dominance. 
    *   *Recommendation:* Since Mexico skews the donut chart so heavily (often taking up 50%+ of the chart), consider making it a `BarChart` or adding an interactive toggle to "Exclude Mexico" so users can better see the breakdown of the *rest* of the world (UK, Germany, Japan, etc.).

---

## 4. U.S.–Mexico (`/us-mexico`)

*   **Passenger vs. Cargo Ranking Insight:** The callout noting that Texas ranks #1 for passengers but lower for cargo (because of cross-border trucking/rail) is arguably the best insight in the entire dashboard. It adds crucial real-world context to the data.
*   **Load Factor Distribution:** The `BoxPlotChart` for route-level load factors is highly analytical and great for power users. 
    *   *Recommendation:* The tooltip for the boxplot could be enhanced to show the *names* of the outlier routes, so if a user hovers over a red dot (a route with an unusually high or low load factor), they instantly see which route it is.

---

## 5. Texas–Mexico (`/texas-mexico`)

**What’s Working Well:**
*   **Tabbed Navigation:** Because this page contains the most depth, splitting it into 5 tabs (`Overview`, `Passengers`, `Operations`, `Cargo`, `Border`) is the perfect UX choice. Keeping the KPI cards sticky above the tabs anchors the context beautifully.
*   **Payload Utilization Metric:** Estimating passenger weight (200 lbs) to calculate total payload utilization is a sophisticated metric. The methodology footnote is essential and well-placed.

**Areas for Improvement:**
*   **Tab Routing/URLs:** Currently, the tabs use local React state (`useState('overview')`). This means if a user wants to share a link specifically to the "Cargo & Trade" tab, they can't.
    *   *Recommendation:* Sync the `activeTab` state with the URL hash or query string (e.g., `#/texas-mexico?tab=cargo`). This allows deep-linking to specific chapters of the analysis.
*   **Border Airport Highlighting:** The Border Airports tab does a great job comparing the 6 border airports to the rest of Texas. 
    *   *Recommendation:* Make sure the `AirportMap` on the *Overview* tab of this page uses the `highlightAirports` prop (passing in the `BORDER_AIRPORTS` set) so they are visually distinct right from the start.

## Proposed Action Plan

1.  **Map Framing:** Add `fitToAirports={true}` to the maps on the Texas Domestic and Texas International pages.
2.  **Smart Hiding:** Conditionally hide the Schedule Adherence chart if the user filters to non-scheduled service classes.
3.  **URL Sync:** Update the `TexasMexico` page to read/write its active tab from the URL search parameters so tabs are shareable.
4.  **Tooltips & Overlays:** Ensure the Box Plot outliers display their route labels, and verify that empty charts render a friendly "No data" message instead of a blank SVG.