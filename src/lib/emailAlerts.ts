/**
 * Email Alert Utility
 * 
 * Sends email alerts for suspicious activity and daily summaries
 * 
 * Features:
 * - Gmail SMTP integration
 * - Rate limit violation alerts
 * - Daily cost threshold alerts
 * - Daily usage summaries
 */

import nodemailer from 'nodemailer';
import { getLogSummary } from './requestLogger';
import { getRateLimitStatus } from './rateLimit';

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER;
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO;
const ALERT_DAILY_COST_THRESHOLD = parseFloat(process.env.ALERT_DAILY_COST_THRESHOLD || '5');

// Track last alert time to prevent spam
const lastAlertTime = new Map<string, number>();
const ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hour

/**
 * Create nodemailer transporter
 */
function createTransporter() {
  if (!ALERT_EMAIL_USER || !ALERT_EMAIL_PASSWORD) {
    throw new Error('Email configuration missing. Set ALERT_EMAIL_USER and ALERT_EMAIL_PASSWORD in .env');
  }
  
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: ALERT_EMAIL_USER,
      pass: ALERT_EMAIL_PASSWORD,
    },
  });
}

/**
 * Check if we should send an alert (respect cooldown)
 */
function shouldSendAlert(alertType: string): boolean {
  const lastTime = lastAlertTime.get(alertType);
  if (!lastTime) return true;
  
  return Date.now() - lastTime > ALERT_COOLDOWN;
}

/**
 * Mark alert as sent
 */
function markAlertSent(alertType: string) {
  lastAlertTime.set(alertType, Date.now());
}

/**
 * Send rate limit violation alert
 */
export async function sendRateLimitAlert(ip: string, reason: string) {
  if (!shouldSendAlert(`rate-limit-${ip}`)) {
    console.log(`Rate limit alert for ${ip} skipped (cooldown)`);
    return;
  }
  
  try {
    const transporter = createTransporter();
    const status = getRateLimitStatus();
    
    await transporter.sendMail({
      from: ALERT_EMAIL_USER,
      to: ALERT_EMAIL_TO,
      subject: '🚨 Rate Limit Exceeded - Property Review System',
      html: `
        <h2>Rate Limit Alert</h2>
        <p><strong>IP Address:</strong> ${ip}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Current Status:</h3>
        <ul>
          <li>Global Daily Requests: ${status.globalDaily} / ${status.globalDailyLimit}</li>
          <li>Active IPs (Hourly): ${status.activeIPs.hourly}</li>
          <li>Active IPs (Burst): ${status.activeIPs.burst}</li>
        </ul>
        
        <h3>Configured Limits:</h3>
        <ul>
          <li>Per Hour: ${status.limits.perHour}</li>
          <li>Burst (5 min): ${status.limits.burst5Min}</li>
          <li>Global Daily: ${status.limits.globalDaily}</li>
        </ul>
        
        <p><em>This alert will not repeat for this IP for 1 hour.</em></p>
      `,
    });
    
    markAlertSent(`rate-limit-${ip}`);
    console.log(`Rate limit alert sent for IP: ${ip}`);
  } catch (error) {
    console.error('Failed to send rate limit alert:', error);
  }
}

/**
 * Send daily cost threshold alert
 */
export async function sendCostThresholdAlert(estimatedCost: number, requestCount: number) {
  if (!shouldSendAlert('cost-threshold')) {
    console.log('Cost threshold alert skipped (cooldown)');
    return;
  }
  
  try {
    const transporter = createTransporter();
    const summary = await getLogSummary();
    
    await transporter.sendMail({
      from: ALERT_EMAIL_USER,
      to: ALERT_EMAIL_TO,
      subject: '💰 Daily Cost Threshold Exceeded - Property Review System',
      html: `
        <h2>Cost Alert</h2>
        <p><strong>Estimated Daily Cost:</strong> $${estimatedCost.toFixed(2)}</p>
        <p><strong>Threshold:</strong> $${ALERT_DAILY_COST_THRESHOLD.toFixed(2)}</p>
        <p><strong>Total Requests Today:</strong> ${requestCount}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Top IPs Today:</h3>
        <ul>
          ${summary.topIPs.slice(0, 5).map(ip => `<li>${ip.ip}: ${ip.count} requests</li>`).join('')}
        </ul>
        
        <h3>Top Endpoints:</h3>
        <ul>
          ${summary.topEndpoints.map(ep => `<li>${ep.endpoint}: ${ep.count} requests</li>`).join('')}
        </ul>
        
        <p><strong>Action Required:</strong> Review the usage and consider adjusting rate limits or investigating suspicious IPs.</p>
        
        <p><em>This alert will not repeat for 1 hour.</em></p>
      `,
    });
    
    markAlertSent('cost-threshold');
    console.log(`Cost threshold alert sent: $${estimatedCost}`);
  } catch (error) {
    console.error('Failed to send cost threshold alert:', error);
  }
}

