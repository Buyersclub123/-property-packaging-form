import { NextResponse } from 'next/server';
import { getEnvironmentVariables } from '@/lib/vercel';

const PROJECT_NAME = 'property-packaging-form';
const TEAM_ID = 'team_HCICkgEtqpNH4cacsrTLXLC9';
const VERCEL_API_BASE = 'https://api.vercel.com';

function getVercelToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('VERCEL_API_TOKEN environment variable is not set');
  }
  return token;
}

function fixCredentialsFormat(credentialsJson: string): string {
  // Parse the JSON
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

async function updateEnvironmentVariable(envId: string, value: string) {
  const token = getVercelToken();
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

export async function POST() {
  try {
    const envVars = await getEnvironmentVariables(PROJECT_NAME, TEAM_ID);
    
    const googleCreds = envVars.envs?.find((env: any) => env.key === 'GOOGLE_SHEETS_CREDENTIALS');
    
    if (!googleCreds) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEETS_CREDENTIALS not found in Vercel' },
        { status: 404 }
      );
    }

    const hasActualNewlines = googleCreds.value?.includes('\n');
    const hasEscapedNewlines = googleCreds.value?.includes('\\n');
    
    if (!hasActualNewlines) {
      return NextResponse.json({
        success: true,
        message: 'Credentials already in correct format (escaped newlines). No update needed.',
        hasActualNewlines: false,
        hasEscapedNewlines,
      });
    }

    const fixedValue = fixCredentialsFormat(googleCreds.value);
    await updateEnvironmentVariable(googleCreds.id, fixedValue);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully updated GOOGLE_SHEETS_CREDENTIALS in Vercel',
      fixed: true,
      beforeLength: googleCreds.value.length,
      afterLength: fixedValue.length,
    });
    
  } catch (error) {
    console.error('Error fixing Vercel credentials:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fix credentials',
      },
      { status: 500 }
    );
  }
}
