import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { syncAuthenticatedUser } from '@/server/actions/auth';
import {
  exchangeGoogleCodeForIdToken,
  getAppOrigin,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  sanitizeRedirectPath,
} from '@/lib/google-oauth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getAppOrigin(request);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const savedNext = cookieStore.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value;
  const next = sanitizeRedirectPath(savedNext || searchParams.get('next'));

  // Clean up temporary OAuth state cookies
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
  cookieStore.delete(GOOGLE_OAUTH_NEXT_COOKIE);

  if (error || errorDescription) {
    console.warn('[Google Auth Callback] OAuth error returned:', error, errorDescription);
    const msg = errorDescription || error || 'Google authentication was cancelled or failed.';
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent('No authorization code received from Google.')}`
    );
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    console.warn('[Google Auth Callback] Invalid or missing OAuth state cookie');
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent('Security verification failed (state mismatch). Please try signing in again.')}`
    );
  }

  const config = getGoogleOAuthConfig();
  if (!config.isConfigured) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent('Google OAuth credentials are not configured on the server.')}`
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const { idToken, accessToken } = await exchangeGoogleCodeForIdToken({
      code,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
    });

    const supabase = await createClient();
    const { data, error: signInError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      access_token: accessToken,
    });

    if (signInError || !data?.user) {
      console.error('[Google Auth Callback] signInWithIdToken error:', signInError);
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(signInError?.message || 'Could not establish session with Google token.')}`
      );
    }

    await syncAuthenticatedUser(data.user);
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err: any) {
    console.error('[Google Auth Callback] Unexpected error during Google sign-in:', err);
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(err?.message || 'Google authentication error')}`
    );
  }
}
