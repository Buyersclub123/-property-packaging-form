import Link from 'next/link';
import { teams } from '@/lib/portalConfig';
import { teamVisible, viewerAccess, visibleTools } from '@/lib/tileAccess';

export default async function DashboardPage() {
  const v = await viewerAccess();
  const shownTeams = teams.filter((t) => teamVisible(t, v));
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1080px] px-4 pb-[60px] pt-0">
        <div className="mb-[22px] rounded-[14px] border border-[#ECE6D2] bg-brand-cream px-[22px] py-4 text-[13.5px] text-[#3B3838]">
          Everything the team uses, in one place.{' '}
          <b className="text-brand-charcoal">Pick a team</b> to see its tools,
          reports and reference material.
        </div>

        <h2 className="m-0 mb-3.5 text-[13px] font-bold uppercase tracking-[1px] text-brand-charcoal">
          Teams
        </h2>

        {!v.ok && (
          <div className="mb-[22px] rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Tile access could not be read, so no tiles are shown: {v.error}
          </div>
        )}

        <ul className="grid list-none grid-cols-1 gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {shownTeams.map((team) => {
            const tools = visibleTools(team, v);
            const total = tools.length;
            const ready = tools.filter((t) => !t.comingSoon).length;

            return (
              <li key={team.id}>
                <Link
                  href={`/team/${team.id}`}
                  className="flex h-full flex-col rounded-[14px] border border-[#EDEDED] bg-white p-[22px] no-underline shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-[border-color,box-shadow] hover:border-[#E0E0E0] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] focus:outline-none focus-visible:border-brand-yellow focus-visible:shadow-[0_0_0_3px_#FFF1A6]"
                >
                  <h3 className="m-0 mb-2.5 text-[16px] font-bold leading-[1.25] tracking-[-0.2px] text-brand-charcoal">
                    {team.name}
                  </h3>

                  <p className="m-0 flex-1 text-[13px] leading-relaxed text-[#7A7575]">
                    {team.description}
                  </p>

                  <div className="mt-[18px] border-t border-[#F2F2F2] pt-3.5 text-[11.5px] font-semibold text-[#9A9595]">
                    {ready === total
                      ? `${total} ${total === 1 ? 'tool' : 'tools'}`
                      : `${ready} of ${total} available`}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
