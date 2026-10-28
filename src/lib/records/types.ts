// Shared shapes for the record pop-out (Contact / Opportunity / Property pages). Client-safe: no server imports.

export interface RecordField {
  label: string;
  value: string;
  long?: boolean;
}

export interface RecordGroup {
  name: string;
  fields: RecordField[];
}

export type RecordPageKind = 'contact' | 'opportunity' | 'property';

export interface RecordPage {
  key: string;
  kind: RecordPageKind;
  menuLabel: string;
  title: string;
  source: string;
  ghlUrl?: string;
  ids?: string;
  note?: string;
  groups: RecordGroup[];
}

export interface RecordBundle {
  opportunityId: string;
  title: string;
  createdAt: string;
  fetchedAt: string;
  pages: RecordPage[];
  warnings: string[];
}

export const PROPERTY_SECTIONS = [
  'Address',
  'Deal & builder',
  'Price & contract',
  'Settlement',
  'Finance',
  'Valuation & rent',
  'Other',
] as const;

export const propertyPageKey = (id: string) => `property:${id}`;
