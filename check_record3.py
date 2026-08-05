import urllib.request, json

# Read token and location from .env.local
token = ''
location_id = ''
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('GHL_BEARER_TOKEN='):
            token = line.split('=', 1)[1].strip()
        if line.startswith('GHL_LOCATION_ID='):
            location_id = line.split('=', 1)[1].strip()

# Use the search endpoint (same as deal sheet)
url = 'https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/search'
payload = json.dumps({"locationId": location_id, "page": 1, "pageLimit": 100}).encode()
req = urllib.request.Request(url, data=payload, headers={
    'Authorization': f'Bearer {token}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
}, method='POST')

resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
records = data.get('records', [])

# Check if the deleted record is in the results
target_id = '6a604aebf8b945659937743c'
found = [r for r in records if r['id'] == target_id]

if found:
    print(f'RECORD STILL IN SEARCH RESULTS (page 1)')
    print(f"Address: {found[0].get('properties', {}).get('property_address', 'N/A')}")
else:
    print(f'Record NOT found in page 1 ({len(records)} records)')
    print('Checking remaining pages...')
    
    page = 2
    while len(records) >= 100:
        payload = json.dumps({"locationId": location_id, "page": page, "pageLimit": 100}).encode()
        req = urllib.request.Request(url, data=payload, headers={
            'Authorization': f'Bearer {token}',
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
        }, method='POST')
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        records = data.get('records', [])
        found = [r for r in records if r['id'] == target_id]
        if found:
            print(f'RECORD STILL IN SEARCH RESULTS (page {page})')
            print(f"Address: {found[0].get('properties', {}).get('property_address', 'N/A')}")
            break
        page += 1
    
    if not found:
        print(f'RECORD NOT FOUND IN ANY PAGE - confirmed deleted from GHL search')
        print(f'Total pages checked: {page - 1}')
