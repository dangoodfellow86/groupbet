import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function cleanUrl(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').replace(/\/+$/, '').trim();
}

function cleanKey(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Refresh auth token safely (catches expired/missing sessions without throwing)
      await supabase.auth.getUser();
    } catch (error) {
      // Avoid failing incoming requests if Supabase auth session check errors
      console.warn('[Proxy Auth Warning] Error refreshing user session in proxy:', error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
