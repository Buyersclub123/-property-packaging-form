import csv

# Read new deal sheet
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-22.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    new_rows = {row['Record ID']: row for row in reader}

# Read GHL extract
with open(r'C:\Users\User\Downloads\records (45).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    ghl_rows = {row['Record ID']: row for row in reader}

common_ids = set(new_rows.keys()) & set(ghl_rows.keys())

# Valid GHL status values (all start with 0x pattern or are known values)
valid_statuses = [
    '01_available', '02_eoi', '03_contr', '04_settled',
    '05_remove_no_interest', '06_remove_lost', '07_test_record',
    '01 available', '02 eoi', '03 contr', '04 settled',
    '05 remove no interest', '06 remove lost', '07 test record',
]

print("ALL STATUS COMPARISONS")
print("="*100)

real_mismatches = []
csv_shift = []
cosmetic = []

for rid in common_ids:
    new_s = new_rows[rid]['Status'].strip()
    ghl_s = ghl_rows[rid]['Status'].strip()
    ghl_norm = ghl_s.replace('_', ' ').title()
    
    if new_s == ghl_norm:
        continue  # match
    
    # Is GHL value a valid status?
    ghl_lower = ghl_s.lower().strip()
    is_valid_ghl = any(ghl_lower.startswith(v[:5]) for v in valid_statuses if v)
    
    # Is it just a cosmetic difference (apostrophe, etc)?
    is_cosmetic = ghl_lower.replace("'", "").replace("-", "").replace("_", " ").title() == new_s.replace("'", "").replace("-", "")
    
    addr = new_rows[rid]['Property Address'][:60]
    
    if not is_valid_ghl:
        csv_shift.append((rid, new_s, ghl_s[:60], addr))
    elif is_cosmetic:
        cosmetic.append((rid, new_s, ghl_s, addr))
    else:
        real_mismatches.append((rid, new_s, ghl_s, addr))

print(f"\nGENUINE STATUS MISMATCHES (deal sheet differs from GHL): {len(real_mismatches)}")
print("-"*100)
for rid, new_s, ghl_s, addr in real_mismatches:
    print(f"  Deal Sheet: '{new_s}' | GHL: '{ghl_s}' | {addr} | {rid}")

print(f"\nCOSMETIC ONLY (apostrophe/formatting): {len(cosmetic)}")
print("-"*100)
for rid, new_s, ghl_s, addr in cosmetic:
    print(f"  Deal Sheet: '{new_s}' | GHL: '{ghl_s}' | {addr}")

print(f"\nCSV COLUMN SHIFT (GHL value is garbage): {len(csv_shift)}")
print("-"*100)
for rid, new_s, ghl_s, addr in csv_shift:
    print(f"  Deal Sheet: '{new_s}' | GHL: '{ghl_s}' | {addr}")

# Also check: are there records where deal sheet has a status but GHL status is empty?
empty_ghl_status = []
for rid in common_ids:
    new_s = new_rows[rid]['Status'].strip()
    ghl_s = ghl_rows[rid]['Status'].strip()
    if new_s and not ghl_s:
        addr = new_rows[rid]['Property Address'][:60]
        empty_ghl_status.append((rid, new_s, addr))

print(f"\nDEAL SHEET HAS STATUS BUT GHL IS EMPTY: {len(empty_ghl_status)}")
for rid, new_s, addr in empty_ghl_status:
    print(f"  Deal Sheet: '{new_s}' | {addr}")

# And vice versa
empty_new_status = []
for rid in common_ids:
    new_s = new_rows[rid]['Status'].strip()
    ghl_s = ghl_rows[rid]['Status'].strip()
    ghl_lower = ghl_s.lower().strip()
    is_valid_ghl = any(ghl_lower.startswith(v[:5]) for v in valid_statuses if v)
    if not new_s and ghl_s and is_valid_ghl:
        addr = ghl_rows[rid]['Property Address'][:60]
        empty_new_status.append((rid, ghl_s, addr))

print(f"\nGHL HAS STATUS BUT DEAL SHEET IS EMPTY: {len(empty_new_status)}")
for rid, ghl_s, addr in empty_new_status:
    print(f"  GHL: '{ghl_s}' | {addr}")
