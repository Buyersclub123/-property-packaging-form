// User email validation and storage
// Blocks shared email accounts, allows individual @buyersclub.com.au accounts

const BLOCKED_EMAILS = ['properties@buyersclub.com.au', 'packaging@buyersclub.com.au'];
const ALLOWED_DOMAIN = '@buyersclub.com.au';
const USER_EMAIL_STORAGE_KEY = 'property-review-user-email';

export interface UserEmailValidation {
  isValid: boolean;
  email: string | null;
  error: string | null;
}

/**
 * Validate email address
 * - Must be @buyersclub.com.au domain
 * - Cannot be Properties@ or Packaging@
 */
export function validateUserEmail(email: string): UserEmailValidation {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      email: null,
      error: 'Email address is required',
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if blocked email
  if (BLOCKED_EMAILS.includes(normalizedEmail)) {
    return {
      isValid: false,
      email: null,
      error: 'Shared email accounts (Properties@ or Packaging@) are not allowed. Please use your individual @buyersclub.com.au email address.',
    };
  }

  // Check domain
  if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
    return {
      isValid: false,
      email: null,
      error: `Only @buyersclub.com.au email addresses are allowed.`,
    };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      email: null,
      error: 'Invalid email format',
    };
  }

  return {
    isValid: true,
    email: normalizedEmail,
    error: null,
  };
}

/**
 * Get user email from localStorage
 */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(USER_EMAIL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save user email to localStorage
 */
export function saveUserEmail(email: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const validation = validateUserEmail(email);
  if (!validation.isValid) {
    return false;
  }

  try {
    localStorage.setItem(USER_EMAIL_STORAGE_KEY, JSON.stringify(validation.email));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear user email from localStorage
 */
export function clearUserEmail(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if user email is set and valid
 */
export function hasValidUserEmail(): boolean {
  const email = getUserEmail();
  if (!email) return false;
  
  const validation = validateUserEmail(email);
  return validation.isValid;
}





