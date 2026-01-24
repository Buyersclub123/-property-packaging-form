# Handoff to Implementation Agent - Batch 1

## 🎯 Your Mission

You are an **Expert Implementation Agent** tasked with implementing 6 Hotspotting-related fixes for the Property Review System form application.

---

## 📋 What You've Been Given

1. **Implementation Brief**: `IMPLEMENTATION-BRIEF-BATCH-1.md` (in this folder)
   - Contains detailed requirements for 6 items
   - Current vs Expected behavior
   - Solution requirements
   - Files to review
   - Success criteria

2. **Workflow Guide**: `../../MULTI-CHAT-WORKFLOW.md`
   - Defines your role and responsibilities
   - Outlines the workflow process
   - Provides document templates

---

## 🚨 CRITICAL RULES - READ CAREFULLY

### Before You Start:
1. ✅ Read `IMPLEMENTATION-BRIEF-BATCH-1.md` thoroughly
2. ✅ Read `../../MULTI-CHAT-WORKFLOW.md` to understand your role
3. ✅ Use Plan Mode (Shift+Tab) to research the codebase

### During Proposal Phase:
1. ✅ Conduct deep analysis of all relevant files
2. ✅ Create `PROPOSED-SOLUTION-BATCH-1.md` in this folder
3. ✅ Document ALL changes you plan to make
4. ✅ Identify potential risks and edge cases
5. ⛔ **STOP - Do NOT execute any code changes yet**
6. ⛔ **WAIT for explicit approval from the user**

### During Execution Phase:
1. ✅ Only proceed after receiving explicit approval
2. ✅ Execute changes step-by-step
3. ✅ Provide status update after each major step
4. ✅ If you encounter architectural conflicts, STOP and report
5. ✅ Create `COMPLETION-REPORT-BATCH-1.md` when done
6. ⛔ **Do NOT commit changes**
7. ⛔ **WAIT for user to review the final diff**

---

## 📝 Your Step-by-Step Process

### Step 1: Research & Analysis (Use Plan Mode - Shift+Tab)
```
Goal: Understand the current implementation thoroughly

Actions:
- Read IMPLEMENTATION-BRIEF-BATCH-1.md
- Review all files mentioned in the brief
- Search for related code using codebase_search
- Understand data flow and component relationships
- Identify all files that need modification
```

### Step 2: Create Proposed Solution
```
Goal: Document your implementation plan

Actions:
- Create PROPOSED-SOLUTION-BATCH-1.md in this folder
- For each of the 6 items, document:
  * Files to modify (with line numbers)
  * Exact changes to make (with code snippets)
  * Rationale for approach
  * Potential risks
  * Testing approach
- Use the template from MULTI-CHAT-WORKFLOW.md
```

### Step 3: Stop and Wait
```
Goal: Get approval before proceeding

Actions:
- Announce: "Proposed solution created in PROPOSED-SOLUTION-BATCH-1.md. Ready for review."
- STOP - Do not proceed
- WAIT for user to say "Approved. Please proceed." or similar
```

### Step 4: Execute Changes (Only After Approval)
```
Goal: Implement the approved solution

Actions:
- Execute changes for Item 1
- Provide status update
- Execute changes for Item 2
- Provide status update
- [Continue for all 6 items]
- If you encounter unexpected issues, STOP and report
```

### Step 5: Create Completion Report
```
Goal: Document what was done

Actions:
- Create COMPLETION-REPORT-BATCH-1.md in this folder
- List all completed items
- Document any new issues discovered
- Provide testing results
- Use the template from MULTI-CHAT-WORKFLOW.md
```

### Step 6: Stop and Wait for Diff Review
```
Goal: Let user review before committing

Actions:
- Announce: "All changes complete. Completion report created. Ready for diff review."
- STOP - Do not commit
- WAIT for user to review and approve the diff
```

---

## 📂 Files You'll Be Working With

Based on the implementation brief, you'll primarily work with:

### Core Files:
- `src/components/steps/Step2PropertyDetails.tsx`
  - Contains the Hotspotting section
  - Handles conditional field visibility
  - Manages field state

### Supporting Files:
- `src/types/property.ts` (if type updates needed)
- `src/components/steps/step2/HotspottingSection.tsx` (if it exists as separate component)

### Files to Review for Context:
- `src/components/steps/Step1PropertySearch.tsx` (to understand form flow)
- `src/components/steps/Step3PropertyDescription.tsx` (to understand step structure)

---

## 🎯 The 6 Items You're Implementing

Quick reference (see brief for full details):

1. **LGA Name in Heading** - Show LGA name in "Hotspotting for [LGA]" heading
2. **Suburb Dropdown** - Make suburb dropdown searchable/filterable
3. **Regional in Heading** - (Documented as Make.com issue - no form changes needed)
4. **7 Edit Fields** - Make 7 specific fields editable when "No" is selected
5. **Rental Yield Field** - Add new "Rental Yield (%)" field
6. **Rental Yield Visibility** - Show/hide based on "Is there a rental component?"

---

## 🔍 Key Questions to Answer in Your Analysis

