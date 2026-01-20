# Quick Start Guide - Resuming Work

## If You're Starting Fresh

1. **Read These Files First** (in order):
   - `README.md` - Project overview
   - `STATUS.md` - Current state and what needs to be done
   - `CONFIG.md` - All configuration values
   - `docs/workflow.md` - How the system works

2. **Key Files to Reference**:
   - `docs/make-scenario.md` - Make.com module details
   - `docs/portal-code.md` - Portal code documentation
   - `code/make-code-module-6.js` - Webhook preprocessor code
   - `code/make-code-module-7.js` - HTML extractor code

## Current Task: Portal Integration

**What We're Working On**: Completing the portal-to-Make.com integration so BAs can select clients and send emails.

**Immediate Steps**:

1. **Update Portal Webhook URL**
   - File: Portal HTML code (see `docs/portal-code.md`)
   - Find: `const MODULE_1_WEBHOOK = 'https://hook.eu1.make.com/YOUR_MODULE_1_WEBHOOK_URL';`
   - Replace with: `const MODULE_1_WEBHOOK = 'https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl';`

2. **Verify Module 3 Portal Handling**
   - Module 3 code handles portal requests and returns array of client email data
   - Need to ensure it properly merges GHL property data with portal client selection
   - Check that email template includes BA message at top for client emails

3. **Configure Path 4 Gmail Module**
   - Path 4 should receive array from Module 3 (portal request)
   - Need to iterate over array and send email to each client
   - Emails should come from BA's Gmail account

4. **Test End-to-End**
   - GHL webhook → Packager email → BA email → Portal → Client emails
   - Verify all email templates render correctly
   - Verify approval buttons work

## Important Context

### What's Already Done
- ✅ Make.com scenario structure is set up
- ✅ Portal code exists and is documented
- ✅ Email template builder code exists
- ✅ Webhook preprocessor handles portal requests
- ✅ Router configured with 4 paths

### What Needs Work
- ⚠️ Portal webhook URL needs updating
- ⚠️ Path 4 needs to iterate over client array and send emails
- ⚠️ Module 3 portal handling may need refinement
- ⚠️ End-to-end testing not completed

### Testing Setup
- All emails currently go to: `john.t@buyersclub.com.au`
- This is intentional for testing
- Once working, will switch to actual recipients

## Key Code Locations

**Portal Code**: 
- Full HTML/JS in `docs/portal-code.md`
- Key function: `sendEmailsToClients()` sends payload to webhook
- Payload structure documented in `docs/make-scenario.md`

**Make.com Modules**:
- Module 6: `code/make-code-module-6.js` (complete)
- Module 7: `code/make-code-module-7.js` (complete)
- Module 3: Full code in `docs/make-scenario.md` (too large for separate file)

**Configuration**:
- All webhooks, credentials, and settings in `CONFIG.md`

## Common Questions

**Q: Where is the full portal code?**
A: In `docs/portal-code.md` - it's documented there because it's a large HTML file.

**Q: Where is Module 3 code?**
A: In `docs/make-scenario.md` - it's documented there because it's very large.

**Q: How do I test?**
A: Use `john.t@buyersclub.com.au` for all email paths. Portal sends to Module 1 webhook.

**Q: What's the next priority?**
A: Complete portal integration - update webhook URL, configure Path 4, test end-to-end.

## If You Get Stuck

1. Check `STATUS.md` for current state
2. Check `docs/workflow.md` for how things should work
3. Check `CONFIG.md` for all configuration values
4. Review original documentation in `docs/` folder

## Next Session Checklist

- [ ] Read STATUS.md
- [ ] Review current task in QUICK-START.md
- [ ] Check CONFIG.md for all values
- [ ] Review relevant code files
- [ ] Continue with immediate steps above

