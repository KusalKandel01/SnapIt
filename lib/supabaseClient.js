import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Same graceful-degrade pattern as Unsplash/AI: if not configured, the app
// keeps working entirely on localStorage — cloud sync just isn't available
// until these two env vars are set. Nothing else breaks.
export const supabase = (url && key) ? createClient(url, key) : null;

export function isCloudConfigured() {
  return !!supabase;
}
