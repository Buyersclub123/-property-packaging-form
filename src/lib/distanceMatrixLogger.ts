/**
 * Distance Matrix API Observational Logger
 * 
 * Purely observational logging - no functional code changes
 * Extracts data from existing request headers and body
 * Infers trigger sources from HTTP headers
 * Optionally links to GHL records (non-blocking)
 */

import { writeFile, appendFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import axios from 'axios';
import { getSheetsClient } from './googleSheets';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'distance-matrix-usage.log');

// Google Sheets logging (for production/Vercel)
const LOG_SHEET_ID = process.env.GOOGLE_SHEET_ID_DISTANCE_MATRIX_LOGS || process.env.GOOGLE_SHEET_ID_MARKET_PERFORMANCE || '';
const LOG_SHEET_TAB = 'Distance Matrix Logs';

export interface ObservationalLogEntry {
  timestamp: string;
  userEmail: string | null;
  propertyAddress: string | null;
  triggerSource: string; // 'form-step5' | 'form-early-processing' | 'make-com' | 'portal' | 'test' | 'unknown'
  process: string | null; // 'property-form-completion' | 'deal-sheet-update' | 'portal-opening' | 'client-selection' | null
  ghlRecordId: string | null;
  ghlRecordLink: string | null;
  apiCallCount: number;
  destinationsCount: number;
  requestHeaders: {
    referer: string | null;
    userAgent: string | null;
    origin: string | null;
  };
  requestBody: {
    propertyAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    userEmail: string | null;
  };
  clientIP: string;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Infer trigger source from request headers and body
 */
function inferTriggerSource(
  referer: string | null,
  origin: string | null,
  userAgent: string | null,
  propertyAddress: string | null
): { triggerSource: string; process: string | null } {
  // Check referer for form pages
  if (referer) {
    if (referer.includes('/form') || referer.includes('property-packaging')) {
      // Check if it's early processing (Step 3-4 transition)
      if (referer.includes('step=3') || referer.includes('step=4')) {
        return { triggerSource: 'form-early-processing', process: 'property-form-completion' };
      }
      // Check if it's Step 5 (ProximityField)
      if (referer.includes('step=5') || referer.includes('step5')) {
        return { triggerSource: 'form-step5', process: 'property-form-completion' };
      }
      // General form usage
      return { triggerSource: 'form', process: 'property-form-completion' };
    }
    
    // Check for portal
    if (referer.includes('portal') || referer.includes('buyersclub123.github.io')) {
      return { triggerSource: 'portal', process: 'portal-opening' };
    }
    
    // Check for test pages
    if (referer.includes('test') || referer.includes('localhost:3000/test')) {
      return { triggerSource: 'test', process: null };
    }
  }
  
  // Check origin
  if (origin) {
    if (origin.includes('make.com') || origin.includes('hook.eu1.make.com')) {
      return { triggerSource: 'make-com', process: null };
    }
  }
  
  // Check user agent for Make.com
  if (userAgent && (userAgent.includes('Make') || userAgent.includes('Integromat'))) {
    return { triggerSource: 'make-com', process: null };
  }
  
  // Default to unknown
  return { triggerSource: 'unknown', process: null };
}

/**
 * Attempt to find GHL record by address (non-blocking, optional)
 */
async function findGhlRecordByAddressOptional(
  address: string | null
): Promise<{ recordId: string | null; recordLink: string | null }> {
  if (!address) {
    return { recordId: null, recordLink: null };
  }
  
  try {
    // Call GHL check-address API (non-blocking, with timeout)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await axios.post(
      `${baseUrl}/api/ghl/check-address`,
      { address },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2000, // 2 second timeout
      }
    );
    
    if (response.data?.recordId) {
      const recordLink = `https://app.gohighlevel.com/custom-objects/692d04e3662599ed0c29edfa/records/${response.data.recordId}`;
      return { recordId: response.data.recordId, recordLink };
    }
  } catch (error) {
    // Silently fail - this is optional
    console.debug('GHL record lookup failed (optional):', error);
  }
  
  return { recordId: null, recordLink: null };
}

/**
 * Log to Google Sheets (for production/Vercel)
 */
