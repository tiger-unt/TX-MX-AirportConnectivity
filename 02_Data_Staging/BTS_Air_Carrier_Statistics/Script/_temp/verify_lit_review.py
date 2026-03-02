"""
Cross-reference the Literature Review MD file against the processed BTS data.
Generates a detailed QA report.
"""
import pandas as pd
import json
import sys

DATA_DIR = r"c:/Users/UNT/UNT System/TxDOT IAC 2025-26 - General/Task 6 - Airport Connectivity/03_Process_Data/BTS"
OUT_DIR = r"c:/Users/UNT/UNT System/TxDOT IAC 2025-26 - General/Task 6 - Airport Connectivity/02_Data_Staging/BTS_Air_Carrier_Statistics/Script/_temp"

# Load data
mkt = pd.read_csv(f"{DATA_DIR}/BTS_T-100_Market_2015-2024.csv")
seg = pd.read_csv(f"{DATA_DIR}/BTS_T-100_Segment_2015-2024.csv")
print(f"Market: {mkt.shape}, Segment: {seg.shape}")
print(f"Market years: {sorted(mkt['YEAR'].unique())}")
print(f"Segment years: {sorted(seg['YEAR'].unique())}")

m24 = mkt[mkt['YEAR'] == 2024].copy()

STATE_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
    'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
    'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
    'Puerto Rico': 'PR', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
    'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
    'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
}
ABBR_STATE = {v: k for k, v in STATE_ABBR.items()}

us_mx = m24[(m24['ORIGIN_COUNTRY_NAME'] == 'United States') & (m24['DEST_COUNTRY_NAME'] == 'Mexico')]
mx_us = m24[(m24['ORIGIN_COUNTRY_NAME'] == 'Mexico') & (m24['DEST_COUNTRY_NAME'] == 'United States')]

BORDER_AIRPORTS = ['ELP', 'LRD', 'MFE', 'DRT', 'BRO', 'HRL']

report_lines = []
def R(line=""):
    report_lines.append(line)

def check_table(title, md_data, data_func, tolerance=0.5):
    """Generic table checker. Returns list of (key, match, details_dict)"""
    R(f"\n### {title}\n")
    results = []
    all_pass = True

    for key, md_values in md_data.items():
        data_values = data_func(key)
        details = {}
        match = True
        for i, (md_v, d_v, label) in enumerate(zip(md_values, data_values, ['Col1', 'Col2', 'Col3'])):
            details[f"md_{i}"] = md_v
            details[f"data_{i}"] = d_v
            details[f"diff_{i}"] = round(d_v - md_v, 2) if isinstance(d_v, (int, float)) else "N/A"
            if isinstance(d_v, (int, float)) and abs(d_v - md_v) > tolerance:
                match = False

        results.append((key, match, details))
        if not match:
            all_pass = False

    return results, all_pass

# ==============================================================================
# TABLE 5: US-Mexico Air Cargo by US State (2024)
# ==============================================================================
exports_freight = us_mx.groupby('ORIGIN_STATE_NM')['FREIGHT'].sum()
imports_freight = mx_us.groupby('DEST_STATE_NM')['FREIGHT'].sum()

md_t5 = {
    'KY': (129407, 109772, 239179), 'CA': (78410, 103631, 182040),
    'AK': (141837, 3823, 145660), 'TN': (97409, 3106, 100514),
    'FL': (23460, 22297, 45756), 'TX': (17431, 5532, 22963),
    'NY': (7111, 13460, 20571), 'GA': (901, 1875, 2776),
    'MI': (867, 1373, 2240), 'IL': (1078, 1016, 2094),
    'OH': (859, 505, 1365), 'NJ': (80, 1098, 1178),
    'MA': (0, 412, 412), 'HI': (104, 196, 299),
    'IN': (156, 112, 268), 'VA': (212, 46, 258),
    'MO': (34, 169, 202), 'OR': (183, 13, 196),
    'PR': (182, 0, 182), 'SC': (12, 161, 173),
    'NC': (62, 89, 151), 'CO': (35, 93, 128),
    'AL': (48, 62, 110), 'UT': (23, 82, 106),
    'LA': (74, 16, 90), 'AZ': (70, 17, 87),
    'WA': (36, 35, 72), 'MN': (55, 6, 61),
    'PA': (1, 56, 57), 'IA': (38, 0, 38),
    'MS': (29, 0, 29), 'WI': (0, 5, 5),
    'MD': (0, 2, 2), 'NH': (1, 0, 1),
    'NV': (0, 0, 1),
}

