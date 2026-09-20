import { NextRequest, NextResponse } from 'next/server';
import { syncFootballData } from '@/server/services/football-sync';

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');

  // Verify secret if configured in environment
  if (cronSecret) {
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    const isBearerValid = authHeader === `Bearer ${cronSecret}`;
    const isQueryValid = querySecret === cronSecret;

    if (!isBearerValid && !isQueryValid && !isVercelCron) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid CRON_SECRET' },
        { status: 401 }
      );
    }
  }

  try {
    const result = await syncFootballData();
    return NextResponse.json({
      success: true,
      synced: result,
    });
  } catch (error: any) {
    console.error('[API Cron sync-fixtures error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync football data',
      },
      { status: 500 }
    );
  }
}
