// ============================================================
// lib/scoring.ts — スコアリング・バッジ判定ロジック
// ============================================================

import type { GameResult, ComboLabel, Difficulty, DifficultyConfig, BadgeKey } from '@/types/supabase'

// ============================================================
// Difficulty Configurations
// ============================================================
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  1: {
    level: 1,
    label: 'Rookie',
    labelJa: 'ルーキー',
    ballSpeed: 3.5,
    strikeWindowMs: 800,
    fakeFrequency: 0,
    spinRate: 0.03,
  },
  2: {
    level: 2,
    label: 'Minor',
    labelJa: 'マイナー',
    ballSpeed: 5.0,
    strikeWindowMs: 650,
    fakeFrequency: 0.1,
    spinRate: 0.05,
  },
  3: {
    level: 3,
    label: 'Semi-Pro',
    labelJa: 'セミプロ',
    ballSpeed: 7.0,
    strikeWindowMs: 500,
    fakeFrequency: 0.2,
    spinRate: 0.08,
  },
  4: {
    level: 4,
    label: 'Pro',
    labelJa: 'プロ',
    ballSpeed: 9.5,
    strikeWindowMs: 380,
    fakeFrequency: 0.3,
    spinRate: 0.12,
  },
  5: {
    level: 5,
    label: 'Elite',
    labelJa: 'エリート',
    ballSpeed: 13.0,
    strikeWindowMs: 280,
    fakeFrequency: 0.4,
    spinRate: 0.18,
  },
}

// ============================================================
// Score Calculation
// ============================================================

/**
 * 反応時間からスコア倍率を計算
 * 速いほど高スコア
 */
export function reactionToMultiplier(reactionMs: number, windowMs: number): number {
  const ratio = reactionMs / windowMs
  if (ratio <= 0.3) return 3.0   // Lightning
  if (ratio <= 0.5) return 2.5   // Perfect
  if (ratio <= 0.7) return 2.0   // Great
  if (ratio <= 0.9) return 1.5   // Good
  return 1.0                      // OK
}

/**
 * ヒット時のスコア計算
 */
export function calculateHitScore(
  reactionMs: number,
  windowMs: number,
  difficulty: Difficulty,
  comboCount: number
): number {
  const baseScore = 100 * difficulty
  const multiplier = reactionToMultiplier(reactionMs, windowMs)
  const comboBonus = Math.min(comboCount * 10, 200)
  return Math.round(baseScore * multiplier + comboBonus)
}

/**
 * コンボ数からラベルを決定
 */
export function getComboLabel(reactionMs: number, windowMs: number): ComboLabel {
  const ratio = reactionMs / windowMs
  if (ratio <= 0.3) return 'Perfect'
  if (ratio <= 0.5) return 'Great'
  if (ratio <= 0.7) return 'Good'
  return 'Good'
}

/**
 * セッション結果からゲームスコアを集計
 */
export function aggregateGameResult(
  reactionTimes: number[],
  correctCount: number,
  totalAttempts: number,
  difficulty: Difficulty,
  durationSec: number,
  moduleId: string,
  scores: number[]
): GameResult {
  const validTimes = reactionTimes.filter((t) => t > 0)
  const reactionMsAvg = validTimes.length > 0
    ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
    : 0
  const reactionMsBest = validTimes.length > 0
    ? Math.min(...validTimes)
    : 0
  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0
  const totalScore = scores.reduce((a, b) => a + b, 0)

  return {
    score: totalScore,
    reactionTimes: validTimes,
    reactionMsAvg: Math.round(reactionMsAvg),
    reactionMsBest: Math.round(reactionMsBest),
    accuracy,
    totalAttempts,
    correctCount,
    difficulty,
    durationSec,
    moduleId: moduleId as GameResult['moduleId'],
  }
}

// ============================================================
// Badge Evaluation
// ============================================================

/**
 * ゲーム結果から獲得バッジを判定
 */
