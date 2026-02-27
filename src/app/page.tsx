'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0d2240] flex flex-col overflow-hidden relative">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.08) 39px, rgba(255,255,255,0.08) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.08) 39px, rgba(255,255,255,0.08) 40px)
          `,
        }}
      />

      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-red/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 md:p-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-xl">
            ⚾
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-wider" style={{ fontFamily: 'Syne, sans-serif' }}>
              WISE VISION
            </div>
            <div className="text-white/40 text-xs tracking-widest">BASEBALL ACADEMY</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-white/60 hover:text-white text-sm transition-colors px-4 py-2">
            ログイン
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-5">
            無料で始める
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block border border-brand-gold/40 text-brand-gold text-xs tracking-[0.3em] uppercase px-4 py-2 rounded-sm mb-8">
            Vision Training App — PHASE 1
          </div>

          <h1
            className="text-4xl md:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            野球選手の<br />
            <span className="text-brand-red">眼</span>を、<br />
            ゲームで鍛える。
          </h1>

          <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            KVA動体視力・眼と手の協応・瞬間視。
            科学的根拠のある視機能トレーニングを、
            楽しいゲームで毎日3分続けよう。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary text-base py-4 px-8 rounded-xl">
              🎮 無料でプレイ開始
            </Link>
            <Link href="/login" className="btn-secondary text-base py-4 px-8 rounded-xl">
              ログイン
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          {[
            { val: '2', label: 'ゲームモジュール', sub: 'PHASE 1' },
            { val: '6', label: '視機能要素', sub: 'カバレッジ' },
            { val: '3分', label: '推奨プレイ時間', sub: '1日あたり' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div
                className="text-3xl font-extrabold text-brand-gold mb-1"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                {s.val}
              </div>
              <div className="text-white/60 text-xs leading-tight">{s.label}</div>
              <div className="text-white/30 text-xs">{s.sub}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Game Cards Preview */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative z-10 px-6 pb-16"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              emoji: '⚡',
              title: 'ピッチャーリアクション',
              desc: '投球に反応してタップ。KVA動体視力と眼と手の協応を強化。',
              tag: 'バッター向け',
              color: 'from-red-900/40 to-red-800/20',
              border: 'border-brand-red/30',
            },
            {
              emoji: '🔢',
              title: 'ボールナンバーハント',
              desc: '飛んでくるボールの数字を読み取る。KVA動体視力 + 瞬間視。',
              tag: 'バッター向け',
              color: 'from-blue-900/40 to-blue-800/20',
              border: 'border-brand-mid/30',
            },
          ].map((game, i) => (
            <div
              key={i}
              className={`card-glass bg-gradient-to-br ${game.color} border ${game.border} rounded-xl p-6`}
            >
              <div className="text-3xl mb-3">{game.emoji}</div>
              <h3 className="text-white font-bold text-lg mb-2">{game.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-3">{game.desc}</p>
              <span className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full">
                {game.tag}
              </span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-white/10">
        <p className="text-white/25 text-xs tracking-widest uppercase" style={{ fontFamily: 'Syne, sans-serif' }}>
          WISE BASEBALL ACADEMY ONLINE — Vision Training App
        </p>
      </footer>
    </main>
  );
}
