'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';
import { UserEmailPrompt } from '@/components/UserEmailPrompt';
import { getUserEmail } from '@/lib/userAuth';

// Dynamically import MultiStepForm with SSR disabled
const MultiStepForm = dynamic(
  () => import('@/components/MultiStepForm').then(mod => ({ default: mod.MultiStepForm })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    ),
  }
);

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Form</h2>
        <p className="text-red-600 mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function EditPropertyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [editor, setEditor] = useState<string | null>(null);
  const [recordIdInput, setRecordIdInput] = useState<string>('');

  // Read URL parameters
  useEffect(() => {
    const returnToParam = searchParams.get('returnTo');
    const editorParam = searchParams.get('editor');
    if (returnToParam) setReturnTo(returnToParam);
    if (editorParam) setEditor(editorParam);
  }, [searchParams]);

  // Get user email
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = getUserEmail();
      if (email) {
        setUserEmail(email);
      }
    }
  }, []);

  // Load property data
  useEffect(() => {
    const loadProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!recordId || recordId === '[id]' || recordId === 'undefined') {
          setLoading(false);
          return; // Will show input form
        }

        // Test mode: Use mock data if ?test=true is in URL
        const isTestMode = searchParams.get('test') === 'true';
        if (isTestMode) {
          console.log('Test mode: Using mock data');
          setPropertyData({
            address: {
              propertyAddress: '123 Test Street, Test Suburb QLD 4000'
            },
            propertyDescription: {
              bedsPrimary: '3',
              bathPrimary: '2',
              garagePrimary: '2',
              yearBuilt: '2020',
              landSize: '500'
            },
            purchasePrice: {
              landPrice: '300000',
              buildPrice: '200000',
              totalPrice: '500000',
              acceptableAcquisitionFrom: '450000',
              acceptableAcquisitionTo: '550000'
            },
            rentalAssessment: {
              occupancyPrimary: 'Owner Occupied',
              currentRentPrimary: '500',
              rentAppraisalPrimaryFrom: '450',
              rentAppraisalPrimaryTo: '550',
              yield: '5.2',
              appraisedYield: '5.5'
            },
            decisionTree: {
              propertyType: 'New',
              lotType: 'Single'
            }
          });
          setLoading(false);
          return;
        }

        console.log('Loading property with recordId:', recordId);
        const response = await fetch(`/api/properties/${recordId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API response error:', response.status, errorText);
          throw new Error(`Failed to load property: ${response.status} ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load property');
        }

        if (!result.data) {
          throw new Error('No data returned from API');
        }

        setPropertyData(result.data);
      } catch (err) {
        console.error('Error loading property:', err);
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (recordId && recordId !== '[id]' && recordId !== 'undefined') {
      loadProperty();
    } else {
      setLoading(false);
      // Will show input form instead
    }
  }, [recordId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
          <p className="text-sm text-gray-500 mt-2">Record ID: {recordId || 'Missing'}</p>
        </div>
      </div>
    );
  }

  // Handle record ID input form (when no recordId in URL)
  const handleRecordIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordIdInput.trim()) {
      setError('Please enter a Record ID');
      return;
    }
    // Build URL with optional query params
    let url = `/properties/${recordIdInput.trim()}/edit`;
    const params = new URLSearchParams();
    if (returnTo) params.append('returnTo', returnTo);
    if (editor) params.append('editor', editor);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    router.push(url);
  };

  // Show record ID input form if no recordId in URL
  if (!recordId || recordId === '[id]' || recordId === 'undefined') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Property</h1>
            <p className="text-gray-600">Enter the GHL Record ID to edit a property</p>
          </div>

          <form onSubmit={handleRecordIdSubmit} className="space-y-4">
            <div>
              <label htmlFor="recordId" className="block text-sm font-medium text-gray-700 mb-2">
                GHL Record ID
              </label>
              <input
                id="recordId"
                type="text"
                value={recordIdInput}
                onChange={(e) => setRecordIdInput(e.target.value)}
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

  if (error && !propertyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Property</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Record ID: {recordId || 'Missing'}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/properties/edit')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Enter Different Record ID
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Check browser console (F12) for more details
          </p>
        </div>
      </div>
    );
  }

  if (!propertyData) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {!userEmail ? (
              <UserEmailPrompt onEmailSet={setUserEmail} />
            ) : (
              <MultiStepForm
                userEmail={userEmail}
                mode="edit"
                initialData={propertyData}
                recordId={recordId}
                returnTo={returnTo}
                editor={editor}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
