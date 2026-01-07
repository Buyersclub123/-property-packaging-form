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
 * CURRENT: Returns hardcoded list
 * FUTURE: Will fetch from GHL API and cache
 * 
 * @returns Array of sourcer options
 */
export async function getSourcers(): Promise<SourcerOption[]> {
  // TODO: Implement GHL API integration
  // Example implementation:
  /*
  try {
    const response = await fetch('/api/ghl/users');
    if (response.ok) {
      const users = await response.json();
      return users
        .filter(user => user.role === 'Property Team Member' || user.team === 'Property')
        .map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        }));
    }
  } catch (error) {
    console.error('Failed to fetch sourcers from GHL:', error);
  }
  */
  
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


