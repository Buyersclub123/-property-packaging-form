'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';
import { UserEmailPrompt } from '@/components/UserEmailPrompt';
import { loadMockData } from '@/utils/mockData';

// Dynamically import MultiStepForm with SSR disabled
const MultiStepForm = dynamic(
  () => import('@/components/MultiStepForm').then(mod => ({ default: mod.MultiStepForm })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Packaging Form</h1>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    ),
  }
);

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm mb-4">{error.message}</pre>
        {error.stack && (
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs mb-4">{error.stack}</pre>
        )}
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Auto-load mock data if ?mock=project or ?mock=single in URL (development only)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const params = new URLSearchParams(window.location.search);
      const mockType = params.get('mock');
      if (mockType === 'project' || mockType === 'single') {
        setTimeout(() => {
          loadMockData(mockType === 'project' ? 'project' : 'single');
        }, 500); // Small delay to ensure store is ready
      }
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Property Packaging Form
            </h1>
            <p className="text-gray-600 mb-8">
              Complete the form below to package a property for review
            </p>
            
            {!userEmail ? (
              <UserEmailPrompt onEmailSet={setUserEmail} />
            ) : (
              <MultiStepForm userEmail={userEmail} />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}


