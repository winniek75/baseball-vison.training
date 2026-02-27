// ============================================================
// Supabase Database Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: 'player' | 'coach'
          name: string
          grade: string | null
          position: string | null
          team_id: string | null
          streak: number
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'player' | 'coach'
          name: string
          grade?: string | null
          position?: string | null
          team_id?: string | null
          streak?: number
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'player' | 'coach'
          name?: string
          grade?: string | null
          position?: string | null
          team_id?: string | null
          streak?: number
          last_login?: string | null
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          module_id: ModuleId
          score: number
          reaction_ms_avg: number | null
          reaction_ms_best: number | null
          accuracy: number | null
          total_attempts: number
          correct_count: number
          difficulty: number
          duration_sec: number | null
          played_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: ModuleId
          score: number
          reaction_ms_avg?: number | null
          reaction_ms_best?: number | null
          accuracy?: number | null
          total_attempts?: number
          correct_count?: number
          difficulty?: number
          duration_sec?: number | null
          played_at?: string
        }
        Update: {
          score?: number
          reaction_ms_avg?: number | null
          reaction_ms_best?: number | null
          accuracy?: number | null
          total_attempts?: number
          correct_count?: number
        }
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_key: BadgeKey
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_key: BadgeKey
          earned_at?: string
        }
        Update: Record<string, never>
      }
      daily_missions: {
        Row: {
          id: string
          user_id: string
          mission_date: string
          module_id: ModuleId
          completed: boolean
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          mission_date?: string
          module_id: ModuleId
          completed?: boolean
          completed_at?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ============================================================
// App-Level Types
// ============================================================

export type ModuleId =
  | 'pitcher-reaction'
  | 'ball-number-hunt'
  | 'fly-tracer'
  | 'flash-sign'
  | 'stadium-vision'
  | 'infield-reaction'
  | 'runner-watch'

export type BadgeKey =
  | 'first_play'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'reaction_300ms'
  | 'reaction_250ms'
  | 'reaction_200ms'
  | 'accuracy_90'
  | 'accuracy_100'
  | 'score_1000'
  | 'all_modules'
  | 'master_pitcher'
  | 'master_hunter'

export type UserProfile = Database['public']['Tables']['users']['Row']
export type GameSession = Database['public']['Tables']['sessions']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']

// ============================================================
// Game Types
// ============================================================

export interface PitchType {
  id: string
  name: string
  nameJa: string
  color: string
  speed: number        // base speed (pixels per frame)
  curveX: number       // horizontal drift
  curveY: number       // vertical drift
  spinRate: number     // rotation speed
}

export interface Ball {
  x: number
  y: number
  z: number            // depth (1=far, 0=close)
  radius: number
  pitch: PitchType
  label?: number       // for ball-number-hunt
  isStrike?: boolean
}

export interface GameResult {
  score: number
  reactionTimes: number[]
  reactionMsAvg: number
  reactionMsBest: number
  accuracy: number
  totalAttempts: number
  correctCount: number
  difficulty: number
  durationSec: number
  moduleId: ModuleId
}

export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface DifficultyConfig {
  level: Difficulty
  label: string
  labelJa: string
  ballSpeed: number
  strikeWindowMs: number
  fakeFrequency: number
  spinRate: number
}

export type ComboLabel = 'Good' | 'Great' | 'Perfect' | 'Insane' | 'Miss'

export interface FloatingFeedback {
  id: string
  label: ComboLabel
  reactionMs?: number
  x: number
  y: number
}