R("## Table 5: US-Mexico Air Cargo by US State (2024)\n")
R("All values in 1,000s of lbs.\n")
R("| State | Export (MD) | Export (Data) | Import (MD) | Import (Data) | Total (MD) | Total (Data) | Status |")
R("|-------|-----------|-------------|-----------|-------------|----------|------------|--------|")

t5_issues = []
for st, (md_exp, md_imp, md_tot) in sorted(md_t5.items(), key=lambda x: -x[1][2]):
    state_name = ABBR_STATE.get(st)
    d_exp = int(round(exports_freight.get(state_name, 0) / 1000))
    d_imp = int(round(imports_freight.get(state_name, 0) / 1000))
    d_tot = d_exp + d_imp
    ok = abs(d_exp - md_exp) <= 1 and abs(d_imp - md_imp) <= 1 and abs(d_tot - md_tot) <= 2
    status = "PASS" if ok else "MISMATCH"
    R(f"| {st} | {md_exp:,} | {d_exp:,} | {md_imp:,} | {d_imp:,} | {md_tot:,} | {d_tot:,} | {status} |")
    if not ok:
        t5_issues.append(f"{st}: Exp MD={md_exp:,} vs Data={d_exp:,}, Imp MD={md_imp:,} vs Data={d_imp:,}")

t5_total_exp = int(round(exports_freight.sum() / 1000))
t5_total_imp = int(round(imports_freight.sum() / 1000))
t5_total_tot = t5_total_exp + t5_total_imp
R(f"| **Total** | **500,206** | **{t5_total_exp:,}** | **269,059** | **{t5_total_imp:,}** | **769,264** | **{t5_total_tot:,}** | {'PASS' if abs(t5_total_tot - 769264) <= 2 else 'MISMATCH'} |")

# ==============================================================================
# TABLE 6: US-Mexico Air Passengers by US State (2024)
# ==============================================================================
deps_pax = us_mx.groupby('ORIGIN_STATE_NM')['PASSENGERS'].sum()
arrs_pax = mx_us.groupby('DEST_STATE_NM')['PASSENGERS'].sum()

md_t6 = {
    'TX': (5552, 5485, 11037), 'CA': (4098, 4083, 8181),
    'IL': (1674, 1688, 3361), 'FL': (1518, 1511, 3028),
    'GA': (1038, 1038, 2075), 'NY': (906, 907, 1813),
    'AZ': (785, 773, 1558), 'CO': (735, 748, 1483),
    'WA': (463, 462, 924), 'NV': (436, 446, 882),
    'NC': (400, 404, 804), 'NJ': (399, 394, 794),
    'MN': (374, 371, 745), 'MI': (313, 317, 630),
    'UT': (284, 282, 565), 'PA': (220, 223, 443),
    'MO': (202, 207, 409), 'VA': (178, 184, 363),
    'MA': (171, 170, 341), 'MD': (139, 142, 281),
    'OR': (123, 123, 246), 'OH': (56, 57, 113),
    'TN': (28, 27, 55), 'KY': (26, 26, 52),
    'LA': (21, 21, 43), 'IN': (15, 15, 30),
    'WI': (12, 12, 24), 'PR': (5, 5, 9),
    'CT': (1, 1, 2), 'KS': (1, 0, 1),
    'IA': (0, 0, 1), 'ND': (0, 0, 0),
    'NE': (0, 0, 0), 'SD': (0, 0, 0),
    'SC': (0, 0, 0),
}

R("\n## Table 6: US-Mexico Air Passengers by US State (2024)\n")
R("All values in 1,000s of passengers.\n")
R("| State | Dep (MD) | Dep (Data) | Arr (MD) | Arr (Data) | Total (MD) | Total (Data) | Status |")
R("|-------|---------|-----------|---------|-----------|----------|------------|--------|")

