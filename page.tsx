'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import { MODULE_INFO, BADGE_INFO, calculateVisionProfile } from '@/lib/scoring'
import type { UserProfile, GameSession, Badge, ModuleId } from '@/types/supabase'

interface SessionChartData {
  date: string
  score: number
  reaction: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const [userRes, sessionsRes, badgesRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('sessions').select('*').eq('user_id', authUser.id).order('played_at', { ascending: false }).limit(30),
        supabase.from('badges').select('*').eq('user_id', authUser.id),
      ])

      if (userRes.data) setUser(userRes.data as UserProfile)
      if (sessionsRes.data) setSessions(sessionsRes.data as GameSession[])
      if (badgesRes.data) setBadges(badgesRes.data as Badge[])
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Chart data — last 7 days scores
  const chartData: SessionChartData[] = sessions
    .slice(0, 7)
    .reverse()
    .map((s) => ({
      date: new Date(s.played_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      score: s.score,
      reaction: s.reaction_ms_avg ?? 0,
    }))

  // Vision profile
  const visionProfile = calculateVisionProfile(sessions)
  const radarData = [
    { skill: 'KVA動体視力', value: visionProfile.kva },
    { skill: 'DVA動体視力', value: visionProfile.dva },
    { skill: '眼と手の協応', value: visionProfile.handEye },
    { skill: '瞬間視', value: visionProfile.instant },
    { skill: '周辺視野', value: visionProfile.peripheral },
    { skill: '深視力', value: visionProfile.depth },
  ]

  // Today's missions
  const todayMissions: ModuleId[] = ['pitcher-reaction', 'ball-number-hunt']
  const playedToday = sessions.filter((s) => {
    const today = new Date().toDateString()
    return new Date(s.played_at).toDateString() === today
  }).map((s) => s.module_id)

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-dark flex items-center justify-center">
        <div className="flex gap-2">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-dark text-white">
      {/* Subtle field atmosphere */}
      <div className="fixed inset-0 field-bg opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/8 bg-navy/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚾</span>
            <div>
              <div
                className="text-xs tracking-[0.2em] text-gold uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                WISE Vision
              </div>
              <div
                className="text-base font-bold leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {user?.name ?? 'プレイヤー'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak */}
            <div className="hud-panel flex items-center gap-2 px-3 py-1.5">
              <span className="text-lg">🔥</span>
              <div>
                <div className="hud-label">連続</div>
                <div className="text-base font-black text-gold leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  {user?.streak ?? 0}日
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-ghost text-sm py-2 px-4"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Today's Missions */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="text-xs tracking-[0.25em] text-gold uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              📋 Today&apos;s Mission
            </div>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {todayMissions.map((missionId, i) => {
              const mod = MODULE_INFO.find((m) => m.id === missionId)
              if (!mod) return null
              const done = playedToday.includes(missionId)

              return (
                <motion.div
                  key={missionId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={`/game/${missionId}`}>
                    <div
                      className={`module-tile p-5 ${done ? 'opacity-60' : ''}`}
                      style={{ borderColor: done ? undefined : `${mod.color}40` }}
                    >
                      {/* Color bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                        style={{ background: mod.color }}
                      />

                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: `${mod.color}25` }}
                        >
                          {mod.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ color: mod.color, fontFamily: 'var(--font-display)' }}
                            >
                              Daily Mission
                            </span>
                            {done && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
                                ✓ クリア
                              </span>
                            )}
                          </div>
                          <h3
                            className="text-base font-bold text-white mb-1"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {mod.nameJa}
                          </h3>
                          <p className="text-xs text-white/50">{mod.description}</p>
                          <div className="flex gap-2 mt-2">
                            {mod.primarySkills.map((skill) => (
                              <span
                                key={skill}
                                className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/60"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-white/20 text-xl flex-shrink-0">→</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: '総プレイ回数',
              value: sessions.length,
              unit: '回',
              icon: '🎮',
            },
            {
              label: '平均反応速度',
              value: sessions.length > 0
                ? Math.round(sessions.filter(s => s.reaction_ms_avg).reduce((a, s) => a + (s.reaction_ms_avg ?? 0), 0) / sessions.filter(s => s.reaction_ms_avg).length) || '—'
                : '—',
              unit: sessions.length > 0 ? 'ms' : '',
              icon: '⚡',
            },
            {
              label: '最高スコア',
              value: sessions.length > 0 ? Math.max(...sessions.map(s => s.score)) : 0,
              unit: 'pt',
              icon: '🏆',
            },
            {
              label: '獲得バッジ',
              value: badges.length,
              unit: '個',
              icon: '🎖',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="game-card p-5"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="hud-label mb-1">{stat.label}</div>
              <div
                className="text-3xl font-black text-white leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {stat.value}
                <span className="text-base font-normal text-white/40 ml-1">{stat.unit}</span>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Score History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="game-card p-6 lg:col-span-3"
          >
            <div
              className="text-xs tracking-[0.2em] text-white/40 uppercase mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              📈 直近7日間のスコア推移
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0d2240',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#d4a017' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#e8380d"
                    strokeWidth={2.5}
                    dot={{ fill: '#e8380d', r: 4 }}
                    activeDot={{ r: 6, fill: '#ff5a30' }}
                    name="スコア"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-white/30 text-sm">
                プレイするとグラフが表示されます
              </div>
            )}
          </motion.div>

          {/* Vision Radar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="game-card p-6 lg:col-span-2"
          >
            <div
              className="text-xs tracking-[0.2em] text-white/40 uppercase mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              👁 ビジョンプロフィール
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                />
                <Radar
                  name="視機能"
                  dataKey="value"
                  stroke="#d4a017"
                  fill="#d4a017"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </section>

        {/* All Game Modules */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="text-xs tracking-[0.25em] text-gold uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              🎮 ゲームモジュール
            </div>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MODULE_INFO.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
              >
                {mod.available ? (
                  <Link href={`/game/${mod.id}`}>
                    <div className="module-tile p-4 h-full">
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                        style={{ background: mod.color }}
                      />
                      <div className="text-2xl mb-2">{mod.icon}</div>
                      <h3
                        className="text-sm font-bold text-white mb-1 leading-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {mod.nameJa}
                      </h3>
                      <p className="text-xs text-white/40 leading-relaxed">{mod.description}</p>
                      <div
                        className="mt-3 text-xs font-bold"
                        style={{ color: mod.color, fontFamily: 'var(--font-display)' }}
                      >
                        プレイ →
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="module-tile p-4 h-full opacity-40 cursor-not-allowed">
                    <div className="text-2xl mb-2 grayscale">{mod.icon}</div>
                    <h3
                      className="text-sm font-bold text-white/60 mb-1 leading-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {mod.nameJa}
                    </h3>
                    <p className="text-xs text-white/30">PHASE 2で追加予定</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Badges */}
        {badges.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="text-xs tracking-[0.25em] text-gold uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                🎖 獲得バッジ
              </div>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => {
                const info = BADGE_INFO[badge.badge_key as keyof typeof BADGE_INFO]
                if (!info) return null
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="game-card px-4 py-2.5 flex items-center gap-2"
                    title={info.description}
                  >
                    <span className="text-xl">{info.emoji}</span>
                    <div>
                      <div
                        className="text-xs font-bold text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {info.name}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
