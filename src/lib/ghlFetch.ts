/**
 * fetch() wrapper for GHL API calls with automatic retry on transient failures.
 * Retries on 429 (rate limit), 5xx (server error), and network errors.
 * Does NOT retry on 4xx client errors (except 429) — those are permanent.
 */

import { getRedisClient } from './redis';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;
const STATS_TTL_SEC = 14 * 86400; // keep 14 days of counters

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** e.g. /objects/{id}/records/search → objects/records/search */
function endpointKey(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path
      .split('/')
      .filter(Boolean)
      .filter((seg) => !/^[A-Za-z0-9]{20,}$/.test(seg)) // drop IDs
      .join('/');
  } catch {
    return 'unknown';
  }
}

const MINUTE_TTL_SEC = 3 * 86400; // per-minute detail kept 3 days
const ERROR_LOG_MAX = 5000;

/** 'production' | 'preview' | 'dev' — dev and prod share Redis, so stats are namespaced. */
export const STATS_ENV = process.env.VERCEL_ENV || 'dev';
export const statsKeys = {
  hour: (bucket: string) => `ghl_stats:${STATS_ENV}:${bucket}`,
  minute: (bucket: string) => `ghl_min:${STATS_ENV}:${bucket}`,
  errors: `ghl_errors:${STATS_ENV}`,
};

const SYD_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Sydney',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** Sydney-time buckets: hour = 2026-09-08T11, minute = 2026-09-08T11:42 */
export function sydneyBuckets(d: Date): { hour: string; minute: string } {
  const p = Object.fromEntries(SYD_FMT.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = `${p.year}-${p.month}-${p.day}T${p.hour}`;
  return { hour, minute: `${hour}:${p.minute}` };
}

/**
 * Record one GHL request attempt in Redis. Fire-and-forget — never blocks or throws.
 *   ghl_stats:{hour}   hash → total, status:{code}, src:{source}, ep:{endpoint}, retries   (14 days)
 *   ghl_min:{minute}   hash → total, src:{source}                                           (3 days)
 *   ghl_errors         zset → score=ms, member="ms|source|endpoint|status|attempt|durMs"    (last 5000)
 */
function recordStat(source: string, url: string, status: number | 'network', attempt: number, ms: number): void {
  const now = new Date();
  const { hour, minute } = sydneyBuckets(now);
  const hourKey = statsKeys.hour(hour);
  const minKey = statsKeys.minute(minute);
  const ep = endpointKey(url);
  const isError = status === 'network' || status >= 400;
  console.log(`[ghlFetch] src=${source} ep=${ep} status=${status} attempt=${attempt} ms=${ms}`);
  getRedisClient()
    .then(async (redis) => {
      const m = redis.multi();
      m.hIncrBy(hourKey, 'total', 1);
      m.hIncrBy(hourKey, `status:${status}`, 1);
      m.hIncrBy(hourKey, `src:${source}`, 1);
      m.hIncrBy(hourKey, `ep:${ep}`, 1);
      m.hIncrBy(hourKey, `src_ep:${source}|${ep}`, 1);
      if (attempt > 0) m.hIncrBy(hourKey, 'retries', 1);
      if (status === 429) m.hIncrBy(hourKey, `src_429:${source}`, 1);
      m.expire(hourKey, STATS_TTL_SEC);

      m.hIncrBy(minKey, 'total', 1);
      m.hIncrBy(minKey, `src:${source}`, 1);
      if (isError) m.hIncrBy(minKey, 'errors', 1);
      m.expire(minKey, MINUTE_TTL_SEC);

      if (isError) {
        const ts = now.getTime();
        m.zAdd(statsKeys.errors, { score: ts, value: `${ts}|${source}|${ep}|${status}|${attempt}|${ms}` });
        m.zRemRangeByRank(statsKeys.errors, 0, -(ERROR_LOG_MAX + 1));
      }
      await m.exec();
    })
    .catch((e) => console.warn('[ghlFetch] stats write failed:', e));
}

export async function ghlFetch(url: string, init?: RequestInit, source = 'unknown'): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[ghlFetch] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms for ${url}`);
      await sleep(delay);
    }

    const t0 = Date.now();
    try {
      const response = await fetch(url, init);
      recordStat(source, url, response.status, attempt, Date.now() - t0);

      if (response.ok) return response;

      // GHL sometimes returns 401 with "Command timed out" — that's a timeout, not auth failure
      const body = await response.clone().text();
      const isTimeout = body.toLowerCase().includes('timed out');
      const isRetryable = RETRYABLE_STATUSES.has(response.status) || isTimeout;

      if (!isRetryable) return response;

      console.warn(`[ghlFetch] Attempt ${attempt + 1} got ${response.status}: ${body.slice(0, 200)}`);
      lastError = response;
      if (attempt === MAX_RETRIES) return response;
    } catch (err) {
      recordStat(source, url, 'network', attempt, Date.now() - t0);
      console.warn(`[ghlFetch] Attempt ${attempt + 1} network error:`, err);
      lastError = err;
      if (attempt === MAX_RETRIES) throw err;
    }
  }

  // Should not reach here, but satisfy TypeScript
  if (lastError instanceof Response) return lastError;
  throw lastError;
}
