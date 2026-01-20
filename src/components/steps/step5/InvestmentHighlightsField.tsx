'use client';

/**
 * InvestmentHighlightsField Component (Phase 3)
 * 
 * Purpose: Display and manage investment highlights/hotspotting reports
 * 
 * Phase 3 Features (Current):
 * - Text area for investment highlights
 * - Manual paste functionality
 * - Controlled component pattern
 * 
 * Phase 4 Features (Future):
 * - Google Sheets lookup
 * - Report selection dropdown
 * - "match found" / "no match" UI
 * - Save logic
 * - Error handling with fallback
 */

interface InvestmentHighlightsFieldProps {
  value: string;
  onChange: (value: string) => void;
  lga?: string; // For future sheet lookup
  state?: string; // For future sheet lookup
  disabled?: boolean;
}

export function InvestmentHighlightsField({ value, onChange, lga, state, disabled = false }: InvestmentHighlightsFieldProps) {
  
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
        <label className="label-field mb-1">Investment Highlights *</label>
        <p className="text-sm text-gray-600">
          Key investment highlights and infrastructure developments.
        </p>
        {lga && (
          <p className="text-xs text-gray-500 mt-1">
            LGA: <span className="font-medium">{lga}</span> {state && `(${state})`}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Paste hotspotting report content or manually enter investment highlights.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled}
        className="input-field min-h-[150px]"
        placeholder="Paste hotspotting report content here or manually enter key investment highlights..."
        spellCheck={true}
        required
      />
      
      <p className="text-xs text-gray-500">
        You can edit the content above as needed.
      </p>
    </div>
  );
}
