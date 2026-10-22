import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/server/db/pool';
import { footballClient } from '@/core/api/football';
import { syncFootballData } from '@/server/services/football-sync';
import {
  resolveActiveGameweek,
  resolvePairedGameweeks,
} from '@/server/services/gameweek-resolver';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gwParam = searchParams.get('gw');
  const compParam = (searchParams.get('comp') || 'PL').toUpperCase();
  const shouldRefresh = searchParams.get('refresh') === 'true';
  const gwNumber = gwParam ? parseInt(gwParam, 10) : undefined;

  // On-demand sync when requested (e.g. user clicked refresh in UI)
  if (shouldRefresh) {
    try {
      if (compParam === 'BOTH') {
        await Promise.all([syncFootballData('PL'), syncFootballData('ELC')]);
      } else {
        await syncFootballData(compParam);
      }
    } catch (syncErr: any) {
      console.warn(`[API /api/fixtures] On-demand sync failed for ${compParam}:`, syncErr.message);
    }
  }

  try {
    // Combined Mode: Both Premier League + Championship
    if (compParam === 'BOTH') {
      const paired = await resolvePairedGameweeks(gwNumber, true);
      if (paired.gameweekIds.length > 0) {
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
            c.code AS competition_code,
            c.name AS competition_name,
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
          JOIN competitions c ON gw.competition_id = c.id
          JOIN teams ht ON f.home_team_id = ht.id
          JOIN teams at ON f.away_team_id = at.id
          WHERE f.gameweek_id = ANY($1::uuid[])
          ORDER BY f.kickoff_time ASC, c.code ASC
          `,
          [paired.gameweekIds]
        );

        if (fixturesRes.rows.length > 0) {
          return NextResponse.json({
            gameweek: paired.plGwNumber,
            activeGameweek: paired.activePlGw,
            pairedGameweeks: {
              PL: paired.plGwNumber,
              ELC: paired.elcGwNumber,
            },
            competition: {
              code: 'BOTH',
              name: 'Premier League + Championship',
            },
            fixtures: fixturesRes.rows,
            source: 'db',
          });
        }
      }
    }

    // Single Competition Mode ('PL' or 'ELC')
    const compRes = await query<{ id: string; name: string; code: string }>(
      'SELECT id, name, code FROM competitions WHERE UPPER(code) = $1 LIMIT 1',
      [compParam]
    );
    const comp = compRes.rows[0];
    const compId = comp?.id;

    // Determine active and target gameweek via self-healing resolver
    const activeGameweek = await resolveActiveGameweek({
      competitionId: compId || null,
      competitionCode: compParam,
    });

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
        c.code AS competition_code,
        c.name AS competition_name,
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
      JOIN competitions c ON gw.competition_id = c.id
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

  // Fallback to FootballApiClient
  try {
    const targetApiComp = compParam === 'BOTH' ? 'PL' : compParam;
    const res = await footballClient.getFixtures(targetApiComp, gwNumber);
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
      competition_code: targetApiComp,
      competition_name: targetApiComp === 'ELC' ? 'Championship' : 'Premier League',
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
      competition: {
        code: compParam,
        name:
          compParam === 'BOTH'
            ? 'Premier League + Championship'
            : compParam === 'ELC'
            ? 'Championship'
            : 'Premier League',
      },
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
