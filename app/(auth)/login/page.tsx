'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'メールアドレスまたはパスワードが正しくありません'
        : error.message
      );
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-[#0d2240] flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px)
          `,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-xl">
              ⚾
            </div>
            <span className="font-bold text-white text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>
              WISE VISION
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">ログイン</h1>
          <p className="text-white/50 text-sm mt-2">トレーニングを続けよう</p>
        </div>

        <div className="card-glass rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-white/70 text-sm mb-2">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 ログイン中...' : '🎮 ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-brand-gold hover:underline">
            新規登録
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