t6_issues = []
for st, (md_dep, md_arr, md_tot) in sorted(md_t6.items(), key=lambda x: -x[1][2]):
    state_name = ABBR_STATE.get(st)
    d_dep = round(deps_pax.get(state_name, 0) / 1000, 1)
    d_arr = round(arrs_pax.get(state_name, 0) / 1000, 1)
    d_tot = round(d_dep + d_arr, 1)
    ok = abs(d_dep - md_dep) <= 1 and abs(d_arr - md_arr) <= 1 and abs(d_tot - md_tot) <= 2
    status = "PASS" if ok else "MISMATCH"
    R(f"| {st} | {md_dep:,} | {d_dep:,} | {md_arr:,} | {d_arr:,} | {md_tot:,} | {d_tot:,} | {status} |")
    if not ok:
        t6_issues.append(f"{st}: Dep MD={md_dep} vs Data={d_dep}, Arr MD={md_arr} vs Data={d_arr}")

t6_total_dep = round(deps_pax.sum() / 1000, 1)
t6_total_arr = round(arrs_pax.sum() / 1000, 1)
t6_total_tot = round(t6_total_dep + t6_total_arr, 1)
R(f"| **Total** | **20,173** | **{t6_total_dep:,}** | **20,121** | **{t6_total_arr:,}** | **40,294** | **{t6_total_tot:,}** | {'PASS' if abs(t6_total_tot - 40294) <= 2 else 'MISMATCH'} |")

# ==============================================================================
# TABLE 13: TX-Mexico Air Cargo by Airport (2024)
# ==============================================================================
tx_exp = m24[(m24['ORIGIN_STATE_NM'] == 'Texas') & (m24['DEST_COUNTRY_NAME'] == 'Mexico')]
tx_imp = m24[(m24['ORIGIN_COUNTRY_NAME'] == 'Mexico') & (m24['DEST_STATE_NM'] == 'Texas')]

# TX airports
tx_ap_exp_f = tx_exp.groupby('ORIGIN')['FREIGHT'].sum()
tx_ap_imp_f = tx_imp.groupby('DEST')['FREIGHT'].sum()
# MX airports
mx_ap_imp_f = tx_exp.groupby('DEST')['FREIGHT'].sum()  # freight arriving at MX from TX
mx_ap_exp_f = tx_imp.groupby('ORIGIN')['FREIGHT'].sum()  # freight departing MX to TX

md_t13 = {
    'GDL': (241.1, 13227.7, 13468.8), 'SAT': (12400.1, 0.4, 12400.6),
    'DFW': (1432.0, 1459.9, 2891.8), 'IAH': (1415.7, 1255.2, 2670.8),
    'NLU': (520.7, 2062.5, 2583.2), 'ELP': (512.3, 1968.2, 2480.5),
    'CUU': (1977.8, 502.2, 2480.0), 'MEX': (1121.3, 702.0, 1823.3),
    'AUS': (1354.3, 0.1, 1354.4), 'LRD': (216.8, 612.9, 829.7),
    'CUN': (300.3, 318.0, 618.3), 'SLW': (442.1, 77.8, 519.9),
    'MTY': (115.3, 168.5, 283.8), 'PVR': (187.6, 77.1, 264.7),
    'QRO': (218.0, 36.8, 254.7), 'MID': (226.9, 23.8, 250.7),
    'AFW': (0.4, 179.8, 180.3), 'BJX': (101.7, 43.8, 145.4),
    'SJD': (17.2, 76.1, 93.3), 'HOU': (33.7, 52.6, 86.3),
    'MFE': (64.6, 0, 64.6), 'SLP': (2.9, 52.4, 55.3),
    'CZM': (21.2, 17.1, 38.2), 'HMO': (0, 37.7, 37.7),
    'PBC': (33.2, 0, 33.2),
}

R("\n## Table 13: TX-Mexico Air Cargo by Airport (2024)\n")
R("All values in 1,000s of lbs. Export = freight sent to counterpart, Import = freight received from counterpart.\n")
R("| Airport | Export (MD) | Export (Data) | Import (MD) | Import (Data) | Total (MD) | Total (Data) | Status |")
R("|---------|-----------|-------------|-----------|-------------|----------|------------|--------|")

t13_issues = []
for ap, (md_exp, md_imp, md_tot) in sorted(md_t13.items(), key=lambda x: -x[1][2]):
    # Determine if TX or MX airport
    if ap in tx_ap_exp_f.index or ap in tx_ap_imp_f.index:
        d_exp = round(tx_ap_exp_f.get(ap, 0) / 1000, 1)
        d_imp = round(tx_ap_imp_f.get(ap, 0) / 1000, 1)
    else:
        d_exp = round(mx_ap_exp_f.get(ap, 0) / 1000, 1)
        d_imp = round(mx_ap_imp_f.get(ap, 0) / 1000, 1)
    d_tot = round(d_exp + d_imp, 1)
    ok = abs(d_exp - md_exp) <= 0.5 and abs(d_imp - md_imp) <= 0.5 and abs(d_tot - md_tot) <= 1
    status = "PASS" if ok else "MISMATCH"
    R(f"| {ap} | {md_exp} | {d_exp} | {md_imp} | {d_imp} | {md_tot} | {d_tot} | {status} |")
    if not ok:
        t13_issues.append(f"{ap}: Exp MD={md_exp} vs Data={d_exp}, Imp MD={md_imp} vs Data={d_imp}")

