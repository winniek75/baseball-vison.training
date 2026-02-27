'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface GameCardProps {
  href: string;
  emoji: string;
  title: string;
  description: string;
  tags: string[];
  bestScore?: number;
  gradient: string;
  borderColor: string;
  index?: number;
}

export default function GameCard({
  href,
  emoji,
  title,
  description,
  tags,
  bestScore,
  gradient,
  borderColor,
  index = 0,
}: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={href}>
        <div
          className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-br ${gradient} p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] cursor-pointer group`}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="flex items-start justify-between mb-4">
            <div className="text-4xl">{emoji}</div>
            {bestScore !== undefined && (
              <div className="text-right">
                <div className="text-white/40 text-xs">ベスト</div>
                <div
                  className="text-brand-gold font-extrabold text-xl"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {bestScore.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <h3
            className="text-white font-bold text-xl mb-2 group-hover:text-brand-gold transition-colors"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {title}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-4">{description}</p>

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-white/40 group-hover:text-white text-sm transition-colors">
              プレイ →
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
