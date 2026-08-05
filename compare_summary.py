import csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

old_records = {}
with open(r'C:\Users\User\Downloads\Deal Sheet 2026 - Deal List (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers = next(reader)
    rid_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='record id')
    addr_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='property address')
    qa_idx = next(i for i,h in enumerate(headers) if h.strip().lower()=='qa status')
    pkg_idx = next((i for i,h in enumerate(headers) if 'packager' in h.strip().lower() and 'approved' not in h.strip().lower()), None)
    for row in reader:
        if len(row) > max(rid_idx, addr_idx):
            rid = row[rid_idx].strip()
            addr = row[addr_idx].strip()
            qa = row[qa_idx].strip() if qa_idx < len(row) else ''
            if rid: old_records[rid] = {'address': addr, 'qa': qa}

new_records = {}
with open(r'C:\Users\User\Downloads\deal-sheet-2026-07-29.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    headers_n = next(reader)
    rid_idx_n = next(i for i,h in enumerate(headers_n) if h.strip().lower()=='record id')
    addr_idx_n = next(i for i,h in enumerate(headers_n) if h.strip().lower()=='property address')
    pkg_idx_n = next(i for i,h in enumerate(headers_n) if 'packager approved' in h.strip().lower())
    for row in reader:
        if len(row) > max(rid_idx_n, addr_idx_n):
            rid = row[rid_idx_n].strip()
            addr = row[addr_idx_n].strip()
            pkg = row[pkg_idx_n].strip() if pkg_idx_n < len(row) else ''
            if rid: new_records[rid] = {'address': addr, 'pkg': pkg}

old_only = {rid: d for rid, d in old_records.items() if rid not in new_records}
new_only = {rid: d for rid, d in new_records.items() if rid not in old_records}

old_approved = {rid: d for rid, d in old_only.items() if d['qa'].lower() == 'approved'}
old_not_approved = {rid: d for rid, d in old_only.items() if d['qa'].lower() != 'approved'}

print(f'Old deal sheet: {len(old_records)} records')
print(f'New deal sheet: {len(new_records)} records')
print(f'Difference: {len(old_records) - len(new_records)}')
print()
print(f'In OLD only: {len(old_only)}')
print(f'  - QA Approved: {len(old_approved)}')
print(f'  - NOT QA Approved: {len(old_not_approved)}')
print(f'In NEW only: {len(new_only)}')
print()

if old_not_approved:
    print('=' * 100)
    print('IN OLD BUT NOT NEW - NOT QA APPROVED (expected if new filters on Packager Approved)')
    print('=' * 100)
    for rid, d in old_not_approved.items():
        print(f'  {d["address"][:60]:<60} | QA: "{d["qa"]}" | {rid}')
    print()

if old_approved:
    print('=' * 100)
    print('IN OLD BUT NOT NEW - QA APPROVED (these SHOULD be in new sheet)')
    print('=' * 100)
    for rid, d in old_approved.items():
        print(f'  {d["address"][:60]:<60} | {rid}')
    print()

if new_only:
    print('=' * 100)
    print('IN NEW BUT NOT OLD')
    print('=' * 100)
    for rid, d in new_only.items():
        print(f'  {d["address"][:60]:<60} | {rid}')