/**
 * Send daily summary email
 */
export async function sendDailySummary() {
  try {
    const transporter = createTransporter();
    const summary = await getLogSummary();
    const status = getRateLimitStatus();
    
    // Estimate cost (rough calculation: ~$5 per 1000 Distance Matrix requests)
    // Each proximity call makes ~26 Distance Matrix requests
    const proximityRequests = summary.topEndpoints
      .find(ep => ep.endpoint.includes('proximity'))?.count || 0;
    const estimatedDistanceMatrixCalls = proximityRequests * 26;
    const estimatedCost = (estimatedDistanceMatrixCalls / 1000) * 5;
    
    await transporter.sendMail({
      from: ALERT_EMAIL_USER,
      to: ALERT_EMAIL_TO,
      subject: `📊 Daily API Usage Summary - ${new Date().toLocaleDateString()}`,
      html: `
        <h2>Daily API Usage Summary</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>Overview:</h3>
        <ul>
          <li><strong>Total Requests:</strong> ${summary.totalRequests}</li>
          <li><strong>Unique IPs:</strong> ${summary.uniqueIPs}</li>
          <li><strong>Errors:</strong> ${summary.errorCount}</li>
          <li><strong>Estimated Cost:</strong> $${estimatedCost.toFixed(2)}</li>
        </ul>
        
        <h3>Rate Limit Status:</h3>
        <ul>
          <li>Global Daily: ${status.globalDaily} / ${status.globalDailyLimit}</li>
          <li>Active IPs: ${status.activeIPs.hourly}</li>
        </ul>
        
        <h3>Top 10 IPs:</h3>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>IP Address</th><th>Requests</th></tr>
          ${summary.topIPs.map(ip => `<tr><td>${ip.ip}</td><td>${ip.count}</td></tr>`).join('')}
        </table>
        
        <h3>Top Endpoints:</h3>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>Endpoint</th><th>Requests</th></tr>
          ${summary.topEndpoints.map(ep => `<tr><td>${ep.endpoint}</td><td>${ep.count}</td></tr>`).join('')}
        </table>
        
        ${summary.errors.length > 0 ? `
          <h3>Recent Errors (Last 20):</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <tr><th>Time</th><th>IP</th><th>Endpoint</th><th>Error</th></tr>
            ${summary.errors.map(err => `
              <tr>
                <td>${new Date(err.timestamp).toLocaleTimeString()}</td>
                <td>${err.ip}</td>
                <td>${err.endpoint}</td>
                <td>${err.error}</td>
              </tr>
            `).join('')}
          </table>
        ` : '<p><em>No errors today!</em></p>'}
        
        <hr>
        <p><small>This is an automated daily summary from the Property Review System.</small></p>
      `,
    });
    
    console.log('Daily summary email sent');
  } catch (error) {
    console.error('Failed to send daily summary:', error);
  }
}

/**
 * Send burst activity alert
 */
export async function sendBurstActivityAlert(ip: string, requestCount: number) {
  if (!shouldSendAlert(`burst-${ip}`)) {
    console.log(`Burst activity alert for ${ip} skipped (cooldown)`);
    return;
  }
  
  try {
    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: ALERT_EMAIL_USER,
      to: ALERT_EMAIL_TO,
      subject: '⚡ Burst Activity Detected - Property Review System',
      html: `
        <h2>Burst Activity Alert</h2>
        <p><strong>IP Address:</strong> ${ip}</p>
        <p><strong>Requests in 5 minutes:</strong> ${requestCount}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        
        <p>This IP has made an unusually high number of requests in a short time period.</p>
        
        <p><strong>Possible Causes:</strong></p>
        <ul>
          <li>Automated script or bot</li>
          <li>Browser refresh loop</li>
          <li>Development/testing activity</li>
          <li>Malicious activity</li>
        </ul>
        
        <p><strong>Action:</strong> Review the logs and consider blocking this IP if the activity continues.</p>
        
        <p><em>This alert will not repeat for this IP for 1 hour.</em></p>
      `,
    });
    
    markAlertSent(`burst-${ip}`);
    console.log(`Burst activity alert sent for IP: ${ip}`);
  } catch (error) {
    console.error('Failed to send burst activity alert:', error);
  }
}
