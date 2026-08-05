import urllib.request, json

url = 'http://localhost:3000/api/deal-sheet'
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())
records = data.get('records', [])
target = [r for r in records if r['id'] == '6a604aebf8b945659937743c']
print(f"Total records: {len(records)}")
if target:
    rec = target[0]
    print(f"RECORD FOUND: {rec.get('propertyAddress', 'N/A')}")
    print(f"Status: {rec.get('status', 'N/A')}")
else:
    print("RECORD NOT FOUND - deleted record is gone from deal sheet API")
