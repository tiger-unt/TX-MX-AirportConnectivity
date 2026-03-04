# About Data Page Review & Feedback: Airport Connectivity Dashboard

This document outlines structural, narrative, and design feedback for the About Data page (`07_WebApp/src/pages/AboutData/index.jsx`).

## 1. Content & Clarity Adjustments

**What's Working Well:**
*   **Plain Language:** The explanation of BTS T-100 data, particularly the difference between Market and Segment data, is written in clear, accessible language avoiding overly dense jargon.
*   **"When to Use Which?" Table:** This is a brilliant addition. It directly answers the most common question users will have when looking at two different datasets.

**Areas for Improvement:**
*   **Conflicting Dates:** Under "BTS T-100 Air Carrier Statistics", the text states: *"Data has been available since 1990 and is reported monthly, with the most recent data from November 2025."* However, the very next sentence says the study covers **2015–2024**.
    *   *Recommendation:* Clarify this to avoid confusing users about whether 2025 data is in the dashboard. E.g., *"While the BTS reports data monthly up to late 2025, this dashboard uses complete, finalized annual data for the period 2015–2024."*
*   **Data Limitations:** The note explaining that foreign airlines do not report mail volumes or flight time data is good.
    *   *Recommendation:* Add a quick concluding sentence confirming *which* metrics are universally safe to use (e.g., *"As a result, Passengers and Freight are the most reliable metrics for comparing U.S. and foreign carriers directly."*).

## 2. Design & Layout Enhancements

**What's Missing or Could Be Better:**
*   **Page Navigation (Table of Contents):** This is a long, text-heavy, scrolling page. 
    *   *Recommendation:* Add a row of "Quick Jump" anchor links right below the hero section (e.g., `Data Source | Market vs. Segment | Limitations | Pipeline | Quality`). This allows users to immediately jump to the methodology they care about.
*   **Data Pipeline Visuals:** The Data Pipeline section currently displays as a 1x4 grid of disjointed cards.
    *   *Recommendation:* Make it look like an actual "pipeline" by adding visual connectors. For example, rendering an arrow (`→`) or a connecting line between the cards on desktop screens to emphasize the sequential flow from `1. Collect` to `4. Publish`.
*   **Market vs. Segment Example Layout:** The JFK → BWI → MIA example is great, but currently relies on basic bulleted lists.
    *   *Recommendation:* Upgrade this to a small visual diagram or a cleanly styled mini-table to make the math immediately obvious at a glance.
*   **Hero Visuals:** Like the homepage, the hero just uses the flat `gradient-blue` background.
    *   *Recommendation:* A subtle grid, dot matrix, or data-node pattern overlay in the hero background would feel very appropriate for a methodology/"data" page.

## 3. Proposed Action Plan (Next Steps)

If these recommendations align with your vision, the next technical steps for `AboutData/index.jsx` would be:
1.  **Correct the Copy:** Update the date references to make the 2015–2024 scope unambiguous.
2.  **Add Anchor Links:** Implement a sticky or static sub-nav bar below the hero linked to section IDs (`#source`, `#market-segment`, `#limitations`, etc.).
3.  **Enhance the Pipeline UI:** Update the Tailwind grid layout for the 4 pipeline steps to include visual arrows connecting them on `md` and `lg` breakpoints.
4.  **Refine the Example UI:** Restructure the Market vs. Segment text example into a more visual, graphic-like layout.