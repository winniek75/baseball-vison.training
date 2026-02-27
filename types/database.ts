export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          position: string | null;
          team_name: string | null;
          grade_level: number | null;
          role: 'player' | 'coach' | 'parent';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          position?: string | null;
          team_name?: string | null;
          grade_level?: number | null;
          role?: 'player' | 'coach' | 'parent';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          position?: string | null;
          team_name?: string | null;
          grade_level?: number | null;
          role?: 'player' | 'coach' | 'parent';
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          game_type: string;
          score: number;
          accuracy: number;
          avg_reaction_ms: number;
          difficulty: number;
          rounds: number;
          duration_sec: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_type: string;
          score: number;
          accuracy: number;
          avg_reaction_ms: number;
          difficulty: number;
          rounds: number;
          duration_sec: number;
          created_at?: string;
        };
        Update: {
          score?: number;
          accuracy?: number;
          avg_reaction_ms?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
