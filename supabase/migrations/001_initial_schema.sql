-- WISE Vision Training App — Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  position TEXT,
  team_name TEXT,
  grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12),
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'coach', 'parent')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Coaches can view all profiles
CREATE POLICY "Coaches can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'coach'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =====================
-- GAME SESSIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('pitcher-reaction', 'ball-number-hunt')),
  score INTEGER NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 100),
  avg_reaction_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  rounds INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for game_sessions
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Coaches can view all sessions
CREATE POLICY "Coaches can view all sessions"
  ON public.game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'coach'
    )
  );

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON public.game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON public.game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- =====================
-- HELPFUL VIEWS
-- =====================

-- Best scores per user per game
CREATE OR REPLACE VIEW public.best_scores AS
SELECT
  user_id,
  game_type,
  MAX(score) AS best_score,
  AVG(accuracy) AS avg_accuracy,
  AVG(avg_reaction_ms) AS avg_reaction_ms,
  COUNT(*) AS total_sessions
FROM public.game_sessions
GROUP BY user_id, game_type;

-- Grant access to views
GRANT SELECT ON public.best_scores TO authenticated;

-- Done!
-- Remember to also run:
-- supabase db push (if using CLI)
-- or paste directly into Supabase SQL editor
