import csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Old deal sheet - Available only
old_records = {}
with open(r'C:\Users\User\Downloads\Deal Sheet 2026 - Deal List (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers = next(reader)
    rid_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='record id')
    addr_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='property address')
    status_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='status')
    qa_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='qa status')
    for row in reader:
        if len(row) > max(rid_idx, addr_idx, status_idx):
            rid = row[rid_idx].strip()
            addr = row[addr_idx].strip()
            status = row[status_idx].strip()
            qa = row[qa_idx].strip() if qa_idx < len(row) else ''
            if rid:
                old_records[rid] = {'address': addr, 'status': status, 'qa': qa}

# New deal sheet - Available + Packager Approved
new_records = {}
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-29.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers_n = next(reader)
    rid_idx_n = next(i for i,h in enumerate(headers_n) if h.strip().lower()=='record id')
    addr_idx_n = next(i for i,h in enumerate(headers_n) if h.strip().lower()=='property address')
    status_idx_n = next(i for i,h in enumerate(headers_n) if h.strip().lower()=='status')
    pkg_idx_n = next(i for i,h in enumerate(headers_n) if 'packager approved' in h.strip().lower())
    qa_idx_n = next(i for i,h in enumerate(headers_n) if 'qa approved' in h.strip().lower())
    for row in reader:
        if len(row) > max(rid_idx_n, addr_idx_n, status_idx_n):
            rid = row[rid_idx_n].strip()
            addr = row[addr_idx_n].strip()
            status = row[status_idx_n].strip()
            pkg = row[pkg_idx_n].strip() if pkg_idx_n < len(row) else ''
            qa = row[qa_idx_n].strip() if qa_idx_n < len(row) else ''
            if rid:
                new_records[rid] = {'address': addr, 'status': status, 'packager_approved': pkg, 'qa': qa}

print(f'Old deal sheet (Available): {len(old_records)} records')
print(f'New deal sheet (Available + Packager Approved): {len(new_records)} records')
print()

# In old but not in new
old_only = {rid: d for rid, d in old_records.items() if rid not in new_records}
# In new but not in old
new_only = {rid: d for rid, d in new_records.items() if rid not in old_records}

print(f'In OLD but NOT in NEW: {len(old_only)}')
print(f'In NEW but NOT in OLD: {len(new_only)}')
print()

if old_only:
    print('=' * 100)
    print('RECORDS IN OLD DEAL SHEET BUT MISSING FROM NEW DEAL SHEET')
    print('=' * 100)
    for rid, d in old_only.items():
        print(f'  {d["address"][:65]:<65} | QA: {d["qa"]:<10} | {rid}')

print()

if new_only:
    print('=' * 100)
    print('RECORDS IN NEW DEAL SHEET BUT NOT IN OLD DEAL SHEET')
    print('=' * 100)
    for rid, d in new_only.items():
        print(f'  {d["address"][:65]:<65} | Pkg: {d["packager_approved"]:<10} | QA: {d["qa"]:<10} | {rid}')
