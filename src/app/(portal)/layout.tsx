import TopNavBar from '@/components/portal/TopNavBar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNavBar />
      {children}
    </>
  );
}
