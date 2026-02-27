import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import GameCard from '@/components/ui/GameCard';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch recent sessions
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Best scores
  const bestScores: Record<string, number> = {};
  sessions?.forEach(s => {
    if (!bestScores[s.game_type] || s.score > bestScores[s.game_type]) {
      bestScores[s.game_type] = s.score;
    }
  });

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? '選手';

  return (
    <div className="min-h-screen bg-navy">
      <Header displayName={displayName} />
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <div className="text-white/50 text-sm mb-1">おかえり、</div>
          <h1
            className="text-3xl font-extrabold text-white"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {displayName} 選手 👋
          </h1>
          {profile?.position && (
            <div className="text-white/40 text-sm mt-1">
              {profile.position}
              {profile.team_name ? ` — ${profile.team_name}` : ''}
            </div>
          )}
        </div>

        {/* Stats row */}
        <DashboardClient sessions={sessions ?? []} />

        {/* Game Cards */}
        <div className="mt-10">
          <h2
            className="text-xl font-bold text-white mb-5"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            🎮 ゲームモジュール — PHASE 1
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GameCard
              href="/games/pitcher-reaction"
              emoji="⚡"
              title="ピッチャーリアクション"
              description="投球が飛んでくる！ストライク球が来たらタップ。KVA動体視力と眼と手の協応を強化。反応速度をmsで計測。"
              tags={['KVA動体視力', '眼と手の協応', 'バッター向け']}
              bestScore={bestScores['pitcher-reaction']}
              gradient="from-red-900/50 to-red-800/20"
              borderColor="border-brand-red/30"
              index={0}
            />
            <GameCard
              href="/games/ball-number-hunt"
              emoji="🔢"
              title="ボールナンバーハント"
              description="飛んでくるボールに書かれた数字を読み取れ！瞬間視とKVA動体視力の複合トレーニング。"
              tags={['KVA動体視力', '瞬間視', 'バッター向け']}
              bestScore={bestScores['ball-number-hunt']}
              gradient="from-blue-900/50 to-blue-800/20"
              borderColor="border-blue-500/30"
              index={1}
            />
          </div>
        </div>

        {/* Recent sessions */}
        {sessions && sessions.length > 0 && (
          <div className="mt-10">
            <h2
              className="text-xl font-bold text-white mb-5"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              📊 最近のプレイ履歴
            </h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(session => (
                <div
                  key={session.id}
                  className="card-glass rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {session.game_type === 'pitcher-reaction' ? '⚡' : '🔢'}
                    </span>
                    <div>
                      <div className="text-white text-sm font-semibold">
                        {session.game_type === 'pitcher-reaction'
                          ? 'ピッチャーリアクション'
                          : 'ボールナンバーハント'}
                      </div>
                      <div className="text-white/40 text-xs">
                        難易度 {session.difficulty} — {new Date(session.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-brand-gold font-extrabold text-lg"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {session.score.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">
                      正確率 {session.accuracy.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
