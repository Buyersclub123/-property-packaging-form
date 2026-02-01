/**
 * Rate Limiting Utility
 * 
 * Protects API endpoints from abuse by limiting requests per IP address
 * 
 * Features:
 * - Per-IP hourly limits
 * - Burst protection (5-minute windows)
 * - Global daily limits
 * - In-memory storage (resets on server restart)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  hourly: Map<string, RateLimitEntry>;
  burst: Map<string, RateLimitEntry>;
  daily: Map<string, RateLimitEntry>;
  globalDaily: number;
  globalDailyResetTime: number;
}

// In-memory storage (resets on server restart)
const store: RateLimitStore = {
  hourly: new Map(),
  burst: new Map(),
  daily: new Map(),
  globalDaily: 0,
  globalDailyResetTime: Date.now() + 24 * 60 * 60 * 1000,
};

// Configuration from environment variables
const RATE_LIMIT_PER_HOUR = parseInt(process.env.RATE_LIMIT_PER_HOUR || '20');
const RATE_LIMIT_BURST_5MIN = parseInt(process.env.RATE_LIMIT_BURST_5MIN || '10');
const RATE_LIMIT_GLOBAL_DAILY = parseInt(process.env.RATE_LIMIT_GLOBAL_DAILY || '100');

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  
  // Clean hourly
  for (const [ip, entry] of store.hourly.entries()) {
    if (now > entry.resetTime) {
      store.hourly.delete(ip);
    }
  }
  
  // Clean burst
  for (const [ip, entry] of store.burst.entries()) {
    if (now > entry.resetTime) {
      store.burst.delete(ip);
    }
  }
  
  // Clean daily
  for (const [ip, entry] of store.daily.entries()) {
    if (now > entry.resetTime) {
      store.daily.delete(ip);
    }
  }
  
  // Reset global daily counter
  if (now > store.globalDailyResetTime) {
    store.globalDaily = 0;
    store.globalDailyResetTime = now + 24 * 60 * 60 * 1000;
  }
}

/**
 * Check and update rate limit for an IP address
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
} {
  cleanupExpiredEntries();
  
  const now = Date.now();
  
  // Check global daily limit
  if (store.globalDaily >= RATE_LIMIT_GLOBAL_DAILY) {
    return {
      allowed: false,
      reason: 'Global daily limit exceeded',
      retryAfter: Math.ceil((store.globalDailyResetTime - now) / 1000),
    };
  }
  
  // Check burst limit (5 minutes)
  const burstEntry = store.burst.get(ip);
  if (burstEntry) {
    if (now < burstEntry.resetTime) {
      if (burstEntry.count >= RATE_LIMIT_BURST_5MIN) {
        return {
          allowed: false,
          reason: 'Burst limit exceeded (too many requests in 5 minutes)',
          retryAfter: Math.ceil((burstEntry.resetTime - now) / 1000),
        };
      }
    } else {
      // Reset burst counter
      store.burst.set(ip, { count: 1, resetTime: now + 5 * 60 * 1000 });
    }
  } else {
    store.burst.set(ip, { count: 1, resetTime: now + 5 * 60 * 1000 });
  }
  
  // Check hourly limit
  const hourlyEntry = store.hourly.get(ip);
  if (hourlyEntry) {
    if (now < hourlyEntry.resetTime) {
      if (hourlyEntry.count >= RATE_LIMIT_PER_HOUR) {
        return {
          allowed: false,
          reason: 'Hourly limit exceeded',
          retryAfter: Math.ceil((hourlyEntry.resetTime - now) / 1000),
        };
      }
    } else {
      // Reset hourly counter
      store.hourly.set(ip, { count: 1, resetTime: now + 60 * 60 * 1000 });
    }
  } else {
    store.hourly.set(ip, { count: 1, resetTime: now + 60 * 60 * 1000 });
  }
  
  // Check daily limit
  const dailyEntry = store.daily.get(ip);
  if (dailyEntry) {
    if (now < dailyEntry.resetTime) {
      if (dailyEntry.count >= RATE_LIMIT_PER_HOUR * 24) {
        return {
          allowed: false,
          reason: 'Daily limit exceeded',
          retryAfter: Math.ceil((dailyEntry.resetTime - now) / 1000),
        };
      }
    } else {
      // Reset daily counter
      store.daily.set(ip, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
    }
  } else {
    store.daily.set(ip, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
  }
  
  // All checks passed - increment counters
  if (burstEntry && now < burstEntry.resetTime) {
    burstEntry.count++;
  }
  if (hourlyEntry && now < hourlyEntry.resetTime) {
    hourlyEntry.count++;
  }
  if (dailyEntry && now < dailyEntry.resetTime) {
    dailyEntry.count++;
  }
  store.globalDaily++;
  
  return { allowed: true };
}

/**
 * Get current rate limit status for monitoring
 */
export function getRateLimitStatus() {
  cleanupExpiredEntries();
  
  return {
    globalDaily: store.globalDaily,
    globalDailyLimit: RATE_LIMIT_GLOBAL_DAILY,
    activeIPs: {
      hourly: store.hourly.size,
      burst: store.burst.size,
      daily: store.daily.size,
    },
    limits: {
      perHour: RATE_LIMIT_PER_HOUR,
      burst5Min: RATE_LIMIT_BURST_5MIN,
      globalDaily: RATE_LIMIT_GLOBAL_DAILY,
    },
  };
}

/**
 * Extract IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers for IP address (Vercel, Cloudflare, etc.)
  const headers = request.headers;
  
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}
