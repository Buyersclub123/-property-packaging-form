import Link from 'next/link';
import { groupHref, type TeamTile, type SubTile } from '@/lib/portalConfig';

function CogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-shrink-0 text-[#7A7575] transition-colors group-hover:text-brand-charcoal">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 flex-shrink-0 text-[#B8B3B3] transition-colors group-hover:text-brand-charcoal"
    >
      <path
        d="M4.5 2.5h6v6M10.5 2.5L4 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.5V11H2V4h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARD =
  'rounded-[14px] border border-[#EDEDED] bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(0,0,0,.04)] flex flex-col h-full';

function ToolTile({ tile, team }: { tile: SubTile; team: TeamTile }) {
  if (tile.comingSoon) {
    return (
      <div className="flex h-full flex-col rounded-[14px] border border-dashed border-[#E0E0E0] bg-[#FBFBFB] px-5 py-[18px]">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <h3 className="m-0 text-[14.5px] font-bold leading-snug tracking-[-0.2px] text-[#8A8585]">
            {tile.name}
          </h3>
          <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-[#F2F2F2] px-[9px] py-1 text-[10.5px] font-bold uppercase tracking-[.3px] text-[#8A8585]">
            Coming soon
          </span>
        </div>
        <p className="m-0 text-[12.5px] leading-relaxed text-[#A5A0A0]">
          {tile.description}
        </p>
      </div>
    );
  }

  const inner = (
    <>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <h3 className="m-0 text-[14.5px] font-bold leading-snug tracking-[-0.2px] text-brand-charcoal">
          {tile.name}
        </h3>
        {tile.icon === 'cog' && <CogIcon />}
        {tile.external && <ExternalIcon />}
      </div>
      <p className="m-0 text-[12.5px] leading-relaxed text-[#7A7575]">
        {tile.description}
      </p>
      {tile.children && (
        <div className="mt-auto pt-3 text-[11.5px] font-semibold text-[#9A9595]">
          {tile.children.length} {tile.children.length === 1 ? 'tool' : 'tools'}
        </div>
      )}
    </>
  );

  const cls = `group ${CARD} no-underline transition-[border-color,box-shadow] hover:border-[#E0E0E0] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] focus:outline-none focus-visible:border-brand-yellow focus-visible:shadow-[0_0_0_3px_#FFF1A6]`;

  if (tile.children) {
    return (
      <Link href={groupHref(team, tile)} className={cls}>
        {inner}
      </Link>
    );
  }

  if (tile.newTab) {
    return (
      <a href={tile.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={tile.href ?? '#'} className={cls}>
      {inner}
    </Link>
  );
}

export default function TeamDetailPage({
  team,
  tools,
  heading,
}: {
  team: TeamTile;
  tools: SubTile[];
  /** For a tile's own page (e.g. Property Team > Backend): its name, description and back link. */
  heading?: { name: string; description: string; back: { href: string; label: string } };
}) {
  const back = heading?.back ?? { href: '/', label: 'Dashboard' };
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1080px] px-4 pb-[60px] pt-6">
        <Link
          href={back.href}
          className="mb-[18px] inline-flex items-center gap-[7px] py-1.5 text-[12.5px] font-semibold text-[#7A7575] no-underline hover:text-brand-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M8.5 3L4.5 7l4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {back.label}
        </Link>

        <h1 className="m-0 mb-1 text-[24px] font-bold leading-[1.15] tracking-[-0.5px] text-brand-charcoal">
          {heading?.name ?? team.name}
        </h1>
        <p className="m-0 mb-[26px] text-[13.5px] text-[#7A7575]">
          {heading?.description ?? team.description}
        </p>

        <h2 className="m-0 mb-3.5 flex items-center gap-[9px] text-[13px] font-bold uppercase tracking-[1px] text-brand-charcoal">
          Tools
          <span className="inline-flex h-[22px] min-w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand-yellow px-[7px] text-[12px] font-extrabold text-brand-charcoal">
            {tools.length}
          </span>
        </h2>

        <ul className="grid list-none grid-cols-1 gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tile) => (
            <li key={tile.name}>
              <ToolTile tile={tile} team={team} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
