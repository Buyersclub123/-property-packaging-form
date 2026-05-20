'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { getUserEmail, saveUserEmail, validateUserEmail, hasValidUserEmail } from '@/lib/userAuth';

type ActiveTab = 'market-performance' | 'investment-highlights';

interface SuburbOption {
  suburbName: string;
  state: string;
}

interface IHReport {
  suburbs: string;
  state: string;
  reportName: string;
  validPeriod: string;
}

interface IHData {
  suburbs: string;
  state: string;
  reportName: string;
  validPeriod: string;
  mainBody: string;
  pdfDriveLink: string;
  pdfFileId: string;
  lastEditedBy: string;
  lastEditedDate: string;
}

interface IHSection {
  heading: string;
  items: string[];
}

const DEFAULT_SECTION_HEADINGS = [
  'Population growth context',
  'Residential',
  'Industrial',
  'Commercial and civic',
  'Health and education',
  'Transport',
  'Job implications (construction + ongoing)',
];

// Strip leading bullets, hyphens, dashes, asterisks, and whitespace
function sanitizeInput(value: string): string {
  return value.replace(/^[\s\-\u2022\u2023\u25E6\u2043\u2219\*\u25AA\u25AB\u25CF]+/, '');
}

interface CurrentData {
  suburbName: string;
  state: string;
  dateCollectedSPI: string;
  dateCollectedREI: string;
  medianPriceChange3Months: string;
  medianPriceChange1Year: string;
  medianPriceChange3Year: string;
  medianPriceChange5Year: string;
  medianYield: string;
  medianRentChange1Year: string;
  rentalPopulation: string;
  vacancyRate: string;
}

const FIELD_DEFINITIONS = [
  {
    group: 'Smart Property Investment Data',
    source: 'smartpropertyinvestment.com.au',
    fields: [
      { key: 'medianPriceChange3Year', label: 'Median price change - 3 year %' },
      { key: 'medianPriceChange5Year', label: 'Median price change - 5 year %' },
    ],
  },
  {
    group: 'Real Estate Investar Data',
    source: 'info.realestateinvestar.com.au',
    fields: [
      { key: 'medianPriceChange3Months', label: 'Median price change - 3 months %' },
      { key: 'medianPriceChange1Year', label: 'Median price change - 1 year %' },
      { key: 'medianYield', label: 'Median yield %' },
      { key: 'medianRentChange1Year', label: 'Median rent change - 1 year %' },
      { key: 'rentalPopulation', label: 'Rental Population %' },
      { key: 'vacancyRate', label: 'Vacancy Rate %' },
    ],
  },
];

const ALL_FIELD_KEYS = FIELD_DEFINITIONS.flatMap((g) => g.fields.map((f) => f.key));

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

// Configurable warning threshold (percentage relative change). Set to 0 to disable.
const WARNING_THRESHOLD_PERCENT = 0;

