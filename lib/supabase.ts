import { createClient } from '@supabase/supabase-js';

// Supabase URL & Anon Key for Snap Service Poses
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kgnddyspcstpmezmqyjw.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbmRkeXNwY3N0cG1lem1xeWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzYzMTYsImV4cCI6MjEwNTkxMjMxNn0.KXjcFfQAz4Pw9V96wq3db-n6rnk4cBf_-JuS6gTXC4c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isSupabaseConfigured(): boolean {
  return true;
}
