-- Supabase setup script for anime app
-- Run this in Supabase SQL Editor to create required tables and policies.

-- Ensure pgcrypto extension exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  username text NOT NULL,
  avatar_url text,
  banner_url text,
  theme_accent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- 2) User lists table
CREATE TABLE IF NOT EXISTS public.user_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anime_id text NOT NULL,
  status text NOT NULL,
  title text NOT NULL,
  image text,
  episodes int4 DEFAULT 0,
  watched_episodes int4 DEFAULT 0,
  rating int4 DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 3) Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id text NOT NULL,
  user_id uuid NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  rating int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security on tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies for profiles: allow select for anon
CREATE POLICY "Allow read profiles" ON public.profiles
  FOR SELECT
  USING (true);

-- Policies for user_lists
CREATE POLICY "Allow read user lists" ON public.user_lists
  FOR SELECT
  USING (true);

CREATE POLICY "Allow insert own user lists" ON public.user_lists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own user lists" ON public.user_lists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own user lists" ON public.user_lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for comments
CREATE POLICY "Allow read comments" ON public.comments
  FOR SELECT
  USING (true);

CREATE POLICY "Allow insert comments" ON public.comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: If you want unauthenticated comment posting, change the insert policy accordingly.
