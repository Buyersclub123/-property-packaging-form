# Cashback/Rebate Fields - Mandatory Discussion

**Date:** 2025-01-13  
**Status:** To be discussed after email template testing

## Context

User has an idea to make Cashback/Rebate Value and Cashback/Rebate Type fields mandatory for Contract Type (for Deal Sheet) values:
- 01 (H&L Comms)
- 02 (Single Comms)  
- 03 (Internal with Comms)

## Current State

- Fields are currently optional
- Fields pre-populate with "$20,000" and "Cashback" (99% of the time these are the values used)
- User considering making them mandatory but keeping pre-populated values

## Discussion Points

1. Should these fields be mandatory for contract types 01, 02, 03?
2. Keep pre-populated values even if mandatory?
3. Impact on form validation
4. Impact on email template (already handles empty/null gracefully)

## Next Steps

- Discuss after email template testing is complete
- Or discuss after testing current property (Established with 03_internal_with_comms + Cashback)
