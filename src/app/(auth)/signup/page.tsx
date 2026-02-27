'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

const POSITIONS = ['投手', '捕手', '一塁手', '二塁手', '三塁手', '遊撃手', '外野手', '指名打者', 'まだ決まっていない'];
const GRADES = [
  { label: '小学1年', val: 1 }, { label: '小学2年', val: 2 }, { label: '小学3年', val: 3 },
  { label: '小学4年', val: 4 }, { label: '小学5年', val: 5 }, { label: '小学6年', val: 6 },
  { label: '中学1年', val: 7 }, { label: '中学2年', val: 8 }, { label: '中学3年', val: 9 },
  { label: '高校1年', val: 10 }, { label: '高校2年', val: 11 }, { label: '高校3年', val: 12 },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [position, setPosition] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number>(7);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setLoading(true);
    setError('');

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).insert({
        user_id: data.user.id,
        display_name: displayName,
        position: position || null,
        grade_level: gradeLevel,
        team_name: teamName || null,
        role: 'player',
      });
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#0d2240] flex items-center justify-center px-4 py-8">
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
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-xl">⚾</div>
            <span className="font-bold text-white text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>WISE VISION</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">新規登録</h1>
          <p className="text-white/50 text-sm mt-2">
            ステップ {step} / 2 — {step === 1 ? 'アカウント情報' : 'プロフィール設定'}
          </p>
          {/* Progress bar */}
          <div className="w-full bg-white/10 rounded-full h-1 mt-4">
            <div
              className="bg-brand-red h-1 rounded-full transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <div className="card-glass rounded-2xl p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-white/70 text-sm mb-2">表示名（ニックネーム）</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-red transition-colors"
                    placeholder="選手名 or ニックネーム"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-red transition-colors"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">パスワード（6文字以上）</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-red transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-white/70 text-sm mb-2">学年</label>
                  <select
                    value={gradeLevel}
                    onChange={e => setGradeLevel(Number(e.target.value))}
                    className="w-full bg-navy/80 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red transition-colors"
                  >
                    {GRADES.map(g => (
                      <option key={g.val} value={g.val}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">守備位置</label>
                  <select
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    className="w-full bg-navy/80 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red transition-colors"
                  >
                    <option value="">選択してください</option>
                    {POSITIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">チーム名（任意）</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-brand-red transition-colors"
                    placeholder="例：WISE野球クラブ"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 btn-secondary py-4 rounded-xl"
                >
                  ← 戻る
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary py-4 rounded-xl disabled:opacity-50"
              >
                {loading ? '🔄 登録中...' : step === 1 ? '次へ →' : '🎮 登録してプレイ開始'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-brand-gold hover:underline">ログイン</Link>
        </p>
      </motion.div>
    </main>
  );
}
