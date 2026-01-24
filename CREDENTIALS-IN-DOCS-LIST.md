# Files Containing Hardcoded Credentials

**Total files:** 52  
**Last checked:** January 24, 2026

---

## High Priority (Recently Modified - Jan 2026)

### Root Directory
1. **CONFIG.md** - Last modified: Jan 24, 2026
   - Contains: GHL Bearer token, webhook URLs
   
2. **CREDENTIALS-MANAGEMENT.md** - Last modified: Jan 24, 2026
   - Contains: Various credentials documentation

---

## Stashproperty Documentation (22 files)

### Modified January 7, 2026 (15 files)
1. `docs/STASHPROPERTY-AP-VERIFICATION-QUESTIONS.md`
2. `docs/STASHPROPERTY-API-DISCOVERY.md` - **Contains API key**
3. `docs/STASHPROPERTY-API-ENDPOINT-FOUND.md`
4. `docs/STASHPROPERTY-API-INTEGRATION-PLAN.md` - **Contains API key**
5. `docs/STASHPROPERTY-API-SUCCESS-NEXT-STEPS.md`
6. `docs/STASHPROPERTY-API-TEST-PLAN.md` - **Contains API key**
7. `docs/STASHPROPERTY-CHROME-PLUGIN-API-DISCOVERY.md`
8. `docs/STASHPROPERTY-COMPLETE-SETUP.md`
9. `docs/STASHPROPERTY-CONVERT-TEST-SCENARIO.md`
10. `docs/STASHPROPERTY-DATA-FLOW-VERIFICATION.md`
11. `docs/STASHPROPERTY-EXCEL-ANALYSIS.md` - **Contains username/password**
12. `docs/STASHPROPERTY-LOGIN-AND-API-SETUP.md` - **Contains username/password AND API key**
13. `docs/STASHPROPERTY-LOGIN-ENDPOINT-FOUND.md`
14. `docs/STASHPROPERTY-MAKECOM-SETUP-GUIDE.md`
15. `docs/STASHPROPERTY-REQUIREMENTS-DISCUSSION.md`
16. `docs/STASHPROPERTY-STANDALONE-SCENARIO-PLAN.md`

### Modified December 22, 2025 (6 files)
17. `docs/STASHPROPERTY-API-TEST-STEPS.md` - **Contains API key**
18. `docs/STASHPROPERTY-GOOGLESHEET-TRIGGER.md`
19. `docs/STASHPROPERTY-MAKECOM-BUILD-STEPS.md`
20. `docs/STASHPROPERTY-MAKECOM-INTEGRATION.md`
21. `docs/STASHPROPERTY-QUICK-REFERENCE.md`
22. `docs/STASHPROPERTY-TESTING-GUIDE.md`

---

## Other Files with Credentials (30 files)

### Handover Documents
- `HANDOVER-2026-01-09-SESSION.md`
- `HANDOVER-2025-01-09-SESSION-END.md`
- `HANDOVER-2025-01-08-SESSION.md`
- `HANDOVER-COMPLETE-2026-01-15.md`
- `form-app/HANDOVER-2026-01-07.md`
- `form-app/GHL-DUPLICATE-ADDRESS-CHECK-HANDOVER.md`

### Blueprint/Configuration Files
- `BLUEPRINT-BACKUP-2026-01-10-BASELINE-WORKING.json`
- `BLUEPRINT-BACKUP-2026-01-10-BEFORE-JSON-BODY-TYPE.json`
- `ROUTE-2-MODULE-9-BASELINE-WORKING-CONFIG.md`

### Environment Templates
- `form-app/env-local-COMPLETE-TEMPLATE.txt` - **Contains GHL token**
- `form-app/env-local-NEW-FORMAT.txt` - **Contains GHL token**
- `form-app/GOOGLE-SHEETS-SETUP.md` - **Contains GHL token**

### GHL Documentation
- `form-app/GHL-SEARCH-ATTEMPTS-AND-FINDINGS.md` - **Contains GHL token**

### Make.com Documentation
- `docs/MAKECOM-SCENARIOS-AND-GHL-WEBHOOKS.md`
- `docs/SPECIFIC-MAKECOM-QUESTIONS.md`
- `MAKECOM-SINGLE-PROPERTY-MODULE-STEPS.md`

### Other Documentation
- `README.md`
- `STATUS.md`
- `MASTER-ENV-VARIABLE-MAPPING.md`
- `SECURITY-AUDIT-REPORT.md` (contains examples from other docs)
- `SECURITY-AUDIT-PLAN.md`
- `MANUAL-AUDIT-CHECKLIST.md`
- `docs/PROXIMITY-CONSOLIDATED-HANDOVER.md`
- `docs/PROXIMITY-ISOLATED-TESTING-HANDOVER.md`
- `docs/PROXIMITY-TEST-HANDOVER.md`
- `docs/TEST-STASHPROPERTY-AP-COMPLETE.md`
- `docs/TEST-STASHPROPERTY-AP-MODULE-DETAILS.md`
- `docs/FIND-STASHPROPERTY-LOGIN-ENDPOINT.md`
- `docs/QUICK-API-DISCOVERY-STEPS.md`

---

## Credentials Found

### Stashproperty
- **Username:** Ali.h@buyersclub.com.au
- **Password:** Buyersclub313!
- **API Key:** stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891

### GHL (GoHighLevel)
- **Bearer Token:** pit-d375efb5-f445-458d-af06-3cbbb4b331dd
- **Bearer Token (old):** pit-325346e7-f183-4be9-a016-55cde205b563

### Geoscape
- **API Key:** VfqDRW796v5jGTfXcHgJXDdoGi7DENZA

---

## Recommended Actions

### Immediate
1. **Rotate all exposed credentials:**
   - Change Stashproperty password
   - Regenerate GHL Bearer token
   - Regenerate Geoscape API key (if possible)

2. **Delete or redact credentials from:**
   - All 22 Stashproperty documentation files
   - CONFIG.md
   - Environment template files
   - GHL documentation files

### Short-term
3. **Add to .gitignore:**
   - Any files with "CREDENTIALS" in the name
   - Environment template files with real values

4. **Create sanitized versions:**
   - Replace real credentials with placeholders like `[YOUR_API_KEY_HERE]`
   - Keep documentation structure but remove sensitive data

### Long-term
5. **Audit Git history:**
   - Check if credentials were ever committed
   - If yes, consider rotating even if files are now cleaned

---

## Notes

- Most files are documentation/handover files from development sessions
- Credentials are used for examples and setup instructions
- These files are likely in Git history even if cleaned now
- Some files may be duplicates or outdated and can be deleted entirely
