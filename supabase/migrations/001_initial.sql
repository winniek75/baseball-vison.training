-- ============================================================
-- WISE Vision App — Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('player', 'coach')) DEFAULT 'player',
  name       TEXT NOT NULL,
  grade      TEXT,                -- 小学生/中学生/高校生
  position   TEXT,                -- バッター/投手/内野手/外野手
  team_id    UUID REFERENCES public.teams(id),
  streak     INTEGER DEFAULT 0,   -- 連続ログイン日数
  last_login DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Coaches can view all players in same team"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users coach
      WHERE coach.id = auth.uid()
        AND coach.role = 'coach'
        AND coach.team_id = users.team_id
    )
  );

-- ============================================================
-- GAME SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id        TEXT NOT NULL CHECK (module_id IN (
                     'pitcher-reaction',
                     'ball-number-hunt',
                     'fly-tracer',
                     'flash-sign',
                     'stadium-vision',
                     'infield-reaction',
                     'runner-watch'
                   )),
  score            INTEGER NOT NULL DEFAULT 0,
  reaction_ms_avg  FLOAT,         -- 平均反応速度 (ms)
  reaction_ms_best FLOAT,         -- 最速反応速度 (ms)
  accuracy         FLOAT,         -- 正答率 0.0〜1.0
  total_attempts   INTEGER DEFAULT 0,
  correct_count    INTEGER DEFAULT 0,
  difficulty       INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  duration_sec     INTEGER,       -- プレイ時間 (秒)
  played_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view sessions of team players"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users coach
      JOIN public.users player ON player.id = sessions.user_id
      WHERE coach.id = auth.uid()
        AND coach.role = 'coach'
        AND coach.team_id = player.team_id
    )
  );

-- Index for fast dashboard queries
CREATE INDEX idx_sessions_user_played ON public.sessions(user_id, played_at DESC);
CREATE INDEX idx_sessions_module ON public.sessions(module_id);

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_key  TEXT NOT NULL,       -- e.g. 'first_play', 'streak_7', 'reaction_200ms'
  earned_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON public.badges FOR SELECT
  UHING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
  ON public.badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DAILY MISSIONS (preset data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  module_id    TEXT NOT NULL,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, mission_date, module_id)
);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions"
  ON public.daily_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON public.daily_missions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert missions"
  ON public.daily_missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'プレイヤー'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update streak on session insert
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_login DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_login INTO v_last_login
  FROM public.users WHERE id = NEW.user_id;

  IF v_last_login IS NULL OR v_last_login < v_today - INTERVAL '1 day' THEN
    -- streak broken or first time
    IF v_last_login = v_today - INTERVAL '1 day' THEN
      UPDATE public.users
      SET streak = streak + 1, last_login = v_today, updated_at = NOW()
      WHERE id = NEW.user_id;
    ELSE
      UPDATE public.users
      SET streak = 1, last_login = v_today, updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  ELSIF v_last_login = v_today THEN
    -- already logged in today, just update
    UPDATE public.users SET updated_at = NOW() WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_insert_update_streak
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_streak();

-- ============================================================
-- SAMPLE BADGE DEFINITIONS (reference data)
-- ============================================================
-- Badge keys and their meanings:
-- 'first_play'        : 初プレイ
-- 'streak_3'          : 3日連続
-- 'streak_7'          : 7日連続
-- 'streak_30'         : 30日連続
-- 'reaction_300ms'    : 平均反応速度300ms以内
-- 'reaction_250ms'    : 平均反応速度250ms以内
-- 'reaction_200ms'    : 平均反応速度200ms以内
-- 'accuracy_90'       : 正答率90%以上
-- 'accuracy_100'      : 正答率100%
-- 'score_1000'        : スコア1000点突破
-- 'all_modules'       : 全モジュール制覇
-- 'master_pitcher'    : ピッチャーリアクションLv5クリア
-- 'master_hunter'     : ボールナンバーハントLv5クリア
