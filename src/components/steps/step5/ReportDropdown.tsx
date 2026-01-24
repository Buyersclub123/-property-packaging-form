'use client';

import { useState, useEffect, useRef } from 'react';

export interface ReportOption {
  fileId: string;
  displayName: string;
  reportName: string;
  state: string;
  validPeriod: string;
  suburbs: string[];
  dateStatus: {
    isValid: boolean;
    status: 'current' | 'expiring-soon' | 'expired' | 'invalid';
    displayText: string;
    daysUntilExpiry: number | null;
  };
}

interface ReportDropdownProps {
  onSelect: (report: ReportOption) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ReportDropdown({ onSelect, disabled = false, placeholder = 'Search for a report...' }: ReportDropdownProps) {
  const [reports, setReports] = useState<{ [state: string]: ReportOption[] }>({});
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/investment-highlights/list-reports');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reports');
      }

      setReports(data.reports);
      setStates(data.states);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on search term
  const filteredReports = () => {
    if (!searchTerm.trim()) {
      return reports;
    }

    const term = searchTerm.toLowerCase();
    const filtered: { [state: string]: ReportOption[] } = {};

    Object.keys(reports).forEach(state => {
      const matchingReports = reports[state].filter(report => 
        report.displayName.toLowerCase().includes(term) ||
        report.reportName.toLowerCase().includes(term) ||
        report.suburbs.some(suburb => suburb.toLowerCase().includes(term)) ||
        state.toLowerCase().includes(term)
      );

      if (matchingReports.length > 0) {
        filtered[state] = matchingReports;
      }
    });

    return filtered;
  };

  // Get flat list of filtered reports for keyboard navigation
  const getFlatList = () => {
    const filtered = filteredReports();
    const flat: ReportOption[] = [];
    
    states.forEach(state => {
      if (filtered[state]) {
        flat.push(...filtered[state]);
      }
    });

    return flat;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const flatList = getFlatList();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => 
        prev < flatList.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flatList.length) {
        handleSelect(flatList[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (report: ReportOption) => {
    onSelect(report);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Current
          </span>
        );
      case 'expiring-soon':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Expiring Soon
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50">
        <p className="text-sm text-gray-600">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-3 border border-red-300 rounded-md bg-red-50">
        <p className="text-sm text-red-600">Error: {error}</p>
        <button
          onClick={loadReports}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  const filtered = filteredReports();
  const flatList = getFlatList();

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <div className="absolute right-3 top-2.5 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {flatList.length === 0 && searchTerm.trim() !== '' ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No reports found matching "{searchTerm}"
            </div>
          ) : flatList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No reports available
            </div>
          ) : (
            <div>
              {states.map(state => {
                if (!filtered[state] || filtered[state].length === 0) return null;

                return (
                  <div key={state} className="py-2">
                    {/* State Header */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                      {state}
                    </div>

                    {/* Reports in this state */}
                    {filtered[state].map((report, index) => {
                      const flatIndex = flatList.indexOf(report);
                      const isHighlighted = flatIndex === highlightedIndex;

                      return (
                        <button
                          key={report.fileId}
                          onClick={() => handleSelect(report)}
                          className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                            isHighlighted ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {report.displayName}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {report.validPeriod}
                              </p>
                              {report.suburbs.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1 truncate">
                                  Covers: {report.suburbs.slice(0, 3).join(', ')}
                                  {report.suburbs.length > 3 && ` +${report.suburbs.length - 3} more`}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(report.dateStatus.status)}
                            </div>
                          </div>
                          {report.dateStatus.displayText && (
                            <p className="text-xs text-gray-500 mt-1">
                              {report.dateStatus.displayText}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
