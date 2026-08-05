import csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Read deal sheet - Record ID to Address mapping
ds_records = {}
with open(r'C:\Users\User\Downloads\Deal Sheet 2026 - Deal List (2).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers = next(reader)
    status_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='status')
    record_id_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='record id')
    address_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='property address')
    
    for row_num, row in enumerate(reader, 2):
        if len(row) > max(status_idx, record_id_idx, address_idx):
            rid = row[record_id_idx].strip()
            address = row[address_idx].strip()
            status = row[status_idx].strip()
            if rid:
                ds_records[rid] = {'address': address, 'status': status, 'row': row_num}

# Read GHL - Record ID to Address mapping
ghl_records = {}
with open(r'C:\Users\User\Downloads\records (50).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers_g = next(reader)
    rid_idx = next(i for i,h in enumerate(headers_g) if h.strip().lower()=='record id')
    address_idx_g = next(i for i,h in enumerate(headers_g) if h.strip().lower()=='property address')
    status_idx_g = next(i for i,h in enumerate(headers_g) if h.strip().lower()=='status')
    
    for row in reader:
        if len(row) > max(rid_idx, address_idx_g):
            rid = row[rid_idx].strip().strip('"')
            address = row[address_idx_g].strip()
            status = row[status_idx_g].strip() if status_idx_g < len(row) else ''
            if rid:
                ghl_records[rid] = {'address': address, 'status': status}

# Find records in both - compare addresses
print("=" * 100)
print("RECORDS WHERE ADDRESS DIFFERS BETWEEN DEAL SHEET AND GHL (same Record ID)")
print("=" * 100)
print()

address_mismatches = []
for rid in ds_records:
    if rid in ghl_records:
        ds_addr = ds_records[rid]['address'].lower().strip()
        ghl_addr = ghl_records[rid]['address'].lower().strip()
        # Normalize for comparison - remove extra spaces, commas
        ds_norm = ' '.join(ds_addr.split())
        ghl_norm = ' '.join(ghl_addr.split())
        if ds_norm != ghl_norm:
            address_mismatches.append({
                'id': rid,
                'ds_address': ds_records[rid]['address'],
                'ghl_address': ghl_records[rid]['address'],
                'ds_status': ds_records[rid]['status'],
                'ghl_status': ghl_records[rid]['status'],
                'ds_row': ds_records[rid]['row'],
            })

print(f"Found {len(address_mismatches)} address mismatches")
print()

for m in sorted(address_mismatches, key=lambda x: x['ds_row']):
    print(f"Row {m['ds_row']} | Record ID: {m['id']}")
    print(f"  Deal Sheet: {m['ds_address']}")
    print(f"  GHL:        {m['ghl_address']}")
    print(f"  DS Status:  {m['ds_status']}  |  GHL Status: {m['ghl_status']}")
    print()

# Also check: deal sheet records NOT in GHL
print("=" * 100)
print("DEAL SHEET RECORDS NOT FOUND IN GHL")
print("=" * 100)
ds_only = {rid: d for rid, d in ds_records.items() if rid not in ghl_records and d['status'] != '07 Test Record'}
print(f"Found {len(ds_only)} (excluding test records)")
for rid, d in sorted(ds_only.items(), key=lambda x: x[1]['row']):
    print(f"  Row {d['row']} | {d['address']} | {d['status']} | {rid}")
