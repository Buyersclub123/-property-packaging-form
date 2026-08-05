import json, sys

bp_path = r'c:\Users\User\property-tool-prod\make-com-scenarios\02a GHL Property Review Submitted approval & email processing.blueprint (32).json'
out_path = r'c:\Users\User\property-tool-prod\extracted-module3-from-blueprint-32-original.js'

with open(bp_path, 'r', encoding='utf-8') as f:
    bp = json.load(f)

def find_module3(nodes):
    for m in nodes:
        mid = m.get('id')
        if mid == 3:
            mapper = m.get('mapper', {})
            code = mapper.get('codeEditorJavascript') or mapper.get('code')
            if code:
                with open(out_path, 'w', encoding='utf-8') as out:
                    out.write(code)
                print(f"FOUND Module 3! Extracted {len(code)} chars")
                return True
            else:
                print("Module 3 found but code is empty")
                return True
        if m.get('routes'):
            for route in m['routes']:
                flow = route.get('flow', [])
                if find_module3(flow):
                    return True
        if m.get('next'):
            if find_module3(m['next']):
                return True
    return False

if not find_module3(bp.get('flow', [])):
    print("Module 3 not found")
