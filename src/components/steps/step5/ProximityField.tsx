'use client';

/**
 * ProximityField Component (Phase 3)
 * 
 * Purpose: Display and manage proximity/amenity data
 * 
 * Phase 3 Features (Current):
 * - Text area for proximity results
 * - Manual paste functionality
 * - Controlled component pattern
 * 
 * Phase 4 Features (Future):
 * - Auto-run on page load
 * - Address override functionality
 * - Loading states
 * - Error handling with fallback
 */

interface ProximityFieldProps {
  value: string;
  onChange: (value: string) => void;
  address?: string; // For future auto-run feature
  disabled?: boolean;
}

export function ProximityField({ value, onChange, address, disabled = false }: ProximityFieldProps) {
  
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
        <label className="label-field mb-1">Proximity *</label>
        <p className="text-sm text-gray-600 mb-2">
          Paste proximity/amenity data for: <span className="font-medium">{address || 'Property Address'}</span>
        </p>
        <p className="text-xs text-gray-500">
          Use the proximity tool or ChatGPT to generate this content, then paste here.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled}
        className="input-field min-h-[200px] font-mono text-sm"
        placeholder={`${address || 'Property Address'}&#10;• 0.5 km (5 mins), Local Kindergarten&#10;• 1.2 km (10 mins), Primary School&#10;• 2.0 km (15 mins), Shopping Centre...`}
        spellCheck={true}
        required
      />
      
      <p className="text-xs text-gray-500">
        You can edit the list above. Add or remove items as needed.
      </p>
    </div>
  );
}
