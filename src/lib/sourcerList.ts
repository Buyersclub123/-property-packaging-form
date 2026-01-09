/**
 * Sourcer List - Future-proofed for GHL API integration
 * 
 * CURRENT: Hardcoded list of sourcer names
 * FUTURE: Will pull from GHL API when implemented
 * 
 * GHL API Endpoint (when ready):
 * - GET https://api.gohighlevel.com/v1/users
 * - Filter by role/team (Property Team Members)
 * - Format: { id, firstName, lastName, email }
 */

export interface SourcerOption {
  id?: string; // GHL user ID (when API integrated)
  name: string; // Display name
  email?: string; // Email (when API integrated)
}

/**
 * Current hardcoded list of sourcers
 * TODO: Replace with GHL API call when ready
 */
const HARDCODED_SOURCERS: SourcerOption[] = [
  { name: 'Adi' },
  { name: 'Ali' },
  { name: 'James' },
  { name: 'Jess' },
  { name: 'John' },
  { name: 'Josh' },
  { name: 'Mohit' },
  { name: 'Sachin' },
  { name: 'Shay' },
  { name: 'Will' },
];

/**
 * Get list of sourcers
 * 
 * CURRENT: Fetches from Google Sheet (Admin sheet - Packagers & Sourcers tab)
 * FUTURE: Could add GHL API integration as backup
 * 
 * @returns Array of sourcer options
 */
export async function getSourcers(): Promise<SourcerOption[]> {
  try {
    const response = await fetch('/api/sourcers');
    if (response.ok) {
      const data = await response.json();
      const names = data.sourcers || [];
      // Convert names to SourcerOption format
      return names.map((name: string) => ({ name }));
    }
  } catch (error) {
    console.error('Failed to fetch sourcers from Google Sheet:', error);
  }
  
  // Fallback to hardcoded list
  return HARDCODED_SOURCERS;
}

/**
 * Get sourcer names only (for dropdown)
 * @returns Array of sourcer names
 */
export async function getSourcerNames(): Promise<string[]> {
  const sourcers = await getSourcers();
  return sourcers.map(s => s.name);
}

/**
 * Client-side cached version (for React components)
 * Fetches once and caches in memory
 */
let cachedSourcers: SourcerOption[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedSourcers(): Promise<SourcerOption[]> {
  const now = Date.now();
  
  // Return cached if still valid
  if (cachedSourcers && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSourcers;
  }
  
  // Fetch fresh data
  cachedSourcers = await getSourcers();
  cacheTimestamp = now;
  
  return cachedSourcers;
}


