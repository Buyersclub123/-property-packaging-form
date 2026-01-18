// Test script to validate Google credentials format
const fs = require('fs');
const path = require('path');

console.log('Testing Google credentials...\n');

// Read .env.local directly
const envPath = path.join(__dirname, '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('❌ Could not read .env.local:', error.message);
  process.exit(1);
}

// Parse .env.local manually - handle multi-line and quoted values
let credentialsJson = '';
const credMatch = envContent.match(/^GOOGLE_SHEETS_CREDENTIALS=(.+?)(?=\n[A-Z_]|$)/ms);
if (credMatch) {
  credentialsJson = credMatch[1].trim();
  // Remove quotes if wrapped (handle both single and double quotes)
  if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
    credentialsJson = credentialsJson.slice(1, -1);
  } else if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
} else {
  console.error('❌ GOOGLE_SHEETS_CREDENTIALS not found in .env.local');
  process.exit(1);
}

if (!credentialsJson) {
  console.error('❌ GOOGLE_SHEETS_CREDENTIALS not found in .env.local');
  process.exit(1);
}

console.log('✓ Found GOOGLE_SHEETS_CREDENTIALS');
console.log('Length:', credentialsJson.length);
console.log('First 50 chars:', credentialsJson.substring(0, 50));
console.log('Last 50 chars:', credentialsJson.substring(credentialsJson.length - 50));

// Remove quotes if present
credentialsJson = credentialsJson.trim();
if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
  credentialsJson = credentialsJson.slice(1, -1);
}
if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
  credentialsJson = credentialsJson.slice(1, -1);
}

// Try to parse
let credentials;
try {
  credentials = JSON.parse(credentialsJson);
  console.log('\n✓ JSON parsed successfully');
} catch (error) {
  console.error('\n❌ JSON parse failed:', error.message);
  process.exit(1);
}

// Validate structure
if (!credentials.private_key) {
  console.error('❌ Missing private_key');
  process.exit(1);
}
if (!credentials.client_email) {
  console.error('❌ Missing client_email');
  process.exit(1);
}

console.log('✓ Has private_key:', credentials.private_key.substring(0, 30) + '...');
console.log('✓ Has client_email:', credentials.client_email);

// Check private key format
const hasBegin = credentials.private_key.includes('-----BEGIN PRIVATE KEY-----');
const hasEnd = credentials.private_key.includes('-----END PRIVATE KEY-----');
const hasNewlines = credentials.private_key.includes('\n');

console.log('\nPrivate key format:');
console.log('  Has BEGIN marker:', hasBegin);
console.log('  Has END marker:', hasEnd);
console.log('  Has newlines:', hasNewlines);
console.log('  Length:', credentials.private_key.length);

if (!hasBegin || !hasEnd) {
  console.error('\n❌ Private key missing BEGIN or END markers');
  process.exit(1);
}

// Check if newlines are escaped
const hasEscapedNewlines = credentials.private_key.includes('\\n');
if (hasEscapedNewlines && !hasNewlines) {
  console.warn('\n⚠️  WARNING: Private key has escaped newlines (\\n) but no actual newlines');
  console.warn('   This might cause JWT signature errors');
  console.warn('   The code should convert \\n to \\n, but if it\'s not working,');
  console.warn('   you may need to regenerate the credentials from Google Cloud Console');
}

console.log('\n✓ Credentials structure looks valid');
console.log('\nIf you still get JWT errors, the service account key may have been rotated.');
console.log('Regenerate it from: https://console.cloud.google.com/iam-admin/serviceaccounts');
