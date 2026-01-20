# Make.com Create JSON Module - Field Names Reference

## Module Location
**Path:** Tools > Create JSON

## Exact Field Names in Create JSON Module:

### Top Level Fields:
- **"Add item"** button - Click to add a new field to the JSON object

### For Each Item Added:
- **Key** - Enter the field name (e.g., "locationId", "properties")
- **Value** - Enter the value or map data:
  - Can be: Text, Number, Boolean, Array, Object, or mapped from previous module
  - Click the mapping icon to map from previous modules

### Value Types Available:
- Text
- Number
- Boolean
- Array
- Object

### For Nested Objects (like "properties"):
1. Click "Add item"
2. Set **Key** to "properties"
3. Set **Value Type** to "Object"
4. Click inside the Object to add nested items:
   - Click "Add item" again
   - Set **Key** (e.g., "why_this_property")
   - Set **Value** (map to data path)

## Example Configuration:

**Item 1:**
- Key: `locationId`
- Value Type: Text
- Value: `UJWYn4mrgGodB7KZUcHt`

**Item 2:**
- Key: `properties`
- Value Type: Object
- Inside Object, Add item:
  - Key: `why_this_property`
  - Value Type: Text
  - Value: `{{5.incoming_data.formData.contentSections.whyThisProperty}}`

## Notes:
- Field names are: **Key** and **Value** (not "Name" and "Value")
- Use "Add item" button to add new fields
- For nested objects, set Value Type to "Object" then add items inside
- Multi-line text fields are automatically escaped when using Create JSON module
