'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function EditPropertyLandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recordIdInput, setRecordIdInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordIdInput.trim()) {
      setError('Please enter a Record ID');
      return;
    }

    // Build URL with optional query params
    let url = `/properties/${recordIdInput.trim()}/edit`;
    const returnTo = searchParams.get('returnTo');
    const editor = searchParams.get('editor');
    
    const params = new URLSearchParams();
    if (returnTo) params.append('returnTo', returnTo);
    if (editor) params.append('editor', editor);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Property</h1>
          <p className="text-gray-600">Enter the GHL Record ID to edit a property</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recordId" className="block text-sm font-medium text-gray-700 mb-2">
              GHL Record ID
            </label>
            <input
              id="recordId"
              type="text"
              value={recordIdInput}
              onChange={(e) => {
                setRecordIdInput(e.target.value);
                setError(null);
              }}
              placeholder="e.g., 697a7fc7b0eb6a33917ea511"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500">
              You can find the Record ID in your GHL dashboard or Deal Sheet (Column Y)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Load Property for Editing
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Or use the direct URL format:
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded text-xs mt-1 inline-block">
              /properties/[RECORD_ID]/edit
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
