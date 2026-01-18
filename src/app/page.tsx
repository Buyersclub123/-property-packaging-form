'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ErrorBoundary } from 'react-error-boundary';
import { UserEmailPrompt } from '@/components/UserEmailPrompt';

// Global error handler for chunk loading errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const error = event.error || event.message;
    const errorString = typeof error === 'string' ? error : error?.message || '';
    
    // Check if it's a chunk load error
    if (
      errorString.includes('Loading chunk') ||
      errorString.includes('ChunkLoadError') ||
      errorString.includes('Failed to fetch dynamically imported module') ||
      (event.target && (event.target as HTMLElement).tagName === 'SCRIPT' && 
       (event.target as HTMLScriptElement).src.includes('_next/static/chunks'))
    ) {
      console.log('ChunkLoadError detected, reloading page...');
      // Reload after a short delay to avoid rapid reload loops
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });

  // Also handle unhandled promise rejections (chunk errors can appear here too)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorString = typeof error === 'string' ? error : error?.message || '';
    
    if (
      errorString.includes('Loading chunk') ||
      errorString.includes('ChunkLoadError') ||
      errorString.includes('Failed to fetch dynamically imported module')
    ) {
      console.log('ChunkLoadError in promise rejection, reloading page...');
      event.preventDefault(); // Prevent default error logging
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });
}

// Dynamically import MultiStepForm with SSR disabled
const MultiStepForm = dynamic(
  () => import('@/components/MultiStepForm').then(mod => ({ default: mod.MultiStepForm })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto px-4">
          <div className="flex items-start justify-between mb-2">
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-900">Property Packaging Form</h1>
            </div>
            <div className="flex-shrink-0 ml-6">
              <Image 
                src="/logo.jpg" 
                alt="Buyers Club Logo" 
                width={200} 
                height={150}
                className="object-contain"
              />
            </div>
          </div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    ),
  }
);

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  // Check if this is a ChunkLoadError (happens when app is redeployed and chunks changed)
  const isChunkLoadError = 
    error.name === 'ChunkLoadError' || 
    error.message.includes('Loading chunk') || 
    error.message.includes('Failed to fetch dynamically imported module');

  // Auto-reload page for chunk load errors (this fixes the issue automatically)
  if (isChunkLoadError && typeof window !== 'undefined') {
    // Small delay to show message, then reload
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Updating Application...</h2>
          <p className="text-gray-700 mb-4">
            A new version of the application is available. The page will reload automatically.
          </p>
          <p className="text-sm text-gray-500">
            If the page doesn't reload automatically, please refresh your browser.
          </p>
        </div>
      </div>
    );
  }

  // Regular error fallback for other errors
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

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Property Packaging Form
                </h1>
                <p className="text-gray-600 mb-8 mt-2">
                  Complete the form below to package a property for review
                </p>
              </div>
              <div className="flex-shrink-0 ml-6">
                <Image 
                  src="/logo.jpg" 
                  alt="Buyers Club Logo" 
                  width={200} 
                  height={150}
                  className="object-contain"
                />
              </div>
            </div>
            
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


