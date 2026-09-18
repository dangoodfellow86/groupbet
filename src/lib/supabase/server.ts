import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function cleanUrl(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').replace(/\/+$/, '').trim();
}

function cleanKey(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

export async function createClient() {
  const cookieStore = await cookies();

  const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be ignored if called from a Server Component
        }
      },
    },
  });
}