# ==============================================================================
# TABLE 14: TX-Mexico Air Passengers by Airport (2024)
# ==============================================================================
tx_ap_dep_p = tx_exp.groupby('ORIGIN')['PASSENGERS'].sum()
tx_ap_arr_p = tx_imp.groupby('DEST')['PASSENGERS'].sum()
mx_ap_dep_p = tx_imp.groupby('ORIGIN')['PASSENGERS'].sum()
mx_ap_arr_p = tx_exp.groupby('DEST')['PASSENGERS'].sum()

md_t14 = {
    'DFW': (2561.2, 2516.9, 5078.1), 'IAH': (2036.3, 2002.0, 4038.3),
    'CUN': (1243.3, 1232.6, 2475.9), 'MEX': (922.5, 960.9, 1883.4),
    'MTY': (526.7, 535.8, 1062.6), 'SJD': (510.6, 502.8, 1013.4),
    'GDL': (459.5, 466.2, 925.7), 'SAT': (358.3, 359.4, 717.7),
    'PVR': (317.1, 318.3, 635.4), 'HOU': (309.3, 309.3, 618.6),
    'QRO': (283.5, 292.2, 575.7), 'BJX': (257.3, 264.0, 521.4),
    'AUS': (245.2, 260.8, 506.0), 'CZM': (135.1, 132.9, 268.0),
    'SLP': (113.5, 117.6, 231.1), 'TQO': (92.9, 95.0, 187.9),
    'AGU': (77.0, 80.4, 157.5), 'OAX': (76.0, 79.0, 155.0),
    'MID': (76.9, 78.0, 154.9), 'MLM': (60.0, 65.4, 125.4),
    'NLU': (52.5, 47.8, 100.3), 'CUU': (47.5, 48.1, 95.6),
    'VER': (47.6, 47.3, 94.9), 'TRC': (34.6, 36.1, 70.7),
    'DGO': (29.9, 31.8, 61.7), 'MZT': (27.8, 27.6, 55.4),
    'MFE': (22.8, 26.5, 49.4), 'TAM': (22.7, 23.0, 45.7),
    'ZIH': (21.0, 19.2, 40.2), 'ZCL': (15.1, 16.1, 31.2),
    'HUX': (9.8, 9.6, 19.5), 'PBC': (9.5, 9.6, 19.1),
    'HRL': (9.8, 3.9, 13.7), 'DAL': (5.4, 5.2, 10.7),
    'CSL': (5.3, 5.4, 10.6), 'ZLO': (4.2, 4.3, 8.5),
    'ACA': (2.6, 2.9, 5.6), 'LTO': (2.3, 2.3, 4.7),
    'ELP': (3.9, 0.0, 3.9), 'CRP': (0.0, 0.4, 0.4),
}

R("\n## Table 14: TX-Mexico Air Passengers by Airport (2024)\n")
R("All values in 1,000s of passengers.\n")
R("| Airport | Dep (MD) | Dep (Data) | Arr (MD) | Arr (Data) | Total (MD) | Total (Data) | Status |")
R("|---------|---------|-----------|---------|-----------|----------|------------|--------|")

t14_issues = []
for ap, (md_dep, md_arr, md_tot) in sorted(md_t14.items(), key=lambda x: -x[1][2]):
    if ap in tx_ap_dep_p.index or ap in tx_ap_arr_p.index:
        d_dep = round(tx_ap_dep_p.get(ap, 0) / 1000, 1)
        d_arr = round(tx_ap_arr_p.get(ap, 0) / 1000, 1)
    else:
        d_dep = round(mx_ap_dep_p.get(ap, 0) / 1000, 1)
        d_arr = round(mx_ap_arr_p.get(ap, 0) / 1000, 1)
    d_tot = round(d_dep + d_arr, 1)
    ok = abs(d_dep - md_dep) <= 0.5 and abs(d_arr - md_arr) <= 0.5 and abs(d_tot - md_tot) <= 1
    status = "PASS" if ok else "MISMATCH"
    R(f"| {ap} | {md_dep} | {d_dep} | {md_arr} | {d_arr} | {md_tot} | {d_tot} | {status} |")
    if not ok:
        t14_issues.append(f"{ap}: Dep MD={md_dep} vs Data={d_dep}, Arr MD={md_arr} vs Data={d_arr}")

