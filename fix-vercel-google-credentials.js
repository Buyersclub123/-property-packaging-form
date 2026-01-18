/**
 * Script to fix GOOGLE_SHEETS_CREDENTIALS in Vercel
 * Converts actual newlines to escaped \n format
 * 
 * Usage:
 *   node fix-vercel-google-credentials.js
 * 
 * Requires VERCEL_API_TOKEN in .env.local
 */

const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const VERCEL_API_BASE = 'https://api.vercel.com';
const PROJECT_NAME = 'property-packaging-form';
const TEAM_ID = 'team_HCICkgEtqpNH4cacsrTLXLC9';

async function getEnvironmentVariables() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('VERCEL_API_TOKEN not found in .env.local. Add it from https://vercel.com/account/tokens');
  }

  const url = `${VERCEL_API_BASE}/v10/projects/${PROJECT_NAME}/env?teamId=${TEAM_ID}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get environment variables: ${response.status} ${error}`);
  }

  return response.json();
}

async function updateEnvironmentVariable(envId, value) {
  const token = process.env.VERCEL_API_TOKEN;
  const url = `${VERCEL_API_BASE}/v10/projects/${PROJECT_NAME}/env/${envId}?teamId=${TEAM_ID}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update environment variable: ${response.status} ${error}`);
  }

  return response.json();
}

function fixCredentialsFormat(credentialsJson) {
  // Parse the JSON
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  // Fix the private key: convert actual newlines to escaped \n
  if (credentials.private_key) {
    // Replace actual newlines with escaped newlines
    credentials.private_key = credentials.private_key.replace(/\n/g, '\\n');
    // Also handle Windows-style line endings
    credentials.private_key = credentials.private_key.replace(/\r\n/g, '\\n');
    credentials.private_key = credentials.private_key.replace(/\r/g, '\\n');
  }

  // Stringify back to JSON (will escape newlines in the private_key)
  return JSON.stringify(credentials);
}

async function main() {
  try {
    console.log('Fetching environment variables from Vercel...');
    const envVars = await getEnvironmentVariables();
    
    const googleCreds = envVars.envs?.find(env => env.key === 'GOOGLE_SHEETS_CREDENTIALS');
    
    if (!googleCreds) {
      console.error('GOOGLE_SHEETS_CREDENTIALS not found in Vercel');
      process.exit(1);
    }

    console.log(`Found GOOGLE_SHEETS_CREDENTIALS (ID: ${googleCreds.id})`);
    console.log(`Current value length: ${googleCreds.value?.length || 0}`);
    
    // Check if it has actual newlines
    const hasActualNewlines = googleCreds.value?.includes('\n');
    const hasEscapedNewlines = googleCreds.value?.includes('\\n');
    
    console.log(`Has actual newlines: ${hasActualNewlines}`);
    console.log(`Has escaped newlines: ${hasEscapedNewlines}`);
    
    if (!hasActualNewlines) {
      console.log('Credentials already in correct format (escaped newlines). No update needed.');
      return;
    }

    console.log('Fixing format: converting actual newlines to escaped \\n...');
    const fixedValue = fixCredentialsFormat(googleCreds.value);
    
    console.log(`Fixed value length: ${fixedValue.length}`);
    console.log('Updating Vercel...');
    
    await updateEnvironmentVariable(googleCreds.id, fixedValue);
    
    console.log('✅ Successfully updated GOOGLE_SHEETS_CREDENTIALS in Vercel');
    console.log('Note: You may need to redeploy or wait a few minutes for the change to take effect.');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