export function evaluateBadges(
  result: GameResult,
  existingBadgeKeys: BadgeKey[],
  currentStreak: number,
  isFirstPlay: boolean
): BadgeKey[] {
  const newBadges: BadgeKey[] = []
  const has = (key: BadgeKey) => existingBadgeKeys.includes(key)

  if (isFirstPlay && !has('first_play')) newBadges.push('first_play')
  if (currentStreak >= 3 && !has('streak_3')) newBadges.push('streak_3')
  if (currentStreak >= 7 && !has('streak_7')) newBadges.push('streak_7')
  if (currentStreak >= 30 && !has('streak_30')) newBadges.push('streak_30')

  if (result.reactionMsAvg > 0) {
    if (result.reactionMsAvg <= 200 && !has('reaction_200ms')) newBadges.push('reaction_200ms')
    else if (result.reactionMsAvg <= 250 && !has('reaction_250ms')) newBadges.push('reaction_250ms')
    else if (result.reactionMsAvg <= 300 && !has('reaction_300ms')) newBadges.push('reaction_300ms')
  }

  if (result.accuracy >= 1.0 && !has('accuracy_100')) newBadges.push('accuracy_100')
  else if (result.accuracy >= 0.9 && !has('accuracy_90')) newBadges.push('accuracy_90')

  if (result.score >= 1000 && !has('score_1000')) newBadges.push('score_1000')

  if (result.moduleId === 'pitcher-reaction' && result.difficulty === 5 && !has('master_pitcher')) {
    newBadges.push('master_pitcher')
  }
  if (result.moduleId === 'ball-number-hunt' && result.difficulty === 5 && !has('master_hunter')) {
    newBadges.push('master_hunter')
  }

  return newBadges
}

// ============================================================
// Badge Display Info
// ============================================================