# ==============================================================================
# TABLE 15 & 16: TX airports only
# ==============================================================================
tx_cargo_by_ap = tx_ap_exp_f.add(tx_ap_imp_f, fill_value=0).sort_values(ascending=False)
tx_pax_by_ap = tx_ap_dep_p.add(tx_ap_arr_p, fill_value=0).sort_values(ascending=False)

# Border calculations
border_cargo = tx_cargo_by_ap[tx_cargo_by_ap.index.isin(BORDER_AIRPORTS)].sum()
total_tx_cargo = tx_cargo_by_ap.sum()
border_cargo_pct = round(border_cargo / total_tx_cargo * 100, 1) if total_tx_cargo > 0 else 0

border_pax = tx_pax_by_ap[tx_pax_by_ap.index.isin(BORDER_AIRPORTS)].sum()
total_tx_pax = tx_pax_by_ap.sum()
border_pax_pct = round(border_pax / total_tx_pax * 100, 1) if total_tx_pax > 0 else 0

border_exp = tx_ap_exp_f[tx_ap_exp_f.index.isin(BORDER_AIRPORTS)].sum()
border_imp = tx_ap_imp_f[tx_ap_imp_f.index.isin(BORDER_AIRPORTS)].sum()
total_tx_exp = tx_ap_exp_f.sum()
total_tx_imp = tx_ap_imp_f.sum()
border_exp_pct = round(border_exp / total_tx_exp * 100, 1) if total_tx_exp > 0 else 0
border_imp_pct = round(border_imp / total_tx_imp * 100, 1) if total_tx_imp > 0 else 0

border_dep = tx_ap_dep_p[tx_ap_dep_p.index.isin(BORDER_AIRPORTS)].sum()
border_arr = tx_ap_arr_p[tx_ap_arr_p.index.isin(BORDER_AIRPORTS)].sum()
total_tx_dep = tx_ap_dep_p.sum()
total_tx_arr = tx_ap_arr_p.sum()

# ==============================================================================
# NARRATIVE CLAIMS
# ==============================================================================
cargo_total_by_state = exports_freight.add(imports_freight, fill_value=0).sort_values(ascending=False)
pax_total_by_state = deps_pax.add(arrs_pax, fill_value=0).sort_values(ascending=False)

tx_cargo_rank = list(cargo_total_by_state.index).index('Texas') + 1
tx_cargo_pct = round(cargo_total_by_state.get('Texas', 0) / cargo_total_by_state.sum() * 100, 1)
tx_pax_rank = list(pax_total_by_state.index).index('Texas') + 1
tx_pax_pct = round(pax_total_by_state.get('Texas', 0) / pax_total_by_state.sum() * 100, 1)

top5_cargo_states = [STATE_ABBR.get(s, s) for s in list(cargo_total_by_state.index)[:5]]

# MFE-NLU route
border_arr_data = tx_imp[tx_imp['DEST'].isin(BORDER_AIRPORTS)]
mfe_arr_from_nlu = border_arr_data[(border_arr_data['DEST'] == 'MFE') & (border_arr_data['ORIGIN'] == 'NLU')]['PASSENGERS'].sum()
total_border_arr_pax = border_arr_data['PASSENGERS'].sum()
mfe_nlu_arr_pct = round(mfe_arr_from_nlu / total_border_arr_pax * 100, 1) if total_border_arr_pax > 0 else 0

border_dep_data = tx_exp[tx_exp['ORIGIN'].isin(BORDER_AIRPORTS)]
mfe_dep_to_nlu = border_dep_data[(border_dep_data['ORIGIN'] == 'MFE') & (border_dep_data['DEST'] == 'NLU')]['PASSENGERS'].sum()
total_border_dep_pax = border_dep_data['PASSENGERS'].sum()
mfe_nlu_dep_pct = round(mfe_dep_to_nlu / total_border_dep_pax * 100, 1) if total_border_dep_pax > 0 else 0

