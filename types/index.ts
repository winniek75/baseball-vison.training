export type UserRole = 'player' | 'coach' | 'parent';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type GameType = 'pitcher-reaction' | 'ball-number-hunt';

export interface GameResult {
  gameType: GameType;
  score: number;
  accuracy: number; // 0-100
  avgReactionMs: number;
  difficulty: DifficultyLevel;
  playedAt: Date;
  rounds: number;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  displayName: string;
  position?: string;
  teamName?: string;
  gradeLevel?: number; // 1-12 (小1〜高3)
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
}

export interface GameSession {
  id: string;
  userId: string;
  gameType: GameType;
  score: number;
  accuracy: number;
  avgReactionMs: number;
  difficulty: DifficultyLevel;
  rounds: number;
  durationSec: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalSessions: number;
  totalScore: number;
  bestScore: Record<GameType, number>;
  avgAccuracy: Record<GameType, number>;
  avgReactionMs: Record<GameType, number>;
  streak: number; // consecutive days
  recentSessions: GameSession[];
}

// Game-specific types
export interface PitcherReactionRound {
  ballType: 'fastball' | 'curve' | 'slider' | 'changeup' | 'fake';
  targetZone: 'strike' | 'ball';
  number?: number; // for number-reading mode
  reactionMs?: number;
  isCorrect?: boolean;
}

export interface BallNumberHuntRound {
  number: number; // 1-99
  displayDurationMs: number;
  reactionMs?: number;
  isCorrect?: boolean;
}
