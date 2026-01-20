'use client';

import { useState, useEffect } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';

/**
 * WhyThisPropertyField Component (Phase 4B)
 * 
 * Purpose: Display and manage "Why This Property" content with AI generation
 * 
 * Phase 3 Features:
 * - Growing text area for property content
 * - Manual paste functionality
 * - Controlled component pattern
 * 
 * Phase 4B Features (Current):
 * - AI auto-generation on page load
 * - Regenerate button
 * - Loading states
 * - Error handling with fallback
 * - Auto-growing textarea (using useAutoResize hook from Phase 4A)
 */

interface WhyThisPropertyFieldProps {
  value: string;
  onChange: (value: string) => void;
  suburb?: string;
  lga?: string;
  disabled?: boolean;
}

export function WhyThisPropertyField({ 
  value, 
  onChange, 
  suburb, 
  lga, 
  disabled = false 
}: WhyThisPropertyFieldProps) {
  const textareaRef = useAutoResize(value); // Auto-growing textarea from Phase 4A
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  /**
   * Auto-generate content when component mounts
   * Only runs if:
   * - suburb and lga are available
   * - field is empty
   * - hasn't been generated yet
   */
  useEffect(() => {
    if (suburb && lga && !value && !generated) {
      generateContent();
    }
  }, [suburb, lga]);

  /**
   * Generate AI content via backend API
   */
  const generateContent = async () => {
    if (!suburb || !lga) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburb,
          lga,
          type: 'why-property' 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      const data = await response.json();
      onChange(data.content);
      setGenerated(true);
    } catch (err) {
      console.error('AI generation error:', err);
      setError('The AI service could not be reached. Please generate content manually via Chat GPT and paste the results below.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle regenerate button click
   */
  const handleRegenerate = () => {
    generateContent();
  };

  /**
   * Handle retry button click (after error)
   */
  const handleRetry = () => {
    setError(null);
    generateContent();
  };

  /**
   * Handle paste event - clean up quotes from clipboard
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Clean up smart quotes and extra whitespace
    let cleaned = pastedText.trim();
    cleaned = cleaned.replace(/^["""''']+/, '');
    cleaned = cleaned.replace(/["""''']+$/, '');
    cleaned = cleaned.trim();
    
    // Insert cleaned text at cursor position or replace selection
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const currentValue = target.value;
    
    const newValue = currentValue.substring(0, start) + cleaned + currentValue.substring(end);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label-field mb-1">Why this Property? *</label>
        <p className="text-sm text-gray-600">
          AI will auto-generate investment reasons, or paste manually from ChatGPT.
        </p>
        <p className="text-xs text-gray-500 italic mt-1">
          Format: Each bullet point as "• **Heading** - Description"
        </p>
        
        {/* Loading State */}
        {loading && (
          <div className="flex items-center space-x-2 mt-3 mb-3 text-blue-600">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Generating content...</span>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="mt-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Success State */}
        {generated && !loading && !error && (
          <div className="mt-3 mb-3 text-sm text-green-600 flex items-center space-x-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Content generated for {suburb}</span>
          </div>
        )}
      </div>

      {/* Auto-growing Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled || loading}
        className="input-field"
        style={{ 
          overflow: 'hidden', 
          resize: 'none',
          minHeight: '150px'
        }}
        placeholder={`AI will generate content automatically, or paste manually...`}
        spellCheck={true}
        required
      />
      
      {/* Regenerate Button */}
      {!loading && (
        <button
          onClick={handleRegenerate}
          disabled={disabled || !suburb || !lga}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Regenerate
        </button>
      )}
    </div>
  );
}
