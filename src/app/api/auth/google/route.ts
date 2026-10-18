import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  buildGoogleAuthorizationUrl,
  generateOAuthState,
  getAppOrigin,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  sanitizeRedirectPath,
} from '@/lib/google-oauth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getAppOrigin(request);
  const next = sanitizeRedirectPath(searchParams.get('next'));
  const config = getGoogleOAuthConfig();

  // 1. Primary Path: First-Party Google OAuth (hides *.supabase.co from Google Consent Screen)
  if (config.isConfigured) {
    const state = generateOAuthState();
    const redirectUri = `${origin}/api/auth/google/callback`;
    const cookieStore = await cookies();
    const isSecure = origin.startsWith('https://');

    cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    cookieStore.set(GOOGLE_OAUTH_NEXT_COOKIE, next, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    const googleAuthUrl = buildGoogleAuthorizationUrl({
      clientId: config.clientId,
      redirectUri,
      state,
    });

    return NextResponse.redirect(googleAuthUrl);
  }

  // 2. Automatic Fallback: Standard Supabase OAuth if GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set yet
  try {
    const supabase = await createClient();
    const callbackUrl = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error || !data?.url) {
      const msg = error?.message || 'Failed to initialize Google Sign-In.';
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
    }

    return NextResponse.redirect(data.url);
  } catch (err: any) {
    console.error('[/api/auth/google] Error initializing OAuth:', err);
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(err?.message || 'Google sign-in failed')}`
    );
  }
}
