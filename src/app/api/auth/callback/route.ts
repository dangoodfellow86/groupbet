import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAuthenticatedUser } from '@/server/actions/auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await syncAuthenticatedUser(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or home with error message
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
