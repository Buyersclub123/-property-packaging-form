export const FILTER_OPERATORS = ['contains', 'contains any', 'not contains', 'equals', 'not equals', 'in', 'not in', 'equals any', 'is blank', 'not blank'] as const;
export interface ViewFilter {
  field: string;
  operator: typeof FILTER_OPERATORS[number];
  value: string;
}
export interface ViewFilterGroup {
  name: string;
  filters: ViewFilter[];
}

// Open is the normal population. A report must explicitly mention status and
// permit another native status before its live read includes closed records.
export function reportRequestsOtherStatuses(filters: ViewFilter[], groups?: ViewFilterGroup[]): boolean {
  const statusFilters = [...filters, ...(groups || []).flatMap(g => g.filters)].filter(f => f.field === 'status');
  return statusFilters.length > 0 && ['won', 'lost', 'abandoned'].some(status =>
    statusFilters.some(f => matchesViewFilter({ status }, f)));
}

export function filterComplete(f: ViewFilter): boolean {
  return !!f.field.trim() && (f.operator === 'is blank' || f.operator === 'not blank' || !!f.value.trim());
}

export function filterGroupsError(groups: unknown): string | null {
  if (groups === undefined) return null;
  if (!Array.isArray(groups)) return 'Filter groups must be a list.';
  for (const [i, group] of groups.entries()) {
    if (!group || typeof group.name !== 'string' || !group.name.trim()) return `Group ${i + 1} needs a name.`;
    if (!Array.isArray(group.filters) || !group.filters.length) return `Group ${i + 1} needs at least one condition.`;
    for (const f of group.filters) {
      if (!f || typeof f.field !== 'string' || typeof f.value !== 'string' || !FILTER_OPERATORS.includes(f.operator) || !filterComplete(f)) {
        return `Complete every condition in group ${i + 1}, or remove that group.`;
      }
    }
  }
  return null;
}

export function matchesViewFilter(record: Record<string, unknown>, f: ViewFilter): boolean {
  const cell = String(record[f.field] || '').toLowerCase().trim();
  const value = f.value.toLowerCase().trim();
  const list = value.split(',').map((s) => s.trim());
  switch (f.operator) {
    case 'equals': return cell === value;
    case 'not equals': return cell !== value;
    case 'contains': return cell.includes(value);
    case 'contains any': {
      const terms = list.filter(Boolean);
      return !terms.length || terms.some((term) => cell.includes(term));
    }
    case 'not contains': return !cell.includes(value);
    // Preserve existing saved views' substring behaviour.
    case 'in': return list.some((item) => cell === item || cell.includes(item));
    case 'not in': return !list.some((item) => cell === item || cell.includes(item));
    // Exact alternatives; "(blank)" is explicit so an empty list item cannot match everything.
    case 'equals any': return list.filter(Boolean).some((item) => cell === (item === '(blank)' ? '' : item));
    case 'is blank': return cell === '';
    case 'not blank': return cell !== '';
    default: return false;
  }
}

/** All common filters AND (every condition in at least one optional OR group). */
export function applyViewFilters<T extends Record<string, unknown>>(records: T[], filters: ViewFilter[], groups?: ViewFilterGroup[]): T[] {
  if (filterGroupsError(groups)) return [];
  return records.filter((record) =>
    filters.every((f) => matchesViewFilter(record, f))
    && (!groups?.length || groups.some((group) => group.filters.every((f) => matchesViewFilter(record, f))))
  );
}
