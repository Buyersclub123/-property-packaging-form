/**
 * Cloudflare Access authentication helpers.
 *
 * In production the app sits behind Cloudflare Access, which sets
 * `Cf-Access-Authenticated-User-Email` on every request after the
 * user has logged in via Google Workspace SSO.
 *
 * In local dev the header is absent — callers fall back to the
 * existing localStorage-based email prompt.
 */

/**
 * Get authenticated user email from Cloudflare Access header.
 * Returns null if not behind Cloudflare Access (e.g. local dev).
 */
export function getCfEmail(request: Request): string | null {
  return request.headers.get('Cf-Access-Authenticated-User-Email');
}

/**
 * Get authenticated user email on the client side.
 * In production (behind Cloudflare Access), calls an API endpoint.
 * In development, falls back to the existing localStorage email.
 */
export async function getAuthenticatedEmail(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      return data.email || null;
    }
  } catch {
    // Fall through to localStorage fallback
  }
  return null;
}
