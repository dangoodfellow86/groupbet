import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/server/db/pool';
import { footballClient } from '@/core/api/football';
import { syncFootballData } from '@/server/services/football-sync';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gwParam = searchParams.get('gw');
  const compParam = (searchParams.get('comp') || 'PL').toUpperCase();
  const shouldRefresh = searchParams.get('refresh') === 'true';
  const gwNumber = gwParam ? parseInt(gwParam, 10) : undefined;

  // On-demand sync when requested (e.g. user clicked refresh in UI)
  if (shouldRefresh) {
    try {
      await syncFootballData(compParam);
    } catch (syncErr: any) {
      console.warn(`[API /api/fixtures] On-demand sync failed for ${compParam}:`, syncErr.message);
    }
  }

  try {
    // 1. Resolve competition metadata
    const compRes = await query<{ id: string; name: string; code: string }>(
      'SELECT id, name, code FROM competitions WHERE UPPER(code) = $1 LIMIT 1',
      [compParam]
    );
    const comp = compRes.rows[0];
    const compId = comp?.id;

    // 2. Determine active and target gameweek
    let activeGameweek = 1;
    if (compId) {
      const activeGwRes = await query<{ gameweek_number: number }>(
        'SELECT gameweek_number FROM gameweeks WHERE competition_id = $1 AND is_current = TRUE LIMIT 1',
        [compId]
      );
      if (activeGwRes.rows[0]) {
        activeGameweek = activeGwRes.rows[0].gameweek_number;
      } else {
        const nextGwRes = await query<{ gameweek_number: number }>(
          'SELECT gameweek_number FROM gameweeks WHERE competition_id = $1 AND is_completed = FALSE ORDER BY gameweek_number ASC LIMIT 1',
          [compId]
        );
        activeGameweek = nextGwRes.rows[0]?.gameweek_number || 1;
      }
    } else {
      const fallbackGwRes = await query<{ gameweek_number: number }>(
        'SELECT gameweek_number FROM gameweeks WHERE is_current = TRUE LIMIT 1'
      );
      activeGameweek = fallbackGwRes.rows[0]?.gameweek_number || 1;
    }

    const currentGw = gwNumber ?? activeGameweek;

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
        AND ($2::uuid IS NULL OR gw.competition_id = $2)
      ORDER BY f.kickoff_time ASC
      `,
      [currentGw, compId || null]
    );

    if (fixturesRes.rows.length > 0) {
      return NextResponse.json({
        gameweek: currentGw,
        activeGameweek,
        competition: comp || { code: compParam, name: compParam === 'ELC' ? 'Championship' : 'Premier League' },
        fixtures: fixturesRes.rows,
        source: 'db',
      });
    }
  } catch (dbErr: any) {
    console.warn(
      `[API /api/fixtures] DB query failed or empty for ${compParam}, falling back to FootballApiClient:`,
      dbErr.message
    );
  }

  // 2. Fallback to FootballApiClient
  try {
    const res = await footballClient.getFixtures(compParam, gwNumber);
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

    const activeGw = res.currentMatchday || 1;
    return NextResponse.json({
      gameweek: gwNumber || activeGw,
      activeGameweek: activeGw,
      competition: { code: compParam, name: compParam === 'ELC' ? 'Championship' : 'Premier League' },
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
