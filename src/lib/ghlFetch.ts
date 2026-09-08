/**
 * fetch() wrapper for GHL API calls with automatic retry on transient failures.
 * Retries on 429 (rate limit), 5xx (server error), and network errors.
 * Does NOT retry on 4xx client errors (except 429) — those are permanent.
 */

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ghlFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[ghlFetch] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms for ${url}`);
      await sleep(delay);
    }

    try {
      const response = await fetch(url, init);

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
      console.warn(`[ghlFetch] Attempt ${attempt + 1} network error:`, err);
      lastError = err;
      if (attempt === MAX_RETRIES) throw err;
    }
  }

  // Should not reach here, but satisfy TypeScript
  if (lastError instanceof Response) return lastError;
  throw lastError;
}
