import { notFound } from 'next/navigation';
import { getTeam, slug } from '@/lib/portalConfig';
import { teamVisible, toolVisible, viewerAccess, visibleChildren } from '@/lib/tileAccess';
import TeamDetailPage from '@/components/portal/TeamDetailPage';

// A tile's own page of tools, e.g. /team/property/backend.
export const dynamic = 'force-dynamic';

function find(id: string, group: string) {
  const team = getTeam(id);
  const tool = team?.subTiles.find((t) => t.children?.length && slug(t.name) === group);
  return team && tool ? { team, tool } : null;
}

export function generateMetadata({ params }: { params: { id: string; group: string } }) {
  return { title: find(params.id, params.group)?.tool.name ?? 'BC Tools' };
}

export default async function Page({ params }: { params: { id: string; group: string } }) {
  const found = find(params.id, params.group);
  if (!found) notFound();
  const { team, tool } = found;

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
  if (!teamVisible(team, v) || !toolVisible(team, tool, v)) {
    return (
      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1080px] px-4 py-10 text-sm text-gray-600">Not available.</div>
      </main>
    );
  }

  return (
    <TeamDetailPage
      team={team}
      tools={visibleChildren(team, tool, v)}
      heading={{ name: tool.name, description: tool.description, back: { href: `/team/${team.id}`, label: team.name } }}
    />
  );
}
