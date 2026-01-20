'use client';

/**
 * WhyThisPropertyField Component (Phase 3)
 * 
 * Purpose: Display and manage "Why This Property" content
 * 
 * Phase 3 Features (Current):
 * - Growing text area for property content
 * - Manual paste functionality
 * - Controlled component pattern
 * 
 * Phase 4 Features (Future):
 * - AI generation button
 * - Regenerate functionality
 * - Loading states
 * - Error handling with fallback
 */

interface WhyThisPropertyFieldProps {
  value: string;
  onChange: (value: string) => void;
  suburb?: string; // For future AI generation
  disabled?: boolean;
}

export function WhyThisPropertyField({ value, onChange, suburb, disabled = false }: WhyThisPropertyFieldProps) {
  
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
          Provide detailed reasons why this property is a good investment opportunity.
        </p>
        <p className="text-xs text-gray-500 italic mt-1">
          Format: Each bullet point as "• **Heading** - Description"
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Use ChatGPT or AI tools to generate this content, then paste here.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled}
        className="input-field min-h-[150px]"
        placeholder={`• **Location** - Prime location in ${suburb || 'growing suburb'}&#10;• **Growth Potential** - Strong capital growth expected&#10;• **Infrastructure** - Major developments planned...`}
        spellCheck={true}
        required
      />
    </div>
  );
}
