# Multi-Chat Workflow Guide

## 📋 Overview

This document defines the workflow for managing multi-chat AI activity for the Property Review System project. It establishes clear roles, responsibilities, and communication protocols between the Planning Agent (this chat) and Implementation Agents (execution chats).

---

## 🎭 Agent Roles

### Planning Agent (This Chat)
**Role**: Lead Systems Architect & Project Manager

**Responsibilities**:
- Maintain `PRIORITY-CHECKLIST.md` (master backlog)
- Create `IMMEDIATE-FIXES-REQUIREMENTS.md` documents for high-priority batches
- Generate implementation briefs for execution chats
- Review proposed solutions from Implementation Agents
- Approve/reject implementation proposals
- Track progress across all batches
- Update tracking documents after completion
- Add new issues discovered during implementation
- Manage Make.com and standalone module planning

**Does NOT**:
- Execute code changes directly
- Commit changes to the codebase
- Run the development server
- Test implementations

---

### Implementation Agent (Execution Chats)
**Role**: Expert Implementation Specialist

**Responsibilities**:
- Read and understand the implementation brief
- Conduct deep codebase analysis for assigned tasks
- Propose detailed solutions with file paths and logic changes
- **STOP and wait for approval before executing**
- Execute approved changes step-by-step
- Provide status updates after each major step
- Report architectural conflicts back to Planning Agent
- Create completion reports in the batch folder
- **Do NOT commit changes until user reviews final diff**

**Does NOT**:
- Make architectural decisions
- Change project structure without approval
- Proceed without explicit approval
- Commit changes without user review

---

## 📁 Folder Structure

```
property-review-system/form-app/
├── PRIORITY-CHECKLIST.md                    # Master backlog (Planning Agent)
├── IMMEDIATE-FIXES-REQUIREMENTS.md          # Current high-priority items (Planning Agent)
├── MULTI-CHAT-WORKFLOW.md                   # This document
├── batches/
│   ├── PROMPT-TEMPLATE.txt                  # Reusable template for all batches (Planning Agent)
│   ├── batch-1/
│   │   ├── IMPLEMENTATION-BRIEF-BATCH-1.md  # Brief for Implementation Agent
│   │   ├── HANDOFF-TO-IMPLEMENTATION-AGENT.md # Onboarding guide
│   │   ├── COPY-PASTE-THIS-PROMPT.txt       # Personalized prompt (Planning Agent)
│   │   ├── PROPOSED-SOLUTION-BATCH-1.md     # Created by Implementation Agent
│   │   ├── COMPLETION-REPORT-BATCH-1.md     # Created by Implementation Agent
│   │   └── [any other batch-specific docs]
│   ├── batch-2/
│   │   └── [similar structure]
│   └── ...
└── [rest of project files]
```

## 📝 Creating Prompts for New Batches

**Planning Agent**: When creating a new batch, use the template to ensure consistency and personalization.

### Process:
1. Copy `batches/PROMPT-TEMPLATE.txt`
2. Replace all [PLACEHOLDERS]:
   - `[X]` → batch number (e.g., "2")
   - `[SPECIFIC GOAL]` → what this batch does (e.g., "implement user authentication")
   - `[N]` → number of items (e.g., "5")
   - `[LIST EACH ITEM]` → all items with one-line descriptions
   - `[LIST KEY FILES]` → files Implementation Agent should review
   - `[SPECIAL NOTES]` → any batch-specific warnings or context
   - `[X-Y]` → effort estimate (e.g., "8-10")
3. Save as: `batches/batch-X/COPY-PASTE-THIS-PROMPT.txt`
4. Tell user to paste this into new chat

### Why This Matters:
- ✅ Ensures Implementation Agent knows exactly where to save documents
- ✅ Provides all context upfront (no questions needed)
- ✅ Includes completion tracking instructions
- ✅ Reminds Implementation Agent to prompt user to update Planning Agent
- ✅ Maintains consistency across all batches

---

## 🔄 Workflow Process

### Phase 1: Planning (Planning Agent)
1. Review `PRIORITY-CHECKLIST.md`
2. Identify high-priority items for next batch
3. Create/update `IMMEDIATE-FIXES-REQUIREMENTS.md`
4. Generate implementation brief in `batches/batch-X/`
5. Provide brief to user for handoff

### Phase 2: Proposal (Implementation Agent)
1. User opens new chat and provides implementation brief
2. Implementation Agent reads brief thoroughly
3. Conducts deep codebase analysis using Plan Mode (Shift+Tab)
4. Creates `PROPOSED-SOLUTION-BATCH-X.md` with:
   - Detailed analysis of current code
   - Specific files to modify
   - Exact changes to make
   - Potential risks and edge cases
   - Testing approach