# LRD+ELP border cargo
lrd_cargo = tx_cargo_by_ap.get('LRD', 0)
elp_cargo = tx_cargo_by_ap.get('ELP', 0)
lrd_elp_border_pct = round((lrd_cargo + elp_cargo) / border_cargo * 100, 1) if border_cargo > 0 else 0

# ELP-CUU cargo route
elp_exp_cuu = tx_exp[(tx_exp['ORIGIN'] == 'ELP') & (tx_exp['DEST'] == 'CUU')]['FREIGHT'].sum()
elp_total_exp = tx_exp[tx_exp['ORIGIN'] == 'ELP']['FREIGHT'].sum()
elp_cuu_exp_pct = round(elp_exp_cuu / elp_total_exp * 100, 1) if elp_total_exp > 0 else 0

# SLW share of LRD cargo
lrd_imp_slw = tx_imp[(tx_imp['DEST'] == 'LRD') & (tx_imp['ORIGIN'] == 'SLW')]['FREIGHT'].sum()
lrd_total_imp = tx_imp[tx_imp['DEST'] == 'LRD']['FREIGHT'].sum()
slw_lrd_imp_pct = round(lrd_imp_slw / lrd_total_imp * 100, 1) if lrd_total_imp > 0 else 0

lrd_exp_slw = tx_exp[(tx_exp['ORIGIN'] == 'LRD') & (tx_exp['DEST'] == 'SLW')]['FREIGHT'].sum()
lrd_total_exp_f = tx_exp[tx_exp['ORIGIN'] == 'LRD']['FREIGHT'].sum()
slw_lrd_exp_pct = round(lrd_exp_slw / lrd_total_exp_f * 100, 1) if lrd_total_exp_f > 0 else 0

# Year range
min_year = mkt['YEAR'].min()
max_year = mkt['YEAR'].max()

# ==============================================================================
# BUILD REPORT
# ==============================================================================

R("\n---\n")
R("## Narrative Claims Verification\n")
R("| # | Claim | Expected | Actual | Status |")
R("|---|-------|----------|--------|--------|")

claims = [
    ("N1", "TX ranks 6th in US-MX air cargo (by weight)", "6th", f"{tx_cargo_rank}{'st' if tx_cargo_rank==1 else 'nd' if tx_cargo_rank==2 else 'rd' if tx_cargo_rank==3 else 'th'}", tx_cargo_rank == 6),
    ("N2", "TX accounts for ~3% of US-MX air cargo", "~3%", f"{tx_cargo_pct}%", abs(tx_cargo_pct - 3.0) <= 0.5),
    ("N3", "TX ranks 1st in US-MX air passengers", "1st", f"{tx_pax_rank}{'st' if tx_pax_rank==1 else 'th'}", tx_pax_rank == 1),
    ("N4", "TX accounts for 27.4% of US-MX air passengers", "27.4%", f"{tx_pax_pct}%", abs(tx_pax_pct - 27.4) <= 0.5),
    ("N5", "States above TX in cargo: KY, CA, Arkansas, TN, FL", "KY,CA,AK,TN,FL", ",".join(top5_cargo_states),
     top5_cargo_states == ['KY', 'CA', 'AK', 'TN', 'FL']),
    ("N6", "SAT handled most TX-MX cargo (among TX airports)", "SAT", tx_cargo_by_ap.index[0], tx_cargo_by_ap.index[0] == 'SAT'),
    ("N7", "DFW handled most TX-MX passengers (among TX airports)", "DFW", tx_pax_by_ap.index[0], tx_pax_by_ap.index[0] == 'DFW'),
    ("N8", "Border airports = 14.7% of TX-MX cargo", "14.7%", f"{border_cargo_pct}%", abs(border_cargo_pct - 14.7) <= 0.5),
    ("N9", "Border airports export 4.6% of TX-MX cargo exports", "4.6%", f"{border_exp_pct}%", abs(border_exp_pct - 4.6) <= 0.5),
    ("N10", "Border airports import 46.7% of TX-MX cargo imports", "46.7%", f"{border_imp_pct}%", abs(border_imp_pct - 46.7) <= 0.5),
    ("N11", "Border airports = 0.6% of TX-MX passengers (total)", "0.6%", f"{border_pax_pct}%", abs(border_pax_pct - 0.6) <= 0.2),
    ("N12", "Border pax = 36,500 out of 11,036,800 total", f"36,500 total", f"{int(border_pax):,} total", abs(int(border_pax) - 36500) < 1000),
    ("N13", "MFE-NLU = 77.4% of border arrivals from MX", "77.4%", f"{mfe_nlu_arr_pct}%", abs(mfe_nlu_arr_pct - 77.4) <= 2),
    ("N14", "MFE-NLU = 54.4% of border departures to MX", "54.4%", f"{mfe_nlu_dep_pct}%", abs(mfe_nlu_dep_pct - 54.4) <= 2),
    ("N15", "LRD+ELP = 98% of border air cargo", "98%", f"{lrd_elp_border_pct}%", abs(lrd_elp_border_pct - 98) <= 2),
    ("N16", "ELP-CUU = 91.8% of ELP cargo exports to MX", "91.8%", f"{elp_cuu_exp_pct}%", abs(elp_cuu_exp_pct - 91.8) <= 2),
    ("N17", "SLW = 43.7% of LRD cargo imports", "43.7%", f"{slw_lrd_imp_pct}%", abs(slw_lrd_imp_pct - 43.7) <= 2),
    ("N18", "SLW = 35.3% of LRD cargo exports", "35.3%", f"{slw_lrd_exp_pct}%", abs(slw_lrd_exp_pct - 35.3) <= 2),
    ("N19", "Figure 2 shows trends from 2000 to 2024", "2000-2024", f"{min_year}-{max_year}", min_year <= 2000),
]

