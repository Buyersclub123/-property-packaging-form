'use client';

import { FILTER_OPERATORS, type ViewFilter, type ViewFilterGroup } from '@/lib/ctrViewFilters';

export default function CtrFilterGroups({ groups, onChange, fields, label, options }: {
  groups: ViewFilterGroup[];
  onChange: (groups: ViewFilterGroup[]) => void;
  fields: string[];
  label: (field: string) => string;
  options: (field: string) => { key: string; label: string }[] | null;
}) {
  const newFilter = (): ViewFilter => ({ field: fields[0] || 'name', operator: 'equals', value: '' });
  const update = (gi: number, fi: number, patch: Partial<ViewFilter>) => onChange(groups.map((g, i) => i !== gi ? g : {
    ...g, filters: g.filters.map((f, j) => j === fi ? { ...f, ...patch } : f),
  }));
  const input = 'rounded border border-gray-400 bg-white px-1 py-1 text-gray-900 text-[11px] min-w-0';
  return (
    <div className="mt-3 border-t border-gray-400 pt-2" data-testid="filter-groups">
      <div className="text-[11px] font-bold">MATCH ANY GROUP (OR)</div>
      <p className="my-1 text-[10px]">Every row must pass the common filters above and all conditions in at least one group below.</p>
      {groups.map((group, gi) => (
        <div key={gi} className="my-2 rounded border border-gray-400 p-2" data-testid="filter-group">
          {gi > 0 && <div className="mb-1 text-[11px] font-bold">OR</div>}
          <div className="mb-2 flex gap-1">
            <input aria-label={`Group ${gi + 1} name`} value={group.name} className={`${input} flex-1`}
              onChange={(e) => onChange(groups.map((g, i) => i === gi ? { ...g, name: e.target.value } : g))} />
            <button type="button" title="Remove group" className="text-[11px] text-red-500"
              onClick={() => onChange(groups.filter((_, i) => i !== gi))}>Remove group</button>
          </div>
          <div className="mb-1 text-[10px]">Match ALL conditions (AND)</div>
          {group.filters.map((f, fi) => {
            const opts = f.operator === 'equals' || f.operator === 'not equals' ? options(f.field) : null;
            const prefix = `Group ${gi + 1} condition ${fi + 1}`;
            return (
              <div key={fi} className="mb-2">
                <div className="flex flex-wrap gap-1">
                  <select aria-label={`${prefix} field`} value={f.field} className={`${input} flex-1`}
                    onChange={(e) => update(gi, fi, { field: e.target.value, value: '' })}>
                    {[...new Set([...fields, f.field])].map((field) => <option key={field} value={field}>{label(field)}</option>)}
                  </select>
                  <select aria-label={`${prefix} operator`} value={f.operator} className={input}
                    onChange={(e) => update(gi, fi, { operator: e.target.value as ViewFilter['operator'] })}>
                    {FILTER_OPERATORS.map((op) => <option key={op}>{op}</option>)}
                  </select>
                  <button type="button" title="Remove condition" aria-label={`${prefix} remove`}
                    className="px-1 text-red-500" onClick={() => onChange(groups.map((g, i) => i !== gi ? g : {
                      ...g, filters: g.filters.filter((_, j) => j !== fi),
                    }))}>✕</button>
                </div>
                {f.operator !== 'is blank' && f.operator !== 'not blank' && (
                  opts?.length ? (
                    <select aria-label={`${prefix} value`} value={f.value} className={`${input} mt-1 w-full`}
                      onChange={(e) => update(gi, fi, { value: e.target.value })}>
                      {!opts.some((o) => o.key === f.value) && <option value={f.value}>{f.value || 'Choose…'}</option>}
                      {opts.filter((o) => o.key !== '').map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input aria-label={`${prefix} value`} value={f.value} className={`${input} mt-1 w-full`}
                      onChange={(e) => update(gi, fi, { value: e.target.value })}
                      placeholder={f.operator === 'equals any' ? 'Exact values separated by commas; (blank) includes empty values' : 'Value'} />
                  )
                )}
                {f.operator === 'equals any' && (
                  <p className="mt-1 text-[10px]">Exact values, separated by commas. Use (blank) for empty values.
                    {options(f.field)?.length ? ` Options: ${options(f.field)!.filter((o) => o.key).map((o) => `${o.label} = ${o.key}`).join('; ')}` : ''}</p>
                )}
              </div>
            );
          })}
          <button type="button" className="text-[11px] underline"
            onClick={() => onChange(groups.map((g, i) => i === gi ? { ...g, filters: [...g.filters, newFilter()] } : g))}>+ Add condition</button>
        </div>
      ))}
      <button type="button" className="text-[11px] underline" onClick={() => onChange([...groups, {
        name: `Group ${groups.length + 1}`, filters: [newFilter()],
      }])}>+ Add OR group</button>
    </div>
  );
}
