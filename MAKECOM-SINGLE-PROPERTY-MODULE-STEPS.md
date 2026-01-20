# Make.com Single Property Route - Step-by-Step Instructions
**Date:** January 9, 2026  
**Goal:** Add HTTP module after Module 5 to create GHL record for single properties  
**Approach:** Start with minimal/core fields, test, then add more

---

## 📋 Pre-Flight Check

Before you start:
- ✅ You're in the Make.com scenario: "Form App Property Submission"
- ✅ You can see Module 1 (Webhook) and Module 5 (Set Variable - Route 1)
- ✅ Module 5 currently has no modules connected after it

---

## 🎯 Step 1: Add HTTP Module After Module 5

### Detailed Steps:

1. **Open Your Make.com Scenario:**
   - Go to Make.com
   - Open scenario: "Form App Property Submission"
   - Make sure scenario is in **Design mode** (not Run mode)

2. **Connect HTTP Module After Module 5:**
   - **Click on Module 5** (the Set Variable module for Route 1)
   - You should see a **small circle** on the right side of Module 5 (this is the connection point)
   - **Click and drag** from that circle to create a new module
   - A menu will appear with module types

3. **Select HTTP Module:**
   - In the search box, type: `HTTP`
   - Select: **"HTTP > Make a Request"**
   - The module will appear connected to Module 5

4. **Rename the Module (Optional but helpful):**
   - Click on the new module
   - In the module name field (top left), rename it to: **"Module 7: Create Single Property GHL Record"**
   - This helps identify it later

---

## 🔧 Step 2: Configure HTTP Module Settings

### 2.1: Basic Settings

1. **Click on the new HTTP module** to open its settings

2. **Set Method:**
   - Find the **"Method"** dropdown
   - Select: **POST**

3. **Set URL:**
   - Find the **"URL"** field
   - Enter exactly:
     ```
     https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records
     ```
   - Make sure there are no trailing spaces

### 2.2: Configure Headers

1. **Find the "Headers" section** (usually below URL)

2. **Click "Add header"** button (or similar)

3. **Add Header 1: Authorization**
   - **Name field:** `Authorization`
   - **Value field:** `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
   - Click "Add" or press Enter

4. **Click "Add header" again**

5. **Add Header 2: Version**
   - **Name field:** `Version`
   - **Value field:** `2021-07-28`
   - Click "Add"

6. **Click "Add header" again**

7. **Add Header 3: Content-Type**
   - **Name field:** `Content-Type`
   - **Value field:** `application/json`
   - Click "Add"

8. **Verify you have 3 headers:**
   - Authorization
   - Version
   - Content-Type

### 2.3: Configure Body (Core Fields Only)

**We'll start with minimal fields to test, then add more after verification.**

1. **Find the "Body type" dropdown**
   - Select: **Raw**

2. **Find the "Content type" dropdown** (for Raw body)
   - Select: **JSON (application/json)**

3. **Find the large text area** (this is where we'll put the JSON body)

4. **Copy and paste this MINIMAL JSON structure:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "",
    "template_type": "",
    "street_number": "",
    "street_name": "",
    "suburb_name": "",
    "state": "",
    "post_code": "",
    "folder_link": ""
  }
}
```

5. **Now we'll map the actual form data to these fields**

---

## 🗺️ Step 3: Map Form Data to JSON Body

**Important:** In Make.com, you use the mapping tool to insert form data into the JSON body.

### Method 1: Using Mapping Tool (Recommended)

1. **Click inside the JSON body text area** (where you pasted the JSON)

2. **Place your cursor** after the colon in `"property_address": ""`

3. **Delete the empty string** `""` (but keep the quotes)

4. **Click the mapping icon** (looks like a purple tag, usually in the bottom right of the text area)
   - **OR** press `Ctrl+Space` (Windows) or `Cmd+Space` (Mac)
   - **OR** type `{{` (two curly braces)

5. **A dropdown menu will appear** showing all available modules

6. **Select Module 5** from the dropdown

7. **You'll see all output fields from Module 5**

8. **Navigate to the field:**
   - Look for: `incoming_data`
   - Expand it (click the arrow)
   - Look for: `formData`
   - Expand it
   - Look for: `address`
   - Expand it
   - Click on: `propertyAddress`

9. **The mapping will be inserted:** `{{5.incoming_data.formData.address.propertyAddress}}`

10. **Your JSON should now look like:**
    ```json
    "property_address": "{{5.incoming_data.formData.address.propertyAddress}}",
    ```

### Method 2: Manual Typing (If mapping tool doesn't work)

If the mapping tool is confusing, you can type the mappings directly:

1. Replace each empty string `""` with the Make.com expression
2. Use this format: `{{5.incoming_data.formData.PATH.TO.FIELD}}`

---

## 📝 Step 4: Complete Field Mappings (Core Fields)

**Map each field one by one using the mapping tool:**

### Field Mapping Table (Core Fields):

