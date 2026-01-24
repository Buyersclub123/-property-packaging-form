# API Protection System Documentation

## Overview

This document describes the comprehensive API protection system implemented to prevent malicious usage and excessive costs from Google Distance Matrix API calls.

## Problem Statement

On January 20, 2026, the Distance Matrix API incurred unexpected charges of $104.90 due to excessive API calls. Investigation revealed:
- **652 requests in 12 hours** on Jan 22 (ongoing issue)
- Root cause: `ProximityField` component had a `useEffect` that could trigger repeatedly
- Each proximity calculation makes ~26 Distance Matrix API calls
- Estimated total cost: $235-275 over 3 days

## Solution Components

### 1. Infinite Loop Fix ✅

**File:** `src/components/steps/step5/ProximityField.tsx`

**Change:** Added `hasAutoRun` state guard to prevent `useEffect` from running multiple times.

```typescript
const [hasAutoRun, setHasAutoRun] = useState(false);

useEffect(() => {
  if (hasAutoRun) return; // CRITICAL: Only run once per mount
  // ... rest of logic
  setHasAutoRun(true);
}, [address, value, preFetchedData]);
```

### 2. Rate Limiting ✅

**File:** `src/lib/rateLimit.ts`

**Features:**
- **Per-IP Hourly Limit:** 20 requests/hour (configurable via `RATE_LIMIT_PER_HOUR`)
- **Burst Protection:** 10 requests per 5 minutes (configurable via `RATE_LIMIT_BURST_5MIN`)
- **Global Daily Limit:** 100 requests/day across all IPs (configurable via `RATE_LIMIT_GLOBAL_DAILY`)
- In-memory storage (resets on server restart)
- Automatic cleanup of expired entries

**Configuration (.env):**
```bash
RATE_LIMIT_PER_HOUR=20
RATE_LIMIT_BURST_5MIN=10
RATE_LIMIT_GLOBAL_DAILY=100
```

**Usage:**
```typescript
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const clientIP = getClientIP(request);
const rateLimitResult = checkRateLimit(clientIP);

if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { error: rateLimitResult.reason },
    { status: 429 }
  );
}
```

### 3. Request Logging ✅

**File:** `src/lib/requestLogger.ts`

**Features:**
- Logs all API requests to `logs/api-requests.log`
- Tracks: IP, endpoint, timestamp, status, duration, errors
- Automatic log rotation (keeps last 7 days)
- Daily summaries for email reports

**Log Format:**
```json
{
  "timestamp": "2026-01-22T10:30:00.000Z",
  "ip": "203.123.45.67",
  "endpoint": "/api/geoapify/proximity",
  "method": "POST",
  "status": 200,
  "duration": 2500
}
```

**Usage:**
```typescript
import { logRequest } from '@/lib/requestLogger';

await logRequest({
  timestamp: new Date().toISOString(),
  ip: clientIP,
  endpoint: '/api/geoapify/proximity',
  method: 'POST',
  status: 200,
  duration: 1500,
});
```

### 4. Email Alerts ✅

**File:** `src/lib/emailAlerts.ts`

**Features:**
- Gmail SMTP integration
- Rate limit violation alerts
- Daily cost threshold alerts ($5 default)
- Burst activity alerts
- Daily usage summaries
- 1-hour cooldown between duplicate alerts

**Configuration (.env):**
```bash
ALERT_EMAIL_USER=john.t@buyersclub.com.au
ALERT_EMAIL_PASSWORD=your-gmail-app-password
ALERT_EMAIL_TO=john.t@buyersclub.com.au
ALERT_DAILY_SUMMARY_TIME=18:00
ALERT_DAILY_COST_THRESHOLD=5
```

**Alert Types:**

1. **Rate Limit Exceeded**
   - Triggered when IP exceeds hourly/burst/daily limits
   - Includes current status and configured limits
   - Cooldown: 1 hour per IP

2. **Daily Cost Threshold**
   - Triggered when estimated daily cost exceeds $5
   - Includes top IPs and endpoints
   - Cooldown: 1 hour

3. **Burst Activity**
   - Triggered when IP makes >10 requests in 5 minutes
   - Suggests possible bot/script activity
   - Cooldown: 1 hour per IP

4. **Daily Summary**
   - Sent at 6 PM daily (configurable)
   - Includes: total requests, unique IPs, errors, cost estimate
   - Top 10 IPs and top 5 endpoints
   - Recent errors (last 20)

### 5. CORS Protection ✅

**File:** `src/app/api/geoapify/proximity/route.ts`

**Features:**
- Whitelist of allowed origins
- Blocks requests from unauthorized domains
- Handles OPTIONS preflight requests

