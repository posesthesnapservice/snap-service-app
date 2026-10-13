-- =========================================================================
-- SNAP SERVICE APP - COMPLETE MASTER DATABASE SCHEMA
-- Run this single script in your NEW Supabase project's SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste & Click RUN
-- =========================================================================

-- 1. POSES TABLE
CREATE TABLE IF NOT EXISTS public.snap_poses (
  id text PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,
  instructions text DEFAULT '',
  subjects text[] DEFAULT '{}'::text[],
  shoot_types text[] DEFAULT '{}'::text[],
  events text[] DEFAULT '{}'::text[],
  tags text[] DEFAULT '{}'::text[],
  status text DEFAULT 'published',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_poses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_poses" ON public.snap_poses;
CREATE POLICY "Public access to snap_poses" ON public.snap_poses FOR ALL USING (true) WITH CHECK (true);

-- 2. TRENDING REELS TABLE (Cinematic Reference Reels)
CREATE TABLE IF NOT EXISTS public.snap_trending_reels (
  id text PRIMARY KEY,
  title text NOT NULL,
  video_url text,
  cover_url text,
  description text DEFAULT '',
  orientation text DEFAULT 'portrait',
  event text DEFAULT 'General',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_trending_reels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_trending_reels" ON public.snap_trending_reels;
CREATE POLICY "Public access to snap_trending_reels" ON public.snap_trending_reels FOR ALL USING (true) WITH CHECK (true);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS public.snap_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  username text,
  password text,
  name text NOT NULL,
  role text DEFAULT 'user',
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_login_at timestamp with time zone
);
ALTER TABLE public.snap_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_users" ON public.snap_users;
CREATE POLICY "Public access to snap_users" ON public.snap_users FOR ALL USING (true) WITH CHECK (true);

-- 4. DIRECTIONAL SHOOTS TABLE (Scene Reference Folders)
CREATE TABLE IF NOT EXISTS public.snap_directional_shoots (
  id text PRIMARY KEY,
  title text NOT NULL,
  scene_number text,
  folder_name text,
  description text,
  media_url text,
  cover_image text,
  director_notes text,
  camera_angle text,
  movement text,
  event text DEFAULT 'General',
  orientation text DEFAULT 'portrait',
  status text DEFAULT 'published',
  tags text[] DEFAULT '{}'::text[],
  reference_images jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_directional_shoots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_directional_shoots" ON public.snap_directional_shoots;
CREATE POLICY "Public access to snap_directional_shoots" ON public.snap_directional_shoots FOR ALL USING (true) WITH CHECK (true);

-- 5. CINEMATIC SHOTS TABLE (Cinematography Guide)
CREATE TABLE IF NOT EXISTS public.snap_cinematic (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  media_url text,
  camera_movement text,
  framing text,
  event text,
  orientation text DEFAULT 'portrait',
  status text DEFAULT 'published',
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_cinematic ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_cinematic" ON public.snap_cinematic;
CREATE POLICY "Public access to snap_cinematic" ON public.snap_cinematic FOR ALL USING (true) WITH CHECK (true);

-- 6. SHOT LIST TABLE (Mandatory Shots Reference)
CREATE TABLE IF NOT EXISTS public.snap_shotlist (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  event text,
  instructions text,
  image_url text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_shotlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_shotlist" ON public.snap_shotlist;
CREATE POLICY "Public access to snap_shotlist" ON public.snap_shotlist FOR ALL USING (true) WITH CHECK (true);

-- 7. TODAY'S SHOOT TABLE (User Personal Cloud Sync)
CREATE TABLE IF NOT EXISTS public.snap_today_shoots (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  user_name text,
  pose_ids text[] DEFAULT '{}'::text[],
  done_ids text[] DEFAULT '{}'::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_today_shoots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_today_shoots" ON public.snap_today_shoots;
CREATE POLICY "Public access to snap_today_shoots" ON public.snap_today_shoots FOR ALL USING (true) WITH CHECK (true);

-- 8. DON'T MISS CHECKLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.snap_dont_miss (
  id text PRIMARY KEY,
  event_name text NOT NULL,
  title text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_dont_miss ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_dont_miss" ON public.snap_dont_miss;
CREATE POLICY "Public access to snap_dont_miss" ON public.snap_dont_miss FOR ALL USING (true) WITH CHECK (true);

-- 9. DON'T MISS USER PROGRESS TABLE (Checkmark states per user & device)
CREATE TABLE IF NOT EXISTS public.snap_dont_miss_progress (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  item_id text NOT NULL,
  event_name text NOT NULL,
  is_completed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_dont_miss_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_dont_miss_progress" ON public.snap_dont_miss_progress;
CREATE POLICY "Public access to snap_dont_miss_progress" ON public.snap_dont_miss_progress FOR ALL USING (true) WITH CHECK (true);

-- 10. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.snap_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_categories" ON public.snap_categories;
CREATE POLICY "Public access to snap_categories" ON public.snap_categories FOR ALL USING (true) WITH CHECK (true);

-- 11. TAGS TABLE
CREATE TABLE IF NOT EXISTS public.snap_tags (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_tags" ON public.snap_tags;
CREATE POLICY "Public access to snap_tags" ON public.snap_tags FOR ALL USING (true) WITH CHECK (true);

-- 12. PASSWORD RESETS TABLE
CREATE TABLE IF NOT EXISTS public.snap_password_resets (
  id text PRIMARY KEY,
  email text NOT NULL,
  note text,
  status text DEFAULT 'pending',
  requested_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_password_resets" ON public.snap_password_resets;
CREATE POLICY "Public access to snap_password_resets" ON public.snap_password_resets FOR ALL USING (true) WITH CHECK (true);

-- 13. USER FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.snap_favorites (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  item_id text NOT NULL,
  item_type text DEFAULT 'pose',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_favorites" ON public.snap_favorites;
CREATE POLICY "Public access to snap_favorites" ON public.snap_favorites FOR ALL USING (true) WITH CHECK (true);

-- 14. SHOOT ASSIGNMENTS TABLE (Admin -> Photographer Shoot Assignments)
CREATE TABLE IF NOT EXISTS public.snap_assignments (
  id text PRIMARY KEY,
  title text NOT NULL,
  assigned_by_name text,
  target_user_id text NOT NULL,
  target_user_name text,
  pose_ids text[] DEFAULT '{}'::text[],
  event_name text,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.snap_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_assignments" ON public.snap_assignments;
CREATE POLICY "Public access to snap_assignments" ON public.snap_assignments FOR ALL USING (true) WITH CHECK (true);

-- 15. STORAGE BUCKET FOR FALLBACK MEDIA (snap_media)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('snap_media', 'snap_media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access snap_media" ON storage.objects;
CREATE POLICY "Public Access snap_media" ON storage.objects FOR ALL USING (bucket_id = 'snap_media') WITH CHECK (bucket_id = 'snap_media');
