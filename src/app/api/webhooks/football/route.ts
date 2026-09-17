import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/verify-webhook';
import { query } from '@/server/db/pool';
import { MatchStatus } from '@/core/types/database';

function mapPayloadStatus(rawStatus: string): MatchStatus {
  const s = rawStatus.toUpperCase();
  if (['FT', 'AET', 'PEN', 'FINISHED', 'AWARDED'].includes(s)) {
    return 'FINISHED';
  }
  if (['PST', 'SUSP', 'INT', 'POSTPONED'].includes(s)) {
    return 'POSTPONED';
  }
  if (['CANC', 'ABD', 'CANCELLED'].includes(s)) {
    return 'CANCELLED';
  }
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'IN_PLAY'].includes(s)) {
    return 'LIVE';
  }
  return 'SCHEDULED';
}

export async function POST(req: NextRequest) {
  const secret = process.env.FOOTBALL_WEBHOOK_SECRET;

  // 1. Read raw body as text for HMAC verification
  const rawBody = await req.text();

  if (secret) {
    const signatureHeader =
      req.headers.get('x-signature') ||
      req.headers.get('x-hub-signature-256') ||
      req.headers.get('x-signature-sha256') ||
      req.headers.get('signature');

    const isValid = verifyWebhookSignature(rawBody, signatureHeader, secret);
    if (!isValid) {
      console.warn('[Webhook] Invalid HMAC signature received.');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook signature' },
        { status: 401 }
      );
    }
  }

  // 2. Parse payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 3. Extract fixture and score information
  const externalOrInternalId = String(
    payload.fixture?.id ?? payload.fixture_id ?? payload.id ?? ''
  );
  const rawStatus =
    payload.fixture?.status?.short ??
    payload.fixture?.status?.long ??
    payload.status ??
    '';
  const homeScore =
    payload.goals?.home ??
    payload.home_score ??
    payload.score?.fulltime?.home ??
    null;
  const awayScore =
    payload.goals?.away ??
    payload.away_score ??
    payload.score?.fulltime?.away ??
    null;

  if (!externalOrInternalId) {
    return NextResponse.json(
      { error: 'Missing fixture ID in webhook payload' },
      { status: 400 }
    );
  }

  const normalizedStatus = mapPayloadStatus(rawStatus);

  try {
    // 4. Query internal fixture record
    const fixtureLookup = await query<{
      id: string;
      status: MatchStatus;
      settled_at: string | null;
      external_id: number;
    }>(
      `
      SELECT id, status, settled_at, external_id
      FROM fixtures
      WHERE id::text = $1 OR external_id::text = $1
      LIMIT 1
      `,
      [externalOrInternalId]
    );

    if (fixtureLookup.rows.length === 0) {
      console.warn(
        `[Webhook] Fixture ${externalOrInternalId} not found in database. Acknowledging event.`
      );
      return NextResponse.json({
        acknowledged: true,
        message: 'Fixture not found in database; event logged.',
        fixtureId: externalOrInternalId,
      });
    }

    const fixture = fixtureLookup.rows[0];

    // 5. Idempotency guard: If already settled and finished, exit immediately
    if (fixture.status === 'FINISHED' && fixture.settled_at !== null) {
      console.log(
        `[Webhook] Fixture ${fixture.id} already settled at ${fixture.settled_at}. Skipping.`
      );
      return NextResponse.json({
        acknowledged: true,
        message: 'Fixture already settled (idempotent)',
        fixtureId: fixture.id,
      });
    }

    // 6. Execute match settlement or update
    if (normalizedStatus === 'FINISHED') {
      console.log(
        `[Webhook] Settling fixture ${fixture.id} with scores ${homeScore}-${awayScore}...`
      );
      await query('SELECT settle_fixture($1, $2, $3)', [
        fixture.id,
        homeScore ?? 0,
        awayScore ?? 0,
      ]);

      return NextResponse.json({
        acknowledged: true,
        status: 'FINISHED',
        action: 'settle_fixture',
        fixtureId: fixture.id,
        scores: { home: homeScore, away: awayScore },
      });
    } else if (
      normalizedStatus === 'POSTPONED' ||
      normalizedStatus === 'CANCELLED'
    ) {
      console.log(`[Webhook] Voiding fixture ${fixture.id}...`);
      await query('SELECT void_fixture($1)', [fixture.id]);

      return NextResponse.json({
        acknowledged: true,
        status: normalizedStatus,
        action: 'void_fixture',
        fixtureId: fixture.id,
      });
    } else if (normalizedStatus === 'LIVE') {
      console.log(
        `[Webhook] Updating fixture ${fixture.id} to LIVE (${homeScore}-${awayScore})...`
      );
      await query(
        `
        UPDATE fixtures
        SET status = 'LIVE',
            home_score = $1,
            away_score = $2,
            updated_at = NOW()
        WHERE id = $3
        `,
        [homeScore, awayScore, fixture.id]
      );

      return NextResponse.json({
        acknowledged: true,
        status: 'LIVE',
        action: 'update_live_score',
        fixtureId: fixture.id,
        scores: { home: homeScore, away: awayScore },
      });
    }

    return NextResponse.json({
      acknowledged: true,
      status: normalizedStatus,
      fixtureId: fixture.id,
    });
  } catch (dbErr: any) {
    console.error('[Webhook] Database error during settlement:', dbErr);
    return NextResponse.json(
      { error: 'Settlement processing failed', details: dbErr.message },
      { status: 500 }
    );
  }
}
