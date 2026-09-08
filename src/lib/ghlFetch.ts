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

/** Hour bucket in Sydney time: 2026-09-08T11 */
function hourBucket(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}`;
}

/**
 * Record one GHL request attempt in Redis. Fire-and-forget — never blocks or throws.
 * Keys (hash per hour): ghl_stats:{bucket} → { total, status:{code}, src:{source}, ep:{endpoint}, retries }
 */
function recordStat(source: string, url: string, status: number | 'network', attempt: number, ms: number): void {
  const now = new Date();
  const key = `ghl_stats:${hourBucket(now)}`;
  const ep = endpointKey(url);
  console.log(`[ghlFetch] src=${source} ep=${ep} status=${status} attempt=${attempt} ms=${ms}`);
  getRedisClient()
    .then(async (redis) => {
      const m = redis.multi();
      m.hIncrBy(key, 'total', 1);
      m.hIncrBy(key, `status:${status}`, 1);
      m.hIncrBy(key, `src:${source}`, 1);
      m.hIncrBy(key, `ep:${ep}`, 1);
      m.hIncrBy(key, `src_ep:${source}|${ep}`, 1);
      if (attempt > 0) m.hIncrBy(key, 'retries', 1);
      if (status === 429) m.hIncrBy(key, `src_429:${source}`, 1);
      m.expire(key, STATS_TTL_SEC);
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
