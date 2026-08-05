import csv

# Read GHL extract
with open(r'C:\Users\User\Downloads\records (45).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    ghl_rows = {row['Record ID']: row for row in reader}

# Read new deal sheet
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-22.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    new_rows = {row['Record ID']: row for row in reader}

common_ids = set(new_rows.keys()) & set(ghl_rows.keys())

# Find misaligned records - where GHL Status contains clearly wrong data
misaligned = []
for rid in common_ids:
    ghl_status = ghl_rows[rid]['Status'].strip()
    new_status = new_rows[rid]['Status'].strip()
    ghl_norm = ghl_status.replace('_', ' ').title()
    
    # Check if GHL status looks like it's from wrong column (too long, contains newlines, etc.)
    is_shifted = len(ghl_status) > 30 or '\n' in ghl_status or '\r' in ghl_status
    
    # Also check packager for shift
    ghl_pkg = ghl_rows[rid].get('Packager', '').strip()
    pkg_shifted = len(ghl_pkg) > 30 or '\n' in ghl_pkg or '\r' in ghl_pkg
    
    if is_shifted or pkg_shifted:
        created = ghl_rows[rid].get('Created At ( AEST )', '')
        updated = ghl_rows[rid].get('Updated At ( AEST )', '')
        address = new_rows[rid]['Property Address'][:60]
        misaligned.append((rid, address, created, updated, new_status, ghl_status[:60]))

misaligned.sort(key=lambda x: x[2])  # sort by created date

print(f"Misaligned records: {len(misaligned)}")
print("="*120)
print(f"{'Address':<55} {'Created':<22} {'Updated':<22} {'Deal Sheet Status':<25}")
print("-"*120)
for rid, addr, created, updated, new_s, ghl_s in misaligned:
    print(f"{addr:<55} {created:<22} {updated:<22} {new_s:<25}")

# Also show all unique Created At dates to see if there's a pattern
print("\n\nCreated dates of misaligned records:")
dates = sorted(set(r[2] for r in misaligned))
for d in dates:
    count = sum(1 for r in misaligned if r[2] == d)
    print(f"  {d} ({count} records)")
