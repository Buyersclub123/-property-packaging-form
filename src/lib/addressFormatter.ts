/**
 * Address Formatting Utilities
 * 
 * Handles address construction for folder naming and display purposes.
 * Follows the format: [Lot X], [Unit Y], [Street Address]
 * 
 * Examples:
 * - "Lot 17, 123 Main Street Suburb VIC 3000"
 * - "Unit 5, 456 Smith Road Suburb NSW 2000"
 * - "Lot 17, Unit 5, 789 Jones Avenue Suburb QLD 4000"
 * - "123 Main Street Suburb VIC 3000" (no lot/unit)
 */

import { AddressData } from '@/types/form';

/**
 * Maximum filename length for Google Drive (Windows has 260 char path limit)
 * We use 250 to be safe and allow for folder nesting
 */
export const MAX_FOLDER_NAME_LENGTH = 250;

/**
 * Constructs a full address string with lot and unit numbers
 * Format: [Lot X], [Unit Y], [Street Address]
 * 
 * @param address - Address data from form
 * @returns Formatted address string
 */
export function constructFullAddress(address: AddressData): string {
  // If propertyAddress already contains lot/unit info, just use it as-is
  const mainAddress = address.propertyAddress?.trim() || '';
  
  // Check if propertyAddress already starts with "Lot" or "Unit"
  const hasLotOrUnit = /^(Lot|Unit)\s/i.test(mainAddress);
  
  if (hasLotOrUnit || !mainAddress) {
    // propertyAddress already formatted OR empty - use as-is
    return mainAddress;
  }
  
  // Otherwise, construct from separate fields
  const parts: string[] = [];
  
  // Add lot number if present
  if (address.lotNumber && address.lotNumber.trim() !== '' && !address.lotNumberNotApplicable) {
    const lotNum = address.lotNumber.trim();
    if (!lotNum.toLowerCase().startsWith('lot')) {
      parts.push(`Lot ${lotNum}`);
    } else {
      parts.push(lotNum);
    }
  }
  
  // Add unit number if present
  if (address.unitNumber && address.unitNumber.trim() !== '' && address.hasUnitNumbers) {
    const unitNum = address.unitNumber.trim();
    if (!unitNum.toLowerCase().startsWith('unit')) {
      parts.push(`Unit ${unitNum}`);
    } else {
      parts.push(unitNum);
    }
  }
  
  // Add main property address
  if (mainAddress) {
    parts.push(mainAddress);
  }
  
  // Join with comma-space separator
  return parts.join(', ');
}

/**
 * Constructs a folder name from address data
 * Validates length and truncates if necessary
 * 
 * @param address - Address data from form
 * @returns Folder name (validated for length)
 */
export function constructFolderName(address: AddressData): string {
  let folderName = constructFullAddress(address);
  
  // Validate length
  if (folderName.length > MAX_FOLDER_NAME_LENGTH) {
    // Truncate and add ellipsis
    folderName = folderName.substring(0, MAX_FOLDER_NAME_LENGTH - 3) + '...';
  }
  
  return folderName;
}

/**
 * Checks if a folder name is valid (not too long)
 * 
 * @param folderName - Folder name to validate
 * @returns True if valid, false if too long
 */
export function isValidFolderName(folderName: string): boolean {
  return folderName.length > 0 && folderName.length <= MAX_FOLDER_NAME_LENGTH;
}

/**
 * Sanitizes a folder name for Google Drive
 * Removes invalid characters and trims whitespace
 * 
 * @param folderName - Folder name to sanitize
 * @returns Sanitized folder name
 */
export function sanitizeFolderName(folderName: string): string {
  // Remove invalid characters for Google Drive (/, \, ?, *, :, |, ", <, >)
  let sanitized = folderName.replace(/[\/\\?*:|"<>]/g, '');
  
  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();
  
  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized;
}

/**
 * Constructs a folder name and sanitizes it
 * This is the main function to use for folder creation
 * 
 * @param address - Address data from form
 * @returns Sanitized folder name ready for Google Drive
 */
export function constructAndSanitizeFolderName(address: AddressData): string {
  const folderName = constructFolderName(address);
  return sanitizeFolderName(folderName);
}
