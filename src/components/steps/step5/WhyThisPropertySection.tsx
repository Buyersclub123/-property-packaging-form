'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';

export function WhyThisPropertySection() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address } = formData;
  
  const [content, setContent] = useState(contentSections?.whyThisProperty || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with store
  useEffect(() => {
    if (contentSections?.whyThisProperty !== undefined) {
      setContent(contentSections.whyThisProperty);
    }
  }, [contentSections?.whyThisProperty]);

  const handleContentChange = (value: string) => {
    setContent(value);
    updateFormData({
      contentSections: {
        ...contentSections,
        whyThisProperty: value,
      },
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    let cleaned = pastedText.trim();
    cleaned = cleaned.replace(/^["""''']+/, '');
    cleaned = cleaned.replace(/["""''']+$/, '');
    cleaned = cleaned.trim();
    handleContentChange(cleaned);
  };

  const generateContent = async () => {
    if (!address?.propertyAddress) return;
    setLoading(true);
    setError(null);
    try {
        const response = await fetch('/api/ai/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                address: address.propertyAddress,
                suburb: address.suburbName,
                lga: address.lga,
                type: 'whyThisProperty'
            })
        });
        const data = await response.json();
        if (data.success) {
            handleContentChange(data.content);
        } else {
            setError(data.error || 'Failed to generate content');
        }
    } catch (e) {
        setError('Failed to connect to AI service. Please try manually or use ChatGPT directly.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Why this Property? *</h3>
          <p className="text-sm text-gray-600">
            Provide detailed reasons why this property is a good investment opportunity.
          </p>
          <p className="text-xs text-gray-500 italic mt-1">
             Format: Each bullet point as "• **Heading** - Description" (all on one line)
          </p>
        </div>
        <button 
            type="button"
            onClick={generateContent}
            disabled={loading || !address?.propertyAddress}
            className="btn-secondary whitespace-nowrap text-sm px-3 py-2 h-[42px]"
        >
            {loading ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-700">
          <p className="font-medium">AI Generation Failed</p>
          <p>{error}</p>
          <p className="mt-1 text-xs">You can use ChatGPT manually and paste the result here.</p>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        onPaste={handlePaste}
        className="input-field min-h-[150px] font-mono text-sm"
        placeholder={`• **Location** - Prime location in ${address?.suburbName || 'growing suburb'}\n• **Growth Potential** - Strong capital growth expected`}
        required
      />
    </div>
  );
}
