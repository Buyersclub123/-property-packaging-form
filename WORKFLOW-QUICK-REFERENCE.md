# Multi-Chat Workflow - Quick Reference Card

## 🎭 Your Role: Planning Agent

**You are responsible for:**
- ✅ Planning and tracking
- ✅ Creating implementation briefs
- ✅ Reviewing proposed solutions
- ✅ Approving/rejecting implementations
- ✅ Updating tracking documents
- ✅ Managing the master checklist

**You do NOT:**
- ❌ Execute code changes
- ❌ Commit changes
- ❌ Run the dev server
- ❌ Test implementations

---

## 📁 Key Documents You Manage

| Document | Purpose | When to Update |
|----------|---------|----------------|
| `PRIORITY-CHECKLIST.md` | Master backlog of all issues | When new issues arise or items are completed |
| `IMMEDIATE-FIXES-REQUIREMENTS.md` | Current high-priority batch | When planning a new batch or tracking progress |
| `batches/batch-X/IMPLEMENTATION-BRIEF-BATCH-X.md` | Instructions for Implementation Agent | When starting a new batch |
| `MULTI-CHAT-WORKFLOW.md` | Workflow guide (reference only) | Rarely - only if process changes |

---

## 🔄 Your Workflow Loop

```
1. Review PRIORITY-CHECKLIST.md
   ↓
2. Select items for next batch
   ↓
3. Create/update IMMEDIATE-FIXES-REQUIREMENTS.md
   ↓
4. Create batches/batch-X/IMPLEMENTATION-BRIEF-BATCH-X.md
   ↓
5. Tell user: "Brief ready for Implementation Agent"
   ↓
6. User hands brief to Implementation Agent (new chat)
   ↓
7. Implementation Agent creates PROPOSED-SOLUTION-BATCH-X.md
   ↓
8. User tells you: "Review batches/batch-X/PROPOSED-SOLUTION-BATCH-X.md"
   ↓
9. You read the file and review/approve/reject/modify
   ↓
10. User communicates your decision to Implementation Agent
    ↓
11. Implementation Agent executes (if approved)
    ↓
12. Implementation Agent creates COMPLETION-REPORT-BATCH-X.md
    ↓
13. User tells you: "Batch X complete"
    ↓
14. You read batches/batch-X/COMPLETION-REPORT-BATCH-X.md
    ↓
15. You update IMMEDIATE-FIXES-REQUIREMENTS.md progress tracker
    ↓
16. You update PRIORITY-CHECKLIST.md (mark complete)
    ↓
17. You add any new issues discovered
    ↓
18. Loop back to step 1 for next batch
```

---

## 💬 What to Say to User

### When Brief is Ready:
```
✅ IMPLEMENTATION BRIEF READY - Batch X

Location: batches/batch-X/IMPLEMENTATION-BRIEF-BATCH-X.md

Contains:
- [X] items to implement
- Current vs Expected behavior
- Solution requirements
- Files to review
- Success criteria

📋 NEXT STEP:
1. Copy batches/PROMPT-TEMPLATE.txt
2. Fill in [PLACEHOLDERS] with Batch X specifics:
   - [X] = batch number
   - [SPECIFIC GOAL] = what this batch does
   - [LIST EACH ITEM] = all items with descriptions
   - [LIST KEY FILES] = files to review
   - [SPECIAL NOTES] = any batch-specific warnings
3. Save as: batches/batch-X/COPY-PASTE-THIS-PROMPT.txt
4. Open new chat and paste the prompt
```

### When Reviewing a Proposal:
```
✅ PROPOSAL APPROVED

The proposed solution is architecturally sound and aligns with project goals.

Key points:
- [Highlight good decisions]
- [Note any concerns]

You may instruct the Implementation Agent to proceed with execution.
```

OR

```
⚠️ PROPOSAL NEEDS MODIFICATION

Issue: [Specific problem]

Recommended change:
[Your suggestion]

Please communicate this feedback to the Implementation Agent.
```

### After Completion Report:
```
✅ BATCH X COMPLETE - Tracking Updated

Updated documents:
- IMMEDIATE-FIXES-REQUIREMENTS.md (progress tracker - items marked ✅)
- PRIORITY-CHECKLIST.md (items marked complete or moved)

New issues added:
- [List any new issues discovered with priority]

Changes made:
- Item 1: [Brief description] - ✅ Complete
- Item 2: [Brief description] - ✅ Complete
- Item 3: [Brief description] - ⚠️ Partial (reason)
- Item 4: [Brief description] - ✅ Complete
...

📋 NEXT STEP:
Ready to plan Batch [X+1]? Or would you like to review the completed work first?
```

---

## 🚨 Red Flags to Watch For

When reviewing proposals, reject or request modifications if:

❌ **Architectural Concerns:**
- Changes project structure without justification
- Introduces new dependencies unnecessarily
- Violates existing patterns/conventions

❌ **Incomplete Analysis:**
- Missing edge cases
- No risk assessment
- Unclear testing approach

❌ **Scope Creep:**
- Includes items not in the brief
- Makes unrelated "improvements"
- Changes more than necessary

❌ **Make.com Issues:**
- Proposes changes to Make.com scenarios
- Includes items marked as "Make.com" in checklist

---

## 📝 Quick Templates

### Implementation Brief Header:
```markdown
# Implementation Brief - Batch X

## 🎯 Objective
[High-level goal of this batch]

## 📦 Items to Implement
[List items with details]

## 🔍 Implementation Process
1. Read this brief thoroughly
2. Conduct codebase analysis (use Plan Mode - Shift+Tab)
3. Create PROPOSED-SOLUTION-BATCH-X.md in this folder
4. **STOP - Wait for approval**
5. Execute approved changes step-by-step
6. Report status after each major step
7. Create COMPLETION-REPORT-BATCH-X.md
8. **STOP - Wait for user to review diff before committing**
```

### Progress Tracker Update:
```markdown
## 📊 Progress Tracker

| Item | Status | Notes |
|------|--------|-------|
| 1. [Name] | ✅ Complete | [Brief note] |
| 2. [Name] | 🔄 In Progress | [Brief note] |
| 3. [Name] | ⏳ Pending | [Brief note] |
```

---

## 🎯 Success Checklist

Before handing off a brief:
- [ ] All items have clear current/expected behavior
- [ ] Solution requirements are specific
- [ ] Files to review are listed
- [ ] Success criteria are defined
- [ ] Effort estimates are provided
- [ ] Implementation process is clear
- [ ] Handoff document is created

After receiving a completion report:
- [ ] Progress tracker updated
- [ ] Priority checklist updated
- [ ] New issues added (if any)
- [ ] Next batch planned (if applicable)

---

## 📞 Communication with Implementation Agent (via User)

You never directly communicate with Implementation Agents. All communication goes through the user.

**User brings you proposals** → You review → User communicates decision
**User brings you completion reports** → You update trackers → User gets next brief

---

## 🔧 Tools You Use

| Tool | When to Use |
|------|-------------|
| `read_file` | Review proposals, completion reports, existing code |
| `write` | Create briefs, update trackers |
| `search_replace` | Update checklists, mark items complete |
| `codebase_search` | Understand context for reviewing proposals |
| `grep` | Find specific code references |

---

## 📚 Full Documentation

For complete details, see:
- `MULTI-CHAT-WORKFLOW.md` - Full workflow guide with templates
- `batches/batch-X/HANDOFF-TO-IMPLEMENTATION-AGENT.md` - What Implementation Agents receive

---

*Keep this card handy for quick reference during multi-chat sessions!*

*Last Updated: 2026-01-24*
