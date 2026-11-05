// Who can delete ANY Contract Team Reporting view (built-in, shared or someone else's).
// Everyone else can only delete views they created themselves.
export const CTR_VIEW_DELETERS = ['john.t@buyersclub.com.au', 'julie.l@buyersclub.com.au'];

export function canDeleteAnyView(email: string | null | undefined): boolean {
  return !!email && CTR_VIEW_DELETERS.includes(email.trim().toLowerCase());
}
