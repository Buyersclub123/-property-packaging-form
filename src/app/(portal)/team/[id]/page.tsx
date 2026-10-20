import { notFound } from 'next/navigation';
import { getTeam, teams } from '@/lib/portalConfig';
import TeamDetailPage from '@/components/portal/TeamDetailPage';

export function generateStaticParams() {
  return teams.map((t) => ({ id: t.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  return { title: getTeam(params.id)?.name ?? 'BC Tools' };
}

export default function Page({ params }: { params: { id: string } }) {
  const team = getTeam(params.id);
  if (!team) notFound();
  return <TeamDetailPage team={team} />;
}