for num, claim, expected, actual, ok in claims:
    status = "PASS" if ok else "MISMATCH"
    R(f"| {num} | {claim} | {expected} | {actual} | {status} |")

# ==============================================================================
# ISSUES & CONCERNS SUMMARY
# ==============================================================================
R("\n---\n")
R("## Issues and Concerns Summary\n")

R("### Confirmed Issues\n")

all_issues = []

# N5: Arkansas vs Alaska
if top5_cargo_states[2] == 'AK':
    all_issues.append(("ISSUE", "N5", "The MD text (Section 3.2 narrative) states that 'Kentucky, California, **Arkansas**, Tennessee, and Florida rank higher than Texas'. The data shows **Alaska** (AK) ranks 3rd, not Arkansas (AR). Arkansas does not appear in Table 5 at all. This appears to be a text error confusing AK (Alaska) with AR (Arkansas)."))

# N12: 36,500 vs actual
if abs(int(border_pax) - 36500) >= 1000:
    all_issues.append(("ISSUE", "N12", f"The MD narrative (Section 4.3, Table 16 text) states border airports processed '36,500 out of a total of 11,036,800 total passengers'. However, the Table 16 data shows border **total** passengers = {int(border_pax):,} (departures + arrivals). The 36,500 figure matches border **departures** only ({int(border_dep):,}). The text should either say '67,000 total passengers' or clarify it means departures only."))

# N19: Year range
if min_year > 2000:
    all_issues.append(("GRAY AREA", "N19", f"Figure 2 narrative says 'from 2000 to 2024', but our processed data only covers {min_year}-{max_year}. This may not be an error if the author used a separate data extraction for Figure 2 with a wider year range. However, it cannot be verified against the current dataset."))

# Table 5 total: tiny rounding discrepancy
if abs(t5_total_tot - 769264) > 0:
    all_issues.append(("GRAY AREA", "Totals", f"Table 5 US total: MD=769,264, Data={t5_total_tot:,}. Difference of {abs(t5_total_tot - 769264):,} (1000 lbs). This is a rounding artifact from summing individually rounded state values."))

# Check SAT Export/Import ratio in Table 15
sat_ratio_md = 29040.1
sat_ratio_calc = round(12400.1 / 0.4, 1) if 0.4 > 0 else float('inf')
if abs(sat_ratio_md - sat_ratio_calc) > 1:
    all_issues.append(("ISSUE", "Table 15", f"SAT Export/Import ratio: MD shows {sat_ratio_md}, but calculated ratio = {sat_ratio_calc}. The MD value appears incorrect."))

# Check for t5, t6, t13, t14 mismatches
for issues_list, table_name in [(t5_issues, "Table 5"), (t6_issues, "Table 6"), (t13_issues, "Table 13"), (t14_issues, "Table 14")]:
    for issue in issues_list:
        all_issues.append(("MISMATCH", table_name, issue))

