# 👋 Start Here - Next Session

**Welcome!** If you're continuing work on the Property Review System, please read this first.

---

## 📋 First Steps

1. **Read the Handover Document:**
   - Open and review: `HANDOVER-2026-01-09-SESSION.md`
   - This contains everything from the previous session
   - Includes: what was done, what's working, what's blocking, TODO list

2. **Understand the Current State:**
   - **Project Route (Route 2):** ✅ Working - Creates parent + 4 child records in GHL
   - **Single Property Route (Route 1):** ❌ **BLOCKING** - Only has Module 5, needs implementation
   - **Form App:** ✅ Working - All improvements deployed to Vercel

3. **Key Files to Review:**
   - `HANDOVER-2026-01-09-SESSION.md` - Most recent session summary
   - `HANDOVER-2025-01-08-SESSION.md` - Previous session (Iterator fix)
   - `MAKE-COM-IMPLEMENTATION-GUIDE.md` - Step-by-step Make.com guide
   - `GHL-FIELDS-CREATED-2026-01-09.csv` - All GHL fields (including 13 newly created)

---

## 🎯 Immediate Priority

**Implement Single Property Route in Make.com**

**Current Issue:**
- Single property submissions go through Module 5 (Set Variable) and then... nothing happens
- No GHL record is created
- No email is sent
- No Deal Sheet entry

**What Needs to Happen:**
1. Add HTTP module after Module 5 to create GHL record for single property
2. Build email template (reuse logic from existing scenario if possible)
3. Send email to packager
4. Write to Deal Sheet

**Reference:** See detailed steps in `HANDOVER-2026-01-09-SESSION.md` → "Next Steps (Immediate Priority)" section

---

## ⚠️ Important Notes

1. **Don't modify existing production scenario:** "PR → Property Review Created"
   - It's working and in production
   - Use it only as reference for email template logic

2. **Ask before making changes:**
   - Previous session learned: Always confirm with user before implementing new features
   - Don't assume - ask first

3. **Test incrementally:**
   - Implement one module at a time
   - Test after each addition
   - Verify data mapping before moving forward

4. **Deployment:**
   - Always verify committed code matches local code
   - Use `git diff` to check before pushing
   - Don't commit credentials or sensitive files

---

## 🔑 Key Information

**Make.com:**
- Webhook URL: `https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h`
- Scenario: "Form App Property Submission" (NEW scenario, not the production one)
- Module 5: Route 1 (Single Property) - needs modules after it
- Module 6: Route 2 (Project) - fully working

**GHL:**
- Location ID: `UJWYn4mrgGodB7KZUcHt`
- Object ID: `692d04e3662599ed0c29edfa`
- API Endpoint: `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`
- Authorization: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`

**Form App:**
- Deployed to Vercel
- All recent improvements are live
- Repository: `property-review-system/form-app`
- Main branch: `main`

---

## 📝 TODO List (From Handover Doc)

### 🔴 HIGH PRIORITY (Blocking)
1. Implement Single Property Route in Make.com
2. Test Single Contract H&L (`total_price` field)

### 🟡 MEDIUM PRIORITY
3. Build email template for single property
4. Build email template for projects (with all lots)
5. Deal Sheet integration (single + projects)

### 🟢 LOW PRIORITY
6. Error handling improvements
7. Documentation updates

**Full TODO list:** See `HANDOVER-2026-01-09-SESSION.md` → "TODO List" section

---

## 🚀 How to Guide the User

1. **Start by reviewing the handover document together:**
   - Confirm what was done
   - Verify current state
   - Identify what's blocking

2. **Focus on the immediate priority:**
   - Single Property Route is the critical blocker
   - Everything else can wait

3. **Ask clarifying questions:**
   - "Which module should we add after Module 5?"
   - "Should we reuse email template logic from existing scenario?"
   - "What Deal Sheet columns need to be mapped?"

4. **Implement incrementally:**
   - Add one module
   - Test it
   - Verify data mapping
   - Move to next module

5. **Document as you go:**
   - Update handover doc when you make progress
   - Note any issues or learnings
   - Update TODO list

---

## 💡 Quick Reference

**Module Structure:**
- Module 1: Webhook
- Module 5: Set Variable - Route 1 (Single Property) ❌ Needs modules after
- Module 6: Set Variable - Route 2 (Project) ✅ Working
  - Module 9: Create Parent Record ✅
  - Module 10: Set Variable (parent_record_id) ✅
  - Module 11: Iterator (lots) ✅
  - Module 12: Create Child Records ✅

**Field Mapping Reference:**
- See Module 12 JSON body for field mapping examples
- Use `{{5.incoming_data.formData}}` for single property
- Use `{{11.lotNumber}}` etc. for project lots (after Iterator)

**Common Issues:**
- Single contract: Use `total_price` (not `land_price` + `build_price`)
- Dual occupancy: Use `rent_appraisal_secondary_from/to`
- Build size: Single total for dual occupancy (not separate primary/secondary)

---

## ✅ Success Checklist

Before ending the session, ensure:
- [ ] Handover document is updated
- [ ] TODO list is current
- [ ] Any new learnings are documented
- [ ] Files are committed and pushed (if applicable)
- [ ] User knows what to do next

---

**Good luck! You've got this! 🚀**

---

*Last Updated: January 9, 2026*  
*Previous Session: See `HANDOVER-2026-01-09-SESSION.md`*
