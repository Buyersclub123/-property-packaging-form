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

# ============================================================
# STATUS - full detail
# ============================================================
print("STATUS MISMATCHES (full list)")
print("="*80)
status_mm = []
for rid in common_ids:
    new_s = new_rows[rid]['Status'].strip()
    ghl_s = ghl_rows[rid]['Status'].strip()
    ghl_norm = ghl_s.replace('_', ' ').title()
    if new_s != ghl_norm:
        addr = new_rows[rid]['Property Address'][:60]
        status_mm.append((rid, new_s, ghl_s, addr))

status_mm.sort(key=lambda x: (x[1], x[2]))
print(f"Total: {len(status_mm)}")
for rid, new_s, ghl_s, addr in status_mm:
    print(f"  New='{new_s}' -> GHL='{ghl_s}' | {addr}")

# ============================================================
# TYPE - check pattern
# ============================================================
print("\n\nTYPE MISMATCHES - pattern analysis")
print("="*80)

# Let's see what the actual values look like
type_pattern = {}
for rid in common_ids:
    new_v = new_rows[rid]['Type'].strip()
    ghl_v = ghl_rows[rid]['Deal Type'].strip()
    if new_v != ghl_v:
        key = f"New='{new_v}' | GHL='{ghl_v}'"
        type_pattern[key] = type_pattern.get(key, 0) + 1

print(f"Total mismatches: {sum(type_pattern.values())}")
for pattern, count in sorted(type_pattern.items(), key=lambda x: -x[1]):
    print(f"  {count}x {pattern}")

# ============================================================
# CASHBACK - check pattern
# ============================================================
print("\n\nCASHBACK MISMATCHES - pattern analysis")
print("="*80)

cb_pattern = {}
for rid in common_ids:
    new_type = new_rows[rid]['CB Type'].strip()
    ghl_type = ghl_rows[rid]['cashback_rebate_type'].strip()
    new_val = new_rows[rid]['CB $'].strip()
    ghl_val = ghl_rows[rid]['cashback_rebate_value'].strip()
    if new_type != ghl_type or new_val != ghl_val:
        # Categorize
        if new_type.lower() == ghl_type.lower() and new_val == ghl_val:
            cat = "CASE_ONLY"
        elif new_type == '' and ghl_type != '':
            cat = "NEW_EMPTY_TYPE"
        elif new_type != '' and ghl_type == '':
            cat = "GHL_EMPTY_TYPE"
        elif new_val != ghl_val:
            cat = "VALUE_DIFF"
        else:
            cat = "OTHER"
        cb_pattern[cat] = cb_pattern.get(cat, 0) + 1

print(f"Total mismatches: {sum(cb_pattern.values())}")
for pattern, count in sorted(cb_pattern.items(), key=lambda x: -x[1]):
    print(f"  {count}x {pattern}")

# ============================================================
# PACKAGER APPROVED - full detail
# ============================================================
print("\n\nPACKAGER APPROVED MISMATCHES")
print("="*80)
pa_mm = []
for rid in common_ids:
    new_v = new_rows[rid]['Packager Approved'].strip()
    ghl_v = ghl_rows[rid]['Packager Approved'].strip()
    if new_v.lower() != ghl_v.lower():
        addr = new_rows[rid]['Property Address'][:50]
        pa_mm.append((rid, new_v, ghl_v, addr))

pa_mm.sort(key=lambda x: (x[1], x[2]))
print(f"Total: {len(pa_mm)}")
for rid, new_v, ghl_v, addr in pa_mm:
    print(f"  New='{new_v}' -> GHL='{ghl_v}' | {addr}")

# ============================================================
# QA APPROVED - full detail
# ============================================================
print("\n\nQA APPROVED MISMATCHES")
print("="*80)
qa_mm = []
for rid in common_ids:
    new_v = new_rows[rid]['QA Approved'].strip()
    ghl_v = ghl_rows[rid]['QA Approved'].strip()
    if new_v.lower() != ghl_v.lower():
        addr = new_rows[rid]['Property Address'][:50]
        qa_mm.append((rid, new_v, ghl_v, addr))

qa_mm.sort(key=lambda x: (x[1], x[2]))
print(f"Total: {len(qa_mm)}")
for rid, new_v, ghl_v, addr in qa_mm:
    print(f"  New='{new_v}' -> GHL='{ghl_v}' | {addr}")

# ============================================================
# PACKAGER & SOURCER - are these column misalignment?
# ============================================================
print("\n\nPACKAGER MISMATCHES - checking for column shift")
print("="*80)
# The GHL extract has 'Sourcer' at col 99 and 'Packager' at col 100
# Check if GHL columns might be reading from wrong fields
pkg_mm = []
for rid in common_ids:
    new_pkg = new_rows[rid]['Packager'].strip()
    ghl_pkg = ghl_rows[rid]['Packager'].strip()
    new_src = new_rows[rid]['Sourcer'].strip()
    ghl_src = ghl_rows[rid]['Sourcer'].strip()
    if new_pkg != ghl_pkg or new_src != ghl_src:
        addr = new_rows[rid]['Property Address'][:40]
        pkg_mm.append((rid, new_pkg, ghl_pkg, new_src, ghl_src, addr))

print(f"Total with either Packager or Sourcer mismatch: {len(pkg_mm)}")
for rid, np, gp, ns, gs, addr in pkg_mm[:25]:
    print(f"  Pkg: New='{np}' GHL='{gp}' | Src: New='{ns}' GHL='{gs}' | {addr}")

# ============================================================
# CLOSING FIELDS - column alignment check
# ============================================================
print("\n\nCLOSING FIELDS - sample of mismatches with all 4 closing fields")
print("="*80)
close_mm = set()
for rid in common_ids:
    new_ba = new_rows[rid]['Closing BA'].strip()
    ghl_ba = ghl_rows[rid]['Closing BA'].strip()
    new_price = new_rows[rid]['Close $'].strip()
    ghl_price = ghl_rows[rid]['Closing Price'].strip()
    new_client = new_rows[rid]['Client'].strip()
    ghl_client = ghl_rows[rid]['Client Closed'].strip()
    new_date = new_rows[rid]['Close Date'].strip()
    ghl_date = ghl_rows[rid]['Closing Date'].strip()
    if any([new_ba != ghl_ba, new_price != ghl_price, new_client != ghl_client, new_date != ghl_date]):
        close_mm.add(rid)

print(f"Records with any closing field mismatch: {len(close_mm)}")
for rid in list(close_mm)[:15]:
    addr = new_rows[rid]['Property Address'][:40]
    print(f"\n  {addr}")
    print(f"    BA:     New='{new_rows[rid]['Closing BA']}' | GHL='{ghl_rows[rid]['Closing BA']}'")
    print(f"    Price:  New='{new_rows[rid]['Close $']}' | GHL='{ghl_rows[rid]['Closing Price']}'")
    print(f"    Client: New='{new_rows[rid]['Client']}' | GHL='{ghl_rows[rid]['Client Closed']}'")
    print(f"    Date:   New='{new_rows[rid]['Close Date']}' | GHL='{ghl_rows[rid]['Closing Date']}'")
