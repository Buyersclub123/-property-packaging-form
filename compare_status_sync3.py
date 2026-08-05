import csv
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Read old deal sheet
deal_sheet = {}
with open(r'C:\Users\User\Downloads\Deal Sheet 2026 - Deal List (2).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers = next(reader)
    status_idx = None
    record_id_idx = None
    address_idx = None
    for i, h in enumerate(headers):
        h_lower = h.strip().lower()
        if h_lower == 'status': status_idx = i
        if h_lower == 'record id': record_id_idx = i
        if h_lower == 'property address': address_idx = i
    
    for row in reader:
        if len(row) > max(status_idx or 0, record_id_idx or 0):
            rid = row[record_id_idx].strip() if record_id_idx is not None else ''
            status = row[status_idx].strip() if status_idx is not None else ''
            address = row[address_idx].strip() if address_idx is not None else ''
            if rid: deal_sheet[rid] = {'status': status, 'address': address}

# Read GHL extract
ghl = {}
with open(r'C:\Users\User\Downloads\records (50).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers_ghl = next(reader)
    rid_idx = None
    status_idx_g = None
    address_idx_g = None
    for i, h in enumerate(headers_ghl):
        h_lower = h.strip().lower()
        if h_lower == 'record id': rid_idx = i
        if h_lower == 'status': status_idx_g = i
        if h_lower == 'property address': address_idx_g = i
    
    for row in reader:
        if len(row) > max(rid_idx or 0, status_idx_g or 0):
            rid = row[rid_idx].strip().strip('"') if rid_idx is not None else ''
            status = row[status_idx_g].strip() if status_idx_g is not None else ''
            address = row[address_idx_g].strip() if address_idx_g is not None else ''
            if rid: ghl[rid] = {'status': status, 'address': address}

def normalize_status(s):
    return s.strip().lower().replace('_', ' ')

# Valid status prefixes
valid_prefixes = ['01', '02', '03', '04', '05', '06', '07']

def is_valid_status(s):
    return any(s.strip().startswith(p) for p in valid_prefixes)

# Find genuine mismatches only (both sides have valid statuses)
mismatches = []
for rid, ds_data in deal_sheet.items():
    if rid in ghl:
        ds_status = ds_data['status']
        ghl_status = ghl[rid]['status']
        if normalize_status(ds_status) != normalize_status(ghl_status):
            if is_valid_status(ds_status) and is_valid_status(ghl_status):
                mismatches.append({
                    'id': rid,
                    'address': ds_data['address'],
                    'ds_status': ds_status,
                    'ghl_status': ghl_status,
                })

print(f"Total records in deal sheet: {len(deal_sheet)}")
print(f"Total records in GHL: {len(ghl)}")
print(f"Genuine status mismatches (ignoring corrupt CSV data): {len(mismatches)}")
print()

if mismatches:
    print("ADDRESS\tDEAL SHEET STATUS\tGHL STATUS\tRECORD ID")
    print("-" * 120)
    for m in sorted(mismatches, key=lambda x: x['ds_status']):
        print(f"{m['address']}\t{m['ds_status']}\t{m['ghl_status']}\t{m['id']}")
else:
    print("ALL CLEAR - No genuine status mismatches found!")