export default function MarketPerformancePage() {
  // Email gate
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(true);

  // Suburb list + search
  const [suburbs, setSuburbs] = useState<SuburbOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuburbs, setLoadingSuburbs] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected suburb / new suburb
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbOption | null>(null);
  const [isNewSuburb, setIsNewSuburb] = useState(false);
  const [newSuburbState, setNewSuburbState] = useState('');

  // Data
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [noUpdate, setNoUpdate] = useState<Record<string, boolean>>({});
  const [loadingData, setLoadingData] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('market-performance');

  // Investment Highlights state
  const [ihReports, setIhReports] = useState<IHReport[]>([]);
  const [ihSearchQuery, setIhSearchQuery] = useState('');
  const [ihShowDropdown, setIhShowDropdown] = useState(false);
  const [ihSelectedReport, setIhSelectedReport] = useState<IHReport | null>(null);
  const [ihCurrentData, setIhCurrentData] = useState<IHData | null>(null);
  const [ihSections, setIhSections] = useState<IHSection[]>([]);
  const [ihEditedSuburbs, setIhEditedSuburbs] = useState<string[]>([]);
  const [ihEditingSuburbs, setIhEditingSuburbs] = useState(false);
  const [ihNewSuburbInput, setIhNewSuburbInput] = useState('');
  const [ihEditedValidPeriod, setIhEditedValidPeriod] = useState('');
  const [ihEditingValidPeriod, setIhEditingValidPeriod] = useState(false);
  const [ihEditedReportName, setIhEditedReportName] = useState('');
  const [ihEditingReportName, setIhEditingReportName] = useState(false);
  const [ihEditingPdfReportName, setIhEditingPdfReportName] = useState(false);
  const [ihUploadingPdf, setIhUploadingPdf] = useState(false);
  const [ihPdfProgress, setIhPdfProgress] = useState('');
  const [ihShowDeleteConfirm, setIhShowDeleteConfirm] = useState(false);
  const [ihDeleting, setIhDeleting] = useState(false);
  const [ihLoadingData, setIhLoadingData] = useState(false);
  const [ihLoadingReports, setIhLoadingReports] = useState(false);
  const [ihSaving, setIhSaving] = useState(false);
  const [ihSavingMetadata, setIhSavingMetadata] = useState(false);
  const [ihShowSaveConfirmModal, setIhShowSaveConfirmModal] = useState(false);
  const [ihMessage, setIhMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const ihSearchRef = useRef<HTMLDivElement>(null);

  // Check email on mount
  useEffect(() => {
    const storedEmail = getUserEmail();
    if (storedEmail && hasValidUserEmail()) {
      setUserEmail(storedEmail);
    }
    setIsCheckingEmail(false);
  }, []);

  // Load suburbs list
  const loadSuburbs = useCallback(async () => {
    setLoadingSuburbs(true);
    try {
      const res = await fetch('/api/admin/market-performance?action=list');
      const data = await res.json();
      if (data.success) {
        setSuburbs(data.suburbs);
      }
    } catch (err) {
      console.error('Failed to load suburbs:', err);
    } finally {
      setLoadingSuburbs(false);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      loadSuburbs();
    }
  }, [userEmail, loadSuburbs]);

  // Load IH reports list
  const loadIhReports = useCallback(async () => {
    setIhLoadingReports(true);
    try {
      const res = await fetch('/api/admin/investment-highlights?action=list');
      const data = await res.json();
      if (data.success) {
        setIhReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to load IH reports:', err);
    } finally {
      setIhLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (userEmail && activeTab === 'investment-highlights' && ihReports.length === 0) {
      loadIhReports();
    }
  }, [userEmail, activeTab, ihReports.length, loadIhReports]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (ihSearchRef.current && !ihSearchRef.current.contains(event.target as Node)) {
        setIhShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Email submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const validation = validateUserEmail(emailInput);
    if (!validation.isValid) {
      setEmailError(validation.error || 'Invalid email');
      return;
    }
    if (saveUserEmail(validation.email!)) {
      setUserEmail(validation.email!);
    } else {
      setEmailError('Failed to save email address');
    }
  };

  // Filter suburbs for dropdown
  const filteredSuburbs = searchQuery.trim()
    ? suburbs.filter(
        (s) =>
          s.suburbName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const exactMatch = suburbs.some(
    (s) => s.suburbName.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  // Select existing suburb
  const handleSelectSuburb = async (suburb: SuburbOption) => {
    setSelectedSuburb(suburb);
    setIsNewSuburb(false);
    setSearchQuery(`${suburb.suburbName}, ${suburb.state}`);
    setShowDropdown(false);
    setMessage(null);

    // Load current data
    setLoadingData(true);
    try {
      const res = await fetch(
        `/api/admin/market-performance?action=lookup&suburb=${encodeURIComponent(suburb.suburbName)}&state=${encodeURIComponent(suburb.state)}`
      );
      const result = await res.json();
      if (result.success && result.found && result.data) {
        setCurrentData(result.data);
        // Initialize newValues as empty, noUpdate all ticked
        const emptyValues: Record<string, string> = {};
        const allNoUpdate: Record<string, boolean> = {};
        ALL_FIELD_KEYS.forEach((key) => {
          emptyValues[key] = '';
          allNoUpdate[key] = false;
        });
        setNewValues(emptyValues);
        setNoUpdate(allNoUpdate);
      } else {
        setCurrentData(null);
        setMessage({ type: 'error', text: 'Could not load suburb data' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch suburb data' });
    } finally {
      setLoadingData(false);
    }
  };

  // Add new suburb
  const handleAddNew = () => {
    const trimmedName = searchQuery.trim();
    if (!trimmedName) return;

    // Check for duplicates (case-insensitive)
    const duplicate = suburbs.find(
      (s) => s.suburbName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setMessage({
        type: 'error',
        text: `"${trimmedName}" already exists in ${duplicate.state}. Please select it from the list.`,
      });
      return;
    }

    setIsNewSuburb(true);
    setSelectedSuburb(null);
    setCurrentData(null);
    setShowDropdown(false);
    setMessage(null);

    // Initialize empty values, no checkboxes for new suburb
    const emptyValues: Record<string, string> = {};
    ALL_FIELD_KEYS.forEach((key) => {
      emptyValues[key] = '';
    });
    setNewValues(emptyValues);
    setNoUpdate({});
  };

  // Handle new value change
  const handleNewValueChange = (key: string, value: string) => {
    setNewValues((prev) => ({ ...prev, [key]: value }));
    // If user types a value, untick "no update"
    if (value && noUpdate[key]) {
      setNoUpdate((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle no update checkbox
  const handleNoUpdateToggle = (key: string) => {
    const newChecked = !noUpdate[key];
    setNoUpdate((prev) => ({ ...prev, [key]: newChecked }));
    // If ticked, clear the new value
    if (newChecked) {
      setNewValues((prev) => ({ ...prev, [key]: '' }));
    }
  };

  // Check if a field has a significant change
  const getWarning = (key: string): string | null => {
    if (WARNING_THRESHOLD_PERCENT <= 0) return null;
    if (!currentData || noUpdate[key] || !newValues[key]) return null;

    const oldVal = parseFloat((currentData as any)[key]);
    const newVal = parseFloat(newValues[key]);
    if (isNaN(oldVal) || isNaN(newVal) || oldVal === 0) return null;

    const percentChange = Math.abs((newVal - oldVal) / oldVal) * 100;
    if (percentChange > WARNING_THRESHOLD_PERCENT) {
      return `${percentChange.toFixed(0)}% change from ${oldVal} to ${newVal}`;
    }
    return null;
  };

  // Validate form
  const isFormValid = (): boolean => {
    if (isNewSuburb) {
      // All fields must have values + state selected
      if (!newSuburbState) return false;
      return ALL_FIELD_KEYS.every((key) => newValues[key] && newValues[key].trim() !== '');
    } else {
      // Each field must either have "no update" ticked OR a new value entered
      return ALL_FIELD_KEYS.every((key) => noUpdate[key] || (newValues[key] && newValues[key].trim() !== ''));
    }
  };

  // Check if at least one field is being updated (for existing suburb)
  const hasChanges = (): boolean => {
    if (isNewSuburb) return true;
    return ALL_FIELD_KEYS.some((key) => !noUpdate[key] && newValues[key] && newValues[key].trim() !== '');
  };

  // Save
  const handleSave = async () => {
    if (!isFormValid()) return;
    if (!isNewSuburb && !hasChanges()) {
      setMessage({ type: 'error', text: 'No fields to update. Untick "No update" and enter values for fields you want to change.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const suburbName = isNewSuburb ? searchQuery.trim() : selectedSuburb!.suburbName;
      const state = isNewSuburb ? newSuburbState : selectedSuburb!.state;

      // Build fields object (only changed fields for update)
      const fields: Record<string, string> = {};
      ALL_FIELD_KEYS.forEach((key) => {
        if (isNewSuburb || (!noUpdate[key] && newValues[key] && newValues[key].trim() !== '')) {
          fields[key] = newValues[key].trim();
        }
      });

      const res = await fetch('/api/admin/market-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isNewSuburb ? 'create' : 'update',
          suburb: suburbName,
          state,
          fields,
          userEmail,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message });

        // Refresh suburbs list
        await loadSuburbs();

        // If we just updated, reload the data to show updated current values
        if (!isNewSuburb && selectedSuburb) {
          await handleSelectSuburb(selectedSuburb);
        } else {
          // Reset form for new suburb
          setIsNewSuburb(false);
          setSelectedSuburb(null);
          setCurrentData(null);
          setSearchQuery('');
          setNewSuburbState('');
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Reset / clear
  const handleClear = () => {
    setSelectedSuburb(null);
    setIsNewSuburb(false);
    setCurrentData(null);
    setSearchQuery('');
    setNewValues({});
    setNoUpdate({});
    setNewSuburbState('');
    setMessage(null);
  };

  // ---- IH Handlers ----

  const ihFilteredReports = ihSearchQuery.trim()
    ? ihReports.filter(
        (r) =>
          r.reportName.toLowerCase().includes(ihSearchQuery.toLowerCase()) ||
          r.suburbs.toLowerCase().includes(ihSearchQuery.toLowerCase()) ||
          r.state.toLowerCase().includes(ihSearchQuery.toLowerCase())
      )
    : [];

  const handleSelectIhReport = async (report: IHReport) => {
    setIhSelectedReport(report);
    setIhSearchQuery(report.reportName);
    setIhShowDropdown(false);
    setIhMessage(null);

    setIhLoadingData(true);
    try {
      const res = await fetch(
        `/api/admin/investment-highlights?action=lookup&reportName=${encodeURIComponent(report.reportName)}&state=${encodeURIComponent(report.state)}`
      );
      const result = await res.json();
      if (result.success && result.found && result.data) {
        setIhCurrentData(result.data);
        setIhEditedSuburbs((result.data.suburbs || '').split(',').map((s: string) => s.trim()).filter(Boolean));
        setIhEditingSuburbs(false);
        setIhNewSuburbInput('');
        setIhEditedValidPeriod(result.data.validPeriod || '');
        setIhEditingValidPeriod(false);
        setIhEditedReportName(result.data.reportName || '');
        setIhEditingReportName(false);
        // Initialize sections with default headings (empty items)
        setIhSections(DEFAULT_SECTION_HEADINGS.map((h) => ({ heading: h, items: [] })));
      } else {
        setIhCurrentData(null);
        setIhMessage({ type: 'error', text: 'Could not load report data' });
      }
    } catch (err) {
      setIhMessage({ type: 'error', text: 'Failed to fetch report data' });
    } finally {
      setIhLoadingData(false);
    }
  };

  // Compose main body from sections
  const composeMainBody = (): string => {
    if (!ihCurrentData) return '';
    const lines: string[] = [ihCurrentData.reportName, ''];
    ihSections.forEach((section) => {
      if (!section.heading.trim() && section.items.length === 0) return; // skip blank sections
      if (section.heading.trim()) {
        lines.push(section.heading.trim());
      }
      section.items.forEach((item) => {
        if (item.trim()) lines.push(item.trim());
      });
      lines.push(''); // blank line between sections
    });
    return lines.join('\n').trim();
  };

  const handleIhSave = async () => {
    if (!ihSelectedReport) return;
    const composedBody = composeMainBody();
    if (!composedBody.trim()) return;

    setIhSaving(true);
    setIhMessage(null);

    try {
      const res = await fetch('/api/admin/investment-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: ihSelectedReport.reportName,
          state: ihSelectedReport.state,
          mainBody: composedBody,
          userEmail,
          suburbs: ihEditedSuburbs.join(', '),
          validPeriod: ihEditedValidPeriod,
          editedReportName: ihEditedReportName,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setIhMessage({ type: 'success', text: result.message });
        // Reload data to reflect saved state
        await handleSelectIhReport(ihSelectedReport);
      } else {
        setIhMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch (err) {
      setIhMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIhSaving(false);
    }
  };

  const handleIhClear = () => {
    setIhSelectedReport(null);
    setIhCurrentData(null);
    setIhSections([]);
    setIhEditedSuburbs([]);
    setIhEditingSuburbs(false);
    setIhNewSuburbInput('');
    setIhEditedValidPeriod('');
    setIhEditingValidPeriod(false);
    setIhEditedReportName('');
    setIhEditingReportName(false);
    setIhShowDeleteConfirm(false);
    setIhSearchQuery('');
    setIhMessage(null);
  };

  const ihAddSuburb = () => {
    const val = ihNewSuburbInput.trim();
    if (!val) return;
    // Split by comma in case they paste multiple
    const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
    setIhEditedSuburbs((prev) => {
      const combined = [...prev, ...parts];
      return [...new Set(combined)]; // deduplicate
    });
    setIhNewSuburbInput('');
  };

  const ihRemoveSuburb = (idx: number) => {
    setIhEditedSuburbs((prev) => prev.filter((_, i) => i !== idx));
  };

  // Delete handler (API not wired yet)
  const handleIhDelete = async () => {
    if (!ihSelectedReport) return;
    setIhDeleting(true);
    setIhMessage(null);
    try {
      const res = await fetch('/api/admin/investment-highlights', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: ihSelectedReport.reportName,
          state: ihSelectedReport.state,
          userEmail,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setIhMessage({ type: 'success', text: `Deleted "${ihSelectedReport.reportName}"` });
        setIhSelectedReport(null);
        setIhCurrentData(null);
        setIhSections([]);
        setIhEditedSuburbs([]);
        setIhSearchQuery('');
        setIhShowDeleteConfirm(false);
        // Reload reports list
        const listRes = await fetch('/api/admin/investment-highlights?action=list');
        const listResult = await listRes.json();
        if (listResult.success) setIhReports(listResult.reports);
      } else {
        setIhMessage({ type: 'error', text: result.error || 'Failed to delete' });
      }
    } catch {
      setIhMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIhDeleting(false);
      setIhShowDeleteConfirm(false);
    }
  };

  // PDF upload handler
  const handleIhPdfUpload = async (file: File) => {
    if (!ihSelectedReport || !ihCurrentData) return;

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setIhMessage({ type: 'error', text: 'Please select a PDF file' });
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setIhMessage({ type: 'error', text: 'File is too large. Maximum size is 50MB.' });
      return;
    }

    setIhUploadingPdf(true);
    setIhPdfProgress('Uploading PDF...');
    setIhMessage(null);

    try {
      // Upload PDF with the correct final name: "{Report Name} - {Valid Period}.pdf"
      const reportName = ihEditedReportName || ihCurrentData.reportName;
      const validPeriod = ihEditedValidPeriod || ihCurrentData.validPeriod;
      const pdfFinalName = `${reportName} - ${validPeriod}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('suburb', ihEditedSuburbs[0] || '');
      formData.append('state', ihCurrentData.state);
      formData.append('finalFileName', pdfFinalName);

      const uploadRes = await fetch('/api/investment-highlights/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadRes.json();

      if (!uploadRes.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setIhPdfProgress('Organizing folders...');

      // Move to CURRENT folder (and move any existing to LEGACY)
      const organizeRes = await fetch('/api/investment-highlights/organize-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadResult.fileId,
          reportName,
          validPeriod,
          suburbs: ihEditedSuburbs.join(', '),
          state: ihCurrentData.state,
          userEmail,
          skipSheetWrite: true,
        }),
      });

      const organizeResult = await organizeRes.json();
      if (!organizeRes.ok) {
        console.warn('Organize-pdf failed:', organizeResult.error);
      }

      setIhPdfProgress('Saving PDF reference...');

      // Save PDF info to sheet columns F and G (use organize result link if available)
      const saveRes = await fetch('/api/admin/investment-highlights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: ihSelectedReport.reportName,
          state: ihSelectedReport.state,
          pdfDriveLink: organizeResult?.webViewLink || uploadResult.webViewLink || '',
          pdfFileId: organizeResult?.fileId || uploadResult.fileId || '',
          userEmail,
          updatedReportName: reportName,
        }),
      });

      const saveResult = await saveRes.json();

      if (saveResult.success) {
        setIhMessage({ type: 'success', text: 'PDF uploaded and saved successfully' });
        await handleSelectIhReport(ihSelectedReport);
      } else {
        setIhMessage({ type: 'error', text: saveResult.error || 'PDF uploaded but failed to save reference' });
      }
    } catch (err) {
      setIhMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to upload PDF' });
    } finally {
      setIhUploadingPdf(false);
      setIhPdfProgress('');
    }
  };

  // Save metadata (suburbs, report name, valid period) without saving main body
  const handleIhSaveMetadata = async () => {
    if (!ihSelectedReport || !ihCurrentData) return;
    setIhSavingMetadata(true);
    setIhMessage(null);

    try {
      const res = await fetch('/api/admin/investment-highlights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: ihSelectedReport.reportName,
          state: ihSelectedReport.state,
          pdfDriveLink: ihCurrentData.pdfDriveLink || '',
          pdfFileId: ihCurrentData.pdfFileId || '',
          userEmail,
          updatedReportName: ihEditedReportName,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      // Also save suburbs and valid period via the POST endpoint (use new name since PATCH already renamed it)
      const postRes = await fetch('/api/admin/investment-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: ihEditedReportName,
          state: ihSelectedReport.state,
          suburbs: ihEditedSuburbs.join(', '),
          validPeriod: ihEditedValidPeriod,
          editedReportName: ihEditedReportName,
          mainBody: ihCurrentData.mainBody || '',
          userEmail,
        }),
      });

      const postResult = await postRes.json();
      if (!postRes.ok || !postResult.success) {
        throw new Error(postResult.error || 'Failed to save metadata');
      }

      // Verify by re-reading the data from the sheet
      const verifyRes = await fetch(
        `/api/admin/investment-highlights?action=lookup&reportName=${encodeURIComponent(ihEditedReportName)}&state=${encodeURIComponent(ihCurrentData.state)}`
      );
      const verifyResult = await verifyRes.json();

      if (verifyResult.success && verifyResult.found) {
        setIhCurrentData(verifyResult.data);
        setIhSelectedReport({ reportName: ihEditedReportName, state: ihCurrentData.state, suburbs: ihEditedSuburbs.join(', '), validPeriod: ihEditedValidPeriod });
        setIhShowSaveConfirmModal(true);
        // Refresh report list
        const listRes = await fetch('/api/admin/investment-highlights?action=list');
        const listResult = await listRes.json();
        if (listResult.success) setIhReports(listResult.reports);
      } else {
        setIhShowSaveConfirmModal(true);
      }
    } catch (err) {
      setIhMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save metadata' });
    } finally {
      setIhSavingMetadata(false);
    }
  };

  // Section manipulation
  const ihAddItem = (sectionIdx: number) => {
    setIhSections((prev) =>
      prev.map((s, i) => (i === sectionIdx ? { ...s, items: [...s.items, ''] } : s))
    );
  };

  const ihUpdateItem = (sectionIdx: number, itemIdx: number, value: string) => {
    const sanitized = sanitizeInput(value);
    setIhSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? { ...s, items: s.items.map((item, j) => (j === itemIdx ? sanitized : item)) }
          : s
      )
    );
  };

  const ihRemoveItem = (sectionIdx: number, itemIdx: number) => {
    setIhSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx ? { ...s, items: s.items.filter((_, j) => j !== itemIdx) } : s
      )
    );
  };

  // Available headings not currently in use
  const ihAvailableHeadings = DEFAULT_SECTION_HEADINGS.filter(
    (h) => !ihSections.some((s) => s.heading.toLowerCase() === h.toLowerCase())
  );

  const ihAddSection = (heading: string) => {
    // Insert at the correct position based on default order
    setIhSections((prev) => {
      const newSection: IHSection = { heading, items: [] };
      const defaultIdx = DEFAULT_SECTION_HEADINGS.findIndex(
        (h) => h.toLowerCase() === heading.toLowerCase()
      );
      // Find the right insertion point to maintain default order
      let insertAt = prev.length;
      for (let i = 0; i < prev.length; i++) {
        const existingIdx = DEFAULT_SECTION_HEADINGS.findIndex(
          (h) => h.toLowerCase() === prev[i].heading.toLowerCase()
        );
        if (existingIdx > defaultIdx) {
          insertAt = i;
          break;
        }
      }
      const updated = [...prev];
      updated.splice(insertAt, 0, newSection);
      return updated;
    });
  };

  const ihRemoveSection = (idx: number) => {
    setIhSections((prev) => prev.filter((_, i) => i !== idx));
  };

  // Parse existing main body text into sections
  const parseMainBodyIntoSections = (text: string): IHSection[] => {
    const lines = text.split('\n');
    const sections: IHSection[] = [];
    let currentSection: IHSection | null = null;
    let skippedTitle = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip the LGA title (first non-empty line)
      if (!skippedTitle) {
        skippedTitle = true;
        continue;
      }

      // Check if this line is a known section heading
      const isHeading = DEFAULT_SECTION_HEADINGS.some(
        (h) => h.toLowerCase() === trimmed.toLowerCase()
      );

      if (isHeading) {
        currentSection = { heading: trimmed, items: [] };
        sections.push(currentSection);
      } else if (currentSection) {
        currentSection.items.push(trimmed);
      } else {
        // Line before any heading — treat as a new section with blank heading
        currentSection = { heading: trimmed, items: [] };
        sections.push(currentSection);
      }
    }

    // If no sections found, return defaults
    if (sections.length === 0) {
      return DEFAULT_SECTION_HEADINGS.map((h) => ({ heading: h, items: [] }));
    }
    return sections;
  };

  const ihLoadExisting = () => {
    if (!ihCurrentData || !ihCurrentData.mainBody) return;
    const parsed = parseMainBodyIntoSections(ihCurrentData.mainBody);
    setIhSections(parsed);
  };

  const ihHasChanges: boolean = ihSections.some(
    (s) => s.items.some((item) => item.trim() !== '')
  );

  // ---- RENDER ----

  if (isCheckingEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Email gate
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Data Editor Portal</h1>
              <Image src="/logo.jpg" alt="Buyers Club Logo" width={150} height={112} className="object-contain" />
            </div>

            <div className="p-6 bg-white border-2 border-red-300 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Verification Required</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please enter your individual @buyersclub.com.au email address to continue.
                Shared email accounts (Properties@, Packaging@) are not allowed.
              </p>

              <form onSubmit={handleEmailSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email Address *</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailError(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your.name@buyersclub.com.au"
                    required
                    autoFocus
                  />
                  {emailError && <p className="text-red-600 text-sm mt-1">{emailError}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main portal
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Editor Portal</h1>
              <p className="text-sm text-gray-500 mt-1">Logged in as: {userEmail}</p>
            </div>
            <Image src="/logo.jpg" alt="Buyers Club Logo" width={150} height={112} className="object-contain" />
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('market-performance')}
              className={`px-6 py-3 text-sm font-semibold ${
                activeTab === 'market-performance'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Market Performance
            </button>
            <button
              onClick={() => setActiveTab('investment-highlights')}
              className={`px-6 py-3 text-sm font-semibold ${
                activeTab === 'investment-highlights'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Investment Highlights
            </button>
          </div>

          {/* Market Performance Tab */}
          {activeTab === 'market-performance' && (
          <>
          {/* Search section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Suburb</h2>
            <div className="flex gap-4 items-start" ref={searchRef}>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (selectedSuburb || isNewSuburb) {
                      handleClear();
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowDropdown(true);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type suburb name to search..."
                />
                {loadingSuburbs && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}

                {/* Dropdown */}
                {showDropdown && searchQuery.trim() && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuburbs.length > 0 ? (
                      filteredSuburbs.map((s, idx) => (
                        <button
                          key={`${s.suburbName}-${s.state}-${idx}`}
                          onClick={() => handleSelectSuburb(s)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{s.suburbName}</span>
                          <span className="text-gray-500 ml-2">{s.state}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">No matching suburbs found</div>
                    )}

                    {/* Add new option */}
                    {searchQuery.trim() && !exactMatch && (
                      <button
                        onClick={handleAddNew}
                        className="w-full text-left px-4 py-2 bg-green-50 hover:bg-green-100 text-sm font-medium text-green-700 border-t border-gray-200"
                      >
                        + Add new suburb: &quot;{searchQuery.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>

              {(selectedSuburb || isNewSuburb) && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>

            {/* New suburb state selector */}
            {isNewSuburb && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <select
                  value={newSuburbState}
                  onChange={(e) => setNewSuburbState(e.target.value)}
                  className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select state</option>
                  {AUSTRALIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Status messages */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Loading data */}
          {loadingData && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading suburb data...</p>
            </div>
          )}

          {/* Data editor */}
          {(selectedSuburb || isNewSuburb) && !loadingData && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isNewSuburb
                      ? `Adding: ${searchQuery.trim()}${newSuburbState ? `, ${newSuburbState}` : ''}`
                      : `Editing: ${selectedSuburb!.suburbName}, ${selectedSuburb!.state}`}
                  </h2>
                  {currentData && (
                    <p className="text-sm text-gray-500 mt-1">
                      Last updated — SPI: {currentData.dateCollectedSPI || 'N/A'} | REI:{' '}
                      {currentData.dateCollectedREI || 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              {FIELD_DEFINITIONS.map((group) => (
                <div key={group.group} className="mb-8">
                  <div className="border-l-4 border-blue-500 pl-4 mb-4">
                    <h3 className="text-base font-bold text-blue-800">{group.group}</h3>
                    <a
                      href={`https://${group.source}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {group.source}
                    </a>
                  </div>

                  {/* Column headers for existing suburb */}
                  {!isNewSuburb && (
                    <div className="grid grid-cols-12 gap-3 mb-2 px-2">
                      <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Field</div>
                      <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Current Value</div>
                      <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase">New Value</div>
                      <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase text-center">
                        No Update
                      </div>
                      <div className="col-span-2"></div>
                    </div>
                  )}

                  {group.fields.map((field) => {
                    const currentVal = currentData ? (currentData as any)[field.key] || '' : '';
                    const warning = getWarning(field.key);
                    const isDisabled = !isNewSuburb && noUpdate[field.key];

                    return (
                      <div
                        key={field.key}
                        className="grid grid-cols-12 gap-3 items-center py-2 px-2 border-b border-gray-100 last:border-0"
                      >
                        {/* Field label */}
                        <div className="col-span-3">
                          <label className="text-sm font-medium text-gray-700">{field.label}</label>
                        </div>

                        {/* Current value (existing suburb only) */}
                        {!isNewSuburb && (
                          <div className="col-span-2">
                            <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600 font-mono">
                              {currentVal || '—'}
                            </div>
                          </div>
                        )}

                        {/* New value input */}
                        <div className={isNewSuburb ? 'col-span-6' : 'col-span-3'}>
                          <input
                            type="number"
                            step="0.01"
                            value={newValues[field.key] || ''}
                            onChange={(e) => handleNewValueChange(field.key, e.target.value)}
                            disabled={isDisabled}
                            className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDisabled
                                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 bg-white'
                            }`}
                            placeholder={isDisabled ? 'No update' : 'Enter value'}
                          />
                        </div>

                        {/* No update checkbox (existing suburb only) */}
                        {!isNewSuburb && (
                          <div className="col-span-2 flex justify-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={noUpdate[field.key] || false}
                                onChange={() => handleNoUpdateToggle(field.key)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-500">Skip</span>
                            </label>
                          </div>
                        )}

                        {/* Warning */}
                        <div className="col-span-2">
                          {warning && (
                            <span className="text-xs text-amber-600 font-medium">⚠ {warning}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Validation message */}
              {!isFormValid() && (selectedSuburb || isNewSuburb) && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    {isNewSuburb
                      ? 'All fields must be filled in before saving a new suburb.'
                      : 'Each field must either have a new value entered or be marked as "No update".'}
                  </p>
                </div>
              )}

              {/* Save button */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving || !isFormValid() || (!isNewSuburb && !hasChanges())}
                  className={`px-6 py-2.5 rounded-md font-medium text-white ${
                    saving || !isFormValid() || (!isNewSuburb && !hasChanges())
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Saving...' : isNewSuburb ? 'Add Suburb' : 'Save Changes'}
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-2.5 rounded-md font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {!isNewSuburb && !hasChanges() && (
                  <p className="text-sm text-gray-500">
                    Untick &quot;No update&quot; and enter new values for the fields you want to change.
                  </p>
                )}
              </div>
            </div>
          )}
          </>
          )}

          {/* Investment Highlights Tab */}
          {activeTab === 'investment-highlights' && (
          <>
          {/* IH Search section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search by Report Name (LGA)</h2>
            <div className="flex gap-4 items-start" ref={ihSearchRef}>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={ihSearchQuery}
                  onChange={(e) => {
                    setIhSearchQuery(e.target.value);
                    setIhShowDropdown(true);
                    if (ihSelectedReport) {
                      handleIhClear();
                    }
                  }}
                  onFocus={() => {
                    if (ihSearchQuery.trim()) setIhShowDropdown(true);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type report name or suburb to search..."
                />
                {ihLoadingReports && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}

                {/* Dropdown */}
                {ihShowDropdown && ihSearchQuery.trim() && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {ihFilteredReports.length > 0 ? (
                      ihFilteredReports.map((r, idx) => (
                        <button
                          key={`${r.reportName}-${r.state}-${idx}`}
                          onClick={() => handleSelectIhReport(r)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{r.reportName}</span>
                          <span className="text-gray-500 ml-2">{r.state}</span>
                          <br />
                          <span className="text-xs text-gray-400">{r.suburbs}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">No matching reports found</div>
                    )}
                  </div>
                )}
              </div>

              {ihSelectedReport && (
                <button
                  onClick={handleIhClear}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* IH Status messages */}
          {ihMessage && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                ihMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {ihMessage.text}
            </div>
          )}

          {/* IH Loading */}
          {ihLoadingData && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading report data...</p>
            </div>
          )}

          {/* Last edited info - above the editor card */}
          {ihSelectedReport && ihCurrentData && !ihLoadingData && ihCurrentData.lastEditedBy && (
            <div className="text-sm text-gray-500 mb-2">
              Last edited by: {ihCurrentData.lastEditedBy}{ihCurrentData.lastEditedDate && ` on ${ihCurrentData.lastEditedDate}`}
            </div>
          )}

          {/* IH Editor */}
          {ihSelectedReport && ihCurrentData && !ihLoadingData && (
            <div className="bg-white rounded-lg shadow p-6">
              {/* Report info header with delete button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Editing: {ihEditedReportName} ({ihCurrentData.state})
                </h2>
                <button
                  onClick={() => setIhShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete Record from backend
                </button>
              </div>

              {/* Delete confirmation modal */}
              {ihShowDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Are you sure you want to delete <strong>{ihCurrentData.reportName}</strong> ({ihCurrentData.state})?
                      This action cannot be undone.
                    </p>
                    <p className="text-xs text-gray-500 mb-6">
                      Tip: Copy the suburbs from the field below before deleting, so you can add them to the correct report.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setIhShowDeleteConfirm(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleIhDelete}
                        disabled={ihDeleting}
                        className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                          ihDeleting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {ihDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save confirmation modal */}
              {ihShowSaveConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 text-center">
                    <div className="mb-4">
                      <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Changes Saved Successfully</h3>
                      <p className="text-sm text-gray-600 mt-1">Your changes have been verified and saved to the backend.</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setIhShowSaveConfirmModal(false);
                          handleIhClear();
                        }}
                        className="btn-secondary text-sm"
                      >
                        Edit a new record
                      </button>
                      <button
                        onClick={async () => {
                          setIhShowSaveConfirmModal(false);
                          setIhEditingPdfReportName(false);
                          setIhEditingValidPeriod(false);
                          setIhEditingSuburbs(false);
                          if (ihSelectedReport) {
                            await handleSelectIhReport({ ...ihSelectedReport, reportName: ihEditedReportName });
                          }
                        }}
                        className="btn-primary text-sm"
                      >
                        View this record
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Suburbs section - blue card */}
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-semibold text-gray-700">Suburbs</label>
                  {!ihEditingSuburbs ? (
                    <button
                      onClick={() => setIhEditingSuburbs(true)}
                      className="btn-secondary text-sm !px-4 !py-1"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => setIhEditingSuburbs(false)}
                      className="btn-secondary text-sm !px-4 !py-1"
                    >
                      Done
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ihEditedSuburbs.map((suburb, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-blue-200 rounded-full text-sm text-gray-700">
                      {suburb}
                      {ihEditingSuburbs && (
                        <button
                          onClick={() => ihRemoveSuburb(idx)}
                          className="text-red-400 hover:text-red-600 ml-1"
                          title="Remove suburb"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
                  {ihEditedSuburbs.length === 0 && (
                    <span className="text-sm text-gray-400">(no suburbs)</span>
                  )}
                </div>
                {ihEditingSuburbs && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={ihNewSuburbInput}
                      onChange={(e) => setIhNewSuburbInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ihAddSuburb(); } }}
                      className="input-field"
                      placeholder="Type a suburb name and press Enter or click Add"
                    />
                    <button
                      onClick={ihAddSuburb}
                      className="btn-secondary text-sm !px-4 !py-2"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Hotspotting Report PDF section - grouped card */}
              <div className="mb-5 p-4 bg-primary-50 border border-primary-100 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-gray-800">Hotspotting Report (PDF)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Valid Period:</span>
                    {ihEditingValidPeriod ? (
                      <>
                        <input
                          type="text"
                          value={ihEditedValidPeriod}
                          onChange={(e) => setIhEditedValidPeriod(e.target.value)}
                          className="input-field max-w-xs !py-1.5"
                          placeholder="e.g. February - May 2026"
                          autoFocus
                        />
                        <button
                          onClick={() => setIhEditingValidPeriod(false)}
                          className="btn-secondary text-sm !px-4 !py-1"
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-700">{ihEditedValidPeriod || ihCurrentData.validPeriod}</span>
                        <button
                          onClick={() => setIhEditingValidPeriod(true)}
                          className="btn-secondary text-sm !px-4 !py-1"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Current PDF link */}
                {ihCurrentData.pdfDriveLink ? (
                  <div className="flex items-center gap-3 mb-3">
                    <a
                      href={ihCurrentData.pdfDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      View current PDF
                    </a>
                    <span className="text-xs text-gray-400">({ihCurrentData.pdfFileId})</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-3">No PDF uploaded yet</p>
                )}

                {/* Report name + PDF filename row */}
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Report Name (in sheet):</span>
                    {ihEditingPdfReportName ? (
                      <>
                        <input
                          type="text"
                          value={ihEditedReportName}
                          onChange={(e) => setIhEditedReportName(e.target.value)}
                          className="input-field max-w-sm !py-1.5"
                          autoFocus
                        />
                        <button
                          onClick={() => setIhEditingPdfReportName(false)}
                          className="btn-secondary text-sm !px-4 !py-1"
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-gray-800">{ihEditedReportName || '(not set)'}</span>
                        <button
                          onClick={() => setIhEditingPdfReportName(true)}
                          className="btn-secondary text-sm !px-4 !py-1"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-sm text-right break-words min-w-0">
                    <span className="text-gray-600 whitespace-nowrap">PDF filename:</span>
                    <span className="text-gray-700 font-medium italic break-all">
                      {ihEditedReportName || ihCurrentData.reportName} - {ihEditedValidPeriod || ihCurrentData.validPeriod}.pdf
                    </span>
                  </div>
                </div>

                {/* Upload button + Save metadata button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className={`btn-secondary text-sm cursor-pointer ${
                      ihUploadingPdf ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      {ihUploadingPdf ? ihPdfProgress : (ihCurrentData.pdfDriveLink ? 'Replace PDF' : 'Upload PDF')}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={ihUploadingPdf}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleIhPdfUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {ihUploadingPdf && (
                      <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                    )}
                  </div>
                  <button
                    onClick={handleIhSaveMetadata}
                    disabled={ihSavingMetadata}
                    className="btn-primary text-sm"
                  >
                    {ihSavingMetadata ? 'Saving...' : 'Save Changes (above)'}
                  </button>
                </div>
              </div>

              {/* Current Main Body (always visible, read-only) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Current Main Body</label>
                  <span className="text-xs text-gray-400">Read-only (select &amp; copy enabled)</span>
                </div>
                <textarea
                  readOnly
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                  value={ihCurrentData.mainBody || '(empty)'}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 font-mono leading-relaxed overflow-hidden resize-none cursor-default select-text"
                />
              </div>

              {/* Action button: Load existing */}
              <div className="mb-6">
                <button
                  onClick={ihLoadExisting}
                  className="text-sm font-medium px-4 py-2 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  Load existing into editor
                </button>
              </div>

              {/* LGA Title */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-sm font-semibold text-blue-800">LGA Title:</span>
                <span className="text-sm text-blue-700 ml-2">{ihEditedReportName || ihCurrentData.reportName}</span>
                <span className="text-xs text-blue-500 ml-2">(auto-included at top of output)</span>
              </div>

              {/* Structured Section Editor */}
              <div className="space-y-6">
                {ihSections.map((section, sIdx) => (
                  <div key={sIdx} className="border border-gray-200 rounded-lg p-4 bg-white">
                    {/* Section heading (fixed, non-editable) */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex-1 px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-50 rounded-md border border-gray-200">
                        {section.heading}
                      </span>
                      <button
                        onClick={() => ihRemoveSection(sIdx)}
                        className="p-1.5 text-red-400 hover:text-red-600"
                        title="Remove section"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Items in this section */}
                    {section.items.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-start gap-2 mb-2 ml-4">
                        <span className="text-gray-400 mt-2 text-sm select-none">•</span>
                        <textarea
                          value={item}
                          onChange={(e) => ihUpdateItem(sIdx, iIdx, e.target.value)}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = Math.max(el.scrollHeight, 38) + 'px';
                            }
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.max(target.scrollHeight, 38) + 'px';
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                          placeholder="Enter text (no bullets or hyphens needed)..."
                          rows={1}
                        />
                        <button
                          onClick={() => ihRemoveItem(sIdx, iIdx)}
                          className="mt-1.5 p-1 text-red-400 hover:text-red-600"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add bullet/paragraph button */}
                    <button
                      onClick={() => ihAddItem(sIdx)}
                      className="ml-4 mt-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add bullet or paragraph
                    </button>
                  </div>
                ))}
              </div>

              {/* Add section dropdown */}
              {ihAvailableHeadings.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Add section:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        ihAddSection(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="" disabled>Select a section to add...</option>
                    {ihAvailableHeadings.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Save button */}
              <div className="flex items-center gap-4 pt-4 mt-6 border-t">
                <button
                  onClick={handleIhSave}
                  disabled={ihSaving || !ihHasChanges}
                  className={`px-6 py-2.5 rounded-md font-medium text-white ${
                    ihSaving || !ihHasChanges
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {ihSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleIhClear}
                  className="px-6 py-2.5 rounded-md font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {!ihHasChanges && (
                  <p className="text-sm text-gray-500">
                    Add items to sections above to enable saving.
                  </p>
                )}
              </div>
            </div>
          )}
          </>
          )}

        </div>
      </div>
    </div>
  );
}
