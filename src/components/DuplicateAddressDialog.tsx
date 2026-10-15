'use client';

export interface DuplicateAddressMatch {
  id?: string;
  address?: string;
  propertyAddress?: string;
  status?: string;
  packager?: string;
  sourcer?: string;
}

interface Props {
  matches: DuplicateAddressMatch[];
  /** Label for the confirm button, e.g. "Yes, create anyway" or "Yes, continue" */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const formatStatus = (s?: string) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

/**
 * Shared "A property record already exists with this address" prompt — used by the packaging form (Step 1)
 * and the Deal Sheet quick-record tool so both behave the same.
 */
export function DuplicateAddressDialog({ matches, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4" onClick={onCancel}>
      <div className="bg-white text-gray-900 border border-gray-200 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">A property record already exists with this address</h3>
        <p className="text-sm text-gray-700">
          {matches.length === 1 ? 'One existing record matches.' : `${matches.length} existing records match.`} Are you sure you want to continue?
          This can be legitimate (e.g. a different dwelling on the same lot), but check it is not already packaged.
        </p>
        <ul className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1 max-h-56 overflow-auto">
          {matches.map((m, i) => (
            <li key={m.id || i} className="flex justify-between gap-3">
              <span>{m.propertyAddress || m.address || '(address unknown)'}</span>
              <span className="text-gray-500 whitespace-nowrap">{[formatStatus(m.status), m.packager].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="btn-secondary">Go back</button>
          <button type="button" onClick={onConfirm} className="btn-primary">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
