import Link from 'next/link';
import type { TeamTile, SubTile } from '@/lib/portalConfig';

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

function ToolTile({ tile }: { tile: SubTile }) {
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
        {tile.external && <ExternalIcon />}
      </div>
      <p className="m-0 text-[12.5px] leading-relaxed text-[#7A7575]">
        {tile.description}
      </p>
    </>
  );

  const cls = `group ${CARD} no-underline transition-[border-color,box-shadow] hover:border-[#E0E0E0] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] focus:outline-none focus-visible:border-brand-yellow focus-visible:shadow-[0_0_0_3px_#FFF1A6]`;

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

export default function TeamDetailPage({ team }: { team: TeamTile }) {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1080px] px-4 pb-[60px] pt-6">
        <Link
          href="/"
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
          Dashboard
        </Link>

        <h1 className="m-0 mb-1 text-[24px] font-bold leading-[1.15] tracking-[-0.5px] text-brand-charcoal">
          {team.name}
        </h1>
        <p className="m-0 mb-[26px] text-[13.5px] text-[#7A7575]">
          {team.description}
        </p>

        <h2 className="m-0 mb-3.5 flex items-center gap-[9px] text-[13px] font-bold uppercase tracking-[1px] text-brand-charcoal">
          Tools
          <span className="inline-flex h-[22px] min-w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand-yellow px-[7px] text-[12px] font-extrabold text-brand-charcoal">
            {team.subTiles.length}
          </span>
        </h2>

        <ul className="grid list-none grid-cols-1 gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {team.subTiles.map((tile) => (
            <li key={tile.name}>
              <ToolTile tile={tile} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
