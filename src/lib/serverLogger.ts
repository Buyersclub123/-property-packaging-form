import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'server-api.log');

/**
 * Log to both console and file
 * This allows us to read logs from file when terminal output isn't accessible
 */
export function serverLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
  
  // Log to console (terminal)
  console.log(logMessage);
  
  // Also log to file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n', 'utf8');
  } catch (error) {
    // If file write fails, just continue with console logging
    console.error('Failed to write to log file:', error);
  }
}
