import { NextResponse } from 'next/server';
import { setEnvironmentVariable, getEnvironmentVariables } from '@/lib/vercel';

/**
 * API route to set up Vercel environment variables
 * This helps automate the setup process
 */
export async function POST(request: Request) {
  try {
    const { projectName, teamId, variables } = await request.json();

    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const results = [];

    // Set each environment variable
    for (const { key, value, environment = 'production' } of variables) {
      try {
        const result = await setEnvironmentVariable(
          projectName,
          key,
          value,
          environment,
          teamId
        );
        results.push({ key, success: true, result });
      } catch (error) {
        results.push({
          key,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get all environment variables to verify
    const allVars = await getEnvironmentVariables(projectName, teamId);

    return NextResponse.json({
      success: true,
      results,
      allEnvironmentVariables: allVars.envs || [],
    });
  } catch (error) {
    console.error('Error setting up Vercel:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup Vercel',
      },
      { status: 500 }
    );
  }
}

