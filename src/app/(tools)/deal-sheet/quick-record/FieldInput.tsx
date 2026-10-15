'use client';

import type { FieldDef, Values } from '@/lib/propertyFields/registry';
import { fieldLabel, fieldOptions, fieldWidth, isRequired } from '@/lib/propertyFields/registry';
import { formatCurrency, parseCurrency, parseExpiry, formatExpiry, getYearOptions, MONTHS } from '@/lib/propertyFields/calcs';

export interface Tone {
  input: string;
  label: string;
  muted: string;
  lockedBg: string;
  copiedRing: string;
}

interface Props {
  field: FieldDef;
  values: Values;
  locked: boolean;
  error?: string;
  copied?: boolean;     // value came from the copied record (visual hint only)
  tone: Tone;
  onChange: (key: string, value: string) => void;
}

const tbcTyping = (raw: string) => {
  const u = raw.toUpperCase();
  return u === 'T' || u === 'TB' || u === 'TBC';
};

export function FieldInput({ field, values, locked, error, copied, tone, onChange }: Props) {
  const label = fieldLabel(field, values);
  const value = values[field.key] || '';
  const requiredMark = isRequired(field, values) ? ' *' : '';
  const base = `input-field ${error ? 'border-red-500' : ''} ${locked ? tone.lockedBg + ' cursor-not-allowed' : ''} ${copied && value ? tone.copiedRing : ''}`;
  const isFull = fieldWidth(field, values) === 'full';
  const lockedFor = (field.dependsOn || []).filter((d) => !values[d]);

  const wrap = (control: React.ReactNode) => (
    <div className={isFull ? 'md:col-span-2' : ''}>
      <label className="label-field">
        {label}{requiredMark}
      </label>
      {control}
      {locked && lockedFor.length > 0 && (
        <p className={`text-xs mt-1 ${tone.muted}`}>Answer the earlier question(s) first.</p>
      )}
      {field.help && !locked && <p className={`text-xs mt-1 ${tone.muted}`}>{field.help}</p>}
      {error && <p className="text-xs mt-1 text-red-600">{error}</p>}
    </div>
  );

  switch (field.type) {
    case 'select': {
      const opts = fieldOptions(field, values);
      return wrap(
        <select className={base} value={value} disabled={locked} onChange={(e) => onChange(field.key, e.target.value)}>
          <option value="">Select...</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>,
      );
    }
    case 'radio': {
      const opts = fieldOptions(field, values);
      return wrap(
        <div className="flex gap-6 mt-2">
          {opts.map((o) => (
            <label key={o.value} className={`flex items-center gap-2 text-sm text-gray-700 ${locked ? 'opacity-50' : 'cursor-pointer'}`}>
              <input type="radio" className="w-4 h-4" name={field.key} checked={value === o.value} disabled={locked} onChange={() => onChange(field.key, o.value)} />
              {o.label}
            </label>
          ))}
        </div>,
      );
    }
    case 'textarea':
      return wrap(
        <textarea className={`${base} min-h-[90px]`} value={value} disabled={locked} placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)} />,
      );
    case 'readonly':
      return wrap(<input className={`${base} ${tone.lockedBg}`} value={value} readOnly placeholder="—" />);
    case 'currency':
      return wrap(
        <input type="text" className={base} value={formatCurrency(value)} disabled={locked} placeholder={field.placeholder}
          onChange={(e) => {
            const raw = parseCurrency(e.target.value);
            if (raw === '' || /^\d+$/.test(raw) || tbcTyping(raw)) onChange(field.key, tbcTyping(raw) ? raw.toUpperCase() : raw);
          }} />,
      );
    case 'numberOrTbc':
      return wrap(
        <input type="text" className={base} value={value} disabled={locked} placeholder={field.placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '' || /^\d*\.?\d*$/.test(raw) || tbcTyping(raw)) onChange(field.key, tbcTyping(raw) ? raw.toUpperCase() : raw);
          }} />,
      );
    case 'yearOrTbc':
      return wrap(
        <input type="text" className={base} value={value} disabled={locked} placeholder={field.placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '' || /^\d{1,4}$/.test(raw) || tbcTyping(raw)) onChange(field.key, tbcTyping(raw) ? raw.toUpperCase() : raw);
          }} />,
      );
    case 'monthYear': {
      const keywords = field.monthYearKeywords || [];
      const activeKeyword = keywords.find((k) => k.value.toUpperCase() === value.toUpperCase());
      const parsed = activeKeyword ? { month: '', year: '' } : parseExpiry(value);
      const suffix = field.monthYearSuffix || '';
      const setMonthYear = (month: string, year: string) => {
        const formatted = formatExpiry(month, year, false, false);
        onChange(field.key, formatted && month && year ? `${formatted}${suffix}` : formatted);
      };
      return wrap(
        <div className={`rounded-lg border p-3 space-y-3 ${error ? 'border-red-500' : 'border-gray-200'}`}>
          <div className="flex flex-wrap gap-4">
            {keywords.map((k) => (
              <label key={k.value} className={`flex items-center gap-2 text-sm text-gray-700 ${locked ? 'opacity-50' : 'cursor-pointer'}`}>
                <input type="checkbox" className="w-4 h-4" disabled={locked} checked={activeKeyword?.value === k.value}
                  onChange={(e) => onChange(field.key, e.target.checked ? k.value : '')} />
                {k.label}
              </label>
            ))}
          </div>
          {!activeKeyword && (
            <div className="grid grid-cols-2 gap-2">
              <select className={base} value={parsed.month} disabled={locked} onChange={(e) => setMonthYear(e.target.value, parsed.year)}>
                <option value="">Select Month</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className={base} value={parsed.year} disabled={locked} onChange={(e) => setMonthYear(parsed.month, e.target.value)}>
                <option value="">Select Year</option>
                {getYearOptions().map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          )}
        </div>,
      );
    }
    case 'text':
    default:
      return wrap(
        <input type="text" className={base} value={value} disabled={locked} placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)} />,
      );
  }
}
