'use client';

import { useEffect, useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface DealRecord {
  id: string;
  type: string;
  packager: string;
  sourcer: string;
  status: string;
  reviewDate: string;
  lastUpdate: string;
  packagerApproved: string;
  qaApproved: string;
  propertyAddress: string;
  asking: string;
  priceGroup: string;
  baMessage: string;
  acceptAcqTotal: string;
  config: string;
  currentRent: string;
  appraisedRent: string;
  lga: string;
  landSize: string;
  titleType: string;
  yearBuiltOrRegistration: string;
  sellingAgent: string;
  cashbackType: string;
  cashbackValue: string;
  closingBA: string;
  closingPrice: string;
  clientClosed: string;
  closingDate: string;
  sortKey: string;
  folderLink: string;
  pdfLink: string;
  portalLink: string;
  createdAt: string;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  monthLabel: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================================================
// HELPERS
// ============================================================================

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function parseRecordDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return null;
  // Try DD/MM/YYYY format first
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  // Try ISO or other parseable format
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function getDayOfWeekIndex(date: Date): number {
  // 0=Monday, 6=Sunday
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function isHLOrSingle(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('house') && t.includes('land') || t.includes('established') ||
    t.includes('h&l') || t.includes('single');
}

function getWeeksForRange(start: Date, end: Date): WeekData[] {
  const weeks: WeekData[] = [];
  let current = getMonday(start);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  while (current <= endDate) {
    const weekEnd = addDays(current, 6);
    weeks.push({
      weekStart: new Date(current),
      weekEnd,
      label: `${formatDate(current)} – ${formatDate(weekEnd)}`,
      monthLabel: getMonthLabel(current),
    });
    current = addDays(current, 7);
  }
  return weeks;
}

interface MonthData {
  monthKey: string; // e.g. '2026-07'
  label: string;    // e.g. 'July 2026'
  weekCount: number; // 4 or 5 depending on days in month
}

function getWeekOfMonth(date: Date): number {
  // Days 1-7 = week 0, 8-14 = week 1, 15-21 = week 2, 22-28 = week 3, 29-31 = week 4
  return Math.floor((date.getDate() - 1) / 7);
}

function getMonthsForRange(start: Date, end: Date): MonthData[] {
  const months: MonthData[] = [];
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  let current = new Date(startMonth);
  while (current <= endMonth) {
    const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    months.push({
      monthKey: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
      label: current.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
      weekCount: Math.ceil(daysInMonth / 7), // 4 or 5
    });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return months;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReportsPage() {
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range — default to last 4 weeks up to current week
  const [weeksToShow, setWeeksToShow] = useState(4);
  const [activeTab, setActiveTab] = useState<'packager' | 'team'>('packager');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'ytd'>('weekly');

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Reports — Deal Sheet';
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/deal-sheet?statuses=all');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setRecords(data.records || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute weeks
  const weeks = useMemo(() => {
    const now = new Date();
    const start = addDays(getMonday(now), -(weeksToShow - 1) * 7);
    return getWeeksForRange(start, now);
  }, [weeksToShow]);

  // Compute months (for monthly view)
  const months = useMemo(() => {
    const now = new Date();
    const start = addDays(getMonday(now), -(weeksToShow - 1) * 7);
    return getMonthsForRange(start, now);
  }, [weeksToShow]);

  // Get all unique packagers
  const packagers = useMemo(() => {
    const names = new Set<string>();
    records.forEach((r) => {
      if (r.packager && r.packager.trim()) names.add(r.packager.trim());
    });
    return Array.from(names).sort();
  }, [records]);

  // Monthly packager stats — per month, per packager, per week-of-month
  const monthlyPackagerStats = useMemo(() => {
    const stats: Record<string, Record<string, { hlSingle: number[]; other: number[] }>> = {};

    months.forEach((month) => {
      stats[month.monthKey] = {};
      packagers.forEach((name) => {
        stats[month.monthKey][name] = {
          hlSingle: new Array(month.weekCount).fill(0),
          other: new Array(month.weekCount).fill(0),
        };
      });
    });

    records.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.packager || !r.packager.trim()) return;
      const packager = r.packager.trim();
      const rMonth = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, '0')}`;

      if (!stats[rMonth] || !stats[rMonth][packager]) return;
      const wIdx = getWeekOfMonth(reviewDate);
      if (isHLOrSingle(r.type)) {
        stats[rMonth][packager].hlSingle[wIdx]++;
      } else {
        stats[rMonth][packager].other[wIdx]++;
      }
    });

    return stats;
  }, [records, months, packagers]);

  // YTD packager stats — one total per month, Jan to current month
  const ytdPackagerStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const monthLabels: string[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      monthLabels.push(new Date(year, m, 1).toLocaleDateString('en-AU', { month: 'short' }));
    }

    const stats: Record<string, number[]> = {};
    packagers.forEach((name) => {
      stats[name] = new Array(currentMonth + 1).fill(0);
    });

    records.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.packager || !r.packager.trim()) return;
      if (reviewDate.getFullYear() !== year) return;
      const m = reviewDate.getMonth();
      const packager = r.packager.trim();
      if (stats[packager]) {
        stats[packager][m]++;
      }
    });

    return { stats, monthLabels, year };
  }, [records, packagers]);

  // YTD team stats
  const ytdTeamStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthLabels: string[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      monthLabels.push(new Date(year, m, 1).toLocaleDateString('en-AU', { month: 'short' }));
    }

    const propertiesReviewed = new Array(currentMonth + 1).fill(0);
    const clientsClosed = new Array(currentMonth + 1).fill(0);
    const cashbackClosed = new Array(currentMonth + 1).fill(0);

    records.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (reviewDate && reviewDate.getFullYear() === year) {
        propertiesReviewed[reviewDate.getMonth()]++;
      }

      const closingDate = parseRecordDate(r.closingDate);
      if (closingDate && closingDate.getFullYear() === year && r.clientClosed && r.clientClosed.trim()) {
        clientsClosed[closingDate.getMonth()]++;
        if (r.cashbackType && r.cashbackType.trim() && r.cashbackType.toLowerCase() !== 'n/a') {
          cashbackClosed[closingDate.getMonth()]++;
        }
      }
    });

    return { propertiesReviewed, clientsClosed, cashbackClosed, monthLabels, year };
  }, [records]);

  // Monthly team stats
  const monthlyTeamStats = useMemo(() => {
    const stats: Record<string, { propertiesReviewed: number[]; clientsClosed: number[]; cashbackClosed: number[] }> = {};

    months.forEach((month) => {
      stats[month.monthKey] = {
        propertiesReviewed: new Array(month.weekCount).fill(0),
        clientsClosed: new Array(month.weekCount).fill(0),
        cashbackClosed: new Array(month.weekCount).fill(0),
      };
    });

    records.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (reviewDate) {
        const rMonth = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, '0')}`;
        if (stats[rMonth]) {
          stats[rMonth].propertiesReviewed[getWeekOfMonth(reviewDate)]++;
        }
      }

      const closingDate = parseRecordDate(r.closingDate);
      if (closingDate && r.clientClosed && r.clientClosed.trim()) {
        const cMonth = `${closingDate.getFullYear()}-${String(closingDate.getMonth() + 1).padStart(2, '0')}`;
        if (stats[cMonth]) {
          stats[cMonth].clientsClosed[getWeekOfMonth(closingDate)]++;
          if (r.cashbackType && r.cashbackType.trim() && r.cashbackType.toLowerCase() !== 'n/a') {
            stats[cMonth].cashbackClosed[getWeekOfMonth(closingDate)]++;
          }
        }
      }
    });

    return stats;
  }, [records, months]);

  // ============================================================================
  // REPORT 1: Weekly Packager Stats
  // ============================================================================

  const packagerStats = useMemo(() => {
    const stats: Record<string, Record<string, { hlSingle: number[]; other: number[] }>> = {};

    // Initialize structure for each week × packager
    weeks.forEach((week) => {
      const weekKey = week.weekStart.toISOString();
      stats[weekKey] = {};
      packagers.forEach((name) => {
        stats[weekKey][name] = {
          hlSingle: [0, 0, 0, 0, 0, 0, 0],
          other: [0, 0, 0, 0, 0, 0, 0],
        };
      });
    });

    // Count records by review date
    records.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.packager || !r.packager.trim()) return;

      const weekMonday = getMonday(reviewDate);
      const weekKey = weekMonday.toISOString();
      const packager = r.packager.trim();
      const dayIdx = getDayOfWeekIndex(reviewDate);

      if (stats[weekKey] && stats[weekKey][packager]) {
        if (isHLOrSingle(r.type)) {
          stats[weekKey][packager].hlSingle[dayIdx]++;
        } else {
          stats[weekKey][packager].other[dayIdx]++;
        }
      }
    });

    return stats;
  }, [records, weeks, packagers]);

  // ============================================================================
  // REPORT 2: Weekly Team Stats
  // ============================================================================

  const teamStats = useMemo(() => {
    const stats: Record<string, {
      propertiesReviewed: number[];
      clientsClosed: number[];
      cashbackClosed: number[];
    }> = {};

    weeks.forEach((week) => {
      stats[week.weekStart.toISOString()] = {
        propertiesReviewed: [0, 0, 0, 0, 0, 0, 0],
        clientsClosed: [0, 0, 0, 0, 0, 0, 0],
        cashbackClosed: [0, 0, 0, 0, 0, 0, 0],
      };
    });

    records.forEach((r) => {
      // Properties Reviewed — based on reviewDate
      const reviewDate = parseRecordDate(r.reviewDate);
      if (reviewDate) {
        const weekKey = getMonday(reviewDate).toISOString();
        const dayIdx = getDayOfWeekIndex(reviewDate);
        if (stats[weekKey]) {
          stats[weekKey].propertiesReviewed[dayIdx]++;
        }
      }

      // Clients Closed — based on closingDate
      const closingDate = parseRecordDate(r.closingDate);
      if (closingDate && r.clientClosed && r.clientClosed.trim()) {
        const weekKey = getMonday(closingDate).toISOString();
        const dayIdx = getDayOfWeekIndex(closingDate);
        if (stats[weekKey]) {
          stats[weekKey].clientsClosed[dayIdx]++;

          // Cashback subset
          if (r.cashbackType && r.cashbackType.trim() && r.cashbackType.toLowerCase() !== 'n/a') {
            stats[weekKey].cashbackClosed[dayIdx]++;
          }
        }
      }
    });

    return stats;
  }, [records, weeks]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-gray-400 text-sm">Loading report data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 bg-gray-950 min-h-screen max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <a href="/deal-sheet" className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">← Deal Sheet</a>
          <h1 className="text-lg font-semibold text-white">{period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Year to Date'} Reports</h1>
          <div className="flex items-center gap-1 bg-gray-900 rounded-md p-0.5">
            <button
              onClick={() => setActiveTab('packager')}
              className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                activeTab === 'packager' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Packager Stats
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                activeTab === 'team' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Team Stats
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-900 rounded-md p-0.5">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                period === 'weekly' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                period === 'monthly' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('ytd')}
              className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                period === 'ytd' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              YTD
            </button>
          </div>
          {period !== 'ytd' && (
            <>
              <label className="text-xs text-gray-400">Range:</label>
              <select
                value={weeksToShow}
                onChange={(e) => setWeeksToShow(parseInt(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5"
              >
                {[4, 8, 12, 16, 26, 52].map((n) => (
                  <option key={n} value={n}>
                    {n} weeks
                  </option>
                ))}
              </select>
            </>
          )}
          <span className="text-xs text-gray-500">{records.length} records loaded</span>
        </div>
      </div>

      {/* Report Content */}
      {activeTab === 'packager' && period === 'weekly' && (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekKey = week.weekStart.toISOString();
            const weekStats = packagerStats[weekKey];
            if (!weekStats) return null;

            return (
              <div key={weekKey} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                {/* Week header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-xs font-semibold text-white">
                    Weekly Packager Stats — {week.label}
                  </span>
                  <span className="text-xs text-gray-400">{week.monthLabel}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className="bg-gray-850">
                        <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Packager</th>
                        <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Metric</th>
                        {DAYS.map((day, i) => (
                          <th key={day} className="text-center px-1 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px] w-10">
                            <div>{DAY_SHORT[i]}</div>
                            <div className="text-[9px] text-gray-600">{formatDate(addDays(week.weekStart, i))}</div>
                          </th>
                        ))}
                        <th className="text-center px-1 py-1 text-yellow-400 font-bold border-b border-gray-800 text-[11px] w-10">Total</th>
                      </tr>
                    </thead>
                      {packagers.map((name, pIdx) => {
                        const pStats = weekStats[name];
                        if (!pStats) return null;
                        const hlTotal = sumArr(pStats.hlSingle);
                        const otherTotal = sumArr(pStats.other);
                        const grandTotal = hlTotal + otherTotal;

                        // Skip packagers with zero activity this week
                        if (grandTotal === 0) return null;

                        return (
                          <tbody key={name}>
                            {/* H&L / Single row */}
                            <tr className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'} hover:bg-gray-800`}>
                              <td className="px-2 py-1 text-white font-medium border-b border-gray-800 text-[11px]" rowSpan={3}>
                                {name}
                              </td>
                              <td className="px-2 py-1 text-gray-300 border-b border-gray-800 text-[11px]">
                                H&L / Single
                              </td>
                              {pStats.hlSingle.map((count, di) => (
                                <td key={di} className="text-center px-1 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                                  {count > 0 ? count : <span className="text-gray-700">–</span>}
                                </td>
                              ))}
                              <td className="text-center px-1 py-1 border-b border-gray-800 text-yellow-300 font-semibold text-[11px]">
                                {hlTotal > 0 ? hlTotal : <span className="text-gray-700">–</span>}
                              </td>
                            </tr>
                            {/* Other row */}
                            <tr className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'} hover:bg-gray-800`}>
                              <td className="px-2 py-1 text-gray-300 border-b border-gray-800 text-[11px]">
                                Other
                              </td>
                              {pStats.other.map((count, di) => (
                                <td key={di} className="text-center px-1 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                                  {count > 0 ? count : <span className="text-gray-700">–</span>}
                                </td>
                              ))}
                              <td className="text-center px-1 py-1 border-b border-gray-800 text-yellow-300 font-semibold text-[11px]">
                                {otherTotal > 0 ? otherTotal : <span className="text-gray-700">–</span>}
                              </td>
                            </tr>
                            {/* Total row */}
                            <tr className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}`}>
                              <td className="px-2 py-1 text-white font-semibold border-b-2 border-gray-700 text-[11px]">
                                TOTAL
                              </td>
                              {pStats.hlSingle.map((_, di) => {
                                const dayTotal = pStats.hlSingle[di] + pStats.other[di];
                                return (
                                  <td key={di} className="text-center px-1 py-1 border-b-2 border-gray-700 text-white font-semibold text-[11px]">
                                    {dayTotal > 0 ? dayTotal : <span className="text-gray-700">–</span>}
                                  </td>
                                );
                              })}
                              <td className="text-center px-1 py-1 border-b-2 border-gray-700 text-yellow-400 font-bold text-[11px]">
                                {grandTotal > 0 ? grandTotal : <span className="text-gray-700">–</span>}
                              </td>
                            </tr>
                          </tbody>
                        );
                      })}

                      {/* Week grand total row */}
                      <tbody>
                        <tr className="bg-gray-800">
                          <td className="px-2 py-1 text-yellow-400 font-bold text-[11px]" colSpan={2}>
                            Week Total
                          </td>
                          {DAYS.map((_, di) => {
                            const dayTotal = packagers.reduce((sum, name) => {
                              const pStats = weekStats[name];
                              return sum + (pStats ? pStats.hlSingle[di] + pStats.other[di] : 0);
                            }, 0);
                            return (
                              <td key={di} className="text-center px-1 py-1 text-yellow-400 font-bold text-[11px]">
                                {dayTotal > 0 ? dayTotal : <span className="text-gray-700">–</span>}
                              </td>
                            );
                          })}
                          <td className="text-center px-1 py-1 text-yellow-400 font-bold text-[11px]">
                            {packagers.reduce((sum, name) => {
                              const pStats = weekStats[name];
                              return sum + (pStats ? sumArr(pStats.hlSingle) + sumArr(pStats.other) : 0);
                            }, 0) || '–'}
                          </td>
                        </tr>
                      </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'team' && period === 'weekly' && (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekKey = week.weekStart.toISOString();
            const wStats = teamStats[weekKey];
            if (!wStats) return null;

            const rows = [
              { label: 'Properties Reviewed', data: wStats.propertiesReviewed, color: 'text-green-400' },
              { label: 'Clients Closed', data: wStats.clientsClosed, color: 'text-blue-400' },
              { label: 'Cash Back Deals Closed', data: wStats.cashbackClosed, color: 'text-purple-400' },
            ];

            return (
              <div key={weekKey} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-xs font-semibold text-white">
                    Weekly Team Stats — {week.label}
                  </span>
                  <span className="text-xs text-gray-400">{week.monthLabel}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Metric</th>
                        {DAYS.map((day, i) => (
                          <th key={day} className="text-center px-1 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px] w-10">
                            <div>{DAY_SHORT[i]}</div>
                            <div className="text-[9px] text-gray-600">{formatDate(addDays(week.weekStart, i))}</div>
                          </th>
                        ))}
                        <th className="text-center px-1 py-1 text-yellow-400 font-bold border-b border-gray-800 text-[11px] w-10">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const total = sumArr(row.data);
                        return (
                          <tr key={row.label} className="hover:bg-gray-800">
                            <td className={`px-2 py-1 font-medium border-b border-gray-800 text-[11px] ${row.color}`}>
                              {row.label}
                            </td>
                            {row.data.map((count, di) => (
                              <td key={di} className="text-center px-1 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                                {count > 0 ? count : <span className="text-gray-700">–</span>}
                              </td>
                            ))}
                            <td className="text-center px-1 py-1 border-b border-gray-800 text-yellow-300 font-bold text-[11px]">
                              {total > 0 ? total : <span className="text-gray-700">–</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== MONTHLY PACKAGER STATS ====== */}
      {activeTab === 'packager' && period === 'monthly' && (
        <div className="space-y-6">
          {months.map((month) => {
            const mStats = monthlyPackagerStats[month.monthKey];
            if (!mStats) return null;

            return (
              <div key={month.monthKey} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-xs font-semibold text-white">
                    Monthly Packager Stats — {month.label}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className="bg-gray-850">
                        <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Packager</th>
                        <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Metric</th>
                        {Array.from({ length: month.weekCount }, (_, i) => (
                          <th key={i} className="text-center px-1 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px] w-12">
                            <div>Wk {i + 1}</div>
                            <div className="text-[9px] text-gray-600">{i * 7 + 1}–{Math.min((i + 1) * 7, 31)}</div>
                          </th>
                        ))}
                        <th className="text-center px-1 py-1 text-yellow-400 font-bold border-b border-gray-800 text-[11px] w-10">Total</th>
                      </tr>
                    </thead>
                    {packagers.map((name, pIdx) => {
                      const pStats = mStats[name];
                      if (!pStats) return null;
                      const hlTotal = sumArr(pStats.hlSingle);
                      const otherTotal = sumArr(pStats.other);
                      const grandTotal = hlTotal + otherTotal;
                      if (grandTotal === 0) return null;

                      return (
                        <tbody key={name}>
                          <tr className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'} hover:bg-gray-800`}>
                            <td className="px-2 py-1 text-white font-medium border-b border-gray-800 text-[11px]" rowSpan={3}>{name}</td>
                            <td className="px-2 py-1 text-gray-300 border-b border-gray-800 text-[11px]">H&L / Single</td>
                            {pStats.hlSingle.map((count, wi) => (
                              <td key={wi} className="text-center px-1 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                                {count > 0 ? count : <span className="text-gray-700">–</span>}
                              </td>
                            ))}
                            <td className="text-center px-1 py-1 border-b border-gray-800 text-yellow-300 font-semibold text-[11px]">
                              {hlTotal > 0 ? hlTotal : <span className="text-gray-700">–</span>}
                            </td>
                          </tr>
                          <tr className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'} hover:bg-gray-800`}>
                            <td className="px-2 py-1 text-gray-300 border-b border-gray-800 text-[11px]">Other</td>
                            {pStats.other.map((count, wi) => (
                              <td key={wi} className="text-center px-1 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                                {count > 0 ? count : <span className="text-gray-700">–</span>}
                              </td>
                            ))}
                            <td className="text-center px-1 py-1 border-b border-gray-800 text-yellow-300 font-semibold text-[11px]">
                              {otherTotal > 0 ? otherTotal : <span className="text-gray-700">–</span>}
                            </td>
                          </tr>
                          <tr className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}`}>
                            <td className="px-2 py-1 text-white font-semibold border-b-2 border-gray-700 text-[11px]">TOTAL</td>
                            {pStats.hlSingle.map((_, wi) => {
                              const dayTotal = pStats.hlSingle[wi] + pStats.other[wi];
                              return (
                                <td key={wi} className="text-center px-1 py-1 border-b-2 border-gray-700 text-white font-semibold text-[11px]">
                                  {dayTotal > 0 ? dayTotal : <span className="text-gray-700">–</span>}
                                </td>
                              );
                            })}
                            <td className="text-center px-1 py-1 border-b-2 border-gray-700 text-yellow-400 font-bold text-[11px]">
                              {grandTotal > 0 ? grandTotal : <span className="text-gray-700">–</span>}
                            </td>
                          </tr>
                        </tbody>
                      );
                    })}
                    <tbody>
                      <tr className="bg-gray-800">
                        <td className="px-2 py-1 text-yellow-400 font-bold text-[11px]" colSpan={2}>Month Total</td>
                        {Array.from({ length: month.weekCount }, (_, wi) => {
                          const wTotal = packagers.reduce((sum, name) => {
                            const pStats = mStats[name];
                            return sum + (pStats ? pStats.hlSingle[wi] + pStats.other[wi] : 0);
                          }, 0);
                          return (
                            <td key={wi} className="text-center px-1 py-1 text-yellow-400 font-bold text-[11px]">
                              {wTotal > 0 ? wTotal : <span className="text-gray-700">–</span>}
                            </td>
                          );
                        })}
                        <td className="text-center px-1 py-1 text-yellow-400 font-bold text-[11px]">
                          {packagers.reduce((sum, name) => {
                            const pStats = mStats[name];
                            return sum + (pStats ? sumArr(pStats.hlSingle) + sumArr(pStats.other) : 0);
                          }, 0) || '–'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== MONTHLY TEAM STATS ====== */}
      {activeTab === 'team' && period === 'monthly' && (
        <div className="space-y-6">
          {months.map((month) => {
            const mStats = monthlyTeamStats[month.monthKey];
            if (!mStats) return null;

            const rows = [
              { label: 'Properties Reviewed', data: mStats.propertiesReviewed, color: 'text-green-400' },
              { label: 'Clients Closed', data: mStats.clientsClosed, color: 'text-blue-400' },
              { label: 'Cash Back Deals Closed', data: mStats.cashbackClosed, color: 'text-purple-400' },
            ];

            return (
              <div key={month.monthKey} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-xs font-semibold text-white">
                    Monthly Team Stats — {month.label}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Metric</th>
                        {Array.from({ length: month.weekCount }, (_, i) => (
                          <th key={i} className="text-center px-1 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px] w-12">
                            <div>Wk {i + 1}</div>
                            <div className="text-[9px] text-gray-600">{i * 7 + 1}–{Math.min((i + 1) * 7, 31)}</div>
                          </th>
                        ))}
                        <th className="text-center px-1 py-1 text-yellow-400 font-bold border-b border-gray-800 text-[11px] w-10">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const total = sumArr(row.data);
                        return (
                          <tr key={row.label} className="hover:bg-gray-800">
                            <td className={`px-2 py-1 font-medium border-b border-gray-800 text-[11px] ${row.color}`}>
                              {row.label}
                            </td>
                            {row.data.map((count, wi) => (
                              <td key={wi} className="text-center px-1 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                                {count > 0 ? count : <span className="text-gray-700">–</span>}
                              </td>
                            ))}
                            <td className="text-center px-1 py-1 border-b border-gray-800 text-yellow-300 font-bold text-[11px]">
                              {total > 0 ? total : <span className="text-gray-700">–</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== YTD PACKAGER STATS ====== */}
      {activeTab === 'packager' && period === 'ytd' && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs font-semibold text-white">
                Year to Date Packager Stats — {ytdPackagerStats.year}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className="bg-gray-850">
                    <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Packager</th>
                    {ytdPackagerStats.monthLabels.map((label, i) => (
                      <th key={i} className="text-center px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px] w-12">
                        {label}
                      </th>
                    ))}
                    <th className="text-center px-2 py-1 text-yellow-400 font-bold border-b border-gray-800 text-[11px] w-12">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {packagers.map((name, pIdx) => {
                    const data = ytdPackagerStats.stats[name];
                    if (!data) return null;
                    const total = sumArr(data);
                    if (total === 0) return null;
                    return (
                      <tr key={name} className={`${pIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'} hover:bg-gray-800`}>
                        <td className="px-2 py-1 text-white font-medium border-b border-gray-800 text-[11px]">{name}</td>
                        {data.map((count, mi) => (
                          <td key={mi} className="text-center px-2 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                            {count > 0 ? count : <span className="text-gray-700">–</span>}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1 border-b border-gray-800 text-yellow-300 font-bold text-[11px]">
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-800">
                    <td className="px-2 py-1 text-yellow-400 font-bold text-[11px]">Total</td>
                    {ytdPackagerStats.monthLabels.map((_, mi) => {
                      const mTotal = packagers.reduce((sum, name) => {
                        const data = ytdPackagerStats.stats[name];
                        return sum + (data ? data[mi] : 0);
                      }, 0);
                      return (
                        <td key={mi} className="text-center px-2 py-1 text-yellow-400 font-bold text-[11px]">
                          {mTotal > 0 ? mTotal : <span className="text-gray-700">–</span>}
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-1 text-yellow-400 font-bold text-[11px]">
                      {packagers.reduce((sum, name) => {
                        const data = ytdPackagerStats.stats[name];
                        return sum + (data ? sumArr(data) : 0);
                      }, 0) || '–'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====== YTD TEAM STATS ====== */}
      {activeTab === 'team' && period === 'ytd' && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs font-semibold text-white">
                Year to Date Team Stats — {ytdTeamStats.year}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px]">Metric</th>
                    {ytdTeamStats.monthLabels.map((label, i) => (
                      <th key={i} className="text-center px-2 py-1 text-gray-400 font-medium border-b border-gray-800 text-[11px] w-12">
                        {label}
                      </th>
                    ))}
                    <th className="text-center px-2 py-1 text-yellow-400 font-bold border-b border-gray-800 text-[11px] w-12">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Properties Reviewed', data: ytdTeamStats.propertiesReviewed, color: 'text-green-400' },
                    { label: 'Clients Closed', data: ytdTeamStats.clientsClosed, color: 'text-blue-400' },
                    { label: 'Cash Back Deals Closed', data: ytdTeamStats.cashbackClosed, color: 'text-purple-400' },
                  ].map((row) => {
                    const total = sumArr(row.data);
                    return (
                      <tr key={row.label} className="hover:bg-gray-800">
                        <td className={`px-2 py-1 font-medium border-b border-gray-800 text-[11px] ${row.color}`}>
                          {row.label}
                        </td>
                        {row.data.map((count, mi) => (
                          <td key={mi} className="text-center px-2 py-1 border-b border-gray-800 text-gray-300 text-[11px]">
                            {count > 0 ? count : <span className="text-gray-700">–</span>}
                          </td>
                        ))}
                        <td className="text-center px-2 py-1 border-b border-gray-800 text-yellow-300 font-bold text-[11px]">
                          {total > 0 ? total : <span className="text-gray-700">–</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
