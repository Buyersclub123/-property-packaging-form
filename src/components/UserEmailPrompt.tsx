'use client';

import { useState, useEffect } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail, hasValidUserEmail } from '@/lib/userAuth';

interface UserEmailPromptProps {
  onEmailSet: (email: string) => void;
}

export function UserEmailPrompt({ onEmailSet }: UserEmailPromptProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if email is already stored
    const storedEmail = getUserEmail();
    if (storedEmail && hasValidUserEmail()) {
      onEmailSet(storedEmail);
      setIsChecking(false);
      return;
    }
    setIsChecking(false);
  }, [onEmailSet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateUserEmail(email);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid email');
      return;
    }

    if (saveUserEmail(validation.email!)) {
      onEmailSet(validation.email!);
    } else {
      setError('Failed to save email address');
    }
  };

  if (isChecking) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border-2 border-red-300 rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Verification Required</h3>
      <p className="text-sm text-gray-600 mb-4">
        Please enter your individual @buyersclub.com.au email address to continue.
        Shared email accounts (Properties@, Packaging@) are not allowed.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="label-field">Your Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="input-field"
            placeholder="your.name@buyersclub.com.au"
            required
            autoFocus
          />
          {error && (
            <p className="text-red-600 text-sm mt-1">{error}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}





