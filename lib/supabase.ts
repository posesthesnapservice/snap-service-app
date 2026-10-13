import { createClient } from '@supabase/supabase-js';

// Supabase URL & Anon Key for Snap Service Poses
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfplokhgimlbtnydpujy.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcGxva2hnaW1sYnRueWRwdWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MTczNjksImV4cCI6MjEwNzQ5MzM2OX0.QwzsEge0bD6mOezA8u9xV-327ndr7kbilKsv9C8Psh8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isSupabaseConfigured(): boolean {
  return true;
}
