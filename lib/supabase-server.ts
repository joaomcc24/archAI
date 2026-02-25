import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing Supabase environment variable NEXT_PUBLIC_SUPABASE_URL for server-side client.');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variable SUPABASE_SERVICE_ROLE_KEY. ' +
        'Server-side admin operations require the service role key and must not fall back to the anon key.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, serviceRoleKey);
  return supabaseInstance;
}

// Export as a getter so it's lazily initialized at runtime, not build time
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
