'use client';

import { useState, useEffect, useRef } from 'react';

export interface ReportOption {
  reportName: string;
  validPeriod: string;
  state: string;
  suburbs: string; // comma-separated
  pdfLink: string;
  fileId: string;
}

interface ReportDropdownProps {
  onSelect: (report: ReportOption) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ReportDropdown({ onSelect, disabled = false, placeholder = 'Search for a report...' }: ReportDropdownProps) {
  const [reports, setReports] = useState<ReportOption[]>([]);
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

      const response = await fetch('/api/investment-highlights/get-reports');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reports');
      }

      setReports(data.reports || []);
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
    return reports.filter(report => 
      report.reportName.toLowerCase().includes(term) ||
      report.state.toLowerCase().includes(term) ||
      report.suburbs.toLowerCase().includes(term) ||
      report.validPeriod.toLowerCase().includes(term)
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const filtered = filteredReports();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => 
        prev < filtered.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelect(filtered[highlightedIndex]);
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
          {filtered.length === 0 && searchTerm.trim() !== '' ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No reports found matching "{searchTerm}"
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No reports available
            </div>
          ) : (
            <div>
              {filtered.map((report, index) => {
                const isHighlighted = index === highlightedIndex;
                const suburbList = report.suburbs.split(',').map(s => s.trim()).filter(s => s.length > 0);

                return (
                  <button
                    key={report.fileId || index}
                    onClick={() => handleSelect(report)}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                      isHighlighted ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.reportName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {report.validPeriod} • {report.state}
                        </p>
                        {suburbList.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            Covers: {suburbList.slice(0, 3).join(', ')}
                            {suburbList.length > 3 && ` +${suburbList.length - 3} more`}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