# Additional text issues spotted during review
all_issues.append(("GRAY AREA", "Table 1", "Table 1 (Mexico Airport Groups): GAP shows no count for Domestic or International columns but Total=11. The data appears incomplete."))
all_issues.append(("NOTE", "Tables 9-12", "Tables 9-12 use BTS TransBorder Freight Data (commodity-level trade data), which is a different dataset from the T-100 Market data. These tables cannot be verified against our processed T-100 data files."))
all_issues.append(("NOTE", "Tables 2-4", "Tables 2-4 use Mexican government data (AFAC/airport group statistics). These cannot be verified against our BTS T-100 data."))
all_issues.append(("NOTE", "Tables 7-8", "Tables 7-8 (airport runway characteristics) use FAA/AFAC airport facility data, not BTS T-100 data. These cannot be verified against our datasets."))
all_issues.append(("GRAY AREA", "Text", "MD text (Section 4.3, Table 13 text) refers to 'George Bus Intercontinental airport' - should be 'George Bush Intercontinental airport' (missing 'h')."))
all_issues.append(("GRAY AREA", "Text", "MD text (Section 4.3, Table 14/16 text) also says 'George Bus Intercontinental' - same typo."))
all_issues.append(("GRAY AREA", "Text", "Table 10 import value for Computer-Related Machinery is listed as '$207,695,1230' - appears to have an extra digit (should likely be '$207,695,123')."))

for severity, loc, desc in all_issues:
    if severity == "ISSUE":
        R(f"- **{severity}** [{loc}]: {desc}")
    elif severity == "MISMATCH":
        R(f"- **{severity}** [{loc}]: {desc}")
    elif severity == "GRAY AREA":
        R(f"- *{severity}* [{loc}]: {desc}")
    else:
        R(f"- {severity} [{loc}]: {desc}")

# ==============================================================================
# FINAL HEADER
# ==============================================================================
header = [
    "# Literature Review QA Report",
    f"**Date**: 2026-03-01",
    f"**File reviewed**: `Air_Connectivity_Review_V2.md` (converted from .docx)",
    f"**Data files used for verification**:",
    f"- `BTS_T-100_Market_2015-2024.csv` ({mkt.shape[0]:,} rows, updated {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')})",
    f"- `BTS_T-100_Segment_2015-2024.csv` ({seg.shape[0]:,} rows)",
    f"- `BTS_T-100_Airports_2015-2024.geojson`",
    "",
    "## Verification Scope",
    "",
    "This report cross-references quantitative claims in the literature review against the processed BTS T-100 Market dataset. Tables and narrative claims that reference BTS T-100 data are verified directly. Tables referencing other data sources (TransBorder Freight, Mexican government data, FAA facility data) are noted but cannot be verified against our datasets.",
    "",
    "### Quick Summary",
    "",
]

# Count results
table_checks = len(md_t5) + len(md_t6) + len(md_t13) + len(md_t14)
table_pass = sum(1 for r in t5_issues + t6_issues + t13_issues + t14_issues if False)  # issues = failures
table_pass = table_checks - len(t5_issues) - len(t6_issues) - len(t13_issues) - len(t14_issues)
narr_pass = sum(1 for _, _, _, _, ok in claims if ok)
narr_total = len(claims)
confirmed_issues = sum(1 for s, _, _ in all_issues if s == "ISSUE" or s == "MISMATCH")
gray_areas = sum(1 for s, _, _ in all_issues if s == "GRAY AREA")

header.append(f"| Category | Checked | Passed | Issues |")
header.append(f"|----------|---------|--------|--------|")
header.append(f"| Table data points | {table_checks} | {table_pass} | {table_checks - table_pass} |")
header.append(f"| Narrative claims | {narr_total} | {narr_pass} | {narr_total - narr_pass} |")
header.append(f"| Confirmed issues | - | - | {confirmed_issues} |")
header.append(f"| Gray areas / Notes | - | - | {gray_areas} |")
header.append("")
header.append("---")
header.append("")

# Write report
full_report = "\n".join(header + report_lines)
out_path = f"{OUT_DIR}/Lit_Review_QA_Report.md"
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(full_report)

print(f"\nReport written to: {out_path}")
print(f"Table checks: {table_pass}/{table_checks} passed")
print(f"Narrative claims: {narr_pass}/{narr_total} passed")
print(f"Confirmed issues: {confirmed_issues}")
print(f"Gray areas: {gray_areas}")

