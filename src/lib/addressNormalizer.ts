/**
 * Address normalization for comparing addresses
 * Handles variations like "St" vs "Street", "QLD" vs "Queensland", etc.
 */

const STREET_ABBREVIATIONS: Record<string, string> = {
  'st': 'street',
  'street': 'street',
  'rd': 'road',
  'road': 'road',
  'ave': 'avenue',
  'avenue': 'avenue',
  'dr': 'drive',
  'drive': 'drive',
  'ct': 'court',
  'court': 'court',
  'pl': 'place',
  'place': 'place',
  'ln': 'lane',
  'lane': 'lane',
  'cres': 'crescent',
  'crescent': 'crescent',
  'way': 'way',
  'tce': 'terrace',
  'terrace': 'terrace',
  'pde': 'parade',
  'parade': 'parade',
  'blvd': 'boulevard',
  'boulevard': 'boulevard',
};

const STATE_ABBREVIATIONS: Record<string, string> = {
  'qld': 'queensland',
  'queensland': 'queensland',
  'nsw': 'new south wales',
  'new south wales': 'new south wales',
  'vic': 'victoria',
  'victoria': 'victoria',
  'sa': 'south australia',
  'south australia': 'south australia',
  'wa': 'western australia',
  'western australia': 'western australia',
  'tas': 'tasmania',
  'tasmania': 'tasmania',
  'nt': 'northern territory',
  'northern territory': 'northern territory',
  'act': 'australian capital territory',
  'australian capital territory': 'australian capital territory',
};

/**
 * Normalize an address string for comparison
 * - Lowercase
 * - Remove extra spaces
 * - Expand abbreviations
 * - Remove punctuation
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  let normalized = address.toLowerCase().trim();
  
  // Remove common punctuation
  normalized = normalized.replace(/[.,;:]/g, ' ');
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Expand street abbreviations
  Object.entries(STREET_ABBREVIATIONS).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  });
  
  // Expand state abbreviations
  Object.entries(STATE_ABBREVIATIONS).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  });
  
  // Remove "lot" prefix variations
  normalized = normalized.replace(/\blot\s+\d+/gi, '');
  
  // Remove unit/lot suffixes that might vary
  normalized = normalized.replace(/\b(unit|lot|apt|apartment)\s+\d+/gi, '');
  
  return normalized.trim();
}

/**
 * Compare two addresses (normalized)
 * Returns true if addresses match (ignoring formatting differences)
 */
export function addressesMatch(address1: string, address2: string): boolean {
  const norm1 = normalizeAddress(address1);
  const norm2 = normalizeAddress(address2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for partial matches)
  // This handles cases where one has more detail than the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Only consider it a match if the shorter one is at least 10 characters
    // This prevents false matches on very short strings
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    if (shorter.length >= 10) {
      return true;
    }
  }
  
  return false;
}