5. **STOPS and waits for user approval**

### Phase 3: Review (User + Planning Agent)
1. User reviews proposed solution
2. User brings proposal to Planning Agent (this chat) if needed
3. Planning Agent reviews for:
   - Architectural consistency
   - Alignment with project goals
   - Completeness of solution
   - Risk assessment
4. Planning Agent provides approval/rejection/modifications
5. User communicates decision to Implementation Agent

### Phase 4: Execution (Implementation Agent)
1. Implementation Agent receives approval
2. Executes changes step-by-step
3. Provides status update after each major step
4. If architectural conflict arises:
   - **STOPS immediately**
   - Documents the conflict
   - User consults Planning Agent
5. Completes all approved changes
6. Creates `COMPLETION-REPORT-BATCH-X.md`
7. **STOPS before committing** - waits for user to review diff

### Phase 5: Completion (Planning Agent)
1. User brings completion report to Planning Agent
2. Planning Agent reviews completion report thoroughly
3. Planning Agent updates `IMMEDIATE-FIXES-REQUIREMENTS.md` progress tracker:
   - Mark completed items with ✅
   - Mark partial items with ⚠️ and note reason
   - Mark blocked items with ❌ and note blocker
   - Update "New Issues Found During Implementation" section
4. Planning Agent updates `PRIORITY-CHECKLIST.md`:
   - Mark completed items as complete
   - Move partial/blocked items to appropriate section
   - Add newly discovered issues with priority
5. Planning Agent provides summary to user showing:
   - What was completed
   - What remains
   - New issues added
   - Whether next batch is ready
6. Planning Agent prepares next batch (if applicable)

---

## 📝 Document Templates

### Implementation Brief Template
```markdown
# Implementation Brief - Batch X

## 🎯 Objective
[High-level goal]

## 📦 Items to Implement
1. [Item name]
   - Current Behavior: [description]
   - Expected Behavior: [description]
   - Solution Requirements: [specific details]
   - Files to Review: [list]
   - Success Criteria: [checklist]
   - Effort: [estimate]

## 🔍 Implementation Process
1. Read this brief thoroughly
2. Conduct codebase analysis (use Plan Mode - Shift+Tab)
3. Create PROPOSED-SOLUTION-BATCH-X.md in this folder
4. **STOP - Wait for approval**
5. Execute approved changes step-by-step
6. Report status after each major step
7. Create COMPLETION-REPORT-BATCH-X.md
8. **STOP - Wait for user to review diff before committing**

## ⚠️ Important Notes
- Do NOT execute until proposal is approved
- Do NOT commit changes until user reviews
- If you encounter architectural conflicts, STOP and report
- Document all decisions in your completion report
```

### Proposed Solution Template
```markdown
# Proposed Solution - Batch X

## 📊 Analysis Summary
[Overview of current implementation]

## 🔧 Proposed Changes

### Item 1: [Name]
**Files to Modify**:
- `path/to/file1.ts` (lines X-Y)
- `path/to/file2.tsx` (lines A-B)

**Changes**:
1. [Specific change with code snippet]
2. [Specific change with code snippet]

**Rationale**: [Why this approach]

**Risks**: [Potential issues]

**Testing**: [How to verify]

[Repeat for each item]

## ⚠️ Architectural Considerations
[Any concerns or questions for Planning Agent]

## ✅ Ready for Approval
- [ ] All items analyzed
- [ ] Changes documented
- [ ] Risks identified
- [ ] Testing approach defined

**Awaiting approval to proceed with implementation.**
```

### Completion Report Template
```markdown
# Completion Report - Batch X

## ✅ Completed Items
1. [Item name]
   - Status: ✅ Complete / ⚠️ Partial / ❌ Blocked
   - Changes Made: [summary]
   - Files Modified: [list]
   - Testing: [results]

## 🐛 New Issues Discovered
1. [Issue description]
   - Severity: High/Medium/Low
   - Recommended Action: [suggestion]

## 📝 Notes
[Any important observations or recommendations]

## 🎯 Next Steps
- [ ] User to review diff
- [ ] User to test changes
- [ ] Planning Agent to update trackers
```

---

## 🚨 Critical Rules

