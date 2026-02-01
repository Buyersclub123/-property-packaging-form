/**
 * Phone number formatting utilities for Australian mobile numbers
 * Gold standard format: +61 4XX XXX XXX (international format)
 */

/**
 * Formats Australian mobile number to international format
 * Input: "0450 581822" or "450581822" or "0450581822"
 * Output: "+61 450 581 822"
 */
export function formatAustralianMobile(value: string): string {
  // Allow "TBC" as-is
  if (value.toUpperCase().trim() === 'TBC') {
    return 'TBC';
  }

  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // If empty, return empty
  if (!digits) return '';
  
  // Must be 9 or 10 digits (10 if includes leading 0, 9 if without)
  if (digits.length < 9 || digits.length > 10) {
    return value; // Return as-is if invalid length (user still typing)
  }
  
  // Remove leading 0 if present (domestic format)
  const mobileDigits = digits.startsWith('0') ? digits.substring(1) : digits;
  
  // Must start with 4 (Australian mobile)
  if (!mobileDigits.startsWith('4') || mobileDigits.length !== 9) {
    return value; // Return as-is if invalid (user still typing)
  }
  
  // Format as +61 4XX XXX XXX (standard: +61 450 581 822)
  // Pattern: +61 4 XX XXX XXX (2-3-3 after the 4)
  return `+61 ${mobileDigits.substring(0, 1)} ${mobileDigits.substring(1, 3)} ${mobileDigits.substring(3, 6)} ${mobileDigits.substring(6)}`;
}

/**
 * Validates if the phone number is valid (numbers only) or "TBC"
 */
export function isValidMobileInput(value: string): boolean {
  const trimmed = value.trim();
  
  // Allow "TBC"
  if (trimmed.toUpperCase() === 'TBC') {
    return true;
  }
  
  // Must be digits only
  const digits = trimmed.replace(/\D/g, '');
  
  // Must be 9 or 10 digits
  if (digits.length < 9 || digits.length > 10) {
    return false;
  }
  
  // If 10 digits, must start with 0
  if (digits.length === 10 && !digits.startsWith('0')) {
    return false;
  }
  
  // After removing leading 0, must start with 4
  const mobileDigits = digits.startsWith('0') ? digits.substring(1) : digits;
  if (!mobileDigits.startsWith('4') || mobileDigits.length !== 9) {
    return false;
  }
  
  return true;
}

/**
 * Normalizes phone number for storage (always to +61 format, or "TBC")
 */
export function normalizeMobileForStorage(value: string): string {
  const trimmed = value.trim();
  
  // Keep "TBC" as-is
  if (trimmed.toUpperCase() === 'TBC') {
    return 'TBC';
  }
  
  // Format to international format
  return formatAustralianMobile(trimmed);
}

/**
 * Handles input - allows only numbers or "TBC"
 * Formats as user types: 0450 581 822 (4-3-3 format)
 */
export function handleMobileInput(value: string): string {
  const trimmed = value.trim();
  const upperTrimmed = trimmed.toUpperCase();
  
  // Allow "TBC" (case insensitive) - check if it starts with T, TB, or is TBC
  if (upperTrimmed === 'T' || upperTrimmed === 'TB' || upperTrimmed === 'TBC' || upperTrimmed.startsWith('TBC')) {
    // If user is typing TBC, preserve it (case insensitive)
    if (upperTrimmed.startsWith('TBC')) {
      return 'TBC';
    }
    // Allow partial TBC input (T, TB)
    return trimmed;
  }
  
  // If input contains any letters that aren't T/B/C, it's invalid
  const hasInvalidLetters = /[A-Za-z]/.test(trimmed) && !/^[TBCtbc]+$/.test(trimmed);
  if (hasInvalidLetters) {
    return ''; // Clear invalid input
  }
  
  // Remove all non-digit characters
  const digits = trimmed.replace(/\D/g, '');
  
  // If empty, return empty
  if (!digits) return '';
  
  // Limit to 10 digits max (domestic format with leading 0)
  const limitedDigits = digits.substring(0, 10);
  
  // Format as user types: 0450 581 822 (4-3-3 format)
  if (limitedDigits.length <= 4) {
    return limitedDigits;
  } else if (limitedDigits.length <= 7) {
    return `${limitedDigits.substring(0, 4)} ${limitedDigits.substring(4)}`;
  } else {
    return `${limitedDigits.substring(0, 4)} ${limitedDigits.substring(4, 7)} ${limitedDigits.substring(7)}`;
  }
}
