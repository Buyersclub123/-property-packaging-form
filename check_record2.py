import urllib.request, json

# Read token from .env.local
token = ''
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('GHL_BEARER_TOKEN='):
            token = line.split('=', 1)[1].strip()
            break

url = 'https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/6a604aebf8b945659937743c?locationId=UJWYn4mrgGodB7KZUcHt'
req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}', 'Version': '2021-07-28'})
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    props = data.get('properties', {})
    print('RECORD STILL EXISTS IN GHL')
    print(f"Address: {props.get('property_address', 'N/A')}")
    print(f"Status: {props.get('status', 'N/A')}")
except urllib.error.HTTPError as e:
    print(f'HTTP {e.code}: {e.reason}')
    if e.code == 404:
        print('RECORD IS DELETED FROM GHL')
    else:
        print(e.read().decode())
