/**
 * Request Logging Utility
 * 
 * Logs all API requests for monitoring and debugging
 * 
 * Features:
 * - Logs to file with rotation
 * - Tracks IP, endpoint, timestamp, response status
 * - Daily summaries for email alerts
 */

import { writeFile, appendFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'api-requests.log');

interface LogEntry {
  timestamp: string;
  ip: string;
  endpoint: string;
  method: string;
  status: number;
  duration?: number;
  error?: string;
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
 * Log an API request
 */
export async function logRequest(entry: LogEntry) {
  try {
    await ensureLogDir();
    
    const logLine = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + '\n';
    
    await appendFile(LOG_FILE, logLine, 'utf-8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Get today's log entries
 */
export async function getTodayLogs(): Promise<LogEntry[]> {
  try {
    if (!existsSync(LOG_FILE)) {
      return [];
    }
    
    const content = await readFile(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    const today = new Date().toISOString().split('T')[0];
    
    return lines
      .map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => {
        if (!entry) return false;
        return entry.timestamp.startsWith(today);
      });
  } catch (error) {
    console.error('Failed to read log file:', error);
    return [];
  }
}

/**
 * Get log summary for daily email
 */
export async function getLogSummary(): Promise<{
  totalRequests: number;
  uniqueIPs: number;
  errorCount: number;
  topEndpoints: { endpoint: string; count: number }[];
  topIPs: { ip: string; count: number }[];
  errors: { timestamp: string; ip: string; endpoint: string; error: string }[];
}> {
  const logs = await getTodayLogs();
  
  const uniqueIPs = new Set(logs.map(l => l.ip));
  const errorCount = logs.filter(l => l.status >= 400).length;
  
  // Count endpoints
  const endpointCounts = new Map<string, number>();
  logs.forEach(log => {
    endpointCounts.set(log.endpoint, (endpointCounts.get(log.endpoint) || 0) + 1);
  });
  
  // Count IPs
  const ipCounts = new Map<string, number>();
  logs.forEach(log => {
    ipCounts.set(log.ip, (ipCounts.get(log.ip) || 0) + 1);
  });
  
  // Get top endpoints
  const topEndpoints = Array.from(endpointCounts.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Get top IPs
  const topIPs = Array.from(ipCounts.entries())
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Get errors
  const errors = logs
    .filter(l => l.status >= 400)
    .map(l => ({
      timestamp: l.timestamp,
      ip: l.ip,
      endpoint: l.endpoint,
      error: l.error || `HTTP ${l.status}`,
    }))
    .slice(0, 20);
  
  return {
    totalRequests: logs.length,
    uniqueIPs: uniqueIPs.size,
    errorCount,
    topEndpoints,
    topIPs,
    errors,
  };
}

/**
 * Rotate log file (keep last 7 days)
 */
export async function rotateLogFile() {
  try {
    if (!existsSync(LOG_FILE)) return;
    
    const content = await readFile(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();
    
    // Keep only logs from last 7 days
    const recentLogs = lines.filter(line => {
      try {
        const entry = JSON.parse(line) as LogEntry;
        return entry.timestamp >= cutoffDate;
      } catch {
        return false;
      }
    });
    
    await writeFile(LOG_FILE, recentLogs.join('\n') + '\n', 'utf-8');
  } catch (error) {
    console.error('Failed to rotate log file:', error);
  }
}
