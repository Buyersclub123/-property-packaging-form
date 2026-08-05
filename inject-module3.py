"""
Inject modified Module 3 code back into blueprint JSON.
Reads the modified code from extracted-module3-from-blueprint-32.js,
replaces Module 3's code in the blueprint (32) JSON,
and writes a new blueprint (33) JSON.
"""
import json

bp_path = r'c:\Users\User\property-tool-prod\make-com-scenarios\02a GHL Property Review Submitted approval & email processing.blueprint (32).json'
code_path = r'c:\Users\User\property-tool-prod\extracted-module3-from-blueprint-32.js'
out_path = r'c:\Users\User\property-tool-prod\make-com-scenarios\02a GHL Property Review Submitted approval & email processing.blueprint (33).json'

# Read the modified code
with open(code_path, 'r', encoding='utf-8') as f:
    new_code = f.read()

# Read the blueprint JSON
with open(bp_path, 'r', encoding='utf-8') as f:
    bp = json.load(f)

def inject_module3(nodes):
    for m in nodes:
        if m.get('id') == 3:
            mapper = m.get('mapper', {})
            if 'codeEditorJavascript' in mapper:
                mapper['codeEditorJavascript'] = new_code
                print(f"Injected {len(new_code)} chars into Module 3 codeEditorJavascript")
                return True
            elif 'code' in mapper:
                mapper['code'] = new_code
                print(f"Injected {len(new_code)} chars into Module 3 code")
                return True
        if m.get('routes'):
            for route in m['routes']:
                if inject_module3(route.get('flow', [])):
                    return True
        if m.get('next'):
            if inject_module3(m['next']):
                return True
    return False

if inject_module3(bp.get('flow', [])):
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(bp, f, indent=4, ensure_ascii=False)
    print(f"Written new blueprint to: {out_path}")
else:
    print("ERROR: Module 3 not found in blueprint")
