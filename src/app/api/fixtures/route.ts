import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/server/db/pool';
import { footballClient } from '@/core/api/football';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gwParam = searchParams.get('gw');
  const gwNumber = gwParam ? parseInt(gwParam, 10) : undefined;

  try {
    // 1. Try querying PostgreSQL
    let currentGw = gwNumber;
    if (!currentGw) {
      const gwRes = await query<{ gameweek_number: number }>(
        'SELECT gameweek_number FROM gameweeks WHERE is_current = TRUE LIMIT 1'
      );
      if (gwRes.rows.length > 0) {
        currentGw = gwRes.rows[0].gameweek_number;
      } else {
        currentGw = 28; // default fallback gameweek
      }
    }

    const fixturesRes = await query(
      `
      SELECT 
        f.id,
        f.external_id,
        f.gameweek_id,
        f.kickoff_time,
        f.status,
        f.home_score,
        f.away_score,
        f.settled_at,
        gw.gameweek_number,
        json_build_object(
          'id', ht.id,
          'external_id', ht.external_id,
          'name', ht.name,
          'short_name', ht.short_name,
          'tla', ht.tla,
          'crest_url', ht.crest_url
        ) AS home_team,
        json_build_object(
          'id', at.id,
          'external_id', at.external_id,
          'name', at.name,
          'short_name', at.short_name,
          'tla', at.tla,
          'crest_url', at.crest_url
        ) AS away_team
      FROM fixtures f
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE gw.gameweek_number = $1
      ORDER BY f.kickoff_time ASC
      `,
      [currentGw]
    );

    if (fixturesRes.rows.length > 0) {
      return NextResponse.json({
        gameweek: currentGw,
        fixtures: fixturesRes.rows,
        source: 'db',
      });
    }
  } catch (dbErr: any) {
    console.warn(
      '[API /api/fixtures] DB query failed or empty, falling back to FootballApiClient:',
      dbErr.message
    );
  }

  // 2. Fallback to FootballApiClient
  try {
    const res = await footballClient.getFixtures('PL', gwNumber);
    const fixtures = res.matches;
    const normalizedFixtures = fixtures.map((f) => ({
      id: String(f.id),
      external_id: f.id,
      gameweek_id: String(f.gameweek),
      kickoff_time: f.utcDate,
      status: f.status,
      home_score: f.homeScore,
      away_score: f.awayScore,
      settled_at: f.status === 'FINISHED' ? f.utcDate : null,
      gameweek_number: f.gameweek,
      home_team: {
        id: String(f.homeTeam.id),
        external_id: f.homeTeam.id,
        name: f.homeTeam.name,
        short_name: f.homeTeam.shortName,
        tla: f.homeTeam.tla,
        crest_url: f.homeTeam.crest,
      },
      away_team: {
        id: String(f.awayTeam.id),
        external_id: f.awayTeam.id,
        name: f.awayTeam.name,
        short_name: f.awayTeam.shortName,
        tla: f.awayTeam.tla,
        crest_url: f.awayTeam.crest,
      },
    }));

    return NextResponse.json({
      gameweek: gwNumber || res.currentMatchday || 4,
      fixtures: normalizedFixtures,
      source: 'api',
    });
  } catch (apiErr: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve fixtures', details: apiErr.message },
      { status: 500 }
    );
  }
}