**Allowed Origins:**
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://property-packaging-form.vercel.app',
];
```

## Implementation in Proximity API

**File:** `src/app/api/geoapify/proximity/route.ts`

The proximity API route now includes:

1. **IP Extraction:** Gets client IP from headers (Vercel, Cloudflare, etc.)
2. **Rate Limit Check:** Blocks requests exceeding limits
3. **Request Logging:** Logs all requests (success and failure)
4. **Email Alerts:** Sends alerts for violations
5. **CORS Headers:** Only allows whitelisted origins
6. **Error Handling:** Comprehensive error logging

**Flow:**
```
1. Extract client IP
2. Check CORS origin
3. Check rate limits → If exceeded: log, alert, return 429
4. Process proximity request
5. Log successful request
6. Add CORS headers
7. Return response
```

## Installation

### 1. Install Dependencies

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Configure Environment Variables

Add to `.env.local` and Vercel:

```bash
# Email Alerts
ALERT_EMAIL_USER=your-email@gmail.com
ALERT_EMAIL_PASSWORD=your-gmail-app-password
ALERT_EMAIL_TO=recipient@email.com
ALERT_DAILY_SUMMARY_TIME=18:00
ALERT_DAILY_COST_THRESHOLD=5

# Rate Limiting
RATE_LIMIT_PER_HOUR=20
RATE_LIMIT_BURST_5MIN=10
RATE_LIMIT_GLOBAL_DAILY=100
```

### 3. Generate Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Create new app password named "Property Review System"
3. Copy the 16-character password
4. Paste into `ALERT_EMAIL_PASSWORD` (remove spaces)

### 4. Deploy to Vercel

```bash
# Upload .env variables to Vercel
vercel env add ALERT_EMAIL_USER
vercel env add ALERT_EMAIL_PASSWORD
# ... (repeat for all variables)

# Deploy
vercel --prod
```

## Testing

### Test Rate Limiting Locally

```bash
# Start dev server
npm run dev

# Make multiple rapid requests
for i in {1..15}; do
  curl -X POST http://localhost:3001/api/geoapify/proximity \
    -H "Content-Type: application/json" \
    -d '{"propertyAddress":"123 Test St, Sydney NSW 2000"}'
  sleep 1
done
```

Expected: After 10 requests in 5 minutes, you should receive a 429 error.

### Test Email Alerts

Trigger a rate limit violation and check your email for alerts.

### Check Logs

```bash
cat logs/api-requests.log
```

## Monitoring

### View Rate Limit Status

Create an admin endpoint (optional):

```typescript
// src/app/api/admin/rate-limit-status/route.ts
import { getRateLimitStatus } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

export async function GET() {
  const status = getRateLimitStatus();
  return NextResponse.json(status);
}
```

### Daily Summary Email

Automatically sent at configured time (default: 6 PM).

Includes:
- Total requests
- Unique IPs
- Error count
- Estimated cost
- Top IPs and endpoints
- Recent errors

## Cost Estimation

**Distance Matrix API Pricing:**
- $5 per 1,000 elements (origin-destination pairs)

**Per Proximity Request:**
- ~26 Distance Matrix API calls
- ~650 elements (26 calls × 25 destinations)
- **Cost: ~$0.13 per proximity request**

**With Rate Limits:**
- Max 100 requests/day globally
- **Max daily cost: ~$13**

**Before Rate Limits:**
- 652 requests in 12 hours = ~$85/day
- Potential monthly cost: ~$2,550

## Security Considerations

1. **IP Spoofing:** Rate limiting uses `x-forwarded-for` header, which can be spoofed. For production, consider using Vercel's Edge Middleware or a dedicated WAF.

2. **DDoS Protection:** Current system uses in-memory storage. For high-traffic scenarios, consider Redis or database-backed rate limiting.

3. **Log Storage:** Logs are stored locally and rotate after 7 days. For production, consider cloud logging (e.g., Datadog, LogDNA).

4. **Email Spam:** 1-hour cooldown prevents alert spam, but consider more sophisticated alerting (e.g., PagerDuty, Slack).

## Troubleshooting

### Email Alerts Not Working

1. Check Gmail App Password is correct
2. Verify 2FA is enabled on Gmail account
3. Check Vercel logs for error messages
4. Test SMTP connection locally

### Rate Limits Too Strict

Adjust in `.env`:
```bash
RATE_LIMIT_PER_HOUR=50  # Increase from 20
RATE_LIMIT_GLOBAL_DAILY=200  # Increase from 100
```

### Logs Not Being Created

1. Check `logs/` directory exists
2. Verify write permissions
3. Check Vercel logs for file system errors

## Future Enhancements

1. **Redis-backed Rate Limiting:** For multi-instance deployments
2. **IP Whitelist:** Allow unlimited requests from trusted IPs
3. **Admin Dashboard:** Real-time monitoring UI
4. **Slack/Discord Alerts:** Alternative to email
5. **Automatic IP Blocking:** Block IPs after X violations
6. **Cost Tracking API:** Real-time cost monitoring with Google Cloud Billing API

## Summary

The protection system provides:
- ✅ Prevention of infinite loops
- ✅ Rate limiting (hourly, burst, daily)
- ✅ Comprehensive request logging
- ✅ Email alerts for violations
- ✅ CORS protection
- ✅ Cost estimation and monitoring

**Estimated Cost Reduction:** From $85/day to $13/day max (85% reduction)

## Support

For issues or questions, contact: john.t@buyersclub.com.au
