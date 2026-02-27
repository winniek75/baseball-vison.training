'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ScoreDisplayProps {
  score: number;
  combo: number;
  accuracy: number;
  avgReactionMs?: number;
}

export default function ScoreDisplay({ score, combo, accuracy, avgReactionMs }: ScoreDisplayProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Score */}
      <div className="text-center">
        <div className="text-white/50 text-xs mb-1">スコア</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={score}
            initial={{ scale: 1.3, color: '#d4a017' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="font-extrabold text-2xl text-white"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {score.toLocaleString()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/20" />

      {/* Combo */}
      <div className="text-center">
        <div className="text-white/50 text-xs mb-1">コンボ</div>
        <div
          className={`font-bold text-xl ${combo >= 5 ? 'text-brand-gold' : combo >= 3 ? 'text-green-400' : 'text-white'}`}
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          {combo}x
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/20" />

      {/* Accuracy */}
      <div className="text-center">
        <div className="text-white/50 text-xs mb-1">正確率</div>
        <div
          className={`font-bold text-xl ${accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}`}
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          {accuracy.toFixed(0)}%
        </div>
      </div>

      {/* Reaction time (optional) */}
      {avgReactionMs !== undefined && avgReactionMs > 0 && (
        <>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <div className="text-white/50 text-xs mb-1">平均反応</div>
            <div
              className="font-bold text-xl text-white/80"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {avgReactionMs.toFixed(0)}ms
            </div>
          </div>
        </>
      )}
    </div>
  );
}
