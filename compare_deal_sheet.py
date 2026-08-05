import csv

# Read new deal sheet
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-22.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    new_rows = {row['Record ID']: row for row in reader}

# Read GHL extract
with open(r'C:\Users\User\Downloads\records (45).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    ghl_rows = {row['Record ID']: row for row in reader}

print(f'New deal sheet records: {len(new_rows)}')
print(f'GHL records: {len(ghl_rows)}')

common_ids = set(new_rows.keys()) & set(ghl_rows.keys())
print(f'Common Record IDs: {len(common_ids)}')

# ============================================================
# 1. STATUS comparison
# ============================================================
print("\n" + "="*80)
print("1. STATUS COMPARISON")
print("="*80)

status_mismatches = []
for rid in common_ids:
    new_status = new_rows[rid]['Status'].strip()
    ghl_status = ghl_rows[rid]['Status'].strip()
    # Normalize: the deal sheet formats status (replaces _ with space, title case)
    ghl_normalized = ghl_status.replace('_', ' ').title()
    if new_status != ghl_normalized:
        status_mismatches.append((rid, new_rows[rid]['Property Address'][:55], new_status, ghl_status))

print(f'Mismatches: {len(status_mismatches)}')
for rid, addr, new_val, ghl_val in sorted(status_mismatches, key=lambda x: x[3]):
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# 2. PACKAGER APPROVED comparison
# ============================================================
print("\n" + "="*80)
print("2. PACKAGER APPROVED COMPARISON")
print("="*80)

pa_mismatches = []
for rid in common_ids:
    new_val = new_rows[rid]['Packager Approved'].strip()
    ghl_val = ghl_rows[rid]['Packager Approved'].strip()
    ghl_normalized = ghl_val.replace('_', ' ').title()
    if new_val.lower() != ghl_normalized.lower() and new_val != ghl_val:
        pa_mismatches.append((rid, new_rows[rid]['Property Address'][:55], new_val, ghl_val))

print(f'Mismatches: {len(pa_mismatches)}')
for rid, addr, new_val, ghl_val in pa_mismatches[:20]:
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# 3. QA APPROVED comparison
# ============================================================
print("\n" + "="*80)
print("3. QA APPROVED COMPARISON")
print("="*80)

qa_mismatches = []
for rid in common_ids:
    new_val = new_rows[rid]['QA Approved'].strip()
    ghl_val = ghl_rows[rid]['QA Approved'].strip()
    ghl_normalized = ghl_val.replace('_', ' ').title()
    if new_val.lower() != ghl_normalized.lower() and new_val != ghl_val:
        qa_mismatches.append((rid, new_rows[rid]['Property Address'][:55], new_val, ghl_val))

print(f'Mismatches: {len(qa_mismatches)}')
for rid, addr, new_val, ghl_val in qa_mismatches[:20]:
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# 4. TYPE comparison
# ============================================================
print("\n" + "="*80)
print("4. TYPE (Deal Type) COMPARISON")
print("="*80)

type_mismatches = []
for rid in common_ids:
    new_val = new_rows[rid]['Type'].strip()
    ghl_val = ghl_rows[rid]['Deal Type'].strip()
    ghl_normalized = ghl_val.replace('_', ' ').title()
    if new_val.lower() != ghl_normalized.lower() and new_val != ghl_val:
        type_mismatches.append((rid, new_rows[rid]['Property Address'][:55], new_val, ghl_val))

print(f'Mismatches: {len(type_mismatches)}')
for rid, addr, new_val, ghl_val in type_mismatches[:20]:
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# 5. PACKAGER comparison
# ============================================================
print("\n" + "="*80)
print("5. PACKAGER COMPARISON")
print("="*80)

pkg_mismatches = []
for rid in common_ids:
    new_val = new_rows[rid]['Packager'].strip()
    ghl_val = ghl_rows[rid]['Packager'].strip()
    if new_val.lower() != ghl_val.lower():
        pkg_mismatches.append((rid, new_rows[rid]['Property Address'][:55], new_val, ghl_val))

print(f'Mismatches: {len(pkg_mismatches)}')
for rid, addr, new_val, ghl_val in pkg_mismatches[:20]:
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# 6. SOURCER comparison
# ============================================================
print("\n" + "="*80)
print("6. SOURCER COMPARISON")
print("="*80)

src_mismatches = []
for rid in common_ids:
    new_val = new_rows[rid]['Sourcer'].strip()
    ghl_val = ghl_rows[rid]['Sourcer'].strip()
    if new_val.lower() != ghl_val.lower():
        src_mismatches.append((rid, new_rows[rid]['Property Address'][:55], new_val, ghl_val))

print(f'Mismatches: {len(src_mismatches)}')
for rid, addr, new_val, ghl_val in src_mismatches[:20]:
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# 7. CLOSING FIELDS comparison
# ============================================================
print("\n" + "="*80)
print("7. CLOSING FIELDS COMPARISON")
print("="*80)

closing_fields = [
    ('Closing BA', 'Closing BA'),
    ('Close $', 'Closing Price'),
    ('Client', 'Client Closed'),
    ('Close Date', 'Closing Date'),
]

for new_col, ghl_col in closing_fields:
    mismatches = []
    for rid in common_ids:
        new_val = new_rows[rid][new_col].strip()
        ghl_val = ghl_rows[rid][ghl_col].strip()
        if new_val != ghl_val and not (new_val == '' and ghl_val == ''):
            mismatches.append((rid, new_rows[rid]['Property Address'][:40], new_val, ghl_val))
    print(f'{new_col} vs {ghl_col}: {len(mismatches)} mismatches')
    for rid, addr, new_val, ghl_val in mismatches[:5]:
        print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')
    if len(mismatches) > 5:
        print(f'  ... and {len(mismatches) - 5} more')

# ============================================================
# 8. CASHBACK comparison
# ============================================================
print("\n" + "="*80)
print("8. CASHBACK COMPARISON")
print("="*80)

cb_mismatches = []
for rid in common_ids:
    new_type = new_rows[rid]['CB Type'].strip()
    ghl_type = ghl_rows[rid]['cashback_rebate_type'].strip()
    new_val = new_rows[rid]['CB $'].strip()
    ghl_val = ghl_rows[rid]['cashback_rebate_value'].strip()
    if new_type != ghl_type or new_val != ghl_val:
        cb_mismatches.append((rid, new_rows[rid]['Property Address'][:40], f'{new_type}/{new_val}', f'{ghl_type}/{ghl_val}'))

print(f'Mismatches: {len(cb_mismatches)}')
for rid, addr, new_val, ghl_val in cb_mismatches[:10]:
    print(f'  {rid} | New: "{new_val}" | GHL: "{ghl_val}" | {addr}')

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f'Status mismatches:           {len(status_mismatches)}')
print(f'Packager Approved mismatches: {len(pa_mismatches)}')
print(f'QA Approved mismatches:      {len(qa_mismatches)}')
print(f'Type mismatches:             {len(type_mismatches)}')
print(f'Packager mismatches:         {len(pkg_mismatches)}')
print(f'Sourcer mismatches:          {len(src_mismatches)}')
print(f'Cashback mismatches:         {len(cb_mismatches)}')
