import urllib.request, json

# Fetch full raw record via the search API, look at ALL fields
url = 'http://localhost:3000/api/deal-sheet'
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())
records = data.get('records', [])
target = [r for r in records if r['id'] == '6a604aebf8b945659937743c']
if target:
    print("Deal sheet transformed record:")
    for k, v in target[0].items():
        if v:
            print(f"  {k}: {v}")

# Now fetch raw from GHL search to see all top-level fields
with open('.env.local', 'r') as f:
    token = ''
    location_id = ''
    for line in f:
        if line.startswith('GHL_BEARER_TOKEN='):
            token = line.split('=', 1)[1].strip()
        if line.startswith('GHL_LOCATION_ID='):
            location_id = line.split('=', 1)[1].strip()

search_url = 'https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/search'
payload = json.dumps({"locationId": location_id, "page": 1, "pageLimit": 5}).encode()
req = urllib.request.Request(search_url, data=payload, headers={
    'Authorization': f'Bearer {token}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
}, method='POST')

try:
    resp2 = urllib.request.urlopen(req)
    raw = json.loads(resp2.read())
    # Show all top-level keys of first record to see structure
    if raw.get('records'):
        first = raw['records'][0]
        print("\nRaw GHL record top-level keys:")
        for k in sorted(first.keys()):
            if k != 'properties':
                print(f"  {k}: {first[k]}")
        print(f"\n  properties keys count: {len(first.get('properties', {}))}")
except Exception as e:
    print(f"Direct API call failed: {e}")
    print("Checking via local API raw endpoint instead...")
