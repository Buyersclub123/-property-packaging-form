import { notFound } from 'next/navigation';
import { getTeam, teams } from '@/lib/portalConfig';
import TeamDetailPage from '@/components/portal/TeamDetailPage';

export function generateStaticParams() {
  return teams.map((t) => ({ id: t.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  const team = getTeam(params.id);
  if (!team) notFound();
  return <TeamDetailPage team={team} />;
}