export interface BadgeInfo {
  key: BadgeKey
  emoji: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export const BADGE_INFO: Record<BadgeKey, BadgeInfo> = {
  first_play: {
    key: 'first_play',
    emoji: '⚾',
    name: '初プレイ',
    description: 'ビジョントレーニングを始めた！',
    rarity: 'common',
  },
  streak_3: {
    key: 'streak_3',
    emoji: '🔥',
    name: '3日連続',
    description: '3日連続でプレイした！',
    rarity: 'common',
  },
  streak_7: {
    key: 'streak_7',
    emoji: '🔥🔥',
    name: '1週間連続',
    description: '7日連続でプレイした！',
    rarity: 'rare',
  },
  streak_30: {
    key: 'streak_30',
    emoji: '👑',
    name: '1ヶ月連続',
    description: '30日連続でプレイした伝説のプレイヤー',
    rarity: 'legendary',
  },
  reaction_300ms: {
    key: 'reaction_300ms',
    emoji: '⚡',
    name: '高速反応 300ms',
    description: '平均反応速度300ms以内を達成！',
    rarity: 'common',
  },
  reaction_250ms: {
    key: 'reaction_250ms',
    emoji: '⚡⚡',
    name: '超高速 250ms',
    description: '平均反応速度250ms以内を達成！',
    rarity: 'rare',
  },
  reaction_200ms: {
    key: 'reaction_200ms',
    emoji: '⚡⚡⚡',
    name: '神速 200ms',
    description: '平均反応速度200ms以内！プロ級の反射神経',
    rarity: 'legendary',
  },
  accuracy_90: {
    key: 'accuracy_90',
    emoji: '🎯',
    name: '精密眼 90%',
    description: '正答率90%以上を達成！',
    rarity: 'rare',
  },
  accuracy_100: {
    key: 'accuracy_100',
    emoji: '💎',
    name: '完璧な眼',
    description: '正答率100%！ミスゼロの完璧なプレイ',
    rarity: 'epic',
  },
  score_1000: {
    key: 'score_1000',
    emoji: '🏆',
    name: '1000点突破',
    description: 'スコア1000点を達成！',
    rarity: 'rare',
  },
  all_modules: {
    key: 'all_modules',
    emoji: '🌟',
    name: '全種目制覇',
    description: '全7モジュールをプレイした！',
    rarity: 'epic',
  },
  master_pitcher: {
    key: 'master_pitcher',
    emoji: '🔱',
    name: 'ピッチャーマスター',
    description: 'ピッチャーリアクションLv5クリア！',
    rarity: 'epic',
  },
  master_hunter: {
    key: 'master_hunter',
    emoji: '🔱',
    name: 'ナンバーハンター',
    description: 'ボールナンバーハントLv5クリア！',
    rarity: 'epic',
  },
}

// ============================================================
// Vision Profile
// ============================================================

export interface VisionProfile {
  kva: number        // KVA動体視力 0-100
  dva: number        // DVA動体視力 0-100
  handEye: number    // 眼と手の協応 0-100
  instant: number    // 瞬間視 0-100
  peripheral: number // 周辺視野 0-100
  depth: number      // 深視力 0-100
}

/**
 * セッション履歴からビジョンプロフィールを計算
 */
export function calculateVisionProfile(
  sessions: Array<{ module_id: string; accuracy: number | null; reaction_ms_avg: number | null }>
): VisionProfile {
  const profile: VisionProfile = {
    kva: 50,
    dva: 50,
    handEye: 50,
    instant: 50,
    peripheral: 50,
    depth: 50,
  }

  const moduleToMetrics: Record<string, (keyof VisionProfile)[]> = {
    'pitcher-reaction': ['kva', 'handEye'],
    'ball-number-hunt': ['kva', 'instant'],
    'fly-tracer': ['dva', 'handEye'],
    'flash-sign': ['instant'],
    'stadium-vision': ['peripheral'],
    'infield-reaction': ['dva', 'handEye'],
    'runner-watch': ['peripheral', 'instant'],
  }

  const accumulated: Record<keyof VisionProfile, number[]> = {
    kva: [], dva: [], handEye: [], instant: [], peripheral: [], depth: [],
  }

  sessions.forEach((s) => {
    const metrics = moduleToMetrics[s.module_id] ?? []
    const acc = s.accuracy ?? 0.5
    const reactionScore = s.reaction_ms_avg
      ? Math.max(0, Math.min(100, 100 - (s.reaction_ms_avg - 150) / 5))
      : 50
    const val = (acc * 60 + reactionScore * 0.4)

    metrics.forEach((m) => {
      accumulated[m].push(val)
    })
  })

  ;(Object.keys(accumulated) as (keyof VisionProfile)[]).forEach((key) => {
    if (accumulated[key].length > 0) {
      profile[key] = Math.min(
        100,
        Math.round(accumulated[key].reduce((a, b) => a + b, 0) / accumulated[key].length)
      )
    }
  })

  return profile
}

// ============================================================
// Module Metadata
// ============================================================

export interface ModuleInfo {
  id: string
  name: string
  nameJa: string
  icon: string
  description: string
  primarySkills: string[]
  position: string
  color: string
  available: boolean
  comingSoon?: boolean
}

export const MODULE_INFO: ModuleInfo[] = [
  {
    id: 'pitcher-reaction',
    name: 'Pitcher Reaction',
    nameJa: 'ピッチャーリアクション',
    icon: '⚡',
    description: '投球に反応してタップ！KVA動体視力と反応速度を鍛える',
    primarySkills: ['KVA動体視力', '眼と手の協応'],
    position: 'バッター向け',
    color: '#e8380d',
    available: true,
  },
  {
    id: 'ball-number-hunt',
    name: 'Ball Number Hunt',
    nameJa: 'ボールナンバーハント',
    icon: '🔢',
    description: '回転するボールの数字を読み取れ！瞬間視と動体視力の複合訓練',
    primarySkills: ['KVA動体視力', '瞬間視'],
    position: 'バッター向け',
    color: '#d4a017',
    available: true,
  },
  {
    id: 'fly-tracer',
    name: 'Fly Tracer',
    nameJa: 'フライトレーサー',
    icon: '👁',
    description: '複数のボールを追跡！DVA動体視力を鍛える',
    primarySkills: ['DVA動体視力', '追従性眼球運動'],
    position: '外野手向け',
    color: '#1a6644',
    available: false,
    comingSoon: true,
  },
  {
    id: 'flash-sign',
    name: 'Flash Sign',
    nameJa: 'フラッシュサイン',
    icon: '🌟',
    description: '一瞬のサインを記憶せよ！瞬間視を極限まで高める',
    primarySkills: ['瞬間視', '記憶'],
    position: '全選手向け',
    color: '#5b2d8e',
    available: false,
    comingSoon: true,
  },
  {
    id: 'stadium-vision',
    name: 'Stadium Vision',
    nameJa: 'スタジアムビジョン',
    icon: '🏟',
    description: '周辺視野を広げる！大型タッチパネルで最大効果',
    primarySkills: ['周辺視野', '空間認知'],
    position: 'タッチパネルモニター特化',
    color: '#2d5a8e',
    available: false,
    comingSoon: true,
  },
  {
    id: 'infield-reaction',
    name: 'Infield Reaction',
    nameJa: 'インフィールドリアクション',
    icon: '🧤',
    description: '内野手目線の打球に反応！DVA動体視力を鍛える',
    primarySkills: ['DVA動体視力', '反応速度'],
    position: '内野手向け',
    color: '#c19a6b',
    available: false,
    comingSoon: true,
  },
  {
    id: 'runner-watch',
    name: 'Runner Watch',
    nameJa: 'ランナーウォッチ',
    icon: '🔴',
    description: '投手視点でランナーを監視！最難関のマルチタスク訓練',
    primarySkills: ['周辺視野', '認知判断'],
    position: '投手・捕手向け',
    color: '#e8380d',
    available: false,
    comingSoon: true,
  },
]
