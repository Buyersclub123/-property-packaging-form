// Vercel API integration for managing deployments and environment variables

const VERCEL_API_BASE = process.env.VERCEL_API_BASE_URL || 'https://api.vercel.com';

/**
 * Get Vercel API token from environment
 */
function getVercelToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('VERCEL_API_TOKEN environment variable is not set');
  }
  return token;
}

/**
 * Get Vercel team/project info
 */
export async function getVercelProjectInfo(projectName: string, teamId?: string) {
  const token = getVercelToken();
  const url = teamId 
    ? `${VERCEL_API_BASE}/v9/projects/${projectName}?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v9/projects/${projectName}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get project info: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Set environment variable in Vercel project
 */
export async function setEnvironmentVariable(
  projectName: string,
  key: string,
  value: string,
  environment: 'production' | 'preview' | 'development' = 'production',
  teamId?: string
) {
  const token = getVercelToken();
  const url = teamId
    ? `${VERCEL_API_BASE}/v10/projects/${projectName}/env?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v10/projects/${projectName}/env`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value,
      type: 'encrypted', // Encrypt sensitive values
      target: [environment], // production, preview, or development
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to set environment variable: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get all environment variables for a project
 */
export async function getEnvironmentVariables(
  projectName: string,
  teamId?: string
) {
  const token = getVercelToken();
  const url = teamId
    ? `${VERCEL_API_BASE}/v10/projects/${projectName}/env?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v10/projects/${projectName}/env`;

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

/**
 * Trigger a deployment
 */
export async function triggerDeployment(
  projectName: string,
  gitRef: string = 'main',
  teamId?: string
) {
  const token = getVercelToken();
  const url = teamId
    ? `${VERCEL_API_BASE}/v13/deployments?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v13/deployments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      gitSource: {
        type: 'github',
        ref: gitRef,
        repo: projectName, // Adjust if repo name differs
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger deployment: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  deploymentId: string,
  teamId?: string
) {
  const token = getVercelToken();
  const url = teamId
    ? `${VERCEL_API_BASE}/v13/deployments/${deploymentId}?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v13/deployments/${deploymentId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get deployment status: ${response.status} ${error}`);
  }

  return response.json();
}

