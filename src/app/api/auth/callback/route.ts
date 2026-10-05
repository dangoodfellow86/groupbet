import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAuthenticatedUser } from '@/server/actions/auth';

function sanitizeRedirectPath(path: string | null): string {
  if (!path) return '/';
  // Ensure path starts with a single '/' and does not start with '//' or contains protocol
  if (path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')) {
    return path;
  }
  return '/';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const rawNext = searchParams.get('next');
  const next = sanitizeRedirectPath(rawNext);

  if (error || errorDescription) {
    console.warn('[Auth Callback] OAuth error returned:', error, errorDescription);
    const msg = errorDescription || error || 'Authentication was cancelled or failed.';
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[Auth Callback] exchangeCodeForSession error:', exchangeError);
        return NextResponse.redirect(
          `${origin}/?auth_error=${encodeURIComponent(exchangeError.message || 'Session exchange failed')}`
        );
      }

      if (data?.user) {
        await syncAuthenticatedUser(data.user);
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (err: any) {
      console.error('[Auth Callback] Unexpected error during sync:', err);
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(err?.message || 'Authentication error')}`
      );
    }
  }

  // Return the user to home with general auth_error if no code was supplied
  return NextResponse.redirect(`${origin}/?auth_error=No+authentication+code+received`);
}
