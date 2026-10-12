import { NextRequest, NextResponse } from 'next/server';
import { footballClient } from '@/core/api/football';

export async function GET(req: NextRequest) {
  try {
    const compParam = (req.nextUrl.searchParams.get('comp') || 'PL').toUpperCase();
    const standingsData = await footballClient.getStandings(compParam);

    return NextResponse.json({
      leagueId: standingsData.leagueId,
      leagueName: standingsData.leagueName,
      season: standingsData.season,
      table: standingsData.table,
    });
  } catch (err: any) {
    console.error('[API /api/standings error]:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve standings', details: err.message },
      { status: 500 }
    );
  }
}
