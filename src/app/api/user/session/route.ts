import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getOrCreateUser } from '@/server/auth/session';
import { getUserLeagues } from '@/server/actions/leagues';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null, leagues: [] });
    }

    const leagues = await getUserLeagues(user.id);
    return NextResponse.json({ user, leagues });
  } catch (error) {
    console.error('[GET /api/user/session] Error:', error);
    return NextResponse.json({ user: null, leagues: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName, email } = body;

    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters' },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(displayName, email);
    const leagues = await getUserLeagues(user.id);

    return NextResponse.json({ user, leagues });
  } catch (error) {
    console.error('[POST /api/user/session] Error:', error);
    return NextResponse.json({ error: 'Failed to save user session' }, { status: 500 });
  }
}
