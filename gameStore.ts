// ============================================================
// store/gameStore.ts — Zustand Global Game State
// ============================================================

import { create } from 'zustand'
import type { GameResult, Difficulty, FloatingFeedback, ComboLabel } from '@/types/supabase'

// ============================================================
// Types
// ============================================================

export type GamePhase =
  | 'idle'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'result'

export interface GameSettings {
  difficulty: Difficulty
  durationSec: number
  moduleId: string
  soundEnabled: boolean
  hapticEnabled: boolean
}

export interface LiveGameState {
  phase: GamePhase
  score: number
  combo: number
  maxCombo: number
  timeRemaining: number
  reactionTimes: number[]
  scores: number[]
  totalAttempts: number
  correctCount: number
  feedbacks: FloatingFeedback[]
  lastResult: GameResult | null
  isScreenLarge: boolean  // タッチパネルモニター判定
}

interface GameStore extends LiveGameState {
  settings: GameSettings

  // Actions
  setSettings: (s: Partial<GameSettings>) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: (result: GameResult) => void
  resetGame: () => void

  addScore: (points: number) => void
  incrementCombo: () => void
  resetCombo: () => void
  addReactionTime: (ms: number) => void
  incrementAttempts: (correct: boolean) => void
  setTimeRemaining: (sec: number) => void
  addFeedback: (label: ComboLabel, x: number, y: number, reactionMs?: number) => void
  removeFeedback: (id: string) => void
  setScreenLarge: (large: boolean) => void
}

// ============================================================
// Default Values
// ============================================================

const defaultSettings: GameSettings = {
  difficulty: 2,
  durationSec: 60,
  moduleId: 'pitcher-reaction',
  soundEnabled: true,
  hapticEnabled: true,
}

const defaultLiveState: LiveGameState = {
  phase: 'idle',
  score: 0,
  combo: 0,
  maxCombo: 0,
  timeRemaining: 60,
  reactionTimes: [],
  scores: [],
  totalAttempts: 0,
  correctCount: 0,
  feedbacks: [],
  lastResult: null,
  isScreenLarge: false,
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultLiveState,
  settings: defaultSettings,

  // ---- Settings ----
  setSettings: (s) =>
    set((state) => ({
      settings: { ...state.settings, ...s },
      timeRemaining: s.durationSec ?? state.settings.durationSec,
    })),

  // ---- Phase Control ----
  startGame: () =>
    set({
      phase: 'playing',
      score: 0,
      combo: 0,
      maxCombo: 0,
      reactionTimes: [],
      scores: [],
      totalAttempts: 0,
      correctCount: 0,
      feedbacks: [],
      lastResult: null,
    }),

  pauseGame: () => set({ phase: 'paused' }),
  resumeGame: () => set({ phase: 'playing' }),

  endGame: (result) =>
    set({
      phase: 'result',
      lastResult: result,
    }),

  resetGame: () =>
    set({
      ...defaultLiveState,
      timeRemaining: get().settings.durationSec,
    }),

  // ---- Score & Combo ----
  addScore: (points) =>
    set((state) => ({ score: state.score + points })),

  incrementCombo: () =>
    set((state) => {
      const combo = state.combo + 1
      return { combo, maxCombo: Math.max(state.maxCombo, combo) }
    }),

  resetCombo: () => set({ combo: 0 }),

  addReactionTime: (ms) =>
    set((state) => ({ reactionTimes: [...state.reactionTimes, ms] })),

  incrementAttempts: (correct) =>
    set((state) => ({
      totalAttempts: state.totalAttempts + 1,
      correctCount: correct ? state.correctCount + 1 : state.correctCount,
    })),

  setTimeRemaining: (sec) => set({ timeRemaining: sec }),

  // ---- Floating Feedback ----
  addFeedback: (label, x, y, reactionMs) => {
    const id = `${Date.now()}-${Math.random()}`
    set((state) => ({
      feedbacks: [...state.feedbacks, { id, label, x, y, reactionMs }],
    }))
    // Auto-remove after animation
    setTimeout(() => {
      set((state) => ({
        feedbacks: state.feedbacks.filter((f) => f.id !== id),
      }))
    }, 900)
  },

  removeFeedback: (id) =>
    set((state) => ({
      feedbacks: state.feedbacks.filter((f) => f.id !== id),
    })),

  setScreenLarge: (large) => set({ isScreenLarge: large }),
}))
