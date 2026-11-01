import BackLink from '@/components/BackLink';

/** Shared strip above every tool page: a back link to the menu the user came from. */
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex h-8 items-center border-b border-gray-200 bg-white px-4">
        <BackLink fallback="/" />
      </div>
      {children}
    </>
  );
}
