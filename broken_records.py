import csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Read GHL to build address lookup
ghl_by_addr = {}
with open(r'C:\Users\User\Downloads\records (50).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    h = next(reader)
    ri = next(i for i,x in enumerate(h) if x.strip().lower()=='record id')
    ai = next(i for i,x in enumerate(h) if x.strip().lower()=='property address')
    for row in reader:
        if len(row) > max(ri, ai):
            rid = row[ri].strip().strip('"')
            addr = row[ai].strip()
            if rid and addr:
                ghl_by_addr[addr.lower()] = {'id': rid, 'address': addr}

broken = [
    (743, '7B CULLEN ST WALKERVALE QLD 4670', '6a571076729dea07d6a0d6a8', '6 Lavinia Pl Eaton WA 6232'),
    (760, '9 Mitchell St Mayfield TAS 7248', '6a067b18d21b8855b8c1a803', '3 Rosie Pl Ballarat East VIC 3350'),
    (795, 'Unit 1, 30 Brewery Lane Armidale NSW 2350', '69bcb98fa9a8687d8b27e7f0', '34 Waterlily Tce Murray Bridge SA 5253'),
    (818, 'Units A,B, 17 Agnew Av Norman Gardens QLD 4701', '6a3e2a68abc4e37d47a35be0', 'Units A,B, 32 Rainbird Cct Logan Reserve QLD 4133'),
    (689, 'COLUMN SHIFTED - shows a Record ID as address', '69e1a68b2bc2d841102ac7b3', '32 Phelps Cct Kirkwood QLD 4680'),
    (484, 'COLUMN SHIFTED - shows Approved', '69e08aa6e69ba14e79a051f3', 'Unit 3, 22 Dove St Mount Austin NSW 2650'),
    (706, 'COLUMN SHIFTED - shows Approved', '69b235fd4ae9ca217954f38f', '37 Baker St Kepnock QLD 4670'),
]

for row, ds_addr, wrong_id, ghl_addr in broken:
    print(f'Row {row}')
    print(f'  DS Address:        {ds_addr}')
    print(f'  Wrong Record ID:   {wrong_id}')
    print(f'  GHL at that ID:    {ghl_addr}')
    # search for correct ID
    found = None
    if not ds_addr.startswith('COLUMN'):
        key = ds_addr.lower()
        for ga, gd in ghl_by_addr.items():
            if key == ga:
                found = gd
                break
        if not found:
            words = [w for w in ds_addr.replace(',','').split() if len(w)>2 and w.upper() not in ('QLD','NSW','VIC','WA','TAS','SA','ACT','NT','UNIT','UNITS')]
            for ga, gd in ghl_by_addr.items():
                hits = sum(1 for w in words if w.lower() in ga)
                if hits >= 2:
                    found = gd
                    break
    if found:
        print(f'  Correct Record ID: {found["id"]}')
        print(f'  GHL match:         {found["address"]}')
    else:
        print(f'  Correct Record ID: MANUAL LOOKUP NEEDED')
    print()
