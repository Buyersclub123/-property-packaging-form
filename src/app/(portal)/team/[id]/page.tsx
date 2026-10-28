import { notFound } from 'next/navigation';
import { getTeam } from '@/lib/portalConfig';
import { teamVisible, viewerAccess, visibleTools } from '@/lib/tileAccess';
import TeamDetailPage from '@/components/portal/TeamDetailPage';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { id: string } }) {
  return { title: getTeam(params.id)?.name ?? 'BC Tools' };
}

export default async function Page({ params }: { params: { id: string } }) {
  const team = getTeam(params.id);
  if (!team) notFound();
  const v = await viewerAccess();
  if (!v.ok) {
    return (
      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1080px] px-4 py-10">
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Tile access could not be read, so no tools are shown: {v.error}
          </div>
        </div>
      </main>
    );
  }
  if (!teamVisible(team, v)) {
    return (
      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1080px] px-4 py-10 text-sm text-gray-600">Not available.</div>
      </main>
    );
  }
  return <TeamDetailPage team={team} tools={visibleTools(team, v)} />;
}
