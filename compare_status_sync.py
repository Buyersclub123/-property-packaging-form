import csv
import sys
from collections import defaultdict

# Read old deal sheet
deal_sheet = {}
with open(r'C:\Users\User\Downloads\Deal Sheet 2026 - Deal List.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers = next(reader)
    # Find column indices
    # First column is Type (header may be wrong), Status is col index 3, Record ID is col index 25
    # Let's find by header name
    status_idx = None
    record_id_idx = None
    type_idx = 0  # First column is Type
    address_idx = None
    for i, h in enumerate(headers):
        h_lower = h.strip().lower()
        if h_lower == 'status':
            status_idx = i
        if h_lower == 'record id':
            record_id_idx = i
        if h_lower == 'property address':
            address_idx = i
    
    print(f"Old Deal Sheet - Status col: {status_idx}, Record ID col: {record_id_idx}, Address col: {address_idx}")
    print(f"Headers: {headers[:8]}...")
    
    for row in reader:
        if len(row) > max(status_idx or 0, record_id_idx or 0):
            rid = row[record_id_idx].strip() if record_id_idx is not None else ''
            status = row[status_idx].strip() if status_idx is not None else ''
            address = row[address_idx].strip() if address_idx is not None else ''
            typ = row[type_idx].strip()
            if rid:
                deal_sheet[rid] = {'status': status, 'address': address, 'type': typ}

# Read GHL extract
ghl = {}
with open(r'C:\Users\User\Downloads\records (48).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers_ghl = next(reader)
    rid_idx = None
    status_idx_g = None
    address_idx_g = None
    type_idx_g = None
    for i, h in enumerate(headers_ghl):
        h_lower = h.strip().lower()
        if h_lower == 'record id':
            rid_idx = i
        if h_lower == 'status':
            status_idx_g = i
        if h_lower == 'property address':
            address_idx_g = i
        if h_lower == 'deal type':
            type_idx_g = i
    
    print(f"\nGHL Extract - Record ID col: {rid_idx}, Status col: {status_idx_g}, Address col: {address_idx_g}, Type col: {type_idx_g}")
    
    for row in reader:
        if len(row) > max(rid_idx or 0, status_idx_g or 0):
            rid = row[rid_idx].strip().strip('"') if rid_idx is not None else ''
            status = row[status_idx_g].strip() if status_idx_g is not None else ''
            address = row[address_idx_g].strip() if address_idx_g is not None else ''
            typ = row[type_idx_g].strip() if type_idx_g is not None else ''
            if rid:
                ghl[rid] = {'status': status, 'address': address, 'type': typ}

print(f"\n{'='*80}")
print(f"Total records in old deal sheet: {len(deal_sheet)}")
print(f"Total records in GHL extract: {len(ghl)}")

# Normalize status for comparison
def normalize_status(s):
    return s.strip().lower().replace('_', ' ')

# Focus statuses
focus_statuses = ['01 available', '02 eoi', '03 contr exchanged', '05 remove no interest', '06 remove lost']

def is_focus(status):
    ns = normalize_status(status)
    for f in focus_statuses:
        if f in ns or ns in f:
            return True
    return False

# Find mismatches
print(f"\n{'='*80}")
print("STATUS MISMATCHES (Deal Sheet vs GHL)")
print(f"{'='*80}\n")

mismatches = []
matches = 0
ds_only = 0
ghl_only = 0

for rid, ds_data in deal_sheet.items():
    if rid in ghl:
        ds_status = ds_data['status']
        ghl_status = ghl[rid]['status']
        if normalize_status(ds_status) != normalize_status(ghl_status):
            mismatches.append({
                'id': rid,
                'address': ds_data['address'] or ghl[rid]['address'],
                'ds_status': ds_status,
                'ghl_status': ghl_status,
                'ds_type': ds_data['type'],
            })
        else:
            matches += 1
    else:
        ds_only += 1

for rid in ghl:
    if rid not in deal_sheet:
        ghl_only += 1

print(f"Matching statuses: {matches}")
print(f"Mismatched statuses: {len(mismatches)}")
print(f"In deal sheet only (not in GHL): {ds_only}")
print(f"In GHL only (not in deal sheet): {ghl_only}")

# Group mismatches by direction
print(f"\n{'='*80}")
print("FOCUS: MISMATCHES INVOLVING KEY STATUSES")
print(f"{'='*80}\n")

focus_mismatches = [m for m in mismatches if is_focus(m['ds_status']) or is_focus(m['ghl_status'])]
other_mismatches = [m for m in mismatches if not (is_focus(m['ds_status']) or is_focus(m['ghl_status']))]

print(f"Focus mismatches: {len(focus_mismatches)}")
print(f"Other mismatches: {len(other_mismatches)}")

# Summary by transition pattern
print(f"\n{'='*80}")
print("MISMATCH PATTERNS (Deal Sheet Status -> GHL Status)")
print(f"{'='*80}\n")

patterns = defaultdict(list)
for m in mismatches:
    key = f"{m['ds_status']} -> {m['ghl_status']}"
    patterns[key].append(m)

for pattern, items in sorted(patterns.items(), key=lambda x: -len(x[1])):
    print(f"\n  {pattern}  ({len(items)} records)")
    for item in items[:5]:
        print(f"    - {item['address'][:60]}  [{item['id'][:12]}...]")
    if len(items) > 5:
        print(f"    ... and {len(items)-5} more")

# Focus mismatches detail
print(f"\n{'='*80}")
print("DETAILED FOCUS MISMATCHES")
print(f"{'='*80}\n")

for m in focus_mismatches:
    print(f"  ID: {m['id']}")
    print(f"  Address: {m['address']}")
    print(f"  Deal Sheet: {m['ds_status']}")
    print(f"  GHL:        {m['ghl_status']}")
    print(f"  Type:       {m['ds_type']}")
    print()

# Records in deal sheet but not in GHL
print(f"\n{'='*80}")
print(f"RECORDS IN DEAL SHEET BUT NOT IN GHL ({ds_only})")
print(f"{'='*80}\n")

for rid, data in deal_sheet.items():
    if rid not in ghl:
        print(f"  {rid} | {data['status']} | {data['address'][:60]}")

# Records in GHL but not in deal sheet  
print(f"\n{'='*80}")
print(f"RECORDS IN GHL BUT NOT IN DEAL SHEET ({ghl_only})")
print(f"{'='*80}\n")

for rid, data in ghl.items():
    if rid not in deal_sheet:
        print(f"  {rid} | {data['status']} | {data['address'][:60]}")