async function logToGoogleSheets(entry: ObservationalLogEntry): Promise<void> {
  if (!LOG_SHEET_ID) {
    throw new Error('No Google Sheet ID configured for Distance Matrix logging');
  }
  
  const sheets = getSheetsClient();
  
  // Prepare row data
  const row = [
    entry.timestamp,
    entry.userEmail || '',
    entry.propertyAddress || '',
    entry.triggerSource,
    entry.process || '',
    entry.ghlRecordId || '',
    entry.ghlRecordLink || '',
    entry.apiCallCount.toString(),
    entry.destinationsCount.toString(),
    entry.clientIP,
    entry.duration.toString(),
    entry.success ? 'Yes' : 'No',
    entry.error || '',
    entry.requestHeaders.referer || '',
    entry.requestHeaders.userAgent || '',
    entry.requestHeaders.origin || '',
  ];
  
  // Append to sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: LOG_SHEET_ID,
    range: `${LOG_SHEET_TAB}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Ensure log directory exists
 */
async function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true });
  }
}

/**
 * Log Distance Matrix API usage (observational, non-blocking)
 */
export async function logDistanceMatrixUsage(
  request: Request,
  clientIP: string,
  requestBody: {
    propertyAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    userEmail: string | null;
  },
  apiCallCount: number,
  destinationsCount: number,
  duration: number,
  success: boolean,
  error?: string
): Promise<void> {
  // Log that we're attempting to log (for debugging)
  console.log('🔍 [Distance Matrix Logger] Attempting to log:', {
    apiCallCount,
    destinationsCount,
    address: requestBody.propertyAddress || 'unknown',
    user: requestBody.userEmail || 'unknown',
  });
  
  // Run in background - don't block the request
  setImmediate(async () => {
    try {
      // Try to ensure log directory exists (will fail in Vercel, that's OK)
      try {
        await ensureLogDir();
      } catch (dirError) {
        // Directory creation failed (expected in Vercel) - continue with logging
        // We'll fall back to console/Google Sheets
      }
      
      // Extract headers
      const referer = request.headers.get('referer');
      const userAgent = request.headers.get('user-agent');
      const origin = request.headers.get('origin');
      
      // Infer trigger source
      const { triggerSource, process } = inferTriggerSource(
        referer,
        origin,
        userAgent,
        requestBody.propertyAddress
      );
      
      // Attempt GHL record lookup (non-blocking, with timeout)
      const ghlLookup = await findGhlRecordByAddressOptional(requestBody.propertyAddress);
      
      // Build log entry
      const entry: ObservationalLogEntry = {
        timestamp: new Date().toISOString(),
        userEmail: requestBody.userEmail,
        propertyAddress: requestBody.propertyAddress,
        triggerSource,
        process,
        ghlRecordId: ghlLookup.recordId,
        ghlRecordLink: ghlLookup.recordLink,
        apiCallCount,
        destinationsCount,
        requestHeaders: {
          referer,
          userAgent,
          origin,
        },
        requestBody,
        clientIP,
        duration,
        success,
        error,
      };
      
      // Try file logging first (dev environment)
      try {
        const logLine = JSON.stringify(entry) + '\n';
        await appendFile(LOG_FILE, logLine, 'utf-8');
      } catch (fileError) {
        // File logging failed (likely Vercel production) - fall back to Google Sheets
        try {
          await logToGoogleSheets(entry);
        } catch (sheetsError) {
          // Both failed - just log to console (Vercel captures this)
          console.error('Both file and Google Sheets logging failed:', sheetsError);
        }
      }
      
      // Always log to console (Vercel captures this)
      // Log summary for quick reading
      console.log('📊 [Distance Matrix Logger] Logged:', {
        timestamp: entry.timestamp,
        user: entry.userEmail || 'unknown',
        address: entry.propertyAddress || 'unknown',
        trigger: entry.triggerSource,
        process: entry.process || 'unknown',
        apiCalls: entry.apiCallCount,
        destinations: entry.destinationsCount,
        ghlRecord: entry.ghlRecordId || 'not found',
        success: entry.success,
        duration: entry.duration + 'ms',
      });
      
      // Also log full JSON for complete details (searchable in Vercel)
      console.log('📊 [Distance Matrix Logger] Full Entry JSON:', JSON.stringify(entry));
    } catch (error) {
      // Silently fail - logging should never break the request
      console.error('Distance Matrix Logger error (non-blocking):', error);
    }
  });
}

/**
 * Get logs for dashboard
 */
export async function getDistanceMatrixLogs(
  limit: number = 100,
  startDate?: string,
  endDate?: string
): Promise<ObservationalLogEntry[]> {
  try {
    // Try file first (dev), then Google Sheets (production)
    if (existsSync(LOG_FILE)) {
      const content = await readFile(LOG_FILE, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
    
    let entries = lines
      .map(line => {
        try {
          return JSON.parse(line) as ObservationalLogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ObservationalLogEntry => entry !== null);
    
    // Filter by date range if provided
    if (startDate || endDate) {
      entries = entries.filter(entry => {
        const entryDate = entry.timestamp.split('T')[0];
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }
    
    // Sort by timestamp (newest first) and limit
    return entries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    } else if (LOG_SHEET_ID) {
      // Fall back to Google Sheets (production)
      return await getLogsFromGoogleSheets(limit, startDate, endDate);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Failed to read Distance Matrix logs:', error);
    return [];
  }
}

/**
 * Get logs from Google Sheets (production)
 */
async function getLogsFromGoogleSheets(
  limit: number,
  startDate?: string,
  endDate?: string
): Promise<ObservationalLogEntry[]> {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: LOG_SHEET_ID,
      range: `${LOG_SHEET_TAB}!A2:Z`, // Skip header row
    });
    
    const rows = response.data.values || [];
    
    // Convert rows to log entries (skip header)
    const entries: ObservationalLogEntry[] = rows
      .map((row): ObservationalLogEntry | null => {
        try {
          return {
            timestamp: row[0] || '',
            userEmail: row[1] || null,
            propertyAddress: row[2] || null,
            triggerSource: row[3] || 'unknown',
            process: row[4] || null,
            ghlRecordId: row[5] || null,
            ghlRecordLink: row[6] || null,
            apiCallCount: parseInt(row[7] || '0', 10),
            destinationsCount: parseInt(row[8] || '0', 10),
            requestHeaders: {
              referer: row[13] || null,
              userAgent: row[14] || null,
              origin: row[15] || null,
            },
            requestBody: {
              propertyAddress: row[2] || null,
              latitude: null, // Not stored in sheet
              longitude: null, // Not stored in sheet
              userEmail: row[1] || null,
            },
            clientIP: row[9] || '',
            duration: parseInt(row[10] || '0', 10),
            success: row[11] === 'Yes',
            error: row[12] || undefined,
          };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ObservationalLogEntry => entry !== null);
    
    // Filter by date range if provided
    let filtered = entries;
    if (startDate || endDate) {
      filtered = entries.filter(entry => {
        const entryDate = entry.timestamp.split('T')[0];
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }
    
    // Sort by timestamp (newest first) and limit
    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to read logs from Google Sheets:', error);
    return [];
  }
}

/**
 * Get statistics for dashboard
 */
export async function getDistanceMatrixStats(
  startDate?: string,
  endDate?: string
): Promise<{
  totalCalls: number;
  totalApiCalls: number;
  uniqueUsers: number;
  uniqueAddresses: number;
  byTriggerSource: Record<string, number>;
  byProcess: Record<string, number>;
  byUser: Array<{ userEmail: string; count: number }>;
  recentLogs: ObservationalLogEntry[];
}> {
  const logs = await getDistanceMatrixLogs(1000, startDate, endDate);
  
  const uniqueUsers = new Set(logs.map(l => l.userEmail).filter(Boolean));
  const uniqueAddresses = new Set(logs.map(l => l.propertyAddress).filter(Boolean));
  
  // Count by trigger source
  const byTriggerSource: Record<string, number> = {};
  logs.forEach(log => {
    byTriggerSource[log.triggerSource] = (byTriggerSource[log.triggerSource] || 0) + 1;
  });
  
  // Count by process
  const byProcess: Record<string, number> = {};
  logs.forEach(log => {
    const process = log.process || 'unknown';
    byProcess[process] = (byProcess[process] || 0) + 1;
  });
  
  // Count by user
  const userCounts = new Map<string, number>();
  logs.forEach(log => {
    if (log.userEmail) {
      userCounts.set(log.userEmail, (userCounts.get(log.userEmail) || 0) + 1);
    }
  });
  const byUser = Array.from(userCounts.entries())
    .map(([userEmail, count]) => ({ userEmail, count }))
    .sort((a, b) => b.count - a.count);
  
  const totalApiCalls = logs.reduce((sum, log) => sum + log.apiCallCount, 0);
  
  return {
    totalCalls: logs.length,
    totalApiCalls,
    uniqueUsers: uniqueUsers.size,
    uniqueAddresses: uniqueAddresses.size,
    byTriggerSource,
    byProcess,
    byUser,
    recentLogs: logs.slice(0, 50),
  };
}
