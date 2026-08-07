'use client';

import { Fragment, useEffect, useState, useMemo } from 'react';

export const dynamic = 'force-dynamic';

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

type Theme = 'dark' | 'light';

export default function ReportsPage() {
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Theme (persisted to localStorage)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dealsheet-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });
  const setTheme = (t: Theme) => { setThemeState(t); localStorage.setItem('dealsheet-theme', t); };

  // Exclude test records toggle
  const [excludeTestRecords, setExcludeTestRecords] = useState(true);

  // Date range — default to last 4 weeks up to current week
  const [weeksToShow, setWeeksToShow] = useState(4);
  const [monthsToShow, setMonthsToShow] = useState(3);
  const [activeTab, setActiveTab] = useState<'packager' | 'sourcer' | 'team' | 'conversion' | 'operations' | 'heatmap'>('packager');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'ytd' | 'lifetime'>('weekly');

  // Conversion report controls
  const [conversionSort, setConversionSort] = useState<{ col: 'name' | 'won' | 'lost' | 'noInterest' | 'total' | 'pct'; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });
  const [hiddenPackagers, setHiddenPackagers] = useState<Set<string>>(new Set());
  const [hiddenSourcers, setHiddenSourcers] = useState<Set<string>>(new Set());
  const [showPkgFilter, setShowPkgFilter] = useState(false);
  const [showSrcFilter, setShowSrcFilter] = useState(false);
  const [statsOrder, setStatsOrder] = useState<'total' | 'alpha'>('total');
  const [opsGroupBy, setOpsGroupBy] = useState<'packager' | 'sourcer'>('packager');

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Reports — Deal Sheet';
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/deal-sheet?statuses=all&_t=${Date.now()}`, { cache: 'no-store' });
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

  // Filtered records (excludes test records when toggle is on)
  const filteredRecords = useMemo(() => {
    if (!excludeTestRecords) return records;
    return records.filter((r) => !r.status.startsWith('07'));
  }, [records, excludeTestRecords]);

  // Compute weeks
  const weeks = useMemo(() => {
    const now = new Date();
    const start = addDays(getMonday(now), -(weeksToShow - 1) * 7);
    return getWeeksForRange(start, now);
  }, [weeksToShow]);

  // Compute months (for monthly view)
  const months = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1), 1);
    return getMonthsForRange(start, now);
  }, [monthsToShow]);

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

    filteredRecords.forEach((r) => {
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
  }, [filteredRecords, months, packagers]);

  // Get all unique sourcers
  const sourcers = useMemo(() => {
    const names = new Set<string>();
    records.forEach((r) => {
      if (r.sourcer && r.sourcer.trim()) names.add(r.sourcer.trim());
    });
    return Array.from(names).sort();
  }, [records]);

  // Monthly sourcer stats — per month, per sourcer, per week-of-month
  const monthlySourcerStats = useMemo(() => {
    const stats: Record<string, Record<string, { hlSingle: number[]; other: number[] }>> = {};

    months.forEach((month) => {
      stats[month.monthKey] = {};
      sourcers.forEach((name) => {
        stats[month.monthKey][name] = {
          hlSingle: new Array(month.weekCount).fill(0),
          other: new Array(month.weekCount).fill(0),
        };
      });
    });

    filteredRecords.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.sourcer || !r.sourcer.trim()) return;
      const sourcer = r.sourcer.trim();
      const rMonth = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, '0')}`;

      if (!stats[rMonth] || !stats[rMonth][sourcer]) return;
      const wIdx = getWeekOfMonth(reviewDate);
      if (isHLOrSingle(r.type)) {
        stats[rMonth][sourcer].hlSingle[wIdx]++;
      } else {
        stats[rMonth][sourcer].other[wIdx]++;
      }
    });

    return stats;
  }, [filteredRecords, months, sourcers]);

  // YTD sourcer stats — one total per month, Jan to current month
  const ytdSourcerStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthLabels: string[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      monthLabels.push(new Date(year, m, 1).toLocaleDateString('en-AU', { month: 'short' }));
    }

    const stats: Record<string, number[]> = {};
    sourcers.forEach((name) => {
      stats[name] = new Array(currentMonth + 1).fill(0);
    });

    filteredRecords.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.sourcer || !r.sourcer.trim()) return;
      if (reviewDate.getFullYear() !== year) return;
      const m = reviewDate.getMonth();
      const sourcer = r.sourcer.trim();
      if (stats[sourcer]) {
        stats[sourcer][m]++;
      }
    });

    return { stats, monthLabels, year };
  }, [filteredRecords, sourcers]);

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

    filteredRecords.forEach((r) => {
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
  }, [filteredRecords, packagers]);

  // Lifetime packager stats — single total per person across all time
  const lifetimePackagerStats = useMemo(() => {
    const stats: Record<string, { hlSingle: number; other: number }> = {};
    packagers.forEach((name) => { stats[name] = { hlSingle: 0, other: 0 }; });

    filteredRecords.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.packager || !r.packager.trim()) return;
      const packager = r.packager.trim();
      if (!stats[packager]) return;
      if (isHLOrSingle(r.type)) stats[packager].hlSingle++;
      else stats[packager].other++;
    });

    return stats;
  }, [filteredRecords, packagers]);

  // Lifetime sourcer stats — single total per person across all time
  const lifetimeSourcerStats = useMemo(() => {
    const stats: Record<string, { hlSingle: number; other: number }> = {};
    sourcers.forEach((name) => { stats[name] = { hlSingle: 0, other: 0 }; });

    filteredRecords.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.sourcer || !r.sourcer.trim()) return;
      const sourcer = r.sourcer.trim();
      if (!stats[sourcer]) return;
      if (isHLOrSingle(r.type)) stats[sourcer].hlSingle++;
      else stats[sourcer].other++;
    });

    return stats;
  }, [filteredRecords, sourcers]);

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

    filteredRecords.forEach((r) => {
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
  }, [filteredRecords]);

  // Lifetime team stats
  const lifetimeTeamStats = useMemo(() => {
    let propertiesReviewed = 0;
    let clientsClosed = 0;
    let cashbackClosed = 0;

    filteredRecords.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (reviewDate) propertiesReviewed++;

      const closingDate = parseRecordDate(r.closingDate);
      if (closingDate && r.clientClosed && r.clientClosed.trim()) {
        clientsClosed++;
        if (r.cashbackType && r.cashbackType.trim() && r.cashbackType.toLowerCase() !== 'n/a') {
          cashbackClosed++;
        }
      }
    });

    return { propertiesReviewed, clientsClosed, cashbackClosed };
  }, [filteredRecords]);

  // Conversion stats helper — categorise records by outcome
  const nonTestRecords = useMemo(() => filteredRecords.filter((r) => !r.status.startsWith('07')), [filteredRecords]);

  function isWon(status: string): boolean {
    return status.startsWith('02') || status.startsWith('03');
  }
  function isRemovedLost(status: string): boolean {
    return status.startsWith('06');
  }
  function isRemovedNoInterest(status: string): boolean {
    return status.startsWith('05');
  }

  // Lifetime conversion stats
  const lifetimeConversion = useMemo(() => {
    const packagerMap: Record<string, { won: number; lost: number; noInterest: number }> = {};
    const sourcerMap: Record<string, { won: number; lost: number; noInterest: number }> = {};

    nonTestRecords.forEach((r) => {
      if (!isWon(r.status) && !isRemovedLost(r.status) && !isRemovedNoInterest(r.status)) return;

      // Packager
      const pkg = (r.packager || '').trim();
      if (pkg) {
        if (!packagerMap[pkg]) packagerMap[pkg] = { won: 0, lost: 0, noInterest: 0 };
        if (isWon(r.status)) packagerMap[pkg].won++;
        else if (isRemovedLost(r.status)) packagerMap[pkg].lost++;
        else if (isRemovedNoInterest(r.status)) packagerMap[pkg].noInterest++;
      }

      // Sourcer
      const src = (r.sourcer || '').trim();
      if (src) {
        if (!sourcerMap[src]) sourcerMap[src] = { won: 0, lost: 0, noInterest: 0 };
        if (isWon(r.status)) sourcerMap[src].won++;
        else if (isRemovedLost(r.status)) sourcerMap[src].lost++;
        else if (isRemovedNoInterest(r.status)) sourcerMap[src].noInterest++;
      }
    });

    return { packagerMap, sourcerMap };
  }, [nonTestRecords]);

  // YTD conversion stats
  const ytdConversion = useMemo(() => {
    const year = new Date().getFullYear();
    const packagerMap: Record<string, { won: number; lost: number; noInterest: number }> = {};
    const sourcerMap: Record<string, { won: number; lost: number; noInterest: number }> = {};

    nonTestRecords.forEach((r) => {
      if (!isWon(r.status) && !isRemovedLost(r.status) && !isRemovedNoInterest(r.status)) return;
      const d = parseRecordDate(r.reviewDate);
      if (!d || d.getFullYear() !== year) return;

      const pkg = (r.packager || '').trim();
      if (pkg) {
        if (!packagerMap[pkg]) packagerMap[pkg] = { won: 0, lost: 0, noInterest: 0 };
        if (isWon(r.status)) packagerMap[pkg].won++;
        else if (isRemovedLost(r.status)) packagerMap[pkg].lost++;
        else if (isRemovedNoInterest(r.status)) packagerMap[pkg].noInterest++;
      }

      const src = (r.sourcer || '').trim();
      if (src) {
        if (!sourcerMap[src]) sourcerMap[src] = { won: 0, lost: 0, noInterest: 0 };
        if (isWon(r.status)) sourcerMap[src].won++;
        else if (isRemovedLost(r.status)) sourcerMap[src].lost++;
        else if (isRemovedNoInterest(r.status)) sourcerMap[src].noInterest++;
      }
    });

    return { packagerMap, sourcerMap };
  }, [nonTestRecords]);

  // Monthly/weekly conversion stats
  const weeklyConversion = useMemo(() => {
    const result: Record<string, { packagerMap: Record<string, { won: number; lost: number; noInterest: number }>; sourcerMap: Record<string, { won: number; lost: number; noInterest: number }> }> = {};

    weeks.forEach((week) => {
      const key = week.weekStart.toISOString();
      result[key] = { packagerMap: {}, sourcerMap: {} };
    });

    nonTestRecords.forEach((r) => {
      if (!isWon(r.status) && !isRemovedLost(r.status) && !isRemovedNoInterest(r.status)) return;
      const d = parseRecordDate(r.reviewDate);
      if (!d) return;

      weeks.forEach((week) => {
        if (d >= week.weekStart && d <= week.weekEnd) {
          const key = week.weekStart.toISOString();
          const pkg = (r.packager || '').trim();
          if (pkg) {
            if (!result[key].packagerMap[pkg]) result[key].packagerMap[pkg] = { won: 0, lost: 0, noInterest: 0 };
            if (isWon(r.status)) result[key].packagerMap[pkg].won++;
            else if (isRemovedLost(r.status)) result[key].packagerMap[pkg].lost++;
            else if (isRemovedNoInterest(r.status)) result[key].packagerMap[pkg].noInterest++;
          }
          const src = (r.sourcer || '').trim();
          if (src) {
            if (!result[key].sourcerMap[src]) result[key].sourcerMap[src] = { won: 0, lost: 0, noInterest: 0 };
            if (isWon(r.status)) result[key].sourcerMap[src].won++;
            else if (isRemovedLost(r.status)) result[key].sourcerMap[src].lost++;
            else if (isRemovedNoInterest(r.status)) result[key].sourcerMap[src].noInterest++;
          }
        }
      });
    });

    return result;
  }, [nonTestRecords, weeks]);

  const monthlyConversion = useMemo(() => {
    const result: Record<string, { packagerMap: Record<string, { won: number; lost: number; noInterest: number }>; sourcerMap: Record<string, { won: number; lost: number; noInterest: number }> }> = {};

    months.forEach((month) => {
      result[month.monthKey] = { packagerMap: {}, sourcerMap: {} };
    });

    nonTestRecords.forEach((r) => {
      if (!isWon(r.status) && !isRemovedLost(r.status) && !isRemovedNoInterest(r.status)) return;
      const d = parseRecordDate(r.reviewDate);
      if (!d) return;
      const rMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!result[rMonth]) return;

      const pkg = (r.packager || '').trim();
      if (pkg) {
        if (!result[rMonth].packagerMap[pkg]) result[rMonth].packagerMap[pkg] = { won: 0, lost: 0, noInterest: 0 };
        if (isWon(r.status)) result[rMonth].packagerMap[pkg].won++;
        else if (isRemovedLost(r.status)) result[rMonth].packagerMap[pkg].lost++;
        else if (isRemovedNoInterest(r.status)) result[rMonth].packagerMap[pkg].noInterest++;
      }
      const src = (r.sourcer || '').trim();
      if (src) {
        if (!result[rMonth].sourcerMap[src]) result[rMonth].sourcerMap[src] = { won: 0, lost: 0, noInterest: 0 };
        if (isWon(r.status)) result[rMonth].sourcerMap[src].won++;
        else if (isRemovedLost(r.status)) result[rMonth].sourcerMap[src].lost++;
        else if (isRemovedNoInterest(r.status)) result[rMonth].sourcerMap[src].noInterest++;
      }
    });

    return result;
  }, [nonTestRecords, months]);

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

    filteredRecords.forEach((r) => {
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
  }, [filteredRecords, months]);

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
    filteredRecords.forEach((r) => {
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
  }, [filteredRecords, weeks, packagers]);

  // Weekly Sourcer Stats
  const sourcerStats = useMemo(() => {
    const stats: Record<string, Record<string, { hlSingle: number[]; other: number[] }>> = {};

    weeks.forEach((week) => {
      const weekKey = week.weekStart.toISOString();
      stats[weekKey] = {};
      sourcers.forEach((name) => {
        stats[weekKey][name] = {
          hlSingle: [0, 0, 0, 0, 0, 0, 0],
          other: [0, 0, 0, 0, 0, 0, 0],
        };
      });
    });

    filteredRecords.forEach((r) => {
      const reviewDate = parseRecordDate(r.reviewDate);
      if (!reviewDate || !r.sourcer || !r.sourcer.trim()) return;

      const weekMonday = getMonday(reviewDate);
      const weekKey = weekMonday.toISOString();
      const sourcer = r.sourcer.trim();
      const dayIdx = getDayOfWeekIndex(reviewDate);

      if (stats[weekKey] && stats[weekKey][sourcer]) {
        if (isHLOrSingle(r.type)) {
          stats[weekKey][sourcer].hlSingle[dayIdx]++;
        } else {
          stats[weekKey][sourcer].other[dayIdx]++;
        }
      }
    });

    return stats;
  }, [filteredRecords, weeks, sourcers]);

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

    filteredRecords.forEach((r) => {
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
  }, [filteredRecords, weeks]);

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

  const isDark = theme === 'dark';
  // Theme helpers for tables
  const tBg = isDark ? 'bg-gray-900' : 'bg-white';
  const tBorder = isDark ? 'border-gray-800' : 'border-gray-200';
  const tHeaderBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const tHeaderBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const tText = isDark ? 'text-white' : 'text-gray-900';
  const tTextMuted = isDark ? 'text-gray-300' : 'text-gray-700';
  const tTextDim = isDark ? 'text-gray-400' : 'text-gray-500';
  const tTextFaint = isDark ? 'text-gray-700' : 'text-gray-300';
  const tRowAlt = isDark ? 'bg-gray-800/50' : 'bg-gray-50';
  const tRowHover = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
  const tAccent = isDark ? 'text-yellow-300' : 'text-blue-600';
  const tAccentBold = isDark ? 'text-yellow-400' : 'text-blue-700';

  return (
    <div className={`p-4 min-h-screen max-w-5xl ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`flex items-center gap-4 mb-4 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg px-4 py-3`}>
        {/* Logo */}
        <img src="/logo.jpg" alt="Buyers Club" className="h-12 w-auto rounded" />

        {/* Report tabs (col 1) + Period (col 2) in a grid */}
        <div className={`grid gap-x-4 gap-y-0.5 ${activeTab === 'operations' || activeTab === 'heatmap' ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {([['packager', 'Packager Stats'], ['sourcer', 'Sourcer Stats'], ['team', 'Team Stats'], ['conversion', 'Conversion']] as const).map(([tab, label], i) => {
            const pKey = ['weekly', 'monthly', 'ytd', 'lifetime'][i] as 'weekly' | 'monthly' | 'ytd' | 'lifetime';
            const pLabel = ['Weekly', 'Monthly', 'YTD', 'Lifetime'][i];
            return (
              <Fragment key={tab}>
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-[11px] rounded font-medium transition-colors text-left ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
                {activeTab !== 'operations' && activeTab !== 'heatmap' && (
                  <button
                    onClick={() => setPeriod(pKey)}
                    className={`px-3 py-1 text-[11px] rounded font-medium transition-colors text-left ${
                      period === pKey
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {pLabel}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Range dropdown */}
        <div className="flex flex-col gap-1">
          {period === 'weekly' && activeTab !== 'operations' && activeTab !== 'heatmap' && (
            <select
              value={weeksToShow}
              onChange={(e) => setWeeksToShow(parseInt(e.target.value))}
              className={`text-xs rounded px-2 py-1.5 border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {[4, 8, 12, 16, 26, 52].map((n) => (
                <option key={n} value={n}>{n} weeks</option>
              ))}
            </select>
          )}
          {period === 'monthly' && activeTab !== 'operations' && activeTab !== 'heatmap' && (
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(parseInt(e.target.value))}
              className={`text-xs rounded px-2 py-1.5 border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {[3, 6, 9, 12].map((n) => (
                <option key={n} value={n}>{n} months</option>
              ))}
            </select>
          )}
        </div>

        {/* Housekeeping / Heatmap — separate section */}
        <div className={`flex flex-col gap-0.5 border-l pl-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {([['operations', 'Housekeeping'], ['heatmap', 'Heatmap']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[11px] rounded font-medium transition-colors text-left ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Exclude test records toggle */}
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeTestRecords}
            onChange={() => setExcludeTestRecords(!excludeTestRecords)}
            className="w-3 h-3"
          />
          <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Excl. Test</span>
        </label>

        {/* Records count */}
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{filteredRecords.length} records</span>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`text-[11px] px-3 py-1 rounded font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:text-gray-900'}`}
        >
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Sort/filter toolbar for packager/sourcer */}
      {(activeTab === 'packager' || activeTab === 'sourcer') && (
        <div className={`flex items-center gap-2 mb-3 px-2`}>
          <button
            onClick={() => setStatsOrder((prev) => prev === 'total' ? 'alpha' : 'total')}
            className={`text-[10px] px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:text-gray-900'}`}
          >
            {statsOrder === 'total' ? '# Total ▼' : 'A–Z ▼'}
          </button>
          {(() => {
            const names = activeTab === 'packager' ? packagers : sourcers;
            const hidden = activeTab === 'packager' ? hiddenPackagers : hiddenSourcers;
            const setHidden = activeTab === 'packager' ? setHiddenPackagers : setHiddenSourcers;
            const showFilter = activeTab === 'packager' ? showPkgFilter : showSrcFilter;
            const setShowFilter = activeTab === 'packager' ? setShowPkgFilter : setShowSrcFilter;
            return (
              <div className="relative">
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={`text-[10px] px-2 py-1 rounded ${hidden.size > 0 ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:text-gray-900'}`}
                >
                  {hidden.size > 0 ? `${hidden.size} hidden` : 'Filter names'}
                </button>
                {showFilter && (
                  <div className={`absolute left-0 top-full mt-1 w-48 max-h-64 overflow-y-auto rounded shadow-lg z-50 p-1 border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={`flex gap-2 px-1 mb-1 border-b pb-1 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <button onClick={() => setHidden(new Set())} className="text-[9px] text-blue-400 hover:underline">Show All</button>
                      <button onClick={() => setHidden(new Set(names))} className="text-[9px] text-red-400 hover:underline">Hide All</button>
                    </div>
                    {names.map((name) => (
                      <label key={name} className={`flex items-center gap-1 px-1 py-0.5 text-[10px] cursor-pointer rounded ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                        <input
                          type="checkbox"
                          checked={!hidden.has(name)}
                          onChange={() => {
                            const next = new Set(hidden);
                            if (next.has(name)) next.delete(name); else next.add(name);
                            setHidden(next);
                          }}
                          className="w-2.5 h-2.5"
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Note about date bucketing */}
      {activeTab === 'conversion' && period !== 'lifetime' && (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} border rounded px-3 py-2 mb-4`}>
          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Note: Records are bucketed by their Review Date (date submitted), not the date they moved to their current status.</span>
        </div>
      )}

      {/* Note for housekeeping */}
      {activeTab === 'operations' && (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} border rounded px-3 py-2 mb-4`}>
          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Note: Only showing records in the status of Available (01).</span>
        </div>
      )}

      {/* Report Content */}
      {activeTab === 'packager' && period === 'weekly' && (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekKey = week.weekStart.toISOString();
            const weekStats = packagerStats[weekKey];
            if (!weekStats) return null;

            return (
              <div key={weekKey} className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                {/* Week header */}
                <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                  <span className={`text-xs font-semibold ${tText}`}>
                    Weekly Packager Stats — {week.label}
                  </span>
                  <span className={`text-xs ${tTextDim}`}>{week.monthLabel}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className={tRowAlt}>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Packager</th>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                        {DAYS.map((day, i) => (
                          <th key={day} className={`text-center px-1 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-10`}>
                            <div>{DAY_SHORT[i]}</div>
                            <div className={`text-[9px] ${tTextFaint}`}>{formatDate(addDays(week.weekStart, i))}</div>
                          </th>
                        ))}
                        <th className={`text-center px-1 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-10`}>Total</th>
                      </tr>
                    </thead>
                      {packagers.filter((n) => !hiddenPackagers.has(n)).sort((a, b) => {
                        if (statsOrder === 'alpha') return a.localeCompare(b);
                        const aTotal = weekStats[a] ? sumArr(weekStats[a].hlSingle) + sumArr(weekStats[a].other) : 0;
                        const bTotal = weekStats[b] ? sumArr(weekStats[b].hlSingle) + sumArr(weekStats[b].other) : 0;
                        return bTotal - aTotal;
                      }).map((name, pIdx) => {
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
                            <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                              <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`} rowSpan={3}>
                                {name}
                              </td>
                              <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>
                                H&L / Single
                              </td>
                              {pStats.hlSingle.map((count, di) => (
                                <td key={di} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                  {count > 0 ? count : <span className={tTextFaint}>–</span>}
                                </td>
                              ))}
                              <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                                {hlTotal > 0 ? hlTotal : <span className={tTextFaint}>–</span>}
                              </td>
                            </tr>
                            {/* Other row */}
                            <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                              <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>
                                Other
                              </td>
                              {pStats.other.map((count, di) => (
                                <td key={di} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                  {count > 0 ? count : <span className={tTextFaint}>–</span>}
                                </td>
                              ))}
                              <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                                {otherTotal > 0 ? otherTotal : <span className={tTextFaint}>–</span>}
                              </td>
                            </tr>
                            {/* Total row */}
                            <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt}`}>
                              <td className={`px-2 py-1 ${tText} font-semibold border-b-2 ${tHeaderBorder} text-[11px]`}>
                                TOTAL
                              </td>
                              {pStats.hlSingle.map((_, di) => {
                                const dayTotal = pStats.hlSingle[di] + pStats.other[di];
                                return (
                                  <td key={di} className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tText} font-semibold text-[11px]`}>
                                    {dayTotal > 0 ? dayTotal : <span className={tTextFaint}>–</span>}
                                  </td>
                                );
                              })}
                              <td className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tAccentBold} font-bold text-[11px]`}>
                                {grandTotal > 0 ? grandTotal : <span className={tTextFaint}>–</span>}
                              </td>
                            </tr>
                          </tbody>
                        );
                      })}

                      {/* Week grand total row */}
                      <tbody>
                        <tr className={tHeaderBg}>
                          <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`} colSpan={2}>
                            Week Total
                          </td>
                          {DAYS.map((_, di) => {
                            const dayTotal = packagers.reduce((sum, name) => {
                              const pStats = weekStats[name];
                              return sum + (pStats ? pStats.hlSingle[di] + pStats.other[di] : 0);
                            }, 0);
                            return (
                              <td key={di} className={`text-center px-1 py-1 ${tAccentBold} font-bold text-[11px]`}>
                                {dayTotal > 0 ? dayTotal : <span className={tTextFaint}>–</span>}
                              </td>
                            );
                          })}
                          <td className={`text-center px-1 py-1 ${tAccentBold} font-bold text-[11px]`}>
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
              <div key={weekKey} className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                  <span className={`text-xs font-semibold ${tText}`}>
                    Weekly Team Stats — {week.label}
                  </span>
                  <span className={`text-xs ${tTextDim}`}>{week.monthLabel}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                        {DAYS.map((day, i) => (
                          <th key={day} className={`text-center px-1 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-10`}>
                            <div>{DAY_SHORT[i]}</div>
                            <div className={`text-[9px] ${tTextFaint}`}>{formatDate(addDays(week.weekStart, i))}</div>
                          </th>
                        ))}
                        <th className={`text-center px-1 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-10`}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const total = sumArr(row.data);
                        return (
                          <tr key={row.label} className={tRowHover}>
                            <td className={`px-2 py-1 font-medium border-b ${tBorder} text-[11px] ${row.color}`}>
                              {row.label}
                            </td>
                            {row.data.map((count, di) => (
                              <td key={di} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                {count > 0 ? count : <span className={tTextFaint}>–</span>}
                              </td>
                            ))}
                            <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-bold text-[11px]`}>
                              {total > 0 ? total : <span className={tTextFaint}>–</span>}
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
              <div key={month.monthKey} className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                  <span className={`text-xs font-semibold ${tText}`}>
                    Monthly Packager Stats — {month.label}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className={tRowAlt}>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Packager</th>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                        {Array.from({ length: month.weekCount }, (_, i) => (
                          <th key={i} className={`text-center px-1 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-12`}>
                            <div>Wk {i + 1}</div>
                            <div className={`text-[9px] ${tTextFaint}`}>{i * 7 + 1}–{Math.min((i + 1) * 7, 31)}</div>
                          </th>
                        ))}
                        <th className={`text-center px-1 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-10`}>Total</th>
                      </tr>
                    </thead>
                    {packagers.filter((n) => !hiddenPackagers.has(n)).sort((a, b) => {
                      if (statsOrder === 'alpha') return a.localeCompare(b);
                      const aS = mStats[a]; const bS = mStats[b];
                      const aT = aS ? sumArr(aS.hlSingle) + sumArr(aS.other) : 0;
                      const bT = bS ? sumArr(bS.hlSingle) + sumArr(bS.other) : 0;
                      return bT - aT;
                    }).map((name, pIdx) => {
                      const pStats = mStats[name];
                      if (!pStats) return null;
                      const hlTotal = sumArr(pStats.hlSingle);
                      const otherTotal = sumArr(pStats.other);
                      const grandTotal = hlTotal + otherTotal;
                      if (grandTotal === 0) return null;

                      return (
                        <tbody key={name}>
                          <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                            <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`} rowSpan={3}>{name}</td>
                            <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>H&L / Single</td>
                            {pStats.hlSingle.map((count, wi) => (
                              <td key={wi} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                {count > 0 ? count : <span className={tTextFaint}>–</span>}
                              </td>
                            ))}
                            <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                              {hlTotal > 0 ? hlTotal : <span className={tTextFaint}>–</span>}
                            </td>
                          </tr>
                          <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                            <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>Other</td>
                            {pStats.other.map((count, wi) => (
                              <td key={wi} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                {count > 0 ? count : <span className={tTextFaint}>–</span>}
                              </td>
                            ))}
                            <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                              {otherTotal > 0 ? otherTotal : <span className={tTextFaint}>–</span>}
                            </td>
                          </tr>
                          <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt}`}>
                            <td className={`px-2 py-1 ${tText} font-semibold border-b-2 ${tHeaderBorder} text-[11px]`}>TOTAL</td>
                            {pStats.hlSingle.map((_, wi) => {
                              const dayTotal = pStats.hlSingle[wi] + pStats.other[wi];
                              return (
                                <td key={wi} className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tText} font-semibold text-[11px]`}>
                                  {dayTotal > 0 ? dayTotal : <span className={tTextFaint}>–</span>}
                                </td>
                              );
                            })}
                            <td className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tAccentBold} font-bold text-[11px]`}>
                              {grandTotal > 0 ? grandTotal : <span className={tTextFaint}>–</span>}
                            </td>
                          </tr>
                        </tbody>
                      );
                    })}
                    <tbody>
                      <tr className={tHeaderBg}>
                        <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`} colSpan={2}>Month Total</td>
                        {Array.from({ length: month.weekCount }, (_, wi) => {
                          const wTotal = packagers.reduce((sum, name) => {
                            const pStats = mStats[name];
                            return sum + (pStats ? pStats.hlSingle[wi] + pStats.other[wi] : 0);
                          }, 0);
                          return (
                            <td key={wi} className={`text-center px-1 py-1 ${tAccentBold} font-bold text-[11px]`}>
                              {wTotal > 0 ? wTotal : <span className={tTextFaint}>–</span>}
                            </td>
                          );
                        })}
                        <td className={`text-center px-1 py-1 ${tAccentBold} font-bold text-[11px]`}>
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
              <div key={month.monthKey} className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                  <span className={`text-xs font-semibold ${tText}`}>
                    Monthly Team Stats — {month.label}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                        {Array.from({ length: month.weekCount }, (_, i) => (
                          <th key={i} className={`text-center px-1 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-12`}>
                            <div>Wk {i + 1}</div>
                            <div className={`text-[9px] ${tTextFaint}`}>{i * 7 + 1}–{Math.min((i + 1) * 7, 31)}</div>
                          </th>
                        ))}
                        <th className={`text-center px-1 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-10`}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const total = sumArr(row.data);
                        return (
                          <tr key={row.label} className={tRowHover}>
                            <td className={`px-2 py-1 font-medium border-b ${tBorder} text-[11px] ${row.color}`}>
                              {row.label}
                            </td>
                            {row.data.map((count, wi) => (
                              <td key={wi} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                {count > 0 ? count : <span className={tTextFaint}>–</span>}
                              </td>
                            ))}
                            <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-bold text-[11px]`}>
                              {total > 0 ? total : <span className={tTextFaint}>–</span>}
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
          <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
              <span className={`text-xs font-semibold ${tText}`}>
                Year to Date Packager Stats — {ytdPackagerStats.year}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className={tRowAlt}>
                    <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Packager</th>
                    {ytdPackagerStats.monthLabels.map((label, i) => (
                      <th key={i} className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-12`}>
                        {label}
                      </th>
                    ))}
                    <th className={`text-center px-2 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-12`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {packagers.filter((n) => !hiddenPackagers.has(n)).sort((a, b) => {
                    if (statsOrder === 'alpha') return a.localeCompare(b);
                    const aT = ytdPackagerStats.stats[a] ? sumArr(ytdPackagerStats.stats[a]) : 0;
                    const bT = ytdPackagerStats.stats[b] ? sumArr(ytdPackagerStats.stats[b]) : 0;
                    return bT - aT;
                  }).map((name, pIdx) => {
                    const data = ytdPackagerStats.stats[name];
                    if (!data) return null;
                    const total = sumArr(data);
                    if (total === 0) return null;
                    return (
                      <tr key={name} className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                        <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`}>{name}</td>
                        {data.map((count, mi) => (
                          <td key={mi} className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                            {count > 0 ? count : <span className={tTextFaint}>–</span>}
                          </td>
                        ))}
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tAccent} font-bold text-[11px]`}>
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={tHeaderBg}>
                    <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>Total</td>
                    {ytdPackagerStats.monthLabels.map((_, mi) => {
                      const mTotal = packagers.reduce((sum, name) => {
                        const data = ytdPackagerStats.stats[name];
                        return sum + (data ? data[mi] : 0);
                      }, 0);
                      return (
                        <td key={mi} className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                          {mTotal > 0 ? mTotal : <span className={tTextFaint}>–</span>}
                        </td>
                      );
                    })}
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
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

      {/* ====== WEEKLY SOURCER STATS ====== */}
      {activeTab === 'sourcer' && period === 'weekly' && (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekKey = week.weekStart.toISOString();
            const weekStats = sourcerStats[weekKey];
            if (!weekStats) return null;

            return (
              <div key={weekKey} className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                  <span className={`text-xs font-semibold ${tText}`}>
                    Weekly Sourcer Stats — {week.label}
                  </span>
                  <span className={`text-xs ${tTextDim}`}>{week.monthLabel}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className={tRowAlt}>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Sourcer</th>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                        {DAYS.map((day, i) => (
                          <th key={day} className={`text-center px-1 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-10`}>
                            <div>{DAY_SHORT[i]}</div>
                            <div className={`text-[9px] ${tTextFaint}`}>{formatDate(addDays(week.weekStart, i))}</div>
                          </th>
                        ))}
                        <th className={`text-center px-1 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-10`}>Total</th>
                      </tr>
                    </thead>
                      {sourcers.filter((n) => !hiddenSourcers.has(n)).sort((a, b) => {
                        if (statsOrder === 'alpha') return a.localeCompare(b);
                        const aTotal = weekStats[a] ? sumArr(weekStats[a].hlSingle) + sumArr(weekStats[a].other) : 0;
                        const bTotal = weekStats[b] ? sumArr(weekStats[b].hlSingle) + sumArr(weekStats[b].other) : 0;
                        return bTotal - aTotal;
                      }).map((name, pIdx) => {
                        const pStats = weekStats[name];
                        if (!pStats) return null;
                        const hlTotal = sumArr(pStats.hlSingle);
                        const otherTotal = sumArr(pStats.other);
                        const grandTotal = hlTotal + otherTotal;

                        if (grandTotal === 0) return null;

                        return (
                          <tbody key={name}>
                            <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                              <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`} rowSpan={3}>
                                {name}
                              </td>
                              <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>
                                H&L / Single
                              </td>
                              {pStats.hlSingle.map((count, di) => (
                                <td key={di} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                  {count > 0 ? count : <span className={tTextFaint}>–</span>}
                                </td>
                              ))}
                              <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                                {hlTotal > 0 ? hlTotal : <span className={tTextFaint}>–</span>}
                              </td>
                            </tr>
                            <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                              <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>
                                Other
                              </td>
                              {pStats.other.map((count, di) => (
                                <td key={di} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                  {count > 0 ? count : <span className={tTextFaint}>–</span>}
                                </td>
                              ))}
                              <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                                {otherTotal > 0 ? otherTotal : <span className={tTextFaint}>–</span>}
                              </td>
                            </tr>
                            <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt}`}>
                              <td className={`px-2 py-1 ${tText} font-semibold border-b-2 ${tHeaderBorder} text-[11px]`}>
                                TOTAL
                              </td>
                              {pStats.hlSingle.map((_, di) => {
                                const dayTotal = pStats.hlSingle[di] + pStats.other[di];
                                return (
                                  <td key={di} className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tText} font-semibold text-[11px]`}>
                                    {dayTotal > 0 ? dayTotal : <span className={tTextFaint}>–</span>}
                                  </td>
                                );
                              })}
                              <td className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tAccentBold} font-bold text-[11px]`}>
                                {grandTotal}
                              </td>
                            </tr>
                          </tbody>
                        );
                      })}
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== MONTHLY SOURCER STATS ====== */}
      {activeTab === 'sourcer' && period === 'monthly' && (
        <div className="space-y-6">
          {months.map((month) => {
            const mStats = monthlySourcerStats[month.monthKey];
            if (!mStats) return null;

            return (
              <div key={month.monthKey} className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                  <span className={`text-xs font-semibold ${tText}`}>
                    Monthly Sourcer Stats — {month.label}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className={tRowAlt}>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Sourcer</th>
                        <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                        {Array.from({ length: month.weekCount }, (_, i) => (
                          <th key={i} className={`text-center px-1 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-12`}>
                            <div>Wk {i + 1}</div>
                            <div className={`text-[9px] ${tTextFaint}`}>{i * 7 + 1}–{Math.min((i + 1) * 7, 31)}</div>
                          </th>
                        ))}
                        <th className={`text-center px-1 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-10`}>Total</th>
                      </tr>
                    </thead>
                    {sourcers.filter((n) => !hiddenSourcers.has(n)).sort((a, b) => {
                      if (statsOrder === 'alpha') return a.localeCompare(b);
                      const aS = mStats[a]; const bS = mStats[b];
                      const aT = aS ? sumArr(aS.hlSingle) + sumArr(aS.other) : 0;
                      const bT = bS ? sumArr(bS.hlSingle) + sumArr(bS.other) : 0;
                      return bT - aT;
                    }).map((name, pIdx) => {
                      const pStats = mStats[name];
                      if (!pStats) return null;
                      const hlTotal = sumArr(pStats.hlSingle);
                      const otherTotal = sumArr(pStats.other);
                      const grandTotal = hlTotal + otherTotal;

                      if (grandTotal === 0) return null;

                      return (
                        <tbody key={name}>
                          <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                            <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`} rowSpan={3}>
                              {name}
                            </td>
                            <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>
                              H&L / Single
                            </td>
                            {pStats.hlSingle.map((count, wi) => (
                              <td key={wi} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                {count > 0 ? count : <span className={tTextFaint}>–</span>}
                              </td>
                            ))}
                            <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                              {hlTotal > 0 ? hlTotal : <span className={tTextFaint}>–</span>}
                            </td>
                          </tr>
                          <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                            <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>
                              Other
                            </td>
                            {pStats.other.map((count, wi) => (
                              <td key={wi} className={`text-center px-1 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                                {count > 0 ? count : <span className={tTextFaint}>–</span>}
                              </td>
                            ))}
                            <td className={`text-center px-1 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>
                              {otherTotal > 0 ? otherTotal : <span className={tTextFaint}>–</span>}
                            </td>
                          </tr>
                          <tr className={`${pIdx % 2 === 0 ? tBg : tRowAlt}`}>
                            <td className={`px-2 py-1 ${tText} font-semibold border-b-2 ${tHeaderBorder} text-[11px]`}>
                              TOTAL
                            </td>
                            {pStats.hlSingle.map((_, wi) => {
                              const wTotal = pStats.hlSingle[wi] + pStats.other[wi];
                              return (
                                <td key={wi} className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tText} font-semibold text-[11px]`}>
                                  {wTotal > 0 ? wTotal : <span className={tTextFaint}>–</span>}
                                </td>
                              );
                            })}
                            <td className={`text-center px-1 py-1 border-b-2 ${tHeaderBorder} ${tAccentBold} font-bold text-[11px]`}>
                              {grandTotal}
                            </td>
                          </tr>
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== YTD SOURCER STATS ====== */}
      {activeTab === 'sourcer' && period === 'ytd' && (
        <div className="space-y-6">
          <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
              <span className={`text-xs font-semibold ${tText}`}>
                Year to Date Sourcer Stats — {ytdSourcerStats.year}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className={tRowAlt}>
                    <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Sourcer</th>
                    {ytdSourcerStats.monthLabels.map((label, i) => (
                      <th key={i} className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-12`}>
                        {label}
                      </th>
                    ))}
                    <th className={`text-center px-2 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-12`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcers.filter((n) => !hiddenSourcers.has(n)).sort((a, b) => {
                    if (statsOrder === 'alpha') return a.localeCompare(b);
                    const aT = ytdSourcerStats.stats[a] ? sumArr(ytdSourcerStats.stats[a]) : 0;
                    const bT = ytdSourcerStats.stats[b] ? sumArr(ytdSourcerStats.stats[b]) : 0;
                    return bT - aT;
                  }).map((name, pIdx) => {
                    const data = ytdSourcerStats.stats[name];
                    if (!data) return null;
                    const total = sumArr(data);
                    if (total === 0) return null;
                    return (
                      <tr key={name} className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                        <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`}>{name}</td>
                        {data.map((count, mi) => (
                          <td key={mi} className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                            {count > 0 ? count : <span className={tTextFaint}>–</span>}
                          </td>
                        ))}
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>{total}</td>
                      </tr>
                    );
                  })}
                  <tr className={tHeaderBg}>
                    <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>Total</td>
                    {ytdSourcerStats.monthLabels.map((_, mi) => {
                      const mTotal = sourcers.reduce((sum, name) => {
                        const data = ytdSourcerStats.stats[name];
                        return sum + (data ? data[mi] : 0);
                      }, 0);
                      return (
                        <td key={mi} className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                          {mTotal > 0 ? mTotal : <span className={tTextFaint}>–</span>}
                        </td>
                      );
                    })}
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {sourcers.reduce((sum, name) => {
                        const data = ytdSourcerStats.stats[name];
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

      {/* ====== LIFETIME PACKAGER STATS ====== */}
      {activeTab === 'packager' && period === 'lifetime' && (
        <div className="space-y-6">
          <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
              <span className={`text-xs font-semibold ${tText}`}>Lifetime Packager Stats</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className={tRowAlt}>
                    <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Packager</th>
                    <th className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-16`}>H&L / Single</th>
                    <th className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-14`}>Other</th>
                    <th className={`text-center px-2 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-14`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {packagers.filter((n) => !hiddenPackagers.has(n)).sort((a, b) => {
                    if (statsOrder === 'alpha') return a.localeCompare(b);
                    const aT = lifetimePackagerStats[a] ? lifetimePackagerStats[a].hlSingle + lifetimePackagerStats[a].other : 0;
                    const bT = lifetimePackagerStats[b] ? lifetimePackagerStats[b].hlSingle + lifetimePackagerStats[b].other : 0;
                    return bT - aT;
                  }).map((name, pIdx) => {
                    const s = lifetimePackagerStats[name];
                    if (!s) return null;
                    const total = s.hlSingle + s.other;
                    if (total === 0) return null;
                    return (
                      <tr key={name} className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                        <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`}>{name}</td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                          {s.hlSingle > 0 ? s.hlSingle : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                          {s.other > 0 ? s.other : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>{total}</td>
                      </tr>
                    );
                  })}
                  <tr className={tHeaderBg}>
                    <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>Total</td>
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {packagers.reduce((sum, n) => sum + (lifetimePackagerStats[n]?.hlSingle || 0), 0) || '–'}
                    </td>
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {packagers.reduce((sum, n) => sum + (lifetimePackagerStats[n]?.other || 0), 0) || '–'}
                    </td>
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {packagers.reduce((sum, n) => sum + (lifetimePackagerStats[n]?.hlSingle || 0) + (lifetimePackagerStats[n]?.other || 0), 0) || '–'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====== LIFETIME SOURCER STATS ====== */}
      {activeTab === 'sourcer' && period === 'lifetime' && (
        <div className="space-y-6">
          <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
              <span className={`text-xs font-semibold ${tText}`}>Lifetime Sourcer Stats</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className={tRowAlt}>
                    <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Sourcer</th>
                    <th className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-16`}>H&L / Single</th>
                    <th className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-14`}>Other</th>
                    <th className={`text-center px-2 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-14`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcers.filter((n) => !hiddenSourcers.has(n)).sort((a, b) => {
                    if (statsOrder === 'alpha') return a.localeCompare(b);
                    const aT = lifetimeSourcerStats[a] ? lifetimeSourcerStats[a].hlSingle + lifetimeSourcerStats[a].other : 0;
                    const bT = lifetimeSourcerStats[b] ? lifetimeSourcerStats[b].hlSingle + lifetimeSourcerStats[b].other : 0;
                    return bT - aT;
                  }).map((name, pIdx) => {
                    const s = lifetimeSourcerStats[name];
                    if (!s) return null;
                    const total = s.hlSingle + s.other;
                    if (total === 0) return null;
                    return (
                      <tr key={name} className={`${pIdx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                        <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`}>{name}</td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                          {s.hlSingle > 0 ? s.hlSingle : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                          {s.other > 0 ? s.other : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tAccent} font-semibold text-[11px]`}>{total}</td>
                      </tr>
                    );
                  })}
                  <tr className={tHeaderBg}>
                    <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>Total</td>
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {sourcers.reduce((sum, n) => sum + (lifetimeSourcerStats[n]?.hlSingle || 0), 0) || '–'}
                    </td>
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {sourcers.reduce((sum, n) => sum + (lifetimeSourcerStats[n]?.other || 0), 0) || '–'}
                    </td>
                    <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                      {sourcers.reduce((sum, n) => sum + (lifetimeSourcerStats[n]?.hlSingle || 0) + (lifetimeSourcerStats[n]?.other || 0), 0) || '–'}
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
          <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
              <span className={`text-xs font-semibold ${tText}`}>
                Year to Date Team Stats — {ytdTeamStats.year}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                    {ytdTeamStats.monthLabels.map((label, i) => (
                      <th key={i} className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px] w-12`}>
                        {label}
                      </th>
                    ))}
                    <th className={`text-center px-2 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-12`}>Total</th>
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
                      <tr key={row.label} className={tRowHover}>
                        <td className={`px-2 py-1 font-medium border-b ${tBorder} text-[11px] ${row.color}`}>
                          {row.label}
                        </td>
                        {row.data.map((count, mi) => (
                          <td key={mi} className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>
                            {count > 0 ? count : <span className={tTextFaint}>–</span>}
                          </td>
                        ))}
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tAccent} font-bold text-[11px]`}>
                          {total > 0 ? total : <span className={tTextFaint}>–</span>}
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

      {/* ====== LIFETIME TEAM STATS ====== */}
      {activeTab === 'team' && period === 'lifetime' && (
        <div className="space-y-6">
          <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
              <span className={`text-xs font-semibold ${tText}`}>Lifetime Team Stats</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className={tRowAlt}>
                    <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Metric</th>
                    <th className={`text-center px-2 py-1 ${tAccentBold} font-bold border-b ${tBorder} text-[11px] w-20`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Properties Reviewed', value: lifetimeTeamStats.propertiesReviewed, color: 'text-green-400' },
                    { label: 'Clients Closed', value: lifetimeTeamStats.clientsClosed, color: 'text-blue-400' },
                    { label: 'Cash Back Deals Closed', value: lifetimeTeamStats.cashbackClosed, color: 'text-purple-400' },
                  ].map((row) => (
                    <tr key={row.label} className={tRowHover}>
                      <td className={`px-2 py-1 font-medium border-b ${tBorder} text-[11px] ${row.color}`}>
                        {row.label}
                      </td>
                      <td className={`text-center px-2 py-1 border-b ${tBorder} ${tAccent} font-bold text-[11px]`}>
                        {row.value > 0 ? row.value : <span className={tTextFaint}>–</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====== CONVERSION REPORT ====== */}
      {activeTab === 'conversion' && (() => {
        const toggleSort = (col: typeof conversionSort.col) => {
          setConversionSort((prev) =>
            prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' },
          );
        };
        const sortArrow = (col: typeof conversionSort.col) =>
          conversionSort.col === col ? (conversionSort.dir === 'asc' ? ' ▲' : ' ▼') : '';

        // Helper to render a conversion table
        const renderConversionTable = (
          title: string,
          dataMap: Record<string, { won: number; lost: number; noInterest: number }>,
          type: 'packager' | 'sourcer',
        ) => {
          const hidden = type === 'packager' ? hiddenPackagers : hiddenSourcers;
          const setHidden = type === 'packager' ? setHiddenPackagers : setHiddenSourcers;
          const showFilter = type === 'packager' ? showPkgFilter : showSrcFilter;
          const setShowFilter = type === 'packager' ? setShowPkgFilter : setShowSrcFilter;

          const allEntries = Object.entries(dataMap)
            .map(([name, d]) => ({ name, ...d, total: d.won + d.lost + d.noInterest, pct: d.won + d.lost + d.noInterest > 0 ? Math.round((d.won / (d.won + d.lost + d.noInterest)) * 100) : 0 }))
            .filter((e) => e.total > 0);

          const entries = allEntries
            .filter((e) => !hidden.has(e.name))
            .sort((a, b) => {
              const { col, dir } = conversionSort;
              let cmp = 0;
              if (col === 'name') cmp = a.name.localeCompare(b.name);
              else cmp = (a[col] as number) - (b[col] as number);
              return dir === 'asc' ? cmp : -cmp;
            });

          if (allEntries.length === 0) return null;

          const totals = entries.reduce(
            (acc, e) => ({ won: acc.won + e.won, lost: acc.lost + e.lost, noInterest: acc.noInterest + e.noInterest, total: acc.total + e.total }),
            { won: 0, lost: 0, noInterest: 0, total: 0 },
          );

          const thClass = `px-2 py-1 font-medium border-b ${tBorder} text-[11px] cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-gray-900'} select-none`;

          return (
            <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                <span className={`text-xs font-semibold ${tText}`}>{title}</span>
                <div className="relative">
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`text-[10px] px-2 py-0.5 rounded ${hidden.size > 0 ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:text-gray-900'}`}
                  >
                    {hidden.size > 0 ? `${hidden.size} hidden` : 'Filter names'}
                  </button>
                  {showFilter && (
                    <div className={`absolute right-0 top-full mt-1 w-48 max-h-64 overflow-y-auto rounded shadow-lg z-50 p-1 border ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`flex gap-2 px-1 mb-1 border-b pb-1 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <button onClick={() => setHidden(new Set())} className="text-[9px] text-blue-400 hover:underline">Show All</button>
                        <button onClick={() => setHidden(new Set(allEntries.map((e) => e.name)))} className="text-[9px] text-red-400 hover:underline">Hide All</button>
                      </div>
                      {allEntries.sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
                        <label key={e.name} className={`flex items-center gap-1 px-1 py-0.5 text-[10px] cursor-pointer rounded ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                          <input
                            type="checkbox"
                            checked={!hidden.has(e.name)}
                            onChange={() => {
                              const next = new Set(hidden);
                              if (next.has(e.name)) next.delete(e.name); else next.add(e.name);
                              setHidden(next);
                            }}
                            className="w-2.5 h-2.5"
                          />
                          <span className="truncate">{e.name} ({e.total})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr className={tRowAlt}>
                      <th className={`text-left ${thClass} ${tTextDim}`} onClick={() => toggleSort('name')}>Name{sortArrow('name')}</th>
                      <th className={`text-center ${thClass} text-green-400 w-20`} onClick={() => toggleSort('won')}>EOI / Exchanged{sortArrow('won')}</th>
                      <th className={`text-center ${thClass} text-red-400 w-16`} onClick={() => toggleSort('lost')}>Removed Lost{sortArrow('lost')}</th>
                      <th className={`text-center ${thClass} text-orange-400 w-16`} onClick={() => toggleSort('noInterest')}>No Interest{sortArrow('noInterest')}</th>
                      <th className={`text-center ${thClass} ${tTextDim} w-14`} onClick={() => toggleSort('total')}>Total{sortArrow('total')}</th>
                      <th className={`text-center ${thClass} ${tAccentBold} font-bold w-14`} onClick={() => toggleSort('pct')}>Win %{sortArrow('pct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => (
                      <tr key={e.name} className={`${idx % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                        <td className={`px-2 py-1 ${tText} font-medium border-b ${tBorder} text-[11px]`}>{e.name}</td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} text-green-300 text-[11px]`}>
                          {e.won > 0 ? e.won : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} text-red-300 text-[11px]`}>
                          {e.lost > 0 ? e.lost : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} text-orange-300 text-[11px]`}>
                          {e.noInterest > 0 ? e.noInterest : <span className={tTextFaint}>–</span>}
                        </td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} ${tTextMuted} text-[11px]`}>{e.total}</td>
                        <td className={`text-center px-2 py-1 border-b ${tBorder} font-semibold text-[11px] ${e.pct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {e.pct}%
                        </td>
                      </tr>
                    ))}
                    <tr className={tHeaderBg}>
                      <td className={`px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>Total</td>
                      <td className="text-center px-2 py-1 text-green-400 font-bold text-[11px]">{totals.won}</td>
                      <td className="text-center px-2 py-1 text-red-400 font-bold text-[11px]">{totals.lost}</td>
                      <td className="text-center px-2 py-1 text-orange-400 font-bold text-[11px]">{totals.noInterest}</td>
                      <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>{totals.total}</td>
                      <td className={`text-center px-2 py-1 ${tAccentBold} font-bold text-[11px]`}>
                        {totals.total > 0 ? `${Math.round((totals.won / totals.total) * 100)}%` : '–'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        };

        // Determine which data to show based on period
        if (period === 'lifetime') {
          return (
            <div className="space-y-6">
              {renderConversionTable('Packager Conversion — Lifetime', lifetimeConversion.packagerMap, 'packager')}
              {renderConversionTable('Sourcer Conversion — Lifetime', lifetimeConversion.sourcerMap, 'sourcer')}
            </div>
          );
        }

        if (period === 'ytd') {
          return (
            <div className="space-y-6">
              {renderConversionTable(`Packager Conversion — YTD ${new Date().getFullYear()}`, ytdConversion.packagerMap, 'packager')}
              {renderConversionTable(`Sourcer Conversion — YTD ${new Date().getFullYear()}`, ytdConversion.sourcerMap, 'sourcer')}
            </div>
          );
        }

        if (period === 'weekly') {
          return (
            <div className="space-y-6">
              {weeks.map((week) => {
                const key = week.weekStart.toISOString();
                const data = weeklyConversion[key];
                if (!data) return null;
                const hasPkgData = Object.values(data.packagerMap).some((d) => d.won + d.lost + d.noInterest > 0);
                const hasSrcData = Object.values(data.sourcerMap).some((d) => d.won + d.lost + d.noInterest > 0);
                if (!hasPkgData && !hasSrcData) return null;
                return (
                  <div key={key} className="space-y-4">
                    {renderConversionTable(`Packager Conversion — ${week.label}`, data.packagerMap, 'packager')}
                    {renderConversionTable(`Sourcer Conversion — ${week.label}`, data.sourcerMap, 'sourcer')}
                  </div>
                );
              })}
            </div>
          );
        }

        if (period === 'monthly') {
          return (
            <div className="space-y-6">
              {months.map((month) => {
                const data = monthlyConversion[month.monthKey];
                if (!data) return null;
                const hasPkgData = Object.values(data.packagerMap).some((d) => d.won + d.lost + d.noInterest > 0);
                const hasSrcData = Object.values(data.sourcerMap).some((d) => d.won + d.lost + d.noInterest > 0);
                if (!hasPkgData && !hasSrcData) return null;
                return (
                  <div key={month.monthKey} className="space-y-4">
                    {renderConversionTable(`Packager Conversion — ${month.label}`, data.packagerMap, 'packager')}
                    {renderConversionTable(`Sourcer Conversion — ${month.label}`, data.sourcerMap, 'sourcer')}
                  </div>
                );
              })}
            </div>
          );
        }

        return null;
      })()}

      {/* ====== OPERATIONS TAB ====== */}
      {activeTab === 'operations' && (() => {
        const now = new Date();
        const availableRecords = filteredRecords.filter((r) => r.status.startsWith('01'));
        const awaitingPackager = availableRecords.filter((r) =>
          r.packagerApproved.toLowerCase() !== 'approved'
        );
        const qaApprovedOver24h = availableRecords.filter((r) => {
          if (r.packagerApproved.toLowerCase() !== 'approved') return false;
          if (r.qaApproved.toLowerCase() === 'approved') return false;
          const reviewDate = parseRecordDate(r.reviewDate);
          if (!reviewDate) return false;
          return (now.getTime() - reviewDate.getTime()) > 24 * 60 * 60 * 1000;
        });

        // Status summary (Available records only)
        const statusCounts: Record<string, number> = {};
        availableRecords.forEach((r) => {
          const prefix = r.status.substring(0, 2);
          const label = prefix === '01' ? '01 - Available' : prefix === '02' ? '02 - EOI' : prefix === '03' ? '03 - Contract Exchanged' : prefix === '05' ? '05 - Removed No Interest' : prefix === '06' ? '06 - Removed Lost' : prefix === '07' ? '07 - Test Record' : r.status.substring(0, 20);
          statusCounts[label] = (statusCounts[label] || 0) + 1;
        });

        // Day of week bar chart — records reviewed by day
        const dowCounts = [0, 0, 0, 0, 0, 0, 0];
        filteredRecords.forEach((r) => {
          const reviewDate = parseRecordDate(r.reviewDate);
          if (!reviewDate) return;
          const jsDay = reviewDate.getDay(); // 0=Sun
          const idx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0
          dowCounts[idx]++;
        });
        const maxDow = Math.max(...dowCounts, 1);
        const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Sort helper
        const groupField = opsGroupBy;
        const sortByGroup = (a: DealRecord, b: DealRecord) => {
          const aVal = (groupField === 'packager' ? a.packager : a.sourcer) || '';
          const bVal = (groupField === 'packager' ? b.packager : b.sourcer) || '';
          return aVal.localeCompare(bVal);
        };
        const sortedAwaitingPkg = [...awaitingPackager].sort(sortByGroup);
        const sortedQa = [...qaApprovedOver24h].sort(sortByGroup);
        const groupLabel = opsGroupBy === 'packager' ? 'Packager' : 'Sourcer';

        return (
          <div className="space-y-6">
            {/* Packager / Sourcer toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setOpsGroupBy('packager')}
                className={`text-[10px] px-3 py-1 rounded font-medium ${opsGroupBy === 'packager' ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:text-gray-900'}`}
              >
                By Packager
              </button>
              <button
                onClick={() => setOpsGroupBy('sourcer')}
                className={`text-[10px] px-3 py-1 rounded font-medium ${opsGroupBy === 'sourcer' ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:text-gray-900'}`}
              >
                By Sourcer
              </button>
            </div>

            {/* Awaiting Packager Approval */}
            <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Awaiting Packager Approval ({awaitingPackager.length})</span>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={tRowAlt}>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Property</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>{groupLabel}</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Review Date</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Status</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAwaitingPkg.length === 0 && (
                      <tr><td colSpan={5} className={`px-2 py-4 text-center ${tTextFaint} text-[11px]`}>None</td></tr>
                    )}
                    {sortedAwaitingPkg.map((r, i) => {
                      const rd = parseRecordDate(r.reviewDate);
                      const ageHrs = rd ? Math.round((now.getTime() - rd.getTime()) / (1000 * 60 * 60)) : 0;
                      const ageStr = ageHrs > 48 ? `${Math.round(ageHrs / 24)}d` : `${ageHrs}h`;
                      return (
                        <tr key={r.id} className={`${i % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                          <td className={`px-2 py-1 ${tText} border-b ${tBorder} text-[11px] max-w-[200px] truncate`}>{r.propertyAddress || '—'}</td>
                          <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>{(groupField === 'packager' ? r.packager : r.sourcer) || '—'}</td>
                          <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>{r.reviewDate || '—'}</td>
                          <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>{r.status.substring(0, 15)}</td>
                          <td className={`px-2 py-1 border-b ${tBorder} text-[11px] font-medium ${ageHrs > 72 ? 'text-red-400' : ageHrs > 48 ? 'text-orange-400' : 'text-yellow-400'}`}>{ageStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QA Approved > 24hrs */}
            <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Awaiting QA Approved &gt; 24hrs ({qaApprovedOver24h.length})</span>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={tRowAlt}>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Property</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>{groupLabel}</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Review Date</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Status</th>
                      <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQa.length === 0 && (
                      <tr><td colSpan={5} className={`px-2 py-4 text-center ${tTextFaint} text-[11px]`}>None</td></tr>
                    )}
                    {sortedQa.map((r, i) => {
                      const rd = parseRecordDate(r.reviewDate);
                      const ageHrs = rd ? Math.round((now.getTime() - rd.getTime()) / (1000 * 60 * 60)) : 0;
                      const ageStr = ageHrs > 48 ? `${Math.round(ageHrs / 24)}d` : `${ageHrs}h`;
                      return (
                        <tr key={r.id} className={`${i % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                          <td className={`px-2 py-1 ${tText} border-b ${tBorder} text-[11px] max-w-[200px] truncate`}>{r.propertyAddress || '—'}</td>
                          <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>{(groupField === 'packager' ? r.packager : r.sourcer) || '—'}</td>
                          <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>{r.reviewDate || '—'}</td>
                          <td className={`px-2 py-1 ${tTextMuted} border-b ${tBorder} text-[11px]`}>{r.status || '—'}</td>
                          <td className={`px-2 py-1 border-b ${tBorder} text-[11px] font-medium ${ageHrs > 72 ? 'text-red-400' : ageHrs > 48 ? 'text-orange-400' : 'text-yellow-400'}`}>{ageStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Summary */}
            <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Status Summary</span>
              </div>
              <div className="px-4 py-2">
                <table className="text-xs">
                  <tbody>
                    {Object.entries(statusCounts).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => (
                      <tr key={status}>
                        <td className={`px-2 py-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'} text-[11px]`}>{status}</td>
                        <td className={`px-2 py-0.5 ${isDark ? 'text-white' : 'text-gray-900'} font-medium text-[11px] text-right`}>{count}</td>
                      </tr>
                    ))}
                    <tr className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`px-2 py-0.5 font-bold text-[11px] ${isDark ? 'text-yellow-400' : 'text-gray-900'}`}>Total</td>
                      <td className={`px-2 py-0.5 font-bold text-[11px] text-right ${isDark ? 'text-yellow-400' : 'text-gray-900'}`}>{availableRecords.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Day of Week Bar Chart */}
            <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                <span className={`text-xs font-semibold ${tText}`}>Records Reviewed by Day of Week</span>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-2 h-32">
                  {dowNames.map((day, i) => {
                    const pct = (dowCounts[i] / maxDow) * 100;
                    return (
                      <div key={day} className="flex flex-col items-center flex-1">
                        <span className={`text-[10px] mb-1 ${tTextMuted} font-medium`}>{dowCounts[i]}</span>
                        <div className="w-full flex justify-center">
                          <div
                            className={`w-8 rounded-t ${pct > 80 ? 'bg-green-500' : pct > 60 ? 'bg-green-400' : pct > 40 ? 'bg-blue-400' : pct > 20 ? 'bg-blue-300' : isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] mt-1 ${tTextDim}`}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ====== HEATMAP TAB ====== */}
      {activeTab === 'heatmap' && (() => {
        // Count records packaged per day-of-week (Mon=0 to Sun=6) and per date
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
        const dailyCounts: Record<string, number> = {};

        filteredRecords.forEach((r) => {
          const d = parseRecordDate(r.reviewDate);
          if (!d) return;
          const dow = getDayOfWeekIndex(d);
          dayOfWeekCounts[dow]++;
          const dateKey = d.toISOString().split('T')[0];
          dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        });

        const maxDow = Math.max(...dayOfWeekCounts, 1);
        const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Last 12 weeks heatmap grid
        const heatmapWeeks = 12;
        const today = new Date();
        const heatStart = addDays(getMonday(today), -(heatmapWeeks - 1) * 7);
        const heatCells: { date: Date; count: number }[][] = [];

        for (let w = 0; w < heatmapWeeks; w++) {
          const weekCells: { date: Date; count: number }[] = [];
          for (let d = 0; d < 7; d++) {
            const date = addDays(heatStart, w * 7 + d);
            const key = date.toISOString().split('T')[0];
            weekCells.push({ date, count: dailyCounts[key] || 0 });
          }
          heatCells.push(weekCells);
        }

        const maxDaily = Math.max(...Object.values(dailyCounts), 1);

        function heatColor(count: number): string {
          if (count === 0) return isDark ? 'bg-gray-800' : 'bg-gray-100';
          const intensity = count / maxDaily;
          if (intensity > 0.75) return 'bg-green-500';
          if (intensity > 0.5) return 'bg-green-400';
          if (intensity > 0.25) return 'bg-green-300';
          return isDark ? 'bg-green-900' : 'bg-green-200';
        }

        return (
          <div className="space-y-6">
            {/* Day of Week Summary */}
            <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Records Reviewed by Day of Week</span>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-2 h-32">
                  {DAY_NAMES.map((day, i) => {
                    const pct = (dayOfWeekCounts[i] / maxDow) * 100;
                    return (
                      <div key={day} className="flex flex-col items-center flex-1">
                        <span className={`text-[10px] mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium`}>{dayOfWeekCounts[i]}</span>
                        <div className="w-full flex justify-center">
                          <div
                            className={`w-8 rounded-t ${pct > 80 ? 'bg-green-500' : pct > 60 ? 'bg-green-400' : pct > 40 ? 'bg-blue-400' : pct > 20 ? 'bg-blue-300' : isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Packager by Day of Week table */}
            {(() => {
              // Build per-packager day-of-week counts
              const pkgDow: Record<string, number[]> = {};
              const totalByDay = [0, 0, 0, 0, 0, 0, 0];
              filteredRecords.forEach((r) => {
                const d = parseRecordDate(r.reviewDate);
                if (!d || !r.packager || !r.packager.trim()) return;
                const dow = getDayOfWeekIndex(d);
                const name = r.packager.trim();
                if (!pkgDow[name]) pkgDow[name] = [0, 0, 0, 0, 0, 0, 0];
                pkgDow[name][dow]++;
                totalByDay[dow]++;
              });
              const grandTotal = totalByDay.reduce((a, b) => a + b, 0);
              const sortedPkgs = Object.entries(pkgDow).sort(([, a], [, b]) => {
                const ta = a.reduce((x, y) => x + y, 0);
                const tb = b.reduce((x, y) => x + y, 0);
                return tb - ta;
              });
              return (
                <div className={`${tBg} border ${tBorder} rounded-lg overflow-hidden`}>
                  <div className={`flex items-center justify-between px-4 py-2 ${tHeaderBg} border-b ${tHeaderBorder}`}>
                    <span className={`text-xs font-semibold ${tText}`}>Packager by Day of Week</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={tRowAlt}>
                          <th className={`text-left px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>Packager</th>
                          {DAY_NAMES.map((d) => (
                            <th key={d} className={`text-center px-2 py-1 ${tTextDim} font-medium border-b ${tBorder} text-[11px]`}>{d}</th>
                          ))}
                          <th className={`text-center px-2 py-1 ${tAccentBold} font-semibold border-b ${tBorder} text-[11px]`}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPkgs.map(([name, counts], i) => {
                          const total = counts.reduce((a, b) => a + b, 0);
                          return (
                            <tr key={name} className={`${i % 2 === 0 ? tBg : tRowAlt} ${tRowHover}`}>
                              <td className={`px-2 py-1 ${tText} border-b ${tBorder} text-[11px] font-medium`}>{name}</td>
                              {counts.map((c, di) => (
                                <td key={di} className={`text-center px-2 py-1 border-b ${tBorder} text-[11px]`}>
                                  <span className={c > 0 ? tText : tTextFaint}>{c > 0 ? c : '—'}</span>
                                  {c > 0 && <span className={`block text-[9px] ${tTextDim}`}>{Math.round((c / totalByDay[di]) * 100)}%</span>}
                                </td>
                              ))}
                              <td className={`text-center px-2 py-1 border-b ${tBorder} text-[11px] font-semibold ${tAccent}`}>{total}</td>
                            </tr>
                          );
                        })}
                        <tr className={`${tHeaderBg} border-t ${tBorder}`}>
                          <td className={`px-2 py-1 ${tText} font-bold text-[11px]`}>Total</td>
                          {totalByDay.map((c, di) => (
                            <td key={di} className={`text-center px-2 py-1 text-[11px] font-bold ${tText}`}>
                              {c}
                              <span className={`block text-[9px] ${tTextDim}`}>{grandTotal > 0 ? Math.round((c / grandTotal) * 100) : 0}%</span>
                            </td>
                          ))}
                          <td className={`text-center px-2 py-1 text-[11px] font-bold ${tAccentBold}`}>{grandTotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Heatmap Grid */}
            <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Daily Activity — Last {heatmapWeeks} Weeks</span>
              </div>
              <div className="p-4">
                <div className="flex gap-0.5">
                  <div className="flex flex-col gap-0.5 mr-1">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className={`text-[9px] h-4 flex items-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{d}</div>
                    ))}
                  </div>
                  {heatCells.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-0.5">
                      {week.map((cell, di) => (
                        <div
                          key={di}
                          className={`w-4 h-4 rounded-sm ${heatColor(cell.count)}`}
                          title={`${cell.date.toLocaleDateString('en-AU')}: ${cell.count} records`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Less</span>
                  <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-green-900' : 'bg-green-200'}`} />
                  <div className="w-3 h-3 rounded-sm bg-green-300" />
                  <div className="w-3 h-3 rounded-sm bg-green-400" />
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>More</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
