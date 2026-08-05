import urllib.request, json

url = 'http://localhost:3000/api/deal-sheet'
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())
records = data.get('records', [])

# Check first 5 records for reviewDate and lastUpdate
print(f"Total records: {len(records)}")
for r in records[:5]:
    print(f"  {r.get('propertyAddress', 'N/A')[:40]}")
    print(f"    reviewDate: '{r.get('reviewDate', '')}'")
    print(f"    lastUpdate: '{r.get('lastUpdate', '')}'")
    print()
