import csv

# Read new deal sheet
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-22.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    new_rows = {row['Record ID']: row for row in reader}

# Read GHL extract
with open(r'C:\Users\User\Downloads\records (45).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    ghl_rows = {row['Record ID']: row for row in reader}

# Find all EOI records in each source
new_eoi = {rid: row for rid, row in new_rows.items() if 'eoi' in row['Status'].lower()}
ghl_eoi = {rid: row for rid, row in ghl_rows.items() 
           if row['Status'].strip().lower().replace('_', ' ') in ['02 eoi', '02_eoi']}

# Also check for GHL records where status column might be shifted but is actually EOI
# Look for exact matches
ghl_eoi_exact = {rid: row for rid, row in ghl_rows.items() 
                 if row['Status'].strip() in ['02 EOI', '02_EOI', '02_eoi', '02 eoi']}

print(f"New deal sheet EOI records: {len(new_eoi)}")
print(f"GHL EOI records (strict match): {len(ghl_eoi_exact)}")
print(f"Difference: {len(new_eoi) - len(ghl_eoi_exact)}")

# Records in new EOI but NOT in GHL EOI
in_new_only = set(new_eoi.keys()) - set(ghl_eoi_exact.keys())
print(f"\nIn NEW EOI but NOT in GHL EOI: {len(in_new_only)}")
print("-"*100)
for rid in sorted(in_new_only):
    addr = new_rows[rid]['Property Address'][:55]
    new_status = new_rows[rid]['Status']
    ghl_status = ghl_rows[rid]['Status'].strip()[:60] if rid in ghl_rows else 'NOT IN GHL'
    print(f"  {rid} | New: '{new_status}' | GHL: '{ghl_status}' | {addr}")

# Records in GHL EOI but NOT in new EOI
in_ghl_only = set(ghl_eoi_exact.keys()) - set(new_eoi.keys())
print(f"\nIn GHL EOI but NOT in NEW EOI: {len(in_ghl_only)}")
print("-"*100)
for rid in sorted(in_ghl_only):
    addr = ghl_rows[rid]['Property Address'][:55] if rid in ghl_rows else 'N/A'
    new_status = new_rows[rid]['Status'] if rid in new_rows else 'NOT IN NEW'
    ghl_status = ghl_rows[rid]['Status'].strip()
    print(f"  {rid} | New: '{new_status}' | GHL: '{ghl_status}' | {addr}")
