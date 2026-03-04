# The Dashboard Design Playbook

**A comprehensive guide to designing professional, data-rich, user-friendly analytical dashboards.**

Built from the design decisions, component patterns, and interaction principles of the TxDOT Airport Connectivity Dashboard — a production data visualization platform analyzing 10 years of Bureau of Transportation Statistics air carrier data across 80,000+ records, 25+ interactive visualizations, and 5 analytical pages.

This document captures every design decision at the component level: what each element does, why it exists, how it behaves across screen sizes, and the specific features that make it feel polished. The goal is a reusable playbook — a reference for building any analytical dashboard from scratch, regardless of the charting library used.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System & Tokens](#2-design-system--tokens)
3. [Typography](#3-typography)
4. [Color System](#4-color-system)
5. [Layout Architecture](#5-layout-architecture)
6. [Site Header](#6-site-header)
7. [Navigation Bar](#7-navigation-bar)
8. [Hero Banners](#8-hero-banners)
9. [Page Header & Breadcrumbs](#9-page-header--breadcrumbs)
10. [Section Blocks & Content Rhythm](#10-section-blocks--content-rhythm)
11. [KPI Stat Cards](#11-kpi-stat-cards)
12. [Chart Card Wrapper](#12-chart-card-wrapper)
13. [Line Chart](#13-line-chart)
14. [Bar Chart](#14-bar-chart)
15. [Stacked Bar Chart](#15-stacked-bar-chart)
16. [Donut Chart](#16-donut-chart)
17. [Treemap Chart](#17-treemap-chart)
18. [Diverging Bar Chart](#18-diverging-bar-chart)
19. [Lollipop Chart](#19-lollipop-chart)
20. [Box Plot Chart](#20-box-plot-chart)
21. [Scatter Plot](#21-scatter-plot)
22. [Heatmap Table](#22-heatmap-table)
23. [Bar Chart Race (Animated)](#23-bar-chart-race-animated)
24. [Interactive Map](#24-interactive-map)
25. [Data Table](#25-data-table)
26. [Filter System](#26-filter-system)
27. [Tab Navigation](#27-tab-navigation)
28. [Insight Callouts](#28-insight-callouts)
29. [Fullscreen Mode](#29-fullscreen-mode)
30. [Download & Export](#30-download--export)
31. [Footer](#31-footer)
32. [Page Storytelling Pattern](#32-page-storytelling-pattern)
33. [Responsive Design Strategy](#33-responsive-design-strategy)
34. [Animation & Motion Design](#34-animation--motion-design)
35. [Accessibility](#35-accessibility)
36. [Anti-Patterns & Pitfalls](#36-anti-patterns--pitfalls)

---

## 1. Design Philosophy

### Core Principles

1. **Data-agnostic components.** Every chart, table, card, and filter is a reusable building block that receives data as props. No component hardcodes field names, data shapes, or domain-specific logic. The page layer is responsible for data selection, filtering, aggregation, and formatting; components are purely presentational.

2. **Storytelling over decoration.** Every page follows a narrative arc: context → key findings → detailed evidence → annotations explaining what to look for. Charts are not just thrown on a page — they are sequenced to guide the reader through an analytical story.

3. **Progressive disclosure.** The dashboard uses a layered information architecture: the Overview page provides a high-level summary with navigation cards, each linked to a progressively deeper analytical page. Within pages, KPI cards provide the headline, trend charts show the trajectory, and detailed charts/tables provide the evidence.

4. **Minimum viable complexity.** Every visual element earns its place. No gratuitous animations, no unnecessary 3D effects, no ornamental chart junk. Each feature — a zoom, a hover, a filter — exists because it answers a question the user would naturally ask while exploring the data.

5. **Brand consistency.** A single, cohesive color palette, typography system, and spacing scale is used everywhere — from chart fills to button hovers to map markers. The design system is defined once and consumed by CSS utilities, JavaScript chart rendering, and component props.

6. **Responsive by default.** Every component adapts to screen size. Charts resize smoothly. Filters collapse from sidebar to inline bar. Navigation switches from horizontal to hamburger. The dashboard is fully usable on mobile, tablet, and desktop.

---

## 2. Design System & Tokens

### Why Tokens Matter

Design tokens are the single source of truth for all visual decisions. They are defined in three parallel locations to ensure consistency across CSS utilities, raw CSS, and JavaScript chart rendering:

1. **CSS Theme Variables** — consumed by Tailwind utility classes (`bg-brand-blue`, `text-text-secondary`)
2. **CSS Custom Properties** (`:root`) — consumed by raw CSS and accessible via `getComputedStyle()` in JavaScript
3. **JavaScript Token Object** — imported directly by D3 chart components for programmatic styling

### Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Tight gaps (icon-to-text) |
| `space-2` | 8px | Small gaps (between filter tags) |
| `space-3` | 12px | Compact padding (tab bar, utility bar) |
| `space-4` | 16px | Standard padding (card padding, section gaps) |
| `space-5` | 20px | Card padding (StatCard) |
| `space-6` | 24px | Section header padding |
| `space-8` | 32px | Content container horizontal padding |
| `space-10` | 40px | Generous component spacing |
| `space-12` | 48px | Page header vertical padding |
| `space-16` | 64px | Section vertical padding (top/bottom of SectionBlock) |
| `space-24` | 96px | Hero section padding |

### Border Radii

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | Small chips, tags, checkboxes |
| `md` | 6px | Buttons, dropdown items |
| `lg` | 8px | Cards, form inputs, navigation items |
| `xl` | 12px | Chart cards, stat cards, major containers |
| `full` | 9999px | Pill buttons, circular badges, avatar shapes |

### Shadows

| Level | Value | Usage |
|---|---|---|
| `xs` | `0 1px 2px rgba(0,0,0,0.05)` | Cards at rest, tables |
| `sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards on hover |
| `md` | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` | Active/selected elements, tabs |
| `lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Highlighted stat cards |
| `xl` | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Tooltips, overlays |

### Transitions

| Speed | Duration | Usage |
|---|---|---|
| Fast | 150ms ease | Button hovers, link color changes |
| Base | 200ms ease | Tab switches, card shadow changes |
| Slow | 300ms ease | Sidebar expand/collapse, mobile menu slide |

---

## 3. Typography

### Font Stack

| Role | Font | Fallbacks | Usage |
|---|---|---|---|
| Primary | IBM Plex Sans | Verdana, Aptos, Arial, sans-serif | All body text, headings, labels, buttons |
| Condensed | IBM Plex Sans Condensed | Verdana, Arial, sans-serif | Compact contexts (available but rarely used) |
| Monospace | IBM Plex Mono | JetBrains Mono, monospace | Data tables, code references |

### Minimum Font Size Rule

**All text in the dashboard must be at least 16px.** This is enforced globally by overriding the CSS framework's small text sizes so that `text-xs` and `text-sm` both resolve to 16px (1rem).

**Approved exceptions** (below 16px):
- Filter selection chips/tags — space-constrained UI chrome
- Filter dropdown group/subgroup headers (10–11px uppercase labels) — structural dividers inside compact dropdown menus
- Map popup content (13px) — small overlay convention for map popups
- Map attribution text (10px) — third-party credit line, universally tiny by mapping convention

### Type Scale

| Size | Value | Usage |
|---|---|---|
| `xs` | 16px (overridden from 12px) | Filter chips, annotation text |
| `sm` | 16px (overridden from 14px) | Secondary text, labels |
| `base` | 16px | Body text, chart labels, form inputs |
| `md` | 18px | H6, emphasized body text |
| `lg` | 20px | H5, section subheadings |
| `xl` | 24px | H4, page section headings |
| `2xl` | 30px | H3, stat card values, page titles (desktop) |
| `3xl` | 36px | H2, hero titles (desktop) |
| `4xl` | 48px | H1, primary hero (used sparingly) |

### Font Weights

| Weight | Value | Usage |
|---|---|---|
| Light | 300 | Available, rarely used |
| Normal | 400 | Body text, descriptions |
| Medium | 500 | Filter labels, breadcrumbs, nav items |
| Semibold | 600 | All headings, chart axis labels, stat card labels |
| Bold | 700 | Stat card values, chart titles, key emphasis |

### Heading Hierarchy

All headings use semibold weight (600) with tight line height (1.2). Body text uses a comfortable line height of 1.6 for readability in narrative paragraphs.

### Fullscreen Font Scaling

When a chart enters fullscreen mode, the font size scales dynamically based on viewport width:
- At 800px width → 18px
- At 1200px width → 20px
- At 1600px+ width → 22px
- Formula: `Math.round(Math.max(18, Math.min(22, 14 + width / 200)))`

---

## 4. Color System

### Brand Palette (9 Colors)

| # | Name | Hex | Role |
|---|---|---|---|
| 1 | TxDOT Blue | `#0056a9` | **Primary.** Default chart fill, links, buttons, active states, map markers |
| 2 | Dark Blue | `#002e69` | Navigation background, gradient endpoint, button hover, active nav items |
| 3 | Dark Green | `#196533` | Charts (3rd series), InsightCallout "highlight" variant, positive trends |
| 4 | Light Orange | `#df5c16` | Charts (4th series), InsightCallout "warning" variant, Mexico map markers, selected route arcs |
| 5 | Dark Purple | `#5f0f40` | Charts (5th series), accent for secondary categories |
| 6 | Light Green | `#8ec02d` | Charts (6th series) |
| 7 | Light Yellow | `#f2ce1b` | Charts (7th series), highlight/gold accents (map halos, heatmap crosshair) |
| 8 | Light Brown | `#c5bbaa` | Charts (8th series), muted accent |
| 9 | Red | `#d90d0d` | Charts (9th series — use last), error states, negative trends, outlier dots, COVID annotation |

### Semantic Colors

| Name | Hex | Usage |
|---|---|---|
| Surface | `#ffffff` | Default backgrounds, cards, tooltips |
| Surface Alt | `#f5f7f9` | Alternating section backgrounds, hover states |
| Surface Dark | `#333f48` | Dark backgrounds (rarely used) |
| Border | `#d1d5db` | Standard borders, table lines, axis lines |
| Border Light | `#c4c9cf` | Subtle borders (header, page header) |
| Text Primary | `#333f48` | Headings, body text, chart values |
| Text Secondary | `#5a6872` | Labels, descriptions, axis text, muted content |
| Text Inverse | `#ffffff` | Text on dark/colored backgrounds |

### Chart Color Cycling

For multi-series charts, colors are assigned via a D3 ordinal scale cycling through the 9-color palette. The first series always gets TxDOT Blue (#0056a9). Single-series charts always use TxDOT Blue.

### Opacity Conventions

| Alpha | Usage |
|---|---|
| 100% | Active/selected elements, primary text |
| 90% | Nav link text (inactive), card hover icons |
| 85% | Map markers (normal), scatter dots (normal) |
| 80% | Trend labels on highlighted cards |
| 70% | Hero subtitle text |
| 55% | Donut box fill opacity, dim-out for non-selected |
| 40% | Non-selected bar dim (`color + '40'`), breadcrumb separator |
| 33% | Non-selected donut dim (`color + '55'`) |
| 30% | Bar dim on StackedBarChart hover |
| 15% | Brand-blue text selection highlight |
| 10% | InsightCallout icon badge, filter tag backgrounds, hover states |
| 5% | Active filter banner background |
| 2-15% | Area chart gradient fill (bottom to top) |

### Map Marker Color System

| Category | Fill | Stroke | Usage |
|---|---|---|---|
| U.S./Texas | `#0056a9` | `#003d75` | Texas and U.S. airports |
| U.S. Other | `#94c4de` | `#6d9bb8` | Non-Texas U.S. airports |
| Mexico | `#df5c16` | `#a84410` | Mexican airports |
| Other International | `#5a7a7a` | `#3a5252` | Non-U.S., non-Mexico airports |
| Highlighted (Border) | — | `#E8B923` (gold, weight 2.5) | Border airports with thick halo |

### Gradient Definitions

| Name | Value | Usage |
|---|---|---|
| `gradient-blue` | `linear-gradient(to right, #002e69, #0056a9)` | Hero banners (dark-to-light blue, left-to-right) |
| `gradient-blue-light` | `linear-gradient(135deg, #1a6fbe, #3a8fd4)` | Highlighted stat card (secondary variant) |

---

## 5. Layout Architecture

### Page Shell

The overall page uses a "sticky footer" flexbox pattern:

```
┌──────────────────────────────────────────────────┐
│ SiteHeader (white, border-bottom)                │  ← Logo + Title + AI Button
├──────────────────────────────────────────────────┤
│ MainNav (brand-blue background)                  │  ← Horizontal links / hamburger
├──────────────────────────────────────────────────┤
│ <main> (flex-1, grows to fill)                   │
│   ┌──────────────────────────────────────────┐   │
│   │ PageHeader (breadcrumbs + title)         │   │
│   ├──────────────────────────────────────────┤   │
│   │ DashboardLayout                          │   │
│   │   ┌──────────────┬───────────────────┐   │   │
│   │   │ Content      │ FilterSidebar     │   │   │
│   │   │ (flex-1)     │ (sticky, w-72,    │   │   │
│   │   │              │  desktop only)    │   │   │
│   │   │ SectionBlock │                   │   │   │
│   │   │ SectionBlock │                   │   │   │
│   │   │ SectionBlock │                   │   │   │
│   │   └──────────────┴───────────────────┘   │   │
│   └──────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ Footer (light gray, border-top)                  │  ← Data source attribution
└──────────────────────────────────────────────────┘
  AskAIDrawer (overlay, always mounted)               ← AI chat panel
```

### Two Container Widths

| Container | Max Width | Padding | Usage |
|---|---|---|---|
| `container-chrome` | 1280px, centered | 0 1.5rem (24px) | Header, navigation, footer — constrained width |
| `container-main` | 100% | 0 2rem (32px) | Page content — full width for charts and tables |

**Rationale**: Navigation and branding elements look better constrained to a readable width. Chart and data content benefits from using all available horizontal space.

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|---|---|---|
| Default (mobile) | < 640px | Single column, hamburger nav, filter bar inline |
| `sm` | ≥ 640px | 2-column stat card grids |
| `md` | ≥ 768px | Desktop nav links, larger hero text, 2-column chart grids |
| `lg` | ≥ 1024px | Filter sidebar appears, content shifts left, 3-4 column grids |
| `xl` | ≥ 1280px | Full content width reached |

---

## 6. Site Header

### Structure

```
┌──────────────────────────────────────────────────┐
│ [TxDOT Logo]  Dashboard Title          [Ask AI]  │
└──────────────────────────────────────────────────┘
```

### Features

| Feature | Specification |
|---|---|
| **Background** | White with thin bottom border (`border-bottom: 1px solid #c4c9cf`) |
| **Container** | Max-width 1280px, centered, 24px horizontal padding |
| **Layout** | Flexbox row, items vertically centered, space-between |
| **Logo** | SVG image, 48px tall (mobile) / 56px tall (desktop), auto width, aspect ratio preserved |
| **Logo error handling** | On load failure, image is hidden via `display: none` — no broken image icon |
| **Title** | Semibold, brand-blue text, 24px (mobile) / 30px (desktop), single line with ellipsis truncation |
| **Action button** | Hidden on mobile. Desktop: blue pill button with icon, darker blue on hover, 150ms color transition |
| **Vertical padding** | 16px top and bottom |
| **Gap** | 24px between logo group and action button |
| **Flex overflow** | Logo group uses `min-w-0` to allow title truncation rather than overflowing |

### Design Decisions

- The logo uses `flex-shrink-0` so it never compresses, even on narrow screens — the title truncates instead.
- The action button disappears on mobile to save horizontal space; the feature is accessible through other means on small screens.
- 150ms transition on the action button hover gives immediate but not jarring feedback.

---

## 7. Navigation Bar

### Desktop Mode (≥ 768px)

```
┌──────────────────────────────────────────────────┐
│  Home   Texas Domestic   Texas Intl   US-MX  ... │
└──────────────────────────────────────────────────┘
```

| Feature | Specification |
|---|---|
| **Background** | Brand blue (`#0056a9`) |
| **Height** | 48px |
| **Link layout** | Flexbox row, 2px gap between links |
| **Link click area** | Full height of bar (48px), 16px horizontal padding — large touch target |
| **Inactive link text** | White at 90% opacity, medium weight |
| **Inactive link hover** | Semi-transparent dark blue background (`#002e69` at 60%), full white text |
| **Active link** | Solid dark blue background (`#002e69`), full white text, inner shadow for "pressed" effect |
| **Transition** | 200ms `transition-all` on all links |
| **z-index** | 40 (above page content, below fullscreen overlay) |

### Mobile Mode (< 768px)

| Feature | Specification |
|---|---|
| **Collapsed state** | "Navigation" text label + hamburger icon (Menu), 48px height |
| **Toggle button** | White icon, 6px padding, rounded, dark blue hover background |
| **Expanded animation** | 300ms ease-in-out, `max-height: 0` → `max-height: 384px` with simultaneous `opacity: 0` → `opacity: 1` |
| **Mobile links** | Full-width blocks, 10px vertical padding, 16px horizontal padding |
| **Mobile inactive** | White at 85% opacity |
| **Mobile active** | Solid dark blue background, full white |
| **Auto-close** | Menu automatically collapses when navigating to a new page (route change detection) |
| **Icon toggle** | Hamburger (Menu) when closed, X when open |

### Design Decisions

- The navigation bar is a separate full-width element below the header, not embedded within it. This gives it its own strong visual identity and makes the blue brand stripe visible.
- Active state uses `shadow-inner` (inset shadow) for a subtle "pressed" effect, giving tactile feedback.
- On mobile, the slide-down animation uses `max-height` + `opacity` for a smooth reveal without layout jumps.

---

## 8. Hero Banners

### Data Page Hero

Used on Texas Domestic, Texas International, U.S.-Mexico, and Texas-Mexico pages.

```
┌──────────────────────────────────────────────────┐
│  ░░░░░░░░░░ gradient-blue ░░░░░░░░░░░░░░░░░░░░  │
│                                                  │
│    Page Title (white, 2xl/3xl)                   │
│    Subtitle text (white/70, base)                │
│                                                  │
└──────────────────────────────────────────────────┘
```

| Feature | Specification |
|---|---|
| **Background** | `linear-gradient(to right, #002e69, #0056a9)` — dark-to-light blue |
| **Text color** | White title, white at 70% opacity for subtitle |
| **Container** | `container-chrome` (1280px max, centered) |
| **Padding** | 40px vertical (mobile), 56px vertical (desktop) |
| **Title size** | 30px (mobile), 36px (desktop), bold |
| **Subtitle** | 16px, normal weight, 4px top margin |

### Overview Page Hero (Enhanced)

```
┌──────────────────────────────────────────────────┐
│  ░░░░░░░░░░ gradient-blue ░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░ with SVG background pattern ░░░░░░░░  │
│                                                  │
│    Airport Connectivity Dashboard                │
│    Descriptive subtitle with dynamic year range  │
│                                                  │
└──────────────────────────────────────────────────┘
```

The Overview hero adds a subtle aviation-themed SVG pattern (star/compass shape) overlaid on the gradient for visual richness without competing with text.

### About Data Hero (Widened)

The static informational page uses a wider content constraint (`max-w-5xl` instead of `container-chrome`) with more generous vertical padding (56px mobile / 80px desktop) to give the long-form content room to breathe.

### Design Decisions

- Gradients flow left-to-right (dark → light), creating natural visual motion toward the content.
- The 70% opacity subtitle creates a clear hierarchy without requiring a different color.
- Hero sections never contain interactive elements (filters, buttons) — they are purely atmospheric and informational.

---

## 9. Page Header & Breadcrumbs

### Structure

```
┌──────────────────────────────────────────────────┐
│  bg-surface-alt (#f5f7f9)                        │
│                                                  │
│  Home  ›  Texas Domestic                         │  ← breadcrumbs
│  Texas Domestic Air Connectivity                 │  ← title
│  Optional subtitle description                   │  ← subtitle
│                                                  │
└──────────────────────────────────────────────────┘
```

### Features

| Feature | Specification |
|---|---|
| **Background** | Light gray surface alt (#f5f7f9) with bottom border |
| **Breadcrumb separator** | Chevron-right icon, 12px, at 40% opacity — very subtle |
| **Breadcrumb links** | Brand blue on hover with transition, keyboard-navigable |
| **Current page** | Primary text color, medium weight (not a link) |
| **Title** | Bold, 24px (mobile) / 30px (desktop) |
| **Subtitle** | 16px, secondary gray, 4px margin below title |
| **Padding** | 24px top and bottom |

### Design Decisions

- Breadcrumbs use a very light separator (40% opacity chevron) to provide wayfinding without visual noise.
- The page header sits on a subtle gray background to visually separate it from both the blue navigation above and the white content below.

---

## 10. Section Blocks & Content Rhythm

### Alternating Section Pattern

Pages organize content into alternating white and gray bands:

```
┌──────────────────────────────────────────────────┐
│  SectionBlock (white background)                 │
│    - Narrative introduction                      │
│    - Insight callouts                            │
├──────────────────────────────────────────────────┤
│  SectionBlock alt (gray background #f5f7f9)      │
│    - KPI stat cards                              │
├──────────────────────────────────────────────────┤
│  SectionBlock (white background)                 │
│    - Route map                                   │
├──────────────────────────────────────────────────┤
│  SectionBlock alt (gray background)              │
│    - Trend charts (2x2 grid)                     │
└──────────────────────────────────────────────────┘
```

### SectionBlock Specifications

| Feature | Specification |
|---|---|
| **Default background** | White (`#ffffff`) |
| **Alt background** | Surface alt (`#f5f7f9`) |
| **Vertical padding** | 64px top and bottom (`section-padding`) |
| **Horizontal padding** | 32px left and right (via `container-main`) |
| **Width** | 100% (full available width) |
| **Semantic element** | `<section>` |

### Design Decisions

- The alternating background creates a clear visual rhythm that groups related content without requiring explicit borders or dividers.
- 64px of vertical padding gives each section room to breathe — content never feels cramped.
- Full-width content (not constrained to 1280px) allows charts and maps to use maximum horizontal space.

---

## 11. KPI Stat Cards

### Structure

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│          [📊] │  │          [✈️] │  │          [🌎] │  │          [📍] │
│               │  │               │  │               │  │               │
│ PASSENGERS    │  │ FLIGHTS       │  │ COUNTRIES     │  │ TOP DEST      │
│ (2024)        │  │ (2024)        │  │ (2024)        │  │ (2024)        │
│               │  │               │  │               │  │               │
│ 12.5M         │  │ 42.1K         │  │ 38            │  │ Cancún        │
│               │  │               │  │               │  │               │
│ ▲ +5.2% YoY  │  │               │  │               │  │               │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
```

### Features

| Feature | Specification |
|---|---|
| **Card shape** | Rounded-xl (12px), padding 20px, shadow-xs at rest, shadow-md on hover |
| **Background** | White with light border (default), gradient-blue (highlighted/primary) |
| **Entrance animation** | Fade-up: 500ms ease-out, starts 12px below with opacity 0. Staggered delay per card (via `delay` prop). |
| **Icon badge** | Top-right corner, absolutely positioned. 20px Lucide icon inside a rounded-lg container. Normal: surface-alt background. Highlighted: white at 10% opacity. |
| **Label** | Uppercase, 16px, semibold, text-secondary. Includes `(YYYY)` year suffix for time-specific metrics. Right-padded to avoid overlapping icon. |
| **Value** | Bold (700), 30px (mobile) / 36px (desktop), text-primary (normal) / white (highlighted) |
| **Trend indicator** | Icon + label below value. Green + TrendingUp for positive, Red + TrendingDown for negative, Gray + Minus for neutral. |
| **Tooltip** | Dark tooltip above card on hover (when `title` prop set). `bg-gray-900`, white text, centered with downward-pointing arrow, opacity transition. |
| **Grid alignment** | Uses CSS subgrid (`row-span-3 grid grid-rows-subgrid gap-y-0`) so label, value, and trend rows align across sibling cards in the same grid row. |

### Variant System

| Variant | Background | Text | Shadow | Border |
|---|---|---|---|---|
| Default | White | Primary | xs → md on hover | Light border |
| Primary (highlighted) | `gradient-blue` (dark) | White | lg | None |
| Secondary (highlighted) | `gradient-blue-light` | White | lg | White at 35% opacity |

### Stat Card Grid Layouts

| Page | Grid | Pattern |
|---|---|---|
| Most pages | `sm:grid-cols-2 lg:grid-cols-4` | 4 KPI cards |
| Texas-Mexico | `sm:grid-cols-2 lg:grid-cols-5` | 5 KPI cards |

### Design Decisions

- The first card in a row typically uses the `primary` highlighted variant to draw the eye to the most important metric (e.g., total passengers).
- Year labels `(2024)` are dynamic, always reflecting the latest year in the filtered dataset.
- The fade-up entrance animation with staggered delays (e.g., 0ms, 80ms, 160ms, 240ms) creates a cascading reveal effect that draws the eye across all cards.
- Subgrid alignment ensures that even when values have different digit counts, the cards maintain a consistent vertical rhythm.
- Hover shadow transition (300ms) from xs to md gives a subtle "lift" effect that invites interaction.

---

## 12. Chart Card Wrapper

Every chart, map, and table on the dashboard is wrapped in a `ChartCard` — a universal container that provides consistent chrome around any visualization.

### Structure

```
┌──────────────────────────────────────────────────┐
│ Chart Title         [headerRight] [⬇][📷][⛶][↺] │
│ Optional subtitle                                │
├──────────────────────────────────────────────────┤
│                                                  │
│            Chart Content Area                    │
│          (children, overflow-hidden)             │
│                                                  │
├──────────────────────────────────────────────────┤
│ Optional footnote text                           │
└──────────────────────────────────────────────────┘
```

### Features

| Feature | Specification |
|---|---|
| **Card styling** | White background, rounded-xl (12px), light border, shadow-xs → shadow-sm on hover, 300ms shadow transition |
| **Overflow** | `overflow-hidden` on card body (needed for rounded corners to clip SVG) |
| **Layout** | Flex column — header, chart area, optional footnote as separate flex children |
| **Title** | Bold (700), 16px, text-primary |
| **Subtitle** | Normal weight, 16px, text-secondary, 2px top margin |
| **Header padding** | 12px horizontal, 12px top, 6px bottom |
| **Minimum height** | 200px default (configurable via prop) |

### Action Buttons (Right Side of Header)

All action buttons share the same styling: `p-1.5 rounded-md text-text-secondary hover:text-brand-blue hover:bg-surface-alt transition-all duration-150`.

| Button | Icon | Size | Behavior |
|---|---|---|---|
| **Custom controls** | (any) | — | Slot for page-specific controls (e.g., metric selector dropdown) |
| **CSV Download** | Download | 14px | Opens dropdown or triggers direct download (see [Download & Export](#30-download--export)) |
| **PNG Export** | Image | 14px | Exports the chart as a high-resolution PNG image |
| **Fullscreen** | Maximize2 | 14px | Opens the chart in a fullscreen overlay |
| **Reset Filter** | RotateCcw | 14px | Only shown when filters are active; resets to default view |

### Footnote Area

- Rendered as a separate flex child below the chart area, outside the `overflow-hidden` flow
- Padding: 12px horizontal, 20px bottom
- Hidden when the card is in empty state or fullscreen mode
- **Critical rule**: Footnotes must use the `footnote` prop, never be placed as children alongside the chart component (see [Anti-Patterns](#36-anti-patterns--pitfalls))

### Empty State

When no data matches the current filter selection, the chart area is replaced with a centered italic message in secondary text. This provides clear feedback rather than rendering an empty chart.

| Feature | Specification |
|---|---|
| **Trigger** | `emptyState` prop — when truthy (a string), replaces chart content with the message |
| **Container** | Centered italic text inside a 192px-tall flex container |
| **Footnote behavior** | Footnotes are hidden when empty state is active |
| **Padding** | Bottom padding (`pb-2`) is suppressed in empty state |
| **Contextual messages** | Pages pass filter-aware messages explaining WHY no data is available (e.g., "No passenger data for the current filter selection. Cargo (Class G) flights do not carry passengers.") |
| **Detection helper** | `isEmptyOrAllZero(data, key)` in `aviationHelpers.js` returns true when data is empty or every value is zero/falsy |

### Zoom Range Integration

ChartCard creates a `ZoomRangeContext` that child charts can use to report their current zoom range (e.g., when a user zooms into a LineChart). The ChartCard uses this to filter the `downloadData` before passing it to the DownloadButton, so CSV exports only include the visible (zoomed) data.

### Dev-Time Warning

In development mode, a `useEffect` scans children for `<p>` elements and logs a console warning, catching the common anti-pattern of placing text alongside chart components.

---

## 13. Line Chart

The line chart is the most feature-rich chart component, used extensively for time-series trends.

### Visual Design

```
         Passengers (2015–2024)
    │
 5M │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
    │        ╭──────╮
 4M │─ ─ ─ /        ╲─ ─ ─ ─╱─
    │      /     COVID    ╲ ╱
 3M │─ ─ /─ ─ ─ ─band─ ─ ─╲─ ─
    │    /                   ╲
 2M │─ /─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
    │╱
    └───┬───┬───┬───┬───┬───┬──
       2015 2017 2019 2020 2022 2024

    ── Texas to Mexico  ── Mexico to Texas
```

### Core Features

| Feature | Specification |
|---|---|
| **Curve interpolation** | Monotone-X (`d3.curveMonotoneX`) — smooth, but never overshoots data points |
| **X-axis scale** | Linear (not band) — positions years at exact numeric values |
| **Y-axis scale** | Linear, starts at 0, `.nice()` for clean tick values |
| **Line stroke** | 2.5px width (normal), 5px width (fullscreen, via CSS) |
| **Data dots** | Small circles at each data point: 3.5px radius, filled with series color, 2px white stroke |
| **Clip path** | All visual elements clipped to the plot area (prevents overflow during zoom/pan) |

### Axis System

| Feature | Specification |
|---|---|
| **X-axis ticks** | Only at actual data x-values (e.g., 2015, 2016, ..., 2024). No interpolated ticks. Integer format. |
| **Y-axis ticks** | ~5 ticks, formatted using `formatValue`. Zero tick is suppressed (no "0" label). |
| **Custom tick marks** | Small 5px marks centered on the axis line (extend 5px above and below). D3's default ticks are replaced. |
| **Grid lines** | Horizontal dashed (`4,4` dash pattern, `#9ca3af` stroke). Vertical dashed in a clipped group (updated on zoom). Zero grid line omitted. |
| **Axis lines** | Solid baseline at bottom and left edge (1px, `#9ca3af`). D3 domain lines removed. |
| **Dynamic left margin** | Left margin computed from the pixel width of the longest Y-axis label: `max(48, longestLabel × charWidth + 16)`. Prevents label clipping for large numbers. |
| **Fullscreen left margin** | `max(100, dynamicLeft)` — minimum 100px in fullscreen for comfortable spacing. |

### Tooltip System

| Feature | Specification |
|---|---|
| **Trigger** | Invisible rectangle overlaying the full plot area. Mousemove event finds the nearest integer x-value. |
| **Guide line** | Vertical dashed line (`#9ca3af`, `4,3` dash pattern) snaps to the hovered x-position. |
| **Highlight dots** | Larger circles (6px radius) at each series' y-value for the hovered x, filled with series color, white stroke 2.5px. |
| **Tooltip box** | White background, 1px border (`#e2e5e9`), 8px border-radius, drop shadow. Max-width 360px. |
| **Tooltip content** | Header: x-value (year). Body: one row per series with colored dot (10px), series name (gray), formatted value (bold). |
| **Positioning** | Fixed to viewport. 16px right of cursor; flips left when near right edge. Above cursor; flips below when near top. Clamped 12px from all viewport edges. |
| **Construction** | Built with safe DOM APIs (createElement, textContent) — no innerHTML — preventing XSS. |
| **Cleanup** | Tooltip DOM element removed from document.body on component unmount. |
| **During zoom** | Tooltip is hidden to prevent stale positioning. |

### Zoom & Pan

| Feature | Specification |
|---|---|
| **Trigger** | Scroll wheel to zoom, click-drag to pan on the chart area. |
| **Scale extent** | 1× to `ceil(uniqueXCount / 3)`. Only enabled when > 3 unique x-values. |
| **Constrained pan** | Cannot scroll beyond the data domain bounds (`[[0,0], [innerW, innerH]]`). |
| **What updates on zoom** | X-axis ticks, line paths (rebuilt with zoomed scale), dot positions, area fills, annotation positions, vertical grid lines. |
| **Reset button** | Appears at top-right of chart when zoom level > 1×. Clicking smoothly transitions back to identity zoom (300ms). |
| **CSV export integration** | Reports visible x-domain (`{ xKey, min, max }`) to ChartCard via `ZoomRangeContext`. Reset reports `null`. |
| **Animation clearing** | Zoom removes the stroke-dashoffset animation (sets dasharray/offset to null) so zoomed lines render instantly. |
| **Excluded from PNG** | Reset button has `export-ignore` class, stripped during PNG export. |

### Multi-Series Support

| Feature | Specification |
|---|---|
| **Series splitting** | `seriesKey` prop splits data into separate lines by unique values (e.g., "Texas to Mexico", "Mexico to Texas"). |
| **Color assignment** | D3 ordinal scale cycling through 9-color palette. First series = TxDOT Blue. |
| **Staggered animation** | Each series starts its line-drawing animation 200ms after the previous one. |
| **Legend** | Below x-axis, centered. Each entry: 30px color line segment (3.5px stroke, round caps) + hollow circle marker (4px radius, white fill, series color stroke) + text label. Wraps to multiple rows if needed (28px row height). |

### Area Fill (Single-Series Only)

| Feature | Specification |
|---|---|
| **Gradient** | Linear gradient from top (series color at 15% opacity) to bottom (series color at 2% opacity). |
| **Shape** | `d3.area()` with same MonotoneX curve, baseline at y=0. |
| **When shown** | Only when `showArea=true` and there is exactly one series. |
| **Clipped** | Inside the same clip path as lines. |

### Annotations

| Feature | Specification |
|---|---|
| **Band annotations** | `{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }` — shaded rectangle spanning full chart height from x to x2. |
| **Line annotations** | `{ x: 2020 }` — single vertical dashed line at x-position. Default stroke `#d90d0d`, dasharray `6,4`. |
| **Labels** | Text at the top of the annotation. Centered for bands, start-aligned for lines. Font size: 80% of base. All pointer-events disabled. |
| **Zoom behavior** | Annotation positions update when the user zooms/pans. |

### Height Computation

| Mode | Height | Rationale |
|---|---|---|
| Normal | `300 + legendSpace` (fixed) | Prevents CSS grid feedback loop |
| Fullscreen | `max(defaultH, containerHeight)` | Fills the overlay |
| Container minHeight | `300 + estimatedLegendRows × 28` | Reserves space for the legend |

---

## 14. Bar Chart

### Orientation Modes

The bar chart supports both **horizontal** (category on Y-axis, value on X-axis) and **vertical** (category on X-axis, value on Y-axis) orientations.

```
Horizontal:                          Vertical:
                                         ┌──┐
 Dallas/Fort Worth ████████████ 4.2M     │  │
 Houston ████████ 2.8M                   │  │     ┌──┐
 San Antonio ████ 1.2M                   │  │     │  │  ┌──┐
 Austin ███ 890K                         │  │     │  │  │  │
                                        DFW  HOU  SAT  AUS
```

### Core Features

| Feature | Specification |
|---|---|
| **Bar corners** | 3px border radius (`rx=3`) on all bars |
| **Bar padding** | 30% of band width between bars |
| **Data slicing** | `maxBars` prop (default 15) limits displayed bars. Data is sliced, not paginated. |
| **Single color** | Default TxDOT Blue (`#0056a9`), customizable via `color` prop |
| **Per-bar color** | `colorAccessor(d)` function for datum-specific fills (e.g., color-coded adherence buckets) |
| **Clickable bars** | When `onBarClick` is provided, bars get pointer cursor and trigger callback |
| **Selected bar** | `selectedBar` prop highlights one bar at full opacity; all others dim to 25% opacity (`color + '40'`) |

### Axis System

| Feature | Horizontal | Vertical |
|---|---|---|
| **Category axis labels** | Left of bars, right-aligned. Truncated with ellipsis when exceeding available label space. | Below bars. Auto-rotated -35° when labels would overlap (detected by comparing `maxLabelLen × 9 > approxBandwidth`). Truncated at 20 characters. |
| **Tick marks** | 5px marks on left side only | 5px marks below axis only |
| **Axis lines** | Solid at bottom (x-baseline) and left edge (y-axis) | Solid at bottom (x-axis) only |
| **Domain lines** | Removed (D3 defaults overridden) | Removed |
| **Grid lines** | None (clean look for bar charts) | None |

### Value Labels

| Mode | Position | Style |
|---|---|---|
| **Horizontal (fits inside)** | Right-aligned inside bar, 8px from right edge | White text, bold, series font size |
| **Horizontal (outside)** | Left-aligned outside bar, 4px from right edge | Secondary gray text |
| **Vertical** | Centered above each bar, 6px gap | Secondary text |

The inside/outside decision for horizontal bars is automatic: if the bar is wide enough to contain the label text with padding, the label goes inside (white on colored bar); otherwise it goes outside (gray after bar).

### Label Tooltip

When category labels are truncated (ellipsis), hovering over the label text shows a dark tooltip with the full text. The tooltip is positioned near the label (right of it for horizontal, above for vertical).

### Height Computation

| Mode | Height |
|---|---|
| **Horizontal (any mode)** | `max(220, dataCount × 32 + margins)` — scales with number of bars |
| **Vertical (normal)** | Fixed 320px |
| **Vertical (fullscreen)** | `max(320, containerHeight)` |

### Entrance Animation

| Element | Animation | Timing |
|---|---|---|
| **Horizontal bars** | Width grows from 0 to final | 600ms, staggered 30ms per bar |
| **Vertical bars** | Y position slides from bottom, height grows from 0 | 600ms, staggered 30ms per bar |
| **Value labels** | Fade in from 0 opacity to 1 | 300ms delay after bar animation |

---

## 15. Stacked Bar Chart

```
    │
200K│  ┌──┐
    │  │░░│ ┌──┐
150K│  │░░│ │░░│
    │  │▒▒│ │░░│ ┌──┐
100K│  │▒▒│ │▒▒│ │░░│
    │  │▓▓│ │▒▒│ │▒▒│
 50K│  │▓▓│ │▓▓│ │▓▓│
    │  │▓▓│ │▓▓│ │▓▓│
    └──┴──┴─┴──┴─┴──┴──
       2020  2021  2022

    ▓ Category A  ▒ Category B  ░ Category C
```

### Core Features

| Feature | Specification |
|---|---|
| **Stack layout** | `d3.stack()` with `stackKeys` ordering (first key = bottom layer). |
| **Bar corners** | `rx=3` rounded corners only on the topmost layer in each column. |
| **Band padding** | 25% between columns. |
| **Normalization mode** | `normalize=true` converts values to percentages (each column sums to 100%). Y-axis shows 0–100% range. |
| **Color** | D3 ordinal scale mapping `stackKeys` to CHART_COLORS. |

### Axis System

Same as LineChart's axis system with these differences:
- X-axis always uses band scale (categorical, not linear).
- X-axis labels always rotated -35° (stacked bars typically have more categories).
- Y-axis format switches to percentage format when `normalize=true`.

### Tooltip Behavior

| Feature | Specification |
|---|---|
| **Trigger** | Invisible column-width overlay rects (one per x-category, full chart height). |
| **Hover highlight** | All layers NOT in the hovered column dim to 30% opacity. |
| **Content** | Header: x-value. Body: layers in reverse stack order (top first), excluding zero-value layers. Each row: colored dot + name + value. Footer: "Total" with sum. |
| **Normalization** | In normalized mode, tooltip shows both percentage and absolute value: `"45.3% (1.2M)"`. Total row shows `"100% (absoluteTotal)"`. |

### Legend

Colored dot (12px diameter) + text label per stack key. Centered below the chart. Multi-row wrapping when items exceed available width (28px row height).

### Animation

Bars grow upward from the baseline: Y starts at `innerH`, height starts at 0. Duration 600ms, staggered by column (20ms) then by layer (100ms), creating a cascading reveal from bottom-left to top-right.

---

## 16. Donut Chart

```
        ╭─────────╮
      ╱╱           ╲╲
    ╱╱    Total:     ╲╲
   │     12.5M        │
    ╲╲               ╱╱
      ╲╲           ╱╱
        ╰─────────╯

   ● Category A (5.3M)
   ● Category B (3.8M)
   ● Category C (2.1M)
   ● Other (1.3M)
```

### Core Features

| Feature | Specification |
|---|---|
| **Donut ratio** | Inner radius = 55% of outer radius (wide ring). |
| **Slice gap** | 0.02 radian pad angle between slices. |
| **Slice border** | 2px white stroke between slices for clean separation. |
| **Sort order** | None — slices maintain data order (no re-sorting by size). |
| **Max diameter** | 300px default, configurable. |

### Center Text

| State | Label | Value |
|---|---|---|
| **Default (nothing hovered/selected)** | "Total" | Sum of all slices |
| **Hovered** | Slice name | Slice value |
| **Selected (clicked)** | Slice name | Slice value |

- Label: Base font size, secondary color. Value: 125% font size, bold (700), primary color.
- Updated via mouseenter/mouseleave on slice paths for smooth interactive feedback.

### Hover & Selection

| Interaction | Effect |
|---|---|
| **Hover** | Hovered slice expands outward by 4px (fills the outer gap). Center text updates. |
| **Click** | Selected slice "explodes" — translated 6px outward along its midpoint angle. |
| **Non-selected slices** | Dimmed to 33% opacity (`color + '55'`). |
| **Click outside** | Deselects (document-level click listener + SVG background click). |
| **Legend click** | Clicking a legend item selects that slice. |

### Legend Placement

| Condition | Legend Position |
|---|---|
| Width > 400px, ≤ 10 slices, enough space for donut ≥ 160px | **Right of donut** (SVG-based, vertically centered) |
| Otherwise, ≤ 15 slices | **Below donut** (HTML flex-wrap buttons) |
| > 15 slices | No legend |

Both legends are interactive (clickable for selection). Selected item highlights; others dim to 40% opacity.

### Animation

Slices fade in: opacity 0 → 1, duration 600ms, staggered 60ms per slice. Only runs once per component lifecycle (tracked by a ref to prevent re-animation on selection changes).

### Height / Size Computation

Normal mode uses a fixed `defaultMaxSize = 300` to prevent height feedback loops. Fullscreen mode uses container height. The donut is centered within the available space after accounting for legend width.

---

## 17. Treemap Chart

```
┌──────────────────────┬────────────┐
│                      │            │
│    Dallas/FW         │  Houston   │
│    4.2M              │  2.8M      │
│                      │            │
├────────────┬─────────┼────────────┤
│            │         │            │
│ San Antonio│ Austin  │  El Paso   │
│ 1.2M       │ 890K    │  320K      │
│            │         │            │
└────────────┴─────────┴────────────┘
```

### Core Features

| Feature | Specification |
|---|---|
| **Layout** | `d3.treemap()` with `padding(3)` between cells and `round(true)` for pixel-perfect rendering. |
| **Sort** | Largest items first (descending by value). |
| **Color** | D3 ordinal scale through CHART_COLORS palette. |
| **Cell corners** | 4px border radius (`rx=4`). |
| **Cell opacity** | 85% at rest, 100% on hover. |

### Cell Labels

| Feature | Specification |
|---|---|
| **Rendering** | SVG `foreignObject` with HTML `<div>` for proper text-overflow handling. |
| **Minimum cell size** | Labels only shown when cell is ≥ 45px wide and ≥ 26px tall. |
| **Name line** | White text, bold (600), nowrap with text-overflow ellipsis. |
| **Value line** | White text at 80% opacity, only shown when cell height > 36px. |

### Tooltip

Dark-style tooltip on hover. Content: bold name, horizontal rule separator, bold formatted value. Fixed positioning with standard viewport clamping.

### Animation

Cell rectangles fade in: opacity 0 → 0.85, duration 500ms, staggered 30ms per cell.

### Design Decisions

- No axes, no margins, no legend — the treemap is entirely self-labeling within its cells.
- Small cells gracefully degrade: labels disappear below the size threshold, but the cell itself is still visible and hoverable.
- The 85% default opacity prevents the brightest colors from feeling overwhelming on large cells.

---

## 18. Diverging Bar Chart

A bilateral horizontal bar chart with bars growing in opposite directions from a center axis. Used for comparing two opposing metrics (e.g., exports vs. imports).

```
                    Exports │ Imports
                            │
   El Paso  ████████████████│████████████████████████████
   Dallas      █████████████│███████████████████
   Houston        ██████████│██████████████
   Laredo            ███████│█████████
                            │
```

### Core Features

| Feature | Specification |
|---|---|
| **Center axis** | Solid vertical line at the midpoint, visually separating left from right. |
| **Shared scale** | Both sides use the same max value (`.nice()`) for visual comparability. |
| **Left direction** | Bars grow leftward from center. Default color: Light Orange (`#df5c16`). |
| **Right direction** | Bars grow rightward from center. Default color: TxDOT Blue (`#0056a9`). |
| **Bar corners** | 3px border radius. |
| **Band padding** | 30% between rows. |
| **Row labels** | Left-aligned in the margin area, truncated with ellipsis if too long. |

### Value Labels

Inline text labels positioned 4px from bar end (left-side: right-aligned; right-side: left-aligned). Secondary gray text, 90% font size. Only shown for non-zero values.

### Legend

Two items centered at bottom: colored rectangle (14×14, rounded) + text label for each side.

### Animation

Bars animate from center outward in both directions: X starts at center position, width starts at 0. Duration 600ms, staggered 30ms per row.

### Height Computation

Based on data count: `max(240, dataCount × 36 + margins)`.

---

## 19. Lollipop Chart

A horizontal chart with thin stems and endpoint dots, designed for ranked data with long labels (e.g., airport routes with "Origin → Destination" format).

```
 DFW → CUN  ─────────────────────●  4.2M
 IAH → MEX  ─────────────●  2.8M
 AUS → CUN  ──────────●  1.9M
 SAT → MTY  ────●  890K
```

### Core Features

| Feature | Specification |
|---|---|
| **Stem** | 3px horizontal line, round linecap, extends from x=0 to value position. |
| **Dot** | Circle at stem endpoint, 7px radius (configurable), filled with series color, 2px white stroke. |
| **Guide lines** | Subtle horizontal lines (`#e5e7eb`, 1px) at each row center, full width. Provide a visual ruler behind the stems. |
| **No axis** | No axis lines, no tick marks. The guide lines and value labels provide context. |
| **Row height** | 52px (accommodates two-line labels). |

### Route Label Rendering

| Format | Rendering |
|---|---|
| `"DFW → CUN"` (contains " → ") | **Two-line display**: origin on top line with ` →` suffix, destination on bottom line. |
| `"Dallas/Fort Worth"` (no arrow) | **Single-line**, centered vertically. |

Both formats truncated to fit label width with ellipsis. Font size: base - 1px, secondary color. Label width: `min(45% of chart width, max(200, 280))`.

### Value Labels

Bold, primary color text positioned `dotRadius + 8` px right of the dot. Format determined by `formatValue` prop.

### Tooltip

Label tooltip only (for truncated route names). Dark background, white text, positioned to the right of the text element on hover.

### Animation

Stems grow from left: x2 from 0 to final position. Dots slide from left: cx from 0 to final, radius from 0 to full. Duration 600ms, staggered 50ms per row. Value labels fade in: 300ms delay after stem animation.

---

## 20. Box Plot Chart

Vertical box-and-whisker chart showing statistical distributions per category (typically years).

```
    100%│
        │  ┬       ┬       ┬
     80%│  │  ┌─┐  │  ┌─┐  │  ┌─┐
        │  ├──┤ │  ├──┤ │  ├──┤ │
     60%│  │  │─│  │  │─│  │  │─│    ─ = median
        │  │  └─┘  │  └─┘  │  └─┘
     40%│  ┴       ┴       ┴
        │     ●                       ● = outlier
     20%│
        └─────┬──────┬──────┬─────
             2022   2023   2024
```

### Core Features

| Feature | Specification |
|---|---|
| **Box** | Rectangle from Q1 to Q3, filled with series color at 55% opacity, series color stroke at 1.5px, 2px corner radius. |
| **Median line** | White line (2.5px, round linecap) inside the box. |
| **Whiskers** | Vertical line from min to max, 1.5px stroke, series color. |
| **Whisker caps** | Horizontal lines at min and max positions, 40% of box width. |
| **Outlier dots** | Red circles (`#d90d0d`), 3.5px radius, white stroke, 80% opacity. |
| **Y-axis domain** | Hardcoded `[0, 110]` for percentage data with breathing room above 100%. |
| **Y-axis ticks** | Explicit values: `[0, 20, 40, 60, 80, 100]`. |

### Tooltip

| Feature | Specification |
|---|---|
| **Trigger** | Invisible full-column-width rectangles (one per category). |
| **Content** | Header: year/category. Statistics table: Routes (count), Max, Q3 (75th), Median, Q1 (25th), Min. Outlier count if any. |

### Annotation Support (Bands on Band Scale)

Box plots use categorical (band) scales but support numeric annotation ranges (e.g., `{ x: 2019.5, x2: 2020.5 }`). The mapping logic checks each band category against the annotation range and expands by `step × 0.175` on each side for visual padding.

### Animation

All elements start at the median position and animate outward:
- Box expands from median to Q1/Q3 boundaries.
- Whiskers extend from median to min/max.
- Median line fades in (200ms extra delay).
- Outlier dots slide from median to final position (300ms extra delay).
- Duration 600ms, staggered 50ms per category.

---

## 21. Scatter Plot

```
    Freight (lbs) ↑
    │
 5M │               ● DFW
    │            ●
 1M │        ● IAH          ● = sized by metric
    │     ●     ●
 100K│  ● ● ●
    │ ●●
    └──────┬─────┬─────┬─────→
          10K  100K   1M   10M
                        Passengers
```

### Core Features

| Feature | Specification |
|---|---|
| **Scale types** | `symlog` (default — handles zeros and extreme skew), `linear`, or `log`. Selectable per axis. |
| **Color encoding** | Optional categorical `colorKey` with explicit `colorMap` or auto-assigned D3 ordinal palette. |
| **Size encoding** | Optional `sizeKey` with `d3.scaleSqrt()` mapping values to radius 4–14px (normal) or 4–20px (fullscreen). |
| **Default dot size** | 6px radius when no `sizeKey` is provided. |
| **Dot opacity** | 85% at rest. |

### Axis System

| Feature | Specification |
|---|---|
| **Custom tick generation** | For symlog/log: powers of 10 within domain, filtered by minimum pixel gap (4× font size). For linear: `scale.ticks(6)`. |
| **Axis labels** | Bold (600), positioned centered below (X) or rotated -90° centered left (Y). |
| **Grid lines** | Horizontal and vertical dashed (`3,3` pattern, `#e5e7eb` — lighter than other charts for less visual noise with many dots). |

### Permanent Labels (Top N Points)

| Feature | Specification |
|---|---|
| **Selection** | Top N points by `sizeKey` (or `xKey + yKey` sum). Controlled by `labelThreshold` prop. |
| **Collision avoidance** | Detects clusters (dots within `3 × maxRadius` pixels). Within clusters, alternates labels above/below. |
| **Positioning** | Right of dot if `cx ≤ 85%` of chart width; left otherwise. Clamped to chart bounds. |
| **Style** | 85% font size, secondary color, bold (600). |

### Tooltip

| Feature | Specification |
|---|---|
| **Trigger** | Individual dot hover (mouseenter/mousemove/mouseleave). |
| **Hover effect** | Dot stroke darkens to `#333f48`, stroke-width increases to 2.5, opacity goes to 1. |
| **Content** | Header: label (bold). Optional: name (gray). Optional: category name (in category color, bold). X-value: `"xLabel: formatX(value)"`. Y-value: `"yLabel: formatY(value)"`. |

### Legend

Shown when categories ≥ 2. Colored circles (6px radius, 85% opacity) + text labels. Centered below the chart.

### Animation

Dots: opacity 0 → 0.85, staggered 25ms per dot, 400ms duration. Permanent labels: opacity 0 → 1, 500ms delay, 300ms duration.

---

## 22. Heatmap Table

An HTML color-intensity grid table (not SVG/D3). Used for origin-destination matrices.

```
              CUN     MEX     GDL     MTY
  ┌─────────┬───────┬───────┬───────┬───────┐
  │TX Airport│ CUN   │ MEX   │ GDL   │ MTY   │
  ├─────────┼───────┼───────┼───────┼───────┤
  │ DFW     │ ████  │ ███   │ ██    │ ██    │
  │ IAH     │ ███   │ ██    │ █     │ ██    │
  │ SAT     │ ██    │ █     │  –    │ ███   │
  │ AUS     │ █     │  –    │  –    │  –    │
  └─────────┴───────┴───────┴───────┴───────┘
```

### Core Features

| Feature | Specification |
|---|---|
| **Cell color** | `rgba(0, 86, 169, alpha)` where alpha = `0.08 + (value / maxValue) × 0.72`. Brand blue with intensity proportional to value. |
| **Text color** | White when intensity > 45%, inherit (dark) otherwise. |
| **Zero cells** | Display en-dash (`–`) in muted text. |
| **Sticky headers** | Column headers stick to top (z-index 20), row labels stick to left (z-index 10), corner cell sticks in both axes (z-index 30). |

### Crosshair Hover System

| Feature | Specification |
|---|---|
| **Row highlight** | Amber/gold background on row header cell, amber top/bottom border lines on all data cells in that row. |
| **Column highlight** | Amber/gold background on column header cell, amber left/right border lines on all data cells in that column. |
| **Hovered cell** | Elevated shadow (`0 4px 16px rgba(0,0,0,0.2)`), amber outline (2.5px), scale(1.08) pop effect, z-index 15. |
| **Crosshair color** | Warm amber/gold (`#E8B923`). Border lines at 60% opacity. Background tint at 10% opacity. Header highlight at 18% opacity. |
| **Implementation** | CSS `box-shadow` technique for row/column lines (avoiding layout shift), excluding the hovered cell itself which uses outline. |

### Floating Tooltip

Shown when airport data is available. Contains full airport names with codes for both row and column airports, bidirectional arrow, and the cell value (or "No service" for zero). Flips below cell when near top of container.

### Scrolling

Container is scrollable with `max-height: 70vh`. Sticky headers maintain context during scroll.

---

## 23. Bar Chart Race (Animated)

An animated bar chart that transitions between year "frames," showing how rankings evolve over time.

```
  Year: 2024                                    Playback:  ◄◄  ▶  ►►
  ─────────────────────────────────────────────  ────────────────────
                                                 [==============○   ]
  DFW → CUN  ████████████████████████  4.2M     2015         2024
  IAH → MEX  ██████████████████  2.8M
  DFW → MEX  ████████████████  2.4M
  AUS → CUN  ████████████  1.9M
  SAT → MTY  ███████  1.1M
```

### Core Features

| Feature | Specification |
|---|---|
| **D3 join pattern** | Uses `selection.join(enter, update, exit)` with keyed data binding by route name. |
| **Stable X-axis** | Global max across all frames prevents axis jumping between years. |
| **Animated counter** | Value labels use D3 `tween('text', ...)` to interpolate numbers from old value to new value during transitions. |
| **Transition duration** | 750ms for all enter/update/exit transitions. |
| **Enter** | New bars appear from bottom (y = innerH), width 0, opacity 0 → slide to position. |
| **Update** | Existing bars slide to new y-position and resize width smoothly. |
| **Exit** | Departing bars slide to bottom, shrink width to 0, fade out, then remove. |

### Year Watermark

Massive background text in bottom-right corner: `min(96, width × 0.2)` font size, weight 800, 8% opacity. Transitions with the frame change.

### Tooltip

| Feature | Specification |
|---|---|
| **Trigger** | Mouseenter on individual bars |
| **Position** | Relative to chart container (not viewport) — placed near cursor with edge clamping |
| **Content** | Route name (bold header) + formatted value |
| **Style** | Dark background, white text, rounded-lg, shadow-lg |

### External Playback Controls

The BarChartRace does NOT contain its own playback UI. The parent component provides:
- Skip backward / play-pause / skip forward buttons
- Year range slider
- Current year display (large bold text)
- Metric selector
- Auto-play at 2-second intervals

### Color Per Origin

Bars can be colored by their origin airport code via `originColors` map, providing visual continuity when the same origin appears across different routes.

### Fill Container Mode

The `fillContainer` prop provides an alternative to `isFullscreen` for contexts where the chart should fill its parent container (e.g., inside a grid cell alongside other visualizations). When `fillContainer=true`, the chart uses `containerHeight` for sizing, similar to fullscreen behavior.

### Structural Diffing

A `structureRef` tracks the last rendered structural parameters (width, height, maxBars). When structure changes, the SVG is fully rebuilt. When only `currentYear` changes, efficient D3 transitions update the existing elements.

---

## 24. Interactive Map

### Technology

Leaflet + React-Leaflet with CARTO light basemap tiles.

### Visual Design

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            Map with tile layer                   │
│                                                  │
│      ●──────────────●                            │
│   (blue)       (orange)                          │
│      ●────●                                      │
│            ╲                                     │
│             ●                                    │
│                                                  │
├──────────────────────────────────────────────────┤
│ ● U.S.  ● Mexico  ● Other  ── Top routes   hint │
└──────────────────────────────────────────────────┘
```

### Marker System

| Feature | Specification |
|---|---|
| **Sizing** | Square-root scaling: `radius = sqrt(volume / maxVolume) × range`. Range: 4px (min) to 20px (max). |
| **Fixed radius mode** | When `fixedRadius` prop is set, all markers use that exact radius. |
| **Category coloring** | U.S./Texas (blue), U.S. Other (light blue), Mexico (orange), Other (gray-green). |
| **Stroke** | Darker shade of category color, 1.5px width. |
| **Fill opacity** | 85% at rest. |

### Marker Interaction States

| State | Visual Change |
|---|---|
| **Hover** | Radius +2px, gold stroke (weight 3), fillOpacity 1 |
| **Selected** | Radius +3px, white stroke (weight 3), fillOpacity 1 |
| **Highlighted (border airports)** | Gold stroke (`#E8B923`, weight 2.5), fillOpacity 0.95 |

### Route Arcs

| Feature | Specification |
|---|---|
| **Shape** | Great-circle arc computed with 30 interpolation points. |
| **Default (no selection)** | Top N routes shown with dashed lines (`strokeDasharray: 6 4`), blue color, 2.5px width, 60% opacity. |
| **Selected airport** | All routes for that airport shown with solid orange lines, 3px width, 70% opacity. |
| **Hover tooltip** | Follows mouse cursor (sticky mode) showing route label and value. |

### Scroll Wheel Guard

| Feature | Specification |
|---|---|
| **Default state** | Scroll zoom is DISABLED. Map shows passive state. |
| **Activation** | User must click the map to enable scroll zoom. |
| **Visual indicator** | On wheel event while inactive, a translucent overlay appears: "Click the map to enable zooming". |
| **Deactivation** | Scroll zoom re-disables when the mouse leaves the map container. |
| **Rationale** | Prevents accidental map zooming when the user is scrolling the page. |

### Airport Region Display

| Feature | Specification |
|---|---|
| **`region` field** | Optional state or country name passed per airport. Shown in popup after the city name. |
| **`formatCityRegion()` helper** | Strips the trailing ", ST" or ", Country" suffix from BTS city names (e.g., "Abilene, TX") to avoid redundancy (e.g., "Abilene, TX, Texas"), then appends the full region name. |
| **Hover tooltip** | Shows `(region)` after the airport name when available. |

### Custom Arc & Marker Colors

| Feature | Specification |
|---|---|
| **Per-arc color** | Arcs use `arc.color` when provided, falling back to existing default/selected logic. Used for color-coding routes by origin airport in the route network evolution animation. |
| **Per-marker color** | Markers use `a.color` for `fillColor` when provided, falling back to the default `markerColor(a.country)` category logic. |

### Popup System

| Feature | Specification |
|---|---|
| **Marker popup** | Shows airport name, IATA code, city (with region if available), and formatted metric value with unit label. |
| **Portal tooltip** | Fixed-position tooltip rendered via React portal to `document.body`. Follows cursor for arc hover, anchored to marker for marker hover. |
| **Map move sync** | Tooltip position updates on map move/zoom via `latLngToContainerPoint()`. |

### Map Controls

| Control | Specification |
|---|---|
| **Zoom +/−** | Leaflet default, top-left corner. |
| **Reset zoom (home)** | Custom button below zoom controls. Resets to initial center and zoom level. |
| **Metric selector** | `<select>` dropdown in ChartCard header (via `headerRight`), switching between Passengers, Freight (lbs), Mail (lbs), Flights. |

### Legend Bar

Bottom of map, white background at 90% opacity with top border. Contains:
- Category color dots with labels (U.S., Mexico, Other, optionally Texas Border)
- Route line style indicators (dashed for top N, solid for selected airport)
- Size legend (small + large circles indicating volume → radius relationship)
- Custom legend items (when provided by parent)
- Hint text on right side (e.g., "Click airport to explore connections")

### Locked Mode

When `locked=true`, all map interactions are disabled: no zoom, no drag, no scroll, no keyboard. Used for small preview maps (e.g., border airport introduction mini-map).

### Auto-Fit Bounds

When `fitToAirports=true`, the map automatically adjusts its viewport to show all airport markers, with padding.

---

## 25. Data Table

### Structure

```
┌──────────────────────────────────────────────────┐
│ Origin ▲  │ Destination  │ Passengers │ Freight  │
├───────────┼──────────────┼────────────┼──────────┤
│ DFW       │ CUN          │ 1,234,567  │ 45,231   │
│ IAH       │ MEX          │   987,654  │ 38,102   │
│ AUS       │ CUN          │   654,321  │ 12,455   │
│ ...       │ ...          │ ...        │ ...      │
├───────────┴──────────────┴────────────┴──────────┤
│ Showing 1-10 of 45 records     [Prev]  1/5 [Next]│
└──────────────────────────────────────────────────┘
```

### Core Features

| Feature | Specification |
|---|---|
| **Sorting** | Click column header to sort ascending; click again for descending. |
| **Sort icons** | Unsorted: double chevron at 40% opacity. Ascending: chevron-up (brand blue). Descending: chevron-down (brand blue). |
| **Null handling** | Null values pushed to end regardless of sort direction. |
| **Type detection** | Numeric values use numeric comparison; strings use `localeCompare`. |
| **Pagination** | Default 10 rows per page, "Showing X–Y of Z records" label, Prev/Next buttons with page indicator. |
| **Page boundary** | Buttons disabled at first/last page (40% opacity, not-allowed cursor). |
| **Reset on sort** | Changing sort column/direction resets to page 1. |

### Column Width Stability

For paginated tables without wrapping columns:
1. An off-screen hidden table renders ALL rows (not just the current page).
2. Maximum column widths are measured across the full dataset.
3. These widths are applied via `<colgroup>` + `table-layout: fixed`.
4. **Result**: Columns never shift when clicking next/previous page.

### Text Wrapping

| Column Config | Behavior |
|---|---|
| Default (no `wrap`) | `white-space: nowrap` — single line, prevents wrap |
| `wrap: true` | `overflow-wrap: anywhere` — multi-line, breaks mid-word when needed. Minimum width: `minWidth` (default 80px). |
| Table with wrap columns | Uses `w-full` and auto layout (not fixed layout) so text can reflow naturally. |
| Table without wrap | Uses `w-fit` so table sizes to content and stays centered. |

### Row Styling

| Feature | Specification |
|---|---|
| **Alternating rows** | White / surface-alt at 40% opacity |
| **Hover** | Brand blue at 3% opacity |
| **Row borders** | 1px bottom border using border-light at 60% opacity |
| **Cell padding** | 12px horizontal, 10px vertical |
| **Font** | 16px, primary color for data, secondary for headers |

### Fullscreen Dynamic Page Size

When inside a fullscreen overlay (detected via `.fullscreen-chart-area` ancestor):
- A ResizeObserver measures available height.
- Page size is dynamically calculated: `floor((height − headerHeight − footerHeight) / rowHeight)`.
- Different row height constants for single-line (41px) and multi-line (72px) modes.
- **Result**: Table shows as many rows as fit the viewport without scrolling.

### Root Container

`w-fit max-w-full mx-auto` — table sizes to its content and is centered. Never stretched to full width (unless wrap columns force it). This prevents tables from looking sparse with wide empty columns.

---

## 26. Filter System

### Architecture

```
Page Component
  │
  ├── defines buildApplicators(filters)  ← maps filter keys to row-filter functions
  ├── defines EXTRACTORS                 ← maps filter keys to value-extractor functions
  │
  ├── useCascadingFilters(baseData, buildApplicators, EXTRACTORS, filters, setFilters)
  │     │
  │     ├── Computes "pools" for each filter
  │     │   (for filter K, pool = baseData filtered by all filters EXCEPT K)
  │     │
  │     └── Auto-prunes stale selections via useEffect
  │           (removes selected values no longer in the valid pool)
  │
  ├── Renders filter controls with options derived from pools
  │
  └── Applies all filters to compute filtered datasets for charts/stats
```

### Filter Types

| Type | Component | Store State | "All" Value | Usage |
|---|---|---|---|---|
| **Single-select** | `FilterSelect` | `string` | `''` (empty string) | Filters with 2 mutually exclusive options (Direction, Carrier Type) |
| **Multi-select** | `FilterMultiSelect` | `string[]` | `[]` (empty array) | Filters with 3+ options where multiple selections make sense (Year, State, Airport, Carrier) |

### FilterSelect (Single-Select)

| Feature | Specification |
|---|---|
| **Element** | Native `<select>` with custom appearance |
| **Custom chevron** | ChevronDown icon absolutely positioned at right, pointer-events disabled |
| **Label** | Uppercase, 16px, medium weight, secondary color |
| **Focus ring** | 2px brand-blue at 20% opacity + brand-blue border |
| **"All" option** | Always present as first option with configurable label, value `""` |
| **Options** | Supports both plain strings and `{ value, label }` objects |

### FilterMultiSelect (Multi-Select)

| Feature | Specification |
|---|---|
| **Trigger button** | Styled identically to FilterSelect. Display label: "All" (none selected), single item name (1 selected), "N selected" (2+ selected). |
| **Dropdown** | Absolute-positioned below (or above if not enough space below). Walks up the DOM tree to find the nearest element with `overflow: auto|scroll`, then measures available space within that container's visible bounds — not the viewport — to determine drop direction. Flips above when more space is available above than below. |
| **Checkboxes** | 16×16 squares: checked = brand-blue fill + white check icon, unchecked = white + gray border. |
| **Selected items** | Blue background at 10% opacity, medium weight, brand-blue text. |
| **Search** | Optional search input at top of dropdown. Auto-focused on open via `requestAnimationFrame`. Case-insensitive `includes()` filtering. |
| **Grouped options** | Supports two levels: simple groups (`{ label, options }`) and nested subgroups (`{ label, subgroups }`) with sticky headers for scroll context. |
| **Group headers** | 11px (simple) or 10px (subgroup) uppercase bold text on gray background. |
| **Outside click** | Closes dropdown on `mousedown` outside. |
| **Chevron animation** | Rotates 180° when dropdown is open. |
| **Auto-reset** | When all options are individually checked, automatically resets to `[]` (the "All" state). |

### Active Filter Tags

```
 Year: [2024 ×]     Direction: [TX to MX ×]     Carrier: [American ×] [United ×]
```

| Feature | Specification |
|---|---|
| **Layout** | Tags grouped by filter category. Category label above tags. |
| **Tag styling** | Inline pill: brand-blue at 10% background, brand-blue text, blue border at 20% opacity. |
| **Remove button** | Small X icon (10px) per tag, hover: darker blue background. |
| **Grouping** | Tags organized by `group` property, preserving insertion order. |

### Filter Sidebar (Desktop, ≥ 1024px)

| Feature | Specification |
|---|---|
| **Position** | Fixed to right side of viewport, sticky below header chrome. |
| **Width** | 288px (expanded), 48px (collapsed). 300ms slide transition. |
| **Background** | Light blue-gray (`#edf1f7`). Header: slightly darker (`#e4e9f1`). |
| **Content** | Active filter tags, "Reset all filters" button (when active), filter controls (children), page-level download buttons. |
| **Collapse toggle** | Panel icon in header, toggles between expanded and collapsed states. |
| **Collapsed state** | Shows filter icon + active count badge. Scroll-to-top arrow button when applicable. |
| **Back to top** | Appears when scroll position > 300px. Smooth scroll to top. |
| **Page download** | "Download Page Data" section with Market Data and Segment Data CSV buttons. |

### Filter Bar (Mobile/Tablet, < 1024px)

| Feature | Specification |
|---|---|
| **Position** | Inline above content (not fixed/sticky). |
| **Layout** | White card with border, flex-wrap for filter controls. |
| **Count badge** | Shows active filter count in brand-blue pill. |
| **Reset button** | Rounded-full pill with brand-blue border. |

### Cascading Filter Logic

When filters are interdependent (selecting a year narrows available airports, selecting a state narrows available airports, etc.):

1. For each filter key K, compute a "pool" by applying all filters EXCEPT K to the base dataset.
2. Extract unique values from that pool to determine K's valid dropdown options.
3. Auto-prune: if any selected values are no longer in the valid pool, remove them silently via batch `setFilters()`.
4. **Result**: Selecting Year=2024 narrows airport/carrier/state options to only those that appear in 2024 data. Selecting State=Florida narrows airport options to Florida airports.

### Direction Sanitization

Each page uses different direction values (e.g., `TX_TO_US` vs `TX_TO_MX`). When navigating between pages, a `useEffect` resets the direction filter to `''` if its current value doesn't belong to the new page's valid options.

### Four Filtered Dataset Variants

Every data page computes four memoized datasets:

| Dataset | Filters Applied | Used For |
|---|---|---|
| `filtered` | All filters (market data) | Point-in-time: stat cards, rankings, donuts, bars, maps, tables |
| `filteredSegment` | All filters (segment data) | Point-in-time: operations, capacity, aircraft data |
| `filteredNoYear` | All filters EXCEPT year (market) | Trend charts (full time series, not narrowed by year) |
| `filteredSegmentNoYear` | All filters EXCEPT year (segment) | Trend charts using segment data |

**Rationale**: Trend charts exist to show the complete historical trajectory. Filtering them by year would defeat their purpose — you'd see a single point instead of a line. The year filter only applies to "snapshot" visualizations.

---

## 27. Tab Navigation

### Visual Design

```
┌──────────────────────────────────────────────────┐
│  ╭────────────╮ ╭──────────╮ ╭──────────╮       │
│  │ ● Overview │ │Passengers│ │Operations│  ...   │
│  ╰────────────╯ ╰──────────╯ ╰──────────╯       │
└──────────────────────────────────────────────────┘
```

### Features

| Feature | Specification |
|---|---|
| **Shape** | Pill buttons (`rounded-full`) |
| **Active tab** | Brand-blue background, white text, medium shadow |
| **Inactive tab** | White background, secondary text, light border, blue hover effects |
| **Transition** | 200ms `transition-all` for smooth color/border/shadow changes |
| **Icon support** | Optional Lucide icon (18px) before label text |
| **Container** | Centered flex row, 8px gap, horizontal scroll on overflow |
| **Scrollbar** | Hidden (custom `scrollbar-hide` utility) — swipe to scroll on mobile |
| **Background** | Surface alt with top/bottom borders, 12px vertical padding |

### Keyboard Navigation (Full ARIA Tab Pattern)

| Key | Behavior |
|---|---|
| **ArrowRight** | Move to next tab (wraps from last to first) |
| **ArrowLeft** | Move to previous tab (wraps from first to last) |
| **Home** | Jump to first tab |
| **End** | Jump to last tab |
| **Tab** | Normal focus behavior — active tab has `tabIndex=0`, inactive have `tabIndex=-1` (roving tabindex) |

All four arrow/home/end keys call `preventDefault()` (prevent scroll), trigger `onChange`, and programmatically focus the new tab button.

### Accessibility

- Container: `role="tablist"`
- Each button: `role="tab"`
- Active: `aria-selected={true}`, `tabIndex={0}`
- Inactive: `aria-selected={false}`, `tabIndex={-1}`

### Tab State Management

Tab state can be either local (`useState`) or synced to URL search params (`useSearchParams`). When URL-synced, the active tab key is stored as `?tab=key` in the URL, enabling shareable links to specific tabs. Tab changes use `history.replace()` (not `push`) to avoid polluting browser history. Invalid or missing tab params fall back to the default tab (e.g., `'overview'`). On tab switch, the page scrolls to the tab bar position.

### Data Architecture

All data computation hooks (`useMemo`) live in the parent orchestrator component, not in tab sub-components. Tabs are purely presentational — they receive pre-computed data as props. This prevents expensive re-computation when switching tabs and keeps the data flow explicit.

---

## 28. Insight Callouts

Dynamic, data-driven narrative callouts that surface key findings inline within page content.

### Visual Design

```
│  💡  Key Finding Title
│      Supporting context explaining the significance
│      of this finding in muted italic text.
```

### Features

| Feature | Specification |
|---|---|
| **Left border** | 3px solid accent line |
| **Icon badge** | 36×36 rounded-lg container with 10% opacity background, centered icon |
| **Finding text** | Bold (600), 16px, primary color |
| **Context text** | Italic, 16px, secondary color, relaxed line height, 4px top margin |
| **Layout** | Flex row, 16px gap between icon badge and text |
| **Padding** | 16px left (after border), 8px vertical |

### Variant System

| Variant | Border Color | Icon Background | Usage |
|---|---|---|---|
| `default` | Brand Blue | Blue at 10% | Standard insights (market share, rankings) |
| `highlight` | Brand Green | Green at 10% | Positive findings (COVID recovery, growth) |
| `warning` | Brand Orange | Orange at 10% | Concentration risks, capacity concerns |

### Data-Driven Content

InsightCallout is purely presentational. All computation logic lives in page-level `useMemo` hooks. Examples of computed insights:

- "DFW and IAH account for 78% of all TX-MX passenger traffic" (warning — concentration)
- "TX-MX passenger volume has recovered to 115% of pre-COVID levels" (highlight — positive)
- "Mexico receives 62% of all Texas international passengers" (default — notable)
- "Texas ranks #2 nationally for US-MX passengers but #4 for cargo" (default — disparity)

---

## 29. Fullscreen Mode

### Architecture

When a user clicks the fullscreen button on any ChartCard:

1. ChartCard hides its children (the chart).
2. A `FullscreenChart` component is rendered via `createPortal(element, document.body)`.
3. The portal creates a full-viewport overlay (`fixed inset-0 z-[100]`).
4. The chart component re-renders inside the overlay at full size.
5. Body scroll is disabled (`overflow: hidden`).

### Layout

```
┌──────────────────────────────────────────────────┐
│  Chart Title (larger)    [CSV] [PNG]    [Close]  │
├──────────────────────────────┬───────────────────┤
│                              │ ╔═══════════════╗ │
│                              │ ║  Filters      ║ │
│    Chart at Full Size        │ ║  (sidebar)    ║ │
│                              │ ║               ║ │
│                              │ ║ Active Tags   ║ │
│                              │ ║ Reset All     ║ │
│                              │ ║ Filter 1      ║ │
│                              │ ║ Filter 2      ║ │
│                              │ ╚═══════════════╝ │
└──────────────────────────────┴───────────────────┘
```

### Features

| Feature | Specification |
|---|---|
| **Background** | White |
| **Z-index** | 100 (above everything) |
| **Animation** | `animate-fade-in` (400ms opacity transition) |
| **Close methods** | Close button, Escape key |
| **Scroll lock** | `document.body.style.overflow = 'hidden'` on mount, restored on unmount |
| **Title scaling** | 24px (mobile) / 36px (desktop) |

### Fullscreen Filter Sidebar

| Feature | Specification |
|---|---|
| **Visibility** | Hidden on mobile (`hidden md:flex`). Only when FilterContext is available. |
| **Width** | 288px (expanded), 48px (collapsed). 300ms transition. |
| **Background** | Light blue-gray (`#edf1f7`) |
| **Content** | Active filter count, active filter tags, "Reset all filters" button, filter controls |
| **Collapse toggle** | Panel icon toggles expanded/collapsed |

### Chart Behavior in Fullscreen

| Feature | Normal Mode | Fullscreen Mode |
|---|---|---|
| **Chart height** | Fixed default height | `max(defaultH, containerHeight)` |
| **Line stroke** | 2.5px | 5px (via CSS `.fullscreen-chart-area svg .line-path`) |
| **Data dots** | 3.5px radius, 2px stroke | 6px radius, 3px stroke (via CSS) |
| **Font size** | 16px | 18–22px (responsive to width) |
| **Margins** | Compact | Expanded (more right padding, larger minimum left margin) |
| **DataTable** | Fixed page size | Dynamic page size (fills available height) |
| **Map** | Normal flex | `flex: 1` to fill space, legend stays at natural height |
| **Action buttons** | Icons only | Icons + text labels |

### Action Buttons (Fullscreen Header)

| Button | Style | Behavior |
|---|---|---|
| **Download CSV** | Larger labeled button with Download icon (18px) + "Download CSV" text | Same dropdown as ChartCard |
| **Export PNG** | Surface-alt background, border, labeled | Same PNG export |
| **Close** | Brand-blue background, white text, labeled with "(Esc)" hint in title | Closes overlay |

---

## 30. Download & Export

### CSV Download

| Feature | Specification |
|---|---|
| **Trigger** | Click download icon in ChartCard header, or "Download CSV" button in fullscreen |
| **Options** | When both summary (aggregated) and detail (row-level) data are available, a dropdown offers both. When only one is available, clicking downloads immediately. |
| **Column mapping** | Optional `columns` object maps internal field names to human-readable CSV headers. Only mapped fields are exported. |
| **Encoding** | UTF-8 BOM prepended (`\uFEFF`) so Excel opens with correct encoding |
| **Value escaping** | Values with commas, quotes, or newlines are wrapped in double quotes with quote escaping (`""`) |
| **Zoom filtering** | When a chart is zoomed, the exported CSV only includes rows within the visible range (via ZoomRangeContext) |
| **File format** | `.csv` extension, no timestamp in filename |
| **Download mechanism** | Blob → object URL → dynamic `<a>` element → click → revoke URL |

### PNG Export

| Feature | Specification |
|---|---|
| **Resolution** | 2× canvas (retina quality) |
| **Background** | White |
| **Header** | Optional title (18px, semibold 600, dark text) + subtitle (16px, normal weight, gray). 20px padding, 12px gap below header. |
| **SVG processing** | Clone SVG → remove `.export-ignore` elements → inline computed CSS styles → replace `foreignObject` with native SVG `<text>` → serialize to blob |
| **CSS inlining** | Recursively copies 16 SVG-relevant CSS properties (font, fill, stroke, opacity, etc.) from live DOM to clone |
| **foreignObject replacement** | Extracts text from leaf `<div>` elements, creates SVG `<text>` nodes, truncates labels to fit cell width |
| **Rationale for foreignObject replacement** | Browsers block HTML inside SVG when loaded as `Image` for canvas drawing. Native SVG text elements bypass this security restriction. |
| **Output** | PNG via `canvas.toDataURL('image/png')` → download |

### Page-Level Download

The filter sidebar includes a "Download Page Data" section with two CSV buttons:
- **Market Data** — full filtered market dataset for the current page
- **Segment Data** — full filtered segment dataset for the current page

Both use centralized column mapping to produce clean, consistently named CSV files.

### Dropdown Behavior

| Feature | Specification |
|---|---|
| **Position** | Absolute, below the trigger button, right-aligned |
| **Style** | White card, rounded-lg, shadow-lg, border, min-width 160px, z-50 |
| **Items** | "Summary (CSV)" and "Detail (CSV)" with Download icons |
| **Outside click** | Closes on `pointerdown` outside |
| **Visibility** | Returns `null` (renders nothing) when no data is available to download |

---

## 31. Footer

### Design

```
┌──────────────────────────────────────────────────┐
│  Data source: Bureau of Transportation           │
│  Statistics (BTS) T-100, 2015–2024               │
└──────────────────────────────────────────────────┘
```

| Feature | Specification |
|---|---|
| **Background** | Light gray at 60% opacity with top border |
| **Container** | 1280px max, centered, 16px vertical padding |
| **Text** | 16px, secondary gray, centered |
| **Content** | Static data source attribution |
| **Conditional** | Hidden on the Overview (home) page to avoid redundancy with the page's own data source section |
| **Element** | `<footer>` semantic HTML |

---

## 32. Page Storytelling Pattern

Every data page follows a consistent narrative structure:

### 1. Hero Banner → Context Setting
The gradient blue hero provides the page title and a one-line description that frames the analytical scope.

### 2. Narrative Introduction → The "Why"
The first `SectionBlock` contains 1-2 paragraphs of prose explaining the significance of this data slice. Written in a professional but accessible tone, it establishes the real-world context (economic corridors, trade relationships, COVID impacts).

### 3. Insight Callouts → Key Findings
1-2 dynamically computed `InsightCallout` components surface the most notable patterns in the current data (accounting for active filters). These are computed in `useMemo` hooks and update in real-time as filters change.

### 4. KPI Stat Cards → The Headlines
4-5 stat cards provide the summary numbers. The first card (typically passengers) is highlighted with a gradient background and shows a YoY trend. All cards include the year in their label.

### 5. Route Map → Spatial Context
An interactive map shows the geographic distribution of activity. Users can switch metrics, click airports to explore connections, and zoom/pan.

### 6. Trend Charts → Historical Trajectory
A 2×2 grid of line charts shows the full time series (2015-2024) for key metrics. These are NOT filtered by the year filter — their purpose is to show the complete trend, with COVID annotation bands for context.

### 7. Detailed Charts → Evidence
Rankings (bar charts), breakdowns (donuts, treemaps), comparisons (diverging bars, scatter plots), and distributions (box plots) provide detailed analytical evidence. These ARE filtered by all filters including year.

### 8. Chart Annotations → Interpretation
Italic text below charts (via the `footnote` prop) explains what to look for: "Notice the sharp decline in 2020 reflecting COVID-19 travel restrictions" or "The asymmetry between export and import volumes suggests differing cargo patterns by direction."

### 9. Data Table → Raw Evidence
A paginated, sortable table provides access to the underlying data for verification and exploration.

### Section Background Alternation
White and gray backgrounds alternate between sections, creating a visual rhythm that groups related content and separates distinct analytical topics.

---

## 33. Responsive Design Strategy

### Layout Transitions

| Viewport | Layout Changes |
|---|---|
| **Mobile (< 640px)** | Single-column everything. Stat cards stack. Charts full-width. Hamburger nav. Filter bar inline. |
| **Small tablet (≥ 640px)** | 2-column stat card grid. Most content still single-column. |
| **Tablet (≥ 768px)** | Desktop nav appears. 2-column chart grids. Hero text scales up. Fullscreen action labels visible. |
| **Desktop (≥ 1024px)** | Filter sidebar appears on right. Content area shifts left. 3-4 column grids. |
| **Wide (≥ 1280px)** | Container chrome reaches max-width. Content benefits from full remaining width. |

### Chart Responsiveness

- All charts use `useChartResize` (ResizeObserver) to re-render when their container changes size.
- Charts are fully re-drawn on resize (SVG cleared and rebuilt) rather than scaled/stretched.
- Margins adjust based on available width (label truncation, axis label space).
- Font sizes stay fixed at 16px in normal mode (no scaling down for narrow charts).
- Horizontal bar charts handle narrow widths by reducing label space proportionally.

### Touch Considerations

- Map scroll zoom requires a deliberate click to activate (prevents accidental zoom on scroll).
- Tab bar supports horizontal swipe scrolling (overflow-x-auto with hidden scrollbar).
- Dropdown menus position themselves dynamically based on available space above/below.
- All interactive elements have adequate touch targets (minimum 44px height for buttons in nav bar).

---

## 34. Animation & Motion Design

### Entrance Animations

| Element | Animation | Duration | Easing | Stagger |
|---|---|---|---|---|
| **Stat cards** | Fade up (12px Y offset → 0, opacity 0 → 1) | 500ms | ease-out | Per card via `delay` prop |
| **Line chart lines** | Stroke-dashoffset drawing | 1000ms | cubicOut | 200ms per series |
| **Line chart dots** | Opacity 0 → 1 | 300ms | — | Appears after line finishes |
| **Bar chart bars** | Width/height grow from 0 | 600ms | — | 30ms per bar |
| **Stacked bar layers** | Height grows from bottom | 600ms | — | 20ms per column + 100ms per layer |
| **Donut slices** | Opacity 0 → 1 | 600ms | — | 60ms per slice |
| **Treemap cells** | Opacity 0 → 0.85 | 500ms | — | 30ms per cell |
| **Scatter dots** | Opacity 0 → 0.85 | 400ms | — | 25ms per dot |
| **Lollipop stems** | x2 grows from 0 | 600ms | — | 50ms per row |
| **Box plot boxes** | Expand from median | 600ms | — | 50ms per category |
| **Bar chart race** | Enter/update/exit keyed joins | 750ms | — | Simultaneous |
| **Fullscreen overlay** | Opacity 0 → 1 | 400ms | ease-out | — |

### Interaction Transitions

| Element | Property | Duration |
|---|---|---|
| Card hover shadow | `shadow-xs` → `shadow-md` | 300ms |
| Button hover color | Text/background color change | 150ms |
| Nav link hover | Background + text color | 200ms |
| Tab button active | Background, color, shadow | 200ms |
| Sidebar expand/collapse | Width | 300ms |
| Mobile menu slide | Max-height + opacity | 300ms |
| Dropdown chevron rotation | Transform rotate | 200ms |
| Map arc tooltip | Follow cursor | Immediate |
| Donut hover expansion | Arc radius change | Immediate (d3 path recompute) |
| Heatmap crosshair | Box-shadow, scale | CSS transitions |
| Tooltip appear/disappear | Opacity | 150ms |

### Animation Principles

1. **One animation per component lifecycle.** Entrance animations run once when the component mounts (tracked via ref). They don't replay on data updates or filter changes.

2. **Staggered reveals.** Multiple sibling elements animate in sequence with small delays (20-60ms), creating a cascading wave effect that's more visually appealing than simultaneous motion.

3. **Fast interactions, slow entrances.** Hover/click feedback is fast (150-200ms) for responsive feel. Entrance animations are slower (500-1000ms) for visual impact.

4. **Easing matters.** Entrance animations use ease-out (fast start, gentle stop) for a natural "arriving" feel. D3 line drawing uses cubicOut for smooth deceleration.

5. **No animation on resize/zoom.** When charts rebuild due to resize events or zoom gestures, they render instantly without entrance animations.

---

## 35. Accessibility

### Semantic HTML

| Element | Usage |
|---|---|
| `<header>` | Site header (landmark) |
| `<nav>` | Main navigation, breadcrumb navigation (navigation landmark) |
| `<main>` | Primary page content (main landmark) |
| `<footer>` | Site footer (contentinfo landmark) |
| `<section>` | Content sections (SectionBlock) |

### Keyboard Navigation

| Context | Keys | Behavior |
|---|---|---|
| **Tab navigation** | ArrowLeft, ArrowRight, Home, End | Roving tabindex pattern. Only active tab has `tabIndex=0`. |
| **Fullscreen overlay** | Escape | Closes the overlay |
| **Map** | Default Leaflet keyboard | Zoom +/−, arrow keys for pan |
| **Data table** | Tab | Focus moves through sortable column headers |
| **Navigation** | Tab | Standard link focus order |

### ARIA Attributes

| Component | Attributes |
|---|---|
| Tab container | `role="tablist"` |
| Tab buttons | `role="tab"`, `aria-selected={true/false}` |
| Hamburger button | `aria-label="Toggle navigation"` |
| Logo image | `alt="TxDOT"` |
| Form labels | Connected via `useId()` and `htmlFor`/`id` pairing |

### Color Contrast

- Primary text (`#333f48`) on white meets WCAG AA (7.8:1 ratio).
- Secondary text (`#5a6872`) on white meets WCAG AA (5.3:1 ratio).
- White text on brand-blue (`#0056a9`) meets WCAG AA (5.5:1 ratio).
- Heatmap cells switch to white text when background intensity > 45%, maintaining readability.
- Chart tooltips use high-contrast dark backgrounds with white text.

### Screen Reader Considerations

- Chart data is available as downloadable CSV for non-visual consumption.
- Stat cards use semantic grouping (label + value + trend).
- Empty states provide descriptive messages rather than blank content.
- Error boundaries display recovery actions with descriptive text.

---

## 36. Anti-Patterns & Pitfalls

### Chart Height Feedback Loop (Critical)

**Problem**: When a chart reads its container height and sets SVG height to match, inside a CSS grid/flex layout with `h-full` containers, a feedback loop occurs:
1. Container height depends on SVG height.
2. SVG height depends on container height (via ResizeObserver).
3. Charts grow to 8000+ px, rendering only gridlines with data invisible.

**Solution**: NEVER use `containerHeight` for SVG height in normal mode. Use a fixed computed default height. Only use `containerHeight` in fullscreen mode:
```
height = isFullscreen ? max(defaultH, containerHeight) : defaultH
```

### Chart Card Children Clipping (Critical)

**Problem**: Placing `<p>` or text elements as children of ChartCard alongside a chart component causes the text to be pushed below the visible area and clipped by `overflow-hidden`. The tops of text characters peek through as faint "lines" at the bottom of the card.

**Solution**: NEVER put text elements as ChartCard children alongside charts. Use the `footnote` prop:
```jsx
<ChartCard footnote={<p>Annotation text here</p>}>
  <LineChart ... />
</ChartCard>
```

### Unicode Escape Sequences in JSX (Critical)

**Problem**: `\uXXXX` escape sequences (e.g., `\u2013` for en-dash) render as literal text in JSX string attributes. Users see `\u2013` instead of `–`.

**Solution**: Always use actual Unicode characters or HTML entities:
- JSX attributes: `title="Texas–Mexico"` (actual character)
- JSX text children: `&ndash;` (HTML entity)
- JS strings in `{}`: `` label={`Texas–Mexico`} `` (actual character)

### Currency Formatting for Non-Currency Data

**Problem**: Using dollar-sign formatting (`$5.3M`) for passenger counts, flights, or freight weights.

**Solution**: Use the correct formatter for each data type:
- Passengers, flights, seats: `formatCompact` → `5.3M`
- Freight, mail (pounds): `fmtLbs` → `5.3M lbs`
- Currency (actual money): `formatCurrency` → `$5.3M`
- Percentages: inline `(v) => \`${v}%\`` → `85.2%`

### Full-Width Tables

**Problem**: Data tables stretched to `w-full` with few columns create wide empty space and look sparse.

**Solution**: Use `w-fit max-w-full mx-auto` so tables size to their content and are centered. Only use `w-full` when wrap columns are present and need horizontal space.

### Trend Charts Filtered by Year

**Problem**: Line charts showing historical trends (2015-2024) that are filtered by the year dropdown — showing a single point instead of a full trend line.

**Solution**: Trend charts receive `filteredNoYear` data (all filters applied EXCEPT year). Only "snapshot" visualizations (stat cards, rankings, donuts, maps, tables) use the year-filtered dataset.

### Tooltip via innerHTML

**Problem**: Building tooltip content via `innerHTML` creates XSS vulnerabilities if any data values contain HTML.

**Solution**: Build tooltips with safe DOM APIs: `createElement`, `textContent`, `appendChild`. Never use `innerHTML` for data-driven content.

### Over-Animating

**Problem**: Re-running entrance animations on every data update or filter change, causing visual noise and distraction.

**Solution**: Track animation state with a ref. Only run entrance animations once per component lifecycle. Data updates should be instant (no transition) or use subtle transitions only for persistent elements (bar chart race enter/update/exit).

---

## Appendix A: Component Quick Reference

| Component | Type | Primary Use |
|---|---|---|
| SiteHeader | Layout | Top-level brand bar with logo, title, action button |
| MainNav | Layout | Horizontal/hamburger navigation |
| PageWrapper | Layout | Page shell (header + nav + main + footer + AI drawer) |
| DashboardLayout | Layout | Two-column content + filter sidebar |
| PageHeader | Layout | Breadcrumbs + page title + subtitle |
| SectionBlock | Layout | Alternating white/gray content bands |
| Footer | Layout | Data source attribution |
| StatCard | UI | KPI metric card with trend indicator |
| ChartCard | UI | Universal chart wrapper with title, actions, export |
| DataTable | UI | Sortable, paginated, column-stable table |
| FullscreenChart | UI | Full-viewport chart overlay via portal |
| DownloadButton | UI | CSV download with optional dropdown |
| InsightCallout | UI | Data-driven narrative callout |
| TabBar | UI | Horizontal pill-tab navigation |
| ErrorBoundary | UI | Error catch with recovery action |
| MapPlaceholder | UI | Placeholder when map data unavailable |
| FilterSidebar | Filter | Desktop sticky sidebar |
| FilterBar | Filter | Mobile/tablet inline filter bar |
| FilterSelect | Filter | Single-select native dropdown |
| FilterMultiSelect | Filter | Multi-select checkbox dropdown |
| ActiveFilterTags | Filter | Pill tags for active filter display |
| LineChart | Chart | Time-series trends with zoom, annotations, multi-series |
| BarChart | Chart | Horizontal/vertical bar rankings |
| StackedBarChart | Chart | Stacked time-series or category breakdown |
| DonutChart | Chart | Proportional share with interactive selection |
| TreemapChart | Chart | Hierarchical area comparison |
| DivergingBarChart | Chart | Bilateral comparison from center axis |
| LollipopChart | Chart | Ranked data with long route labels |
| BoxPlotChart | Chart | Statistical distribution per category |
| ScatterPlot | Chart | Two-variable relationship with color/size encoding |
| HeatmapTable | Chart | Color-intensity origin-destination matrix |
| BarChartRace | Chart | Animated ranking evolution over time |
| AirportMap | Map | Leaflet markers + great-circle route arcs |

---

## Appendix B: Chart Feature Matrix

| Feature | Line | Bar | Stacked | Donut | Treemap | Diverging | Lollipop | BoxPlot | Scatter | Heatmap | Race |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tooltip | ✓ (fixed) | ✓ (label) | ✓ (fixed) | Center text | ✓ (fixed) | — | ✓ (label) | ✓ (fixed) | ✓ (fixed) | ✓ (float) | ✓ (label) |
| Zoom/Pan | ✓ | — | — | — | — | — | — | — | — | — | — |
| Multi-series | ✓ | — | ✓ | — | — | — | — | — | Color groups | — | — |
| Legend | ✓ | — | ✓ | ✓ (right/bottom) | — | ✓ | — | — | ✓ | — | — |
| Annotations | ✓ (band/line) | — | — | — | — | — | — | ✓ (band) | — | — | — |
| Click interaction | — | ✓ | — | ✓ (select) | — | — | — | — | — | — | — |
| Entrance animation | ✓ (draw) | ✓ (grow) | ✓ (grow) | ✓ (fade) | ✓ (fade) | ✓ (grow) | ✓ (grow) | ✓ (expand) | ✓ (fade) | — | ✓ (join) |
| Fullscreen height | ✓ | ✓ (vert) | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | ✓ |
| Responsive font | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Value labels | — | ✓ (in/out) | — | — | ✓ (in cell) | ✓ (inline) | ✓ (right) | — | ✓ (top-N) | ✓ (in cell) | ✓ (right) |
| Grid lines | ✓ (H+V) | — | ✓ (H+V) | — | — | — | Guide lines | ✓ (H) | ✓ (H+V) | — | — |
| Dynamic margins | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | — | — | ✓ |

---

## Appendix C: Design Token Quick Reference

### Colors (copy-paste ready)

```
Primary Blue:      #0056a9
Dark Blue:         #002e69
Dark Green:        #196533
Light Orange:      #df5c16
Dark Purple:       #5f0f40
Light Green:       #8ec02d
Light Yellow:      #f2ce1b
Light Brown:       #c5bbaa
Red:               #d90d0d

Background:        #ffffff
Background Alt:    #f5f7f9
Border:            #d1d5db
Border Light:      #c4c9cf
Text Primary:      #333f48
Text Secondary:    #5a6872
```

### Font Stack (copy-paste ready)

```
Primary:   'IBM Plex Sans', Verdana, Aptos, Arial, sans-serif
Condensed: 'IBM Plex Sans Condensed', Verdana, Arial, sans-serif
Mono:      'IBM Plex Mono', 'JetBrains Mono', monospace
```

---

*This playbook was generated from the TxDOT Airport Connectivity Dashboard codebase — a production React + D3 + Leaflet application built by the UNT System research team under TxDOT IAC 2025-26.*
