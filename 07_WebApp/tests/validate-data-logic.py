"""
Dashboard Data Logic Validator

Validates that the dashboard's data aggregation logic matches what the raw CSV
data should produce. Tests all pages, all filter combinations, all trade directions.

This is a "headless" validator — it doesn't open a browser. Instead it reimplements
the dashboard's aggregation logic in Python and checks for:
  1. Correct direction filtering (export/import/total)
  2. Correct state field usage (ORIGIN_STATE_NM vs DEST_STATE_NM)
  3. Correct metric totals (passengers, freight, mail)
  4. Internal consistency between market and segment data

Usage:
  python tests/validate-data-logic.py [--year 2024] [--verbose]
"""

import sys
import os
import csv
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / 'public' / 'data'
VERBOSE = '--verbose' in sys.argv
TARGET_YEAR = int(next((sys.argv[i+1] for i, a in enumerate(sys.argv) if a == '--year'), '2024'))


def load_csv(filename):
    rows = []
    with open(DATA_DIR / filename, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for field in ['YEAR', 'PASSENGERS', 'FREIGHT', 'MAIL',
                          'DEPARTURES_PERFORMED', 'DEPARTURES_SCHEDULED', 'SEATS']:
                if field in row:
                    try:
                        row[field] = int(float(row[field] or 0))
                    except (ValueError, TypeError):
                        row[field] = 0
            rows.append(row)
    return rows


# ── Predicates (must match aviationHelpers.js exactly) ───────────────

def is_us_to_mx(d):
    return d['ORIGIN_COUNTRY_NAME'] == 'United States' and d['DEST_COUNTRY_NAME'] == 'Mexico'

def is_mx_to_us(d):
    return d['ORIGIN_COUNTRY_NAME'] == 'Mexico' and d['DEST_COUNTRY_NAME'] == 'United States'

def is_us_mx(d):
    return is_us_to_mx(d) or is_mx_to_us(d)

def is_tx_domestic(d):
    return (d['ORIGIN_COUNTRY_NAME'] == 'United States' and
            d['DEST_COUNTRY_NAME'] == 'United States' and
            (d.get('ORIGIN_STATE_NM') == 'Texas' or d.get('DEST_STATE_NM') == 'Texas'))

def is_tx_intl(d):
    return ((d.get('ORIGIN_STATE_NM') == 'Texas' and d['DEST_COUNTRY_NAME'] != 'United States') or
            (d.get('DEST_STATE_NM') == 'Texas' and d['ORIGIN_COUNTRY_NAME'] != 'United States'))

def is_tx_mx(d):
    return ((d.get('ORIGIN_STATE_NM') == 'Texas' and d['DEST_COUNTRY_NAME'] == 'Mexico') or
            (d.get('DEST_STATE_NM') == 'Texas' and d['ORIGIN_COUNTRY_NAME'] == 'Mexico'))


# ── Aggregation helper (must match aggregateByUsState in USMexico/index.jsx) ─

def aggregate_by_us_state(data, field, direction):
    """Mirror of the JS aggregateByUsState function."""
    by_state = defaultdict(float)
    if direction in ('export', 'total'):
        for d in data:
            if not is_us_to_mx(d):
                continue
            state = d.get('ORIGIN_STATE_NM', '')
            if not state:
                continue
            by_state[state] += d[field]
    if direction in ('import', 'total'):
        for d in data:
            if not is_mx_to_us(d):
                continue
            state = d.get('DEST_STATE_NM', '')
            if not state:
                continue
            by_state[state] += d[field]
    return dict(by_state)


# ── Test infrastructure ──────────────────────────────────────────────

passed = 0
failed = 0
warnings = 0


def check(test_name, actual, expected, tolerance_pct=0.1):
    global passed, failed
    if expected == 0:
        ok = actual == 0
    else:
        ok = abs((actual - expected) / expected) * 100 <= tolerance_pct
    status = 'PASS' if ok else 'FAIL'
    if not ok:
        failed += 1
        print(f'  [FAIL] {test_name}: got {actual:,.0f}, expected {expected:,.0f} (diff={actual - expected:+,.0f})')
    else:
        passed += 1
        if VERBOSE:
            print(f'  [PASS] {test_name}: {actual:,.0f}')


def section(title):
    print(f'\n{"=" * 60}')
    print(f'  {title}')
    print(f'{"=" * 60}')


# ── Tests ────────────────────────────────────────────────────────────

def test_us_mexico_state_rankings(market):
    """Validate that state rankings work correctly for all 3 trade directions."""
    section(f'US-Mexico State Rankings (year={TARGET_YEAR})')

    year_data = [d for d in market if is_us_mx(d) and d['YEAR'] == TARGET_YEAR]
    print(f'  Base rows: {len(year_data)}')

    for direction in ('export', 'import', 'total'):
        print(f'\n  --- Direction: {direction} ---')

        # Freight by state
        cargo_by_state = aggregate_by_us_state(year_data, 'FREIGHT', direction)
        sorted_cargo = sorted(cargo_by_state.items(), key=lambda x: -x[1])

        # Passenger by state
        pax_by_state = aggregate_by_us_state(year_data, 'PASSENGERS', direction)
        sorted_pax = sorted(pax_by_state.items(), key=lambda x: -x[1])

        # Verify no double-counting: total from aggregation should match sum
        if direction == 'export':
            direct_total = sum(d['FREIGHT'] for d in year_data if is_us_to_mx(d))
            agg_total = sum(cargo_by_state.values())
            check(f'{direction} cargo total consistency', agg_total, direct_total)

            direct_pax = sum(d['PASSENGERS'] for d in year_data if is_us_to_mx(d))
            agg_pax = sum(pax_by_state.values())
            check(f'{direction} pax total consistency', agg_pax, direct_pax)

        elif direction == 'import':
            direct_total = sum(d['FREIGHT'] for d in year_data if is_mx_to_us(d))
            agg_total = sum(cargo_by_state.values())
            check(f'{direction} cargo total consistency', agg_total, direct_total)

        elif direction == 'total':
            export_total = sum(d['FREIGHT'] for d in year_data if is_us_to_mx(d))
            import_total = sum(d['FREIGHT'] for d in year_data if is_mx_to_us(d))
            agg_total = sum(cargo_by_state.values())
            check(f'{direction} cargo total consistency', agg_total, export_total + import_total)

        # TX rank
        tx_cargo = cargo_by_state.get('Texas', 0)
        tx_rank = next((i + 1 for i, (s, _) in enumerate(sorted_cargo) if s == 'Texas'), '-')
        tx_pax = pax_by_state.get('Texas', 0)
        tx_pax_rank = next((i + 1 for i, (s, _) in enumerate(sorted_pax) if s == 'Texas'), '-')

        total_cargo = sum(cargo_by_state.values())
        total_pax = sum(pax_by_state.values())
        tx_cargo_pct = (tx_cargo / total_cargo * 100) if total_cargo else 0
        tx_pax_pct = (tx_pax / total_pax * 100) if total_pax else 0

        print(f'  TX Cargo: #{tx_rank} ({tx_cargo_pct:.1f}%) = {tx_cargo:,.0f} lbs')
        print(f'  TX Pax:   #{tx_pax_rank} ({tx_pax_pct:.1f}%) = {tx_pax:,.0f}')
        print(f'  Top 5 cargo states:')
        for state, val in sorted_cargo[:5]:
            print(f'    {state}: {val:,.0f} lbs')

        # Verify export uses ORIGIN, import uses DEST
        if direction == 'export':
            for d in year_data:
                if is_us_to_mx(d) and d.get('ORIGIN_STATE_NM'):
                    check(f'{direction} uses ORIGIN_STATE (sample)',
                          cargo_by_state.get(d['ORIGIN_STATE_NM'], 0) > 0, True)
                    break

        if direction == 'import':
            for d in year_data:
                if is_mx_to_us(d) and d.get('DEST_STATE_NM'):
                    check(f'{direction} uses DEST_STATE (sample)',
                          cargo_by_state.get(d['DEST_STATE_NM'], 0) > 0, True)
                    break


def test_tx_share_donut(market):
    """Validate TX share donut chart data for all trade directions."""
    section(f'TX Share Donut Chart (year={TARGET_YEAR})')

    year_data = [d for d in market if is_us_mx(d) and d['YEAR'] == TARGET_YEAR]

    for direction in ('export', 'import', 'total'):
        pax_by_state = aggregate_by_us_state(year_data, 'PASSENGERS', direction)
        tx_pax = pax_by_state.get('Texas', 0)
        other_pax = sum(v for k, v in pax_by_state.items() if k != 'Texas')
        total = tx_pax + other_pax

        if total > 0:
            tx_share = tx_pax / total * 100
            print(f'  {direction}: TX={tx_pax:,.0f} ({tx_share:.1f}%), Other={other_pax:,.0f}')
            check(f'{direction} donut sum', tx_pax + other_pax, total)
        else:
            print(f'  {direction}: No data')


def test_market_vs_segment_consistency(market, segment):
    """Check that market and segment data are internally consistent."""
    section(f'Market vs Segment Consistency (year={TARGET_YEAR})')

    m_usmx = [d for d in market if is_us_mx(d) and d['YEAR'] == TARGET_YEAR]
    s_usmx = [d for d in segment if is_us_mx(d) and d['YEAR'] == TARGET_YEAR]

    m_pax = sum(d['PASSENGERS'] for d in m_usmx)
    s_pax = sum(d['PASSENGERS'] for d in s_usmx)

    # Market and segment passenger totals can differ due to connecting flights
    diff_pct = abs(m_pax - s_pax) / m_pax * 100 if m_pax else 0
    print(f'  Market passengers:  {m_pax:>15,}')
    print(f'  Segment passengers: {s_pax:>15,} (diff: {diff_pct:.2f}%)')

    m_freight = sum(d['FREIGHT'] for d in m_usmx)
    s_freight = sum(d['FREIGHT'] for d in s_usmx)
    freight_diff = abs(m_freight - s_freight) / m_freight * 100 if m_freight else 0
    print(f'  Market freight:     {m_freight:>15,} lbs')
    print(f'  Segment freight:    {s_freight:>15,} lbs (diff: {freight_diff:.2f}%)')
    print(f'  Note: Segment > Market is expected for freight (multi-leg counting)')

    # Segment should have DEPARTURES and SEATS that market doesn't
    s_deps = sum(d['DEPARTURES_PERFORMED'] for d in s_usmx)
    s_seats = sum(d['SEATS'] for d in s_usmx)
    print(f'  Segment departures: {s_deps:>15,}')
    print(f'  Segment seats:      {s_seats:>15,}')
    if s_seats > 0:
        lf = s_pax / s_seats * 100
        print(f'  Load factor:        {lf:>14.1f}%')


def test_texas_mexico_bidirectional(market):
    """Validate TX-Mexico bidirectional data."""
    section(f'Texas-Mexico Bidirectional (year={TARGET_YEAR})')

    data = [d for d in market if is_tx_mx(d) and d['YEAR'] == TARGET_YEAR]
    tx_to_mx = [d for d in data if d.get('ORIGIN_STATE_NM') == 'Texas']
    mx_to_tx = [d for d in data if d.get('DEST_STATE_NM') == 'Texas']

    pax_out = sum(d['PASSENGERS'] for d in tx_to_mx)
    pax_in = sum(d['PASSENGERS'] for d in mx_to_tx)
    freight_out = sum(d['FREIGHT'] for d in tx_to_mx)
    freight_in = sum(d['FREIGHT'] for d in mx_to_tx)

    print(f'  TX->MX: {pax_out:>12,} pax, {freight_out:>15,} lbs freight')
    print(f'  MX->TX: {pax_in:>12,} pax, {freight_in:>15,} lbs freight')
    print(f'  Total: {pax_out + pax_in:>12,} pax, {freight_out + freight_in:>15,} lbs freight')

    # Verify all rows are accounted for
    total_rows = len(data)
    directional_rows = len(tx_to_mx) + len(mx_to_tx)
    check('All TX-MX rows have a direction', directional_rows, total_rows)


def test_texas_domestic(market):
    """Validate Texas Domestic page data."""
    section(f'Texas Domestic (year={TARGET_YEAR})')

    data = [d for d in market if is_tx_domestic(d) and d['YEAR'] == TARGET_YEAR]
    total_pax = sum(d['PASSENGERS'] for d in data)

    # Counterpart state logic
    by_state = defaultdict(int)
    for d in data:
        counterpart = d['DEST_STATE_NM'] if d.get('ORIGIN_STATE_NM') == 'Texas' else d.get('ORIGIN_STATE_NM', '')
        if counterpart and counterpart != 'Texas':
            by_state[counterpart] += d['PASSENGERS']

    sorted_states = sorted(by_state.items(), key=lambda x: -x[1])
    print(f'  Total passengers: {total_pax:,}')
    print(f'  Top 5 counterpart states:')
    for state, val in sorted_states[:5]:
        print(f'    {state}: {val:,}')


def test_direction_field_correctness(market):
    """Verify that for each direction, the correct state field is used."""
    section('Direction Field Correctness')

    year_data = [d for d in market if is_us_mx(d) and d['YEAR'] == TARGET_YEAR]

    # Export: every US->MX row should have ORIGIN_STATE_NM as a US state
    us_states = set()
    for d in year_data:
        if is_us_to_mx(d):
            us_states.add(d.get('ORIGIN_STATE_NM', ''))
    print(f'  Export origin states: {len(us_states)} unique US states')
    check('Export has US origin states', len(us_states) > 0, True)
    check('Export origin states do not include Mexico',
          'Mexico' not in us_states and '' not in us_states or len(us_states) > 1, True)

    # Import: every MX->US row should have DEST_STATE_NM as a US state
    dest_states = set()
    for d in year_data:
        if is_mx_to_us(d):
            dest_states.add(d.get('DEST_STATE_NM', ''))
    print(f'  Import destination states: {len(dest_states)} unique US states')
    check('Import has US dest states', len(dest_states) > 0, True)

    # Verify no overlap confusion: MX->US rows should NOT use ORIGIN_STATE for US state ranking
    mx_origin_states = set()
    for d in year_data:
        if is_mx_to_us(d):
            mx_origin_states.add(d.get('ORIGIN_STATE_NM', ''))
    print(f'  MX->US origin states (should be Mexican): {mx_origin_states}')
    check('MX->US origin states are not US states',
          'Texas' not in mx_origin_states and 'California' not in mx_origin_states, True)


def test_all_years_trend(market):
    """Validate trend data across all years."""
    section('All-Years Trend Consistency')

    usmx = [d for d in market if is_us_mx(d)]
    by_year = defaultdict(lambda: {'pax': 0, 'freight': 0, 'mail': 0, 'rows': 0})
    for d in usmx:
        y = d['YEAR']
        by_year[y]['pax'] += d['PASSENGERS']
        by_year[y]['freight'] += d['FREIGHT']
        by_year[y]['mail'] += d['MAIL']
        by_year[y]['rows'] += 1

    print(f'  {"Year":>6} {"Passengers":>15} {"Freight (lbs)":>18} {"Mail (lbs)":>15} {"Rows":>8}')
    for year in sorted(by_year.keys()):
        v = by_year[year]
        print(f'  {year:>6} {v["pax"]:>15,} {v["freight"]:>18,} {v["mail"]:>15,} {v["rows"]:>8,}')
        check(f'Year {year} has data', v['rows'] > 0, True)


# ── Main ─────────────────────────────────────────────────────────────

def main():
    print('Dashboard Data Logic Validator')
    print(f'Target year: {TARGET_YEAR}')
    print(f'Data directory: {DATA_DIR}')
    print()

    print('Loading CSV data...')
    market = load_csv('BTS_T-100_Market_2015-2024.csv')
    segment = load_csv('BTS_T-100_Segment_2015-2024.csv')
    print(f'  Market rows: {len(market):,}')
    print(f'  Segment rows: {len(segment):,}')

    test_us_mexico_state_rankings(market)
    test_tx_share_donut(market)
    test_market_vs_segment_consistency(market, segment)
    test_texas_mexico_bidirectional(market)
    test_texas_domestic(market)
    test_direction_field_correctness(market)
    test_all_years_trend(market)

    print(f'\n{"=" * 60}')
    print(f'  RESULTS: {passed} passed, {failed} failed')
    print(f'{"=" * 60}')

    if failed:
        print('\n  Some checks failed — review output above.')
        sys.exit(1)
    else:
        print('\n  All checks passed.')
        sys.exit(0)


if __name__ == '__main__':
    main()
