import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

function cleanUrl(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').replace(/\/+$/, '').trim();
}

function cleanKey(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) {
    console.warn('[Supabase Client] Missing or incomplete NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  browserClient = createBrowserClient(url, key);
  return browserClient;
}
