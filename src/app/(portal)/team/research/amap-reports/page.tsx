'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Report = {
  id: string;
  name: string;
  modifiedTime: string;
  size: number;
  viewUrl: string;
};

function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanName(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/^Buyers Club_/, '')
    .replace(/ AMAP Report$/i, '')
    .trim();
}

export default function AmapReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/amap-reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReports(data.reports);
        } else {
          setError(data.error || 'Failed to load reports');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1080px] px-4 pb-[60px] pt-6">
        <Link
          href="/team/research"
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
          Research &amp; Data
        </Link>

        <h1 className="m-0 mb-1 text-[24px] font-bold leading-[1.15] tracking-[-0.5px] text-brand-charcoal">
          AMAP Reports
        </h1>
        <p className="m-0 mb-[26px] text-[13.5px] text-[#7A7575]">
          Research reports from the AMAP method analysis.
        </p>

        {loading && (
          <div className="rounded-[14px] border border-[#EDEDED] bg-white p-8 text-center text-[13px] text-[#7A7575]">
            Loading reports...
          </div>
        )}

        {error && (
          <div className="rounded-[14px] border border-red-200 bg-red-50 p-8 text-center text-[13px] text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="rounded-[14px] border border-[#EDEDED] bg-white p-8 text-center text-[13px] text-[#7A7575]">
            No reports found.
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <>
            <h2 className="m-0 mb-3.5 flex items-center gap-[9px] text-[13px] font-bold uppercase tracking-[1px] text-brand-charcoal">
              Reports
              <span className="inline-flex h-[22px] min-w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand-yellow px-[7px] text-[12px] font-extrabold text-brand-charcoal">
                {reports.length}
              </span>
            </h2>

            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <li key={report.id}>
                  <a
                    href={report.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col rounded-[14px] border border-[#EDEDED] bg-white px-5 py-[18px] no-underline shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-[border-color,box-shadow] hover:border-[#E0E0E0] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] focus:outline-none focus-visible:border-brand-yellow focus-visible:shadow-[0_0_0_3px_#FFF1A6]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="m-0 text-[14.5px] font-bold leading-snug tracking-[-0.2px] text-brand-charcoal">
                        {cleanName(report.name)}
                      </h3>
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
                    </div>
                    <div className="mt-auto flex items-center gap-3 text-[11.5px] text-[#9A9595]">
                      <span>{formatDate(report.modifiedTime)}</span>
                      {report.size > 0 && (
                        <>
                          <span className="text-[#E0E0E0]">·</span>
                          <span>{formatSize(report.size)}</span>
                        </>
                      )}
                      <span className="text-[#E0E0E0]">·</span>
                      <span>PDF</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
