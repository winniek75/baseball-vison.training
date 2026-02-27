'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import BallNumberHuntGame from '@/components/games/BallNumberHuntGame';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionMs: number;
  rounds: number;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, { label: string; desc: string; color: string }> = {
  1: { label: '入門', desc: '1桁数字・表示1秒・ゆっくり', color: 'bg-green-600' },
  2: { label: '初級', desc: '1桁・700ms表示', color: 'bg-blue-600' },
  3: { label: '中級', desc: '1桁・500ms・回転あり', color: 'bg-yellow-600' },
  4: { label: '上級', desc: '2桁・350ms・速い回転', color: 'bg-orange-600' },
  5: { label: '超上級', desc: '2桁・200ms・超高速', color: 'bg-red-700' },
};

export default function BallNumberHuntPage() {
  const router = useRouter();
  const supabase = createClient();

  const [gameState, setGameState] = useState<'select' | 'playing' | 'result'>('select');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [result, setResult] = useState<GameResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleComplete = async (res: GameResult) => {
    setResult(res);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('game_sessions').insert({
          user_id: user.id,
          game_type: 'ball-number-hunt',
          score: res.score,
          accuracy: res.accuracy,
          avg_reaction_ms: res.avgReactionMs,
          difficulty,
          rounds: res.rounds,
          duration_sec: 90,
        });
      }
    } catch (err) {
      console.error('Save error:', err);
    }

    setSaving(false);
    setGameState('result');
  };

  return (
    <div className="min-h-screen bg-navy">
      <Header />
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {gameState === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-8">
                <div className="text-white/50 text-sm mb-1">ゲームモジュール</div>
                <h1
                  className="text-3xl font-extrabold text-white"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  🔢 ボールナンバーハント
                </h1>
                <p className="text-white/50 text-sm mt-2">
                  KVA動体視力 + 瞬間視 — プロも実践する「ボール数字読み」のデジタル版
                </p>
              </div>

              <div className="mb-8">
                <h2
                  className="text-lg font-bold text-white mb-4"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  難易度を選択
                </h2>
                <div className="space-y-3">
                  {([1, 2, 3, 4, 5] as DifficultyLevel[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`
                        w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                        ${difficulty === d
                          ? 'border-brand-red bg-brand-red/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                        }
                      `}
                    >
                      <div className={`w-8 h-8 rounded-lg ${DIFFICULTY_LABELS[d].color} flex items-center justify-center font-bold text-white text-sm`}>
                        {d}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{DIFFICULTY_LABELS[d].label}</div>
                        <div className="text-white/50 text-sm">{DIFFICULTY_LABELS[d].desc}</div>
                      </div>
                      {difficulty === d && <div className="ml-auto text-brand-red text-xl">✓</div>}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setGameState('playing')}
                className="w-full btn-primary py-5 text-xl rounded-2xl"
              >
                🎮 ゲームスタート
              </button>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <BallNumberHuntGame
                difficulty={difficulty}
                onComplete={handleComplete}
              />
            </motion.div>
          )}

          {gameState === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-6xl mb-4">
                {result.accuracy >= 80 ? '🏆' : result.accuracy >= 60 ? '⭐' : '💪'}
              </div>
              <h2
                className="text-3xl font-extrabold text-white mb-6"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                結果発表
              </h2>

              <div className="card-glass rounded-2xl p-8 mb-6 max-w-sm mx-auto">
                <div
                  className="text-6xl font-extrabold text-brand-gold mb-2"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {result.score.toLocaleString()}
                </div>
                <div className="text-white/50 text-sm mb-6">TOTAL SCORE</div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div
                      className={`text-2xl font-bold mb-1 ${result.accuracy >= 80 ? 'text-green-400' : result.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}`}
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {result.accuracy.toFixed(0)}%
                    </div>
                    <div className="text-white/40 text-xs">正確率</div>
                  </div>
                  <div>
                    <div
                      className="text-2xl font-bold text-white mb-1"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {result.avgReactionMs > 0 ? `${result.avgReactionMs.toFixed(0)}ms` : '—'}
                    </div>
                    <div className="text-white/40 text-xs">平均反応</div>
                  </div>
                  <div>
                    <div
                      className="text-2xl font-bold text-white mb-1"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {result.rounds}
                    </div>
                    <div className="text-white/40 text-xs">ラウンド数</div>
                  </div>
                </div>
              </div>

              {saving && <p className="text-white/40 text-sm mb-4">💾 保存中...</p>}

              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <button
                  onClick={() => { setResult(null); setGameState('select'); }}
                  className="flex-1 btn-primary py-4 rounded-xl"
                >
                  🔄 もう一度
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 btn-secondary py-4 rounded-xl"
                >
                  🏠 ダッシュボード
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