1. **LGA Name (Item 1)**:
   - Where is the LGA value stored after property search?
   - How is it passed to Step 2?
   - Where is the Hotspotting heading rendered?

2. **Suburb Dropdown (Item 2)**:
   - What component is currently used for the suburb dropdown?
   - Does it support filtering/search?
   - If not, what component should replace it?

3. **7 Edit Fields (Item 4)**:
   - Which 7 fields are currently disabled?
   - What condition controls their disabled state?
   - Why isn't the current logic working?

4. **Rental Yield (Items 5 & 6)**:
   - Where should the new field be added in the form?
   - What condition controls its visibility?
   - What type/validation should it have?

---

## 💡 Tips for Success

### Use Plan Mode (Shift+Tab)
- This tells Claude to research first, then plan
- Perfect for understanding unfamiliar codebases
- Helps you create a comprehensive proposal

### Be Specific in Your Proposal
- Include exact line numbers
- Show before/after code snippets
- Explain your reasoning
- Identify edge cases

### Communicate Clearly
- Provide status updates after each major step
- If you're unsure about something, ask
- If you encounter conflicts, stop and report

### Test Your Changes
- Verify each item works as expected
- Check for unintended side effects
- Document testing results in completion report

---

## 📞 Communication Templates

### When Proposal is Ready:
```
✅ PROPOSED SOLUTION READY

I've completed my analysis and created PROPOSED-SOLUTION-BATCH-1.md.

Summary:
- Analyzed [X] files
- Identified [Y] changes needed
- Documented approach for all 6 items
- Identified [Z] potential risks

The proposed solution is ready for your review.

⏸️ AWAITING APPROVAL - I will not execute any changes until you explicitly approve.
```

### After Each Major Step:
```
✅ STATUS UPDATE: Item [X] Complete

Changes made:
- [Brief summary]

Files modified:
- [List]

Testing:
- [Results]

Moving on to Item [X+1]...
```

### When Complete:
```
✅ BATCH 1 IMPLEMENTATION COMPLETE

All 6 items have been implemented:
1. LGA Name in Heading - ✅ Complete
2. Suburb Dropdown - ✅ Complete
3. Regional in Heading - ✅ Documented (no changes needed)
4. 7 Edit Fields - ✅ Complete
5. Rental Yield Field - ✅ Complete
6. Rental Yield Visibility - ✅ Complete

Completion report created: COMPLETION-REPORT-BATCH-1.md

⏸️ READY FOR DIFF REVIEW - Please review changes before I commit.
```

### If You Encounter a Problem:
```
⚠️ ARCHITECTURAL CONFLICT DETECTED

Item: [Item name]
Issue: [Description of the conflict]

Current situation:
- [What you found]

Options:
1. [Approach A with pros/cons]
2. [Approach B with pros/cons]

⏸️ STOPPED - Awaiting guidance from Planning Agent.
```

---

## 🎓 Example: How Item 1 Might Look in Your Proposal

```markdown
### Item 1: LGA Name in Heading

**Current Implementation** (Step2PropertyDetails.tsx, lines 450-455):
```typescript
<h3 className="text-lg font-semibold mb-4">
  Hotspotting Information
</h3>
```

**Analysis**:
- LGA value is stored in `formData.property_lga` (passed from Step 1)
- Current heading is static text
- Need to make it dynamic

**Proposed Change** (Step2PropertyDetails.tsx, lines 450-455):
```typescript
<h3 className="text-lg font-semibold mb-4">
  {formData.property_lga 
    ? `Hotspotting for ${formData.property_lga}`
    : 'Hotspotting Information'}
</h3>
```

**Rationale**:
- Simple conditional rendering
- Falls back to generic text if LGA not available
- No type changes needed (property_lga already exists)

**Risks**:
- Low risk
- If property_lga is undefined, falls back gracefully

**Testing**:
- Verify LGA name appears after property search
- Verify fallback text appears if LGA missing
- Check formatting/styling
```

---

## ✅ Ready to Begin?

Before you start coding:
- [ ] I have read IMPLEMENTATION-BRIEF-BATCH-1.md
- [ ] I have read MULTI-CHAT-WORKFLOW.md
- [ ] I understand I must create a proposal first
- [ ] I understand I must wait for approval before executing
- [ ] I understand I must not commit changes
- [ ] I will provide status updates after each major step
- [ ] I will stop if I encounter architectural conflicts

---

## 🚀 Begin Your Mission

**Your first action should be:**

Use Plan Mode (Shift+Tab) and say:

```
"I am an expert Implementation Agent. I will now analyze the codebase for Batch 1 - Hotspotting Fixes.

My goal is to understand the current implementation of:
1. LGA name display in headings
2. Suburb dropdown functionality
3. Conditional field editing (7 fields)
4. Rental yield field requirements

I will create a comprehensive implementation plan including file paths, logic changes, and potential risks. I will output a specialized proposal in PROPOSED-SOLUTION-BATCH-1.md that documents all necessary changes.

I will NOT execute any changes until explicitly approved."
```

Then begin your analysis!

---

*Good luck! The Planning Agent is standing by to review your proposal.*
