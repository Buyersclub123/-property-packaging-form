import csv

# Read new deal sheet
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-22.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    new_rows = {row['Record ID']: row for row in reader}

# The 23 misaligned record IDs - let me find them programmatically
with open(r'C:\Users\User\Downloads\records (45).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    ghl_rows = {row['Record ID']: row for row in reader}

common_ids = set(new_rows.keys()) & set(ghl_rows.keys())

misaligned_ids = []
for rid in common_ids:
    ghl_status = ghl_rows[rid]['Status'].strip()
    ghl_pkg = ghl_rows[rid].get('Packager', '').strip()
    is_shifted = len(ghl_status) > 30 or '\n' in ghl_status or '\r' in ghl_status
    pkg_shifted = len(ghl_pkg) > 30 or '\n' in ghl_pkg or '\r' in ghl_pkg
    if is_shifted or pkg_shifted:
        misaligned_ids.append(rid)

print(f"Misaligned records: {len(misaligned_ids)}")
print(f"Of those, in new deal sheet: {sum(1 for r in misaligned_ids if r in new_rows)}")
print(f"Of those, NOT in new deal sheet: {sum(1 for r in misaligned_ids if r not in new_rows)}")
print()

for rid in misaligned_ids:
    in_new = "YES" if rid in new_rows else "NO"
    addr = new_rows[rid]['Property Address'][:55] if rid in new_rows else ghl_rows[rid]['Property Address'][:55]
    status = new_rows[rid]['Status'] if rid in new_rows else "N/A"
    print(f"  In new: {in_new} | Status: {status:<25} | {addr}")
