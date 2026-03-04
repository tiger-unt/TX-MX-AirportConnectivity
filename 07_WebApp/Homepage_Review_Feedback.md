# Homepage Review & Feedback: Airport Connectivity Dashboard

This document outlines structural, narrative, and design feedback for the Overview/Homepage (`07_WebApp/src/pages/Overview/index.jsx`). 

## 1. The Narrative & Story Flow

**What’s Working Well:**
*   **The "Layers" Concept:** The explanation in the "Our Approach" section is excellent. Guiding the user from the broadest context (Texas Domestic) down to the core focus (Texas–Mexico) gives them a clear mental model of why those supplementary pages exist.
*   **Data Accuracy:** The mathematical derivations for the insights (e.g., Texas's share of national US-Mexico traffic, hub concentration) are accurate and use the data predicates correctly.

**Areas for Improvement:**
*   **Redundant Phrasing:** The Hero section asks: *"How has air connectivity between Texas and Mexico evolved...?"* and the very next paragraph in "Our Approach" asks: *"The central question driving this dashboard is: how connected are Texas and Mexico by air?"* 
    *   *Recommendation:* Tighten this up. Use the Hero to state the *purpose* (e.g., "A data-driven exploration of cross-border aviation") and let the Approach section handle the specific questions and methodology.
*   **Highlight Global Filters:** There is no mention on the homepage that the user can interact with the data globally.
    *   *Recommendation:* Add a quick sentence in the Approach section like *"Use the filter bar on any page to slice the data by year, carrier type, or direction"* to set expectations for interactivity early on.

## 2. Structural & Layout Adjustments

Currently, the page flows like this:
`Hero` ➡️ `Our Approach (Cards)` ➡️ `Data Source (Text wall)` ➡️ `Key Findings`

**The "Data Source" Interruption:** 
The "Data Source" section interrupts the narrative flow. A user reads about the dashboard layers, sees the navigation cards, and then hits a wall of text about BTS methodology before they get to the engaging "Key Findings."

**Recommended Page Flow:**
1.  **Hero:** Welcome & high-level purpose.
2.  **Our Approach / Dashboard Layers:** The 4 navigation cards.
3.  **Key Findings:** The insight callouts.
4.  **Data Source:** Move this to the very bottom as a footer-style section (perhaps with a subtle gray background). This creates a smoother user journey: *Context → Exploration Options → Insights → Methodology.*

**Reordering Key Findings:**
The insights currently jump around contextually (Domestic → International → US-Mexico → TX-MX → TX-MX → International).
*   *Recommendation:* Reorder these Insight Callouts to perfectly match the 4 "Layers" of the dashboard, so the user reads them from broadest to narrowest (Domestic first, ending with Texas-Mexico).

## 3. Design & Visual Engagement

**What’s Missing:**
*   **A Map on the Homepage!** This is an aviation dashboard, but the current Overview page consists entirely of text and cards. We have a powerful, reusable `AirportMap` component already built.
    *   *Recommendation:* Add a striking, high-level map right below the hero (or integrated into a split-layout hero) showing all Texas and Mexico routes. This would provide an immediate visual hook before the user even clicks a card.
*   **Hero Visuals:** The hero is currently a flat blue gradient (`gradient-blue`). 
    *   *Recommendation:* Consider adding a faint, stylized background pattern, an SVG icon watermark, or a subtle map graphic to make it feel less empty and more aligned with the aviation theme.

## 4. Proposed Action Plan (Next Steps)

If these recommendations align with your vision, the next technical steps for `Overview/index.jsx` would be:
1.  **Reorder the Layout:** Move `Key Findings` directly below `Our Approach`.
2.  **Reposition Data Source:** Move the `Data Source` section to the bottom of the page, styling it distinctively to act as a pre-footer.
3.  **Refine Copy:** Clean up the hero text to remove repetitive phrasing and add a mention of the interactive filters.
4.  **Sort Insights:** Reorder the Insight Callouts array to flow logically (Domestic → Intl → US-Mx → TX-Mx).
5.  **Implement Homepage Map (Optional but Highly Recommended):** Render a top-level `AirportMap` instance showcasing the entire Texas-Mexico network as a visual centerpiece.