'use client';

import { motion } from 'framer-motion';

interface Session {
  id: string;
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_ms: number;
  difficulty: number;
  rounds: number;
  created_at: string;
}

interface DashboardClientProps {
  sessions: Session[];
}

export default function DashboardClient({ sessions }: DashboardClientProps) {
  const totalSessions = sessions.length;
  const totalScore = sessions.reduce((sum, s) => sum + s.score, 0);

  const pitcherSessions = sessions.filter(s => s.game_type === 'pitcher-reaction');
  const numberSessions = sessions.filter(s => s.game_type === 'ball-number-hunt');

  const avgAccuracy = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
    : 0;

  const bestReaction = sessions.filter(s => s.avg_reaction_ms > 0).length > 0
    ? Math.min(...sessions.filter(s => s.avg_reaction_ms > 0).map(s => s.avg_reaction_ms))
    : null;

  const stats = [
    { val: totalSessions.toString(), label: '総セッション数', emoji: '🎮' },
    { val: totalScore.toLocaleString(), label: '累計スコア', emoji: '⭐' },
    { val: `${avgAccuracy.toFixed(0)}%`, label: '平均正確率', emoji: '🎯' },
    { val: bestReaction ? `${bestReaction.toFixed(0)}ms` : '—', label: '最速反応', emoji: '⚡' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="card-glass rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-1">{stat.emoji}</div>
          <div
            className="text-2xl font-extrabold text-white mb-1"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {stat.val}
          </div>
          <div className="text-white/40 text-xs">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
