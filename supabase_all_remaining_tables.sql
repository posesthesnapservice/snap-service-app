-- =========================================================================
-- SNAP SERVICE APP - MASTER SUPABASE SCHEMA FOR ALL REMAINING MODULES
-- Run this script in Supabase SQL Editor (>_ icon on the left navigation)
-- =========================================================================

-- 1. CINEMATIC SHOTS TABLE (Cinematography Guide)
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


-- 2. SHOT LIST TABLE (Mandatory Shots Reference)
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


-- 3. TODAY'S SHOOT TABLE (User Personal Cloud Sync)
-- Each user gets their own persistent Today's Shoot list synced across PC & Mobile
CREATE TABLE IF NOT EXISTS public.snap_today_shoots (
  id text PRIMARY KEY,                      -- format: user_id (e.g. '1', '2', '3', '4')
  user_id text NOT NULL UNIQUE,
  user_name text,
  pose_ids text[] DEFAULT '{}'::text[],
  done_ids text[] DEFAULT '{}'::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.snap_today_shoots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_today_shoots" ON public.snap_today_shoots;
CREATE POLICY "Public access to snap_today_shoots" ON public.snap_today_shoots FOR ALL USING (true) WITH CHECK (true);


-- 4. DON'T MISS CHECKLIST ITEMS TABLE
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


-- 5. DON'T MISS USER PROGRESS TABLE (Checkmark states per user & device)
CREATE TABLE IF NOT EXISTS public.snap_dont_miss_progress (
  id text PRIMARY KEY,                      -- format: `${user_id}_${item_id}`
  user_id text NOT NULL,
  item_id text NOT NULL,
  event_name text NOT NULL,
  is_completed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.snap_dont_miss_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_dont_miss_progress" ON public.snap_dont_miss_progress;
CREATE POLICY "Public access to snap_dont_miss_progress" ON public.snap_dont_miss_progress FOR ALL USING (true) WITH CHECK (true);


-- 6. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.snap_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,                       -- 'subject' | 'shoot_type' | 'event' | 'style' | 'location' | 'custom'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.snap_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_categories" ON public.snap_categories;
CREATE POLICY "Public access to snap_categories" ON public.snap_categories FOR ALL USING (true) WITH CHECK (true);


-- 7. TAGS TABLE
CREATE TABLE IF NOT EXISTS public.snap_tags (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.snap_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_tags" ON public.snap_tags;
CREATE POLICY "Public access to snap_tags" ON public.snap_tags FOR ALL USING (true) WITH CHECK (true);


-- 8. PASSWORD RESETS TABLE (User reset requests to Admin)
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


-- 9. USER FAVORITES TABLE (Persistent cross-device favorites)
CREATE TABLE IF NOT EXISTS public.snap_favorites (
  id text PRIMARY KEY,                      -- format: `${user_id}_${item_id}`
  user_id text NOT NULL,
  item_id text NOT NULL,
  item_type text DEFAULT 'pose',            -- 'pose' | 'reel'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.snap_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to snap_favorites" ON public.snap_favorites;
CREATE POLICY "Public access to snap_favorites" ON public.snap_favorites FOR ALL USING (true) WITH CHECK (true);

-- 10. DIRECTIONAL SHOOTS TABLE
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