| JSON Field Name | Make.com Expression | How to Find in Mapping Tool |
|----------------|---------------------|----------------------------|
| `property_address` | `{{5.incoming_data.formData.address.propertyAddress}}` | Module 5 → incoming_data → formData → address → propertyAddress |
| `template_type` | `{{5.incoming_data.formData.decisionTree.templateType}}` | Module 5 → incoming_data → formData → decisionTree → templateType |
| `street_number` | `{{5.incoming_data.formData.address.streetNumber}}` | Module 5 → incoming_data → formData → address → streetNumber |
| `street_name` | `{{5.incoming_data.formData.address.streetName}}` | Module 5 → incoming_data → formData → address → streetName |
| `suburb_name` | `{{5.incoming_data.formData.address.suburb}}` | Module 5 → incoming_data → formData → address → suburb |
| `state` | `{{5.incoming_data.formData.address.state}}` | Module 5 → incoming_data → formData → address → state |
| `post_code` | `{{5.incoming_data.formData.address.postcode}}` | Module 5 → incoming_data → formData → address → postcode |
| `folder_link` | `{{5.incoming_data.folderLink}}` | Module 5 → incoming_data → folderLink |

### Detailed Steps for Each Field:

1. **Click in the JSON body** after the colon and quotes for the field
2. **Delete the empty string** `""`
3. **Press `{{`** or click mapping icon
4. **Navigate through the structure:**
   - Start with Module 5
   - Go to `incoming_data`
   - Go to `formData`
   - Then navigate to the specific field based on the table above
5. **Click the field** to insert it
6. **Move to next field** and repeat

### Final JSON Body Should Look Like:

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{5.incoming_data.formData.address.propertyAddress}}",
    "template_type": "{{5.incoming_data.formData.decisionTree.templateType}}",
    "street_number": "{{5.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{5.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{5.incoming_data.formData.address.suburb}}",
    "state": "{{5.incoming_data.formData.address.state}}",
    "post_code": "{{5.incoming_data.formData.address.postcode}}",
    "folder_link": "{{5.incoming_data.folderLink}}"
  }
}
```

---

## ✅ Step 5: Save and Test

### Save the Module:

1. **Click "OK"** button (usually bottom right)
2. **OR** click "Save" if there's a Save button
3. The module should now be configured

### Test the Module:

**Option 1: Test with Existing Data (Recommended First)**

1. **Find the scenario execution history:**
   - Look for previous executions (if any)
   - Or find a recent execution from Module 1 (webhook)

2. **Re-run the execution:**
   - Click on a previous execution
   - Click "Run" or "Replay" button
   - This will re-run the scenario with the same data

3. **Watch the execution:**
   - The scenario will run through Module 1 → Module 5 → **New HTTP Module**
   - Watch for any errors

**Option 2: Submit New Test (If you have property ready)**

1. **Go to your form app**
2. **Submit a single property** (not a project)
3. **Go back to Make.com**
4. **Watch the execution** in real-time
5. **Check for errors**

### Verify Success:

1. **Check the HTTP module execution:**
   - Click on the HTTP module in the execution
   - Look at the "Response" section
   - You should see a response with status code `201` (Created)
   - The response should contain an `id` field (this is the GHL record ID)

2. **Check GHL:**
   - Go to your GHL account
   - Navigate to Property Reviews custom object
   - Look for a new record with the property address you submitted
   - Click on it to view details

3. **Verify Fields Populated:**
   - Check that the 8 core fields we mapped have values:
     - Property Address ✅
     - Template Type ✅
     - Street Number ✅
     - Street Name ✅
     - Suburb Name ✅
     - State ✅
     - Post Code ✅
     - Folder Link ✅

---

## 🐛 Troubleshooting

### If you get an error:

**Error: "Cannot find module 5" or similar:**
- Make sure you're using `{{5.incoming_data...}}` not `{{module5...}}`
- Check that Module 5 is actually numbered as "5" in your scenario

**Error: "Field not found" or "undefined":**
- Check the field path is correct
- Use Make.com's data inspector: Click on Module 5 in an execution to see what fields are actually available
- The structure might be slightly different

**Error: "401 Unauthorized":**
- Check the Authorization header is exactly: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- Make sure there are no extra spaces

**Error: "400 Bad Request":**
- Check the JSON body is valid JSON (no syntax errors)
- Make sure `locationId` is in the body (not in URL)
- Check that all field names match GHL field names exactly

**No record created in GHL:**
- Check the HTTP response status code
- If it's not 201, check the error message in the response
- Make sure the GHL Object ID is correct: `692d04e3662599ed0c29edfa`

---

## 📊 Step 6: Document Results

After testing, please note:

1. **Did the HTTP request succeed?**
   - Status code: ______
   - GHL Record ID created: ______

2. **Which fields populated in GHL?**
   - List fields that have values ✅
   - List fields that are empty ❌

3. **Any errors or issues?**
   - Note any error messages
   - Note any fields that should have values but don't

---

## 🚀 Step 7: Next Steps (After Core Fields Work)

Once these 8 core fields are working, we'll add more fields incrementally:

**Next batch to add:**
- Property description fields (beds, bath, land size, etc.)
- Purchase price fields (with contract type logic)
- Rental assessment fields
- Risk overlays fields
- Content sections fields

But let's get these 8 working first! ✅

---

## 💡 Tips

1. **Use Make.com's Data Inspector:**
   - Click on Module 5 in any execution
   - You can see the exact structure of the data
   - This helps verify field paths

2. **Test Incrementally:**
   - Start with just 1-2 fields
   - If that works, add more
   - Easier to debug if something goes wrong

3. **Save Often:**
   - Make.com auto-saves, but it's good to click Save after major changes

4. **Check Execution Logs:**
   - If something fails, check the execution log
   - It shows exactly where it failed and why

---

**Ready to start?** Follow Step 1 above to add the HTTP module! 🚀