### For Implementation Agents:
1. **NEVER execute code changes before proposal is approved**
2. **NEVER commit changes before user reviews diff**
3. **ALWAYS stop if you encounter architectural conflicts**
4. **ALWAYS create documents in the batch folder for Planning Agent review**
5. **ALWAYS provide status updates after major steps**

### For Planning Agent:
1. **NEVER execute code changes directly**
2. **ALWAYS review proposals for architectural consistency**
3. **ALWAYS update tracking documents after completion**
4. **ALWAYS add new issues to appropriate checklists**
5. **ALWAYS provide clear approval/rejection with reasoning**

### For User:
1. **ALWAYS review proposed solutions before approving**
2. **ALWAYS review final diff before committing**
3. **ALWAYS bring completion reports back to Planning Agent**
4. **ALWAYS communicate decisions clearly to both agents**

---

## 🎯 Success Criteria

A batch is considered successfully completed when:
- ✅ All items in the brief are addressed
- ✅ Proposed solution was reviewed and approved
- ✅ Changes were executed without architectural conflicts
- ✅ Completion report was created
- ✅ User reviewed and approved final diff
- ✅ Planning Agent updated all tracking documents
- ✅ New issues (if any) were added to checklists

---

## 📞 Communication Protocol

### Implementation Agent → User
- "Proposed solution created in `PROPOSED-SOLUTION-BATCH-X.md`. Ready for review."
- "Encountered architectural conflict: [description]. Awaiting guidance."
- "Completed [item]. Status update: [summary]."
- "All changes complete. Completion report created. Ready for diff review."

### User → Planning Agent
- "Review this proposed solution: [paste or reference]"
- "Implementation complete. Here's the completion report: [paste or reference]"
- "New issue discovered during implementation: [description]"

### Planning Agent → User
- "Proposal approved. You may instruct Implementation Agent to proceed."
- "Proposal needs modification: [specific feedback]"
- "Tracking documents updated. Ready for next batch."

---

## 🔧 Tools & Techniques

### For Implementation Agents:
- **Plan Mode (Shift+Tab)**: Use for initial codebase research and planning
- **Codebase Search**: Find relevant code by meaning
- **Grep**: Search for exact symbols/strings
- **Read File**: Review specific files in detail
- **Search Replace**: Make precise code changes

### For Planning Agent:
- **Read File**: Review proposals and completion reports
- **Write**: Create/update tracking documents
- **Search Replace**: Update checklists and trackers

---

## 📚 Reference Documents

- `PRIORITY-CHECKLIST.md` - Master backlog of all issues and features
- `IMMEDIATE-FIXES-REQUIREMENTS.md` - Current high-priority batch details
- `batches/batch-X/IMPLEMENTATION-BRIEF-BATCH-X.md` - Specific batch instructions
- `GOOGLE-SHEETS-CONDITIONAL-FORMATTING-GUIDE.md` - Example of Planning Agent output

---

## 🎓 Example Workflow

### Example: Batch 1 - Hotspotting Fixes

1. **Planning Agent** creates `batches/batch-1/IMPLEMENTATION-BRIEF-BATCH-1.md`
2. **User** opens new chat, provides brief to **Implementation Agent**
3. **Implementation Agent** analyzes codebase, creates `PROPOSED-SOLUTION-BATCH-1.md`
4. **Implementation Agent** says: "Proposed solution ready. Awaiting approval."
5. **User** reviews proposal, brings to **Planning Agent** if needed
6. **Planning Agent** reviews, says: "Approved. Proceed with implementation."
7. **User** tells **Implementation Agent**: "Approved. Please proceed."
8. **Implementation Agent** executes changes, provides status updates
9. **Implementation Agent** creates `COMPLETION-REPORT-BATCH-1.md`
10. **Implementation Agent** says: "Complete. Ready for diff review."
11. **User** reviews diff, approves
12. **User** brings completion report to **Planning Agent**
13. **Planning Agent** updates `IMMEDIATE-FIXES-REQUIREMENTS.md` and `PRIORITY-CHECKLIST.md`
14. **Planning Agent** prepares Batch 2 (if applicable)

---

## ✨ Benefits of This Workflow

1. **Clear Separation of Concerns**: Planning vs. Execution
2. **Quality Control**: Mandatory review before execution
3. **Traceability**: All decisions documented
4. **Risk Mitigation**: Stop points prevent runaway changes
5. **Efficiency**: Parallel planning and execution possible
6. **Consistency**: Standardized templates and processes
7. **Accountability**: Clear ownership of each phase

---

*Last Updated: 2026-01-24*
*Planning Agent: Claude Sonnet 4.5*
