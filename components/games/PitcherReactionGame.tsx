'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type BallType = 'fastball' | 'curve' | 'slider' | 'changeup' | 'fake';
type GamePhase = 'ready' | 'countdown' | 'playing' | 'result';

interface Round {
  ballType: BallType;
  isStrike: boolean;
  number?: number;
  reactionMs?: number;
  isCorrect?: boolean;
}

interface PitcherReactionGameProps {
  difficulty: 1 | 2 | 3 | 4 | 5;
  onComplete: (result: {
    score: number;
    accuracy: number;
    avgReactionMs: number;
    rounds: number;
  }) => void;
}

const BALL_CONFIG: Record<BallType, { label: string; color: string; speed: number; curve: number }> = {
  fastball:   { label: '直球',     color: '#e8380d', speed: 1.0, curve: 0 },
  curve:      { label: 'カーブ',   color: '#3b82f6', speed: 0.75, curve: 1 },
  slider:     { label: 'スライダー', color: '#a855f7', speed: 0.85, curve: 0.5 },
  changeup:   { label: 'チェンジアップ', color: '#22c55e', speed: 0.6, curve: 0.3 },
  fake:       { label: 'フェイク',  color: '#6b7280', speed: 0.9, curve: 0 },
};

const DIFFICULTY_CONFIG = {
  1: { duration: 45, ballSpeed: 1800, strikeRatio: 0.7, fakeRatio: 0,    numberMode: false, roundTarget: 20 },
  2: { duration: 45, ballSpeed: 1500, strikeRatio: 0.65, fakeRatio: 0.1, numberMode: false, roundTarget: 25 },
  3: { duration: 60, ballSpeed: 1200, strikeRatio: 0.6, fakeRatio: 0.15, numberMode: false, roundTarget: 30 },
  4: { duration: 60, ballSpeed: 1000, strikeRatio: 0.55, fakeRatio: 0.2, numberMode: true,  roundTarget: 35 },
  5: { duration: 60, ballSpeed: 800,  strikeRatio: 0.5, fakeRatio: 0.25, numberMode: true,  roundTarget: 40 },
};

function getRandomBallType(fakeRatio: number): BallType {
  const r = Math.random();
  if (r < fakeRatio) return 'fake';
  const types: BallType[] = ['fastball', 'curve', 'slider', 'changeup'];
  return types[Math.floor(Math.random() * types.length)];
}

export default function PitcherReactionGame({ difficulty, onComplete }: PitcherReactionGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const ballStartTimeRef = useRef<number>(0);
  const currentRoundRef = useRef<Round | null>(null);
  const roundsRef = useRef<Round[]>([]);

  const config = DIFFICULTY_CONFIG[difficulty];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; type: 'perfect' | 'great' | 'miss' | 'fake' } | null>(null);
  const [ballVisible, setBallVisible] = useState(false);
  const [ballProgress, setBallProgress] = useState(0); // 0-1 (far to close)
  const [currentBall, setCurrentBall] = useState<Round | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const ballTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showFeedback = useCallback((text: string, type: 'perfect' | 'great' | 'miss' | 'fake') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 700);
  }, []);

  const launchBall = useCallback(() => {
    const isStrike = Math.random() < config.strikeRatio;
    const ballType = getRandomBallType(config.fakeRatio);
    const number = config.numberMode ? Math.floor(Math.random() * 9) + 1 : undefined;

    const round: Round = { ballType, isStrike, number };
    currentRoundRef.current = round;
    setCurrentBall(round);
    setBallVisible(true);
    setBallProgress(0);
    setWaitingForInput(true);
    ballStartTimeRef.current = performance.now();

    // Animate ball approach
    const startTime = performance.now();
    const duration = config.ballSpeed;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setBallProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ball passed — no reaction
        if (waitingForInput || currentRoundRef.current === round) {
          handleMiss(round, false);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [config, waitingForInput]);

  const handleMiss = useCallback((round: Round, wasEarly: boolean = false) => {
    cancelAnimationFrame(animFrameRef.current);
    setWaitingForInput(false);
    setBallVisible(false);
    currentRoundRef.current = null;

    round.isCorrect = false;
    round.reactionMs = undefined;
    roundsRef.current.push({ ...round });

    if (round.ballType === 'fake') {
      showFeedback('ナイス！フェイク見切り', 'fake');
      setScore(s => s + 50);
      setCombo(c => c + 1);
      round.isCorrect = true;
    } else {
      showFeedback(wasEarly ? 'フライング！' : '見逃し！', 'miss');
      setCombo(0);
    }

    // Launch next ball after short delay
    ballTimerRef.current = setTimeout(launchBall, 800);
  }, [launchBall, showFeedback]);

  const handleTap = useCallback(() => {
    if (!waitingForInput || !currentRoundRef.current) return;

    const round = currentRoundRef.current;
    const reactionMs = performance.now() - ballStartTimeRef.current;

    cancelAnimationFrame(animFrameRef.current);
    setWaitingForInput(false);
    setBallVisible(false);
    currentRoundRef.current = null;

    round.reactionMs = reactionMs;

    if (round.ballType === 'fake') {
      // Tapped a fake — penalty
      round.isCorrect = false;
      showFeedback('フェイク！ミス', 'miss');
      setCombo(0);
    } else if (round.isStrike) {
      // Correct tap
      round.isCorrect = true;
      const newCombo = combo + 1;
      setCombo(newCombo);

      let pts = 100;
      if (reactionMs < 300) { pts = 300; showFeedback('PERFECT! ⚡', 'perfect'); }
      else if (reactionMs < 500) { pts = 200; showFeedback('GREAT! 🔥', 'great'); }
      else { showFeedback('OK 👍', 'great'); }

      pts *= Math.max(1, Math.floor(newCombo / 3));
      setScore(s => s + pts);
    } else {
      // Tapped a ball — not a strike
      round.isCorrect = false;
      showFeedback('ボール球！', 'miss');
      setCombo(0);
    }

    roundsRef.current.push({ ...round });
    ballTimerRef.current = setTimeout(launchBall, 600);
  }, [waitingForInput, combo, launchBall, showFeedback]);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return;

    // Launch first ball
    ballTimerRef.current = setTimeout(launchBall, 500);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(ballTimerRef.current);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase]);

  // On result
  useEffect(() => {
    if (phase !== 'result') return;
    setWaitingForInput(false);
    setBallVisible(false);

    const rounds = roundsRef.current;
    const correct = rounds.filter(r => r.isCorrect).length;
    const accuracy = rounds.length > 0 ? (correct / rounds.length) * 100 : 0;
    const reactionTimes = rounds.filter(r => r.reactionMs != null).map(r => r.reactionMs!);
    const avgReactionMs = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;

    setTimeout(() => {
      onComplete({ score, accuracy, avgReactionMs, rounds: rounds.length });
    }, 1500);
  }, [phase]);

  // Ball size based on progress (far=small, close=large)
  const ballSize = 20 + ballProgress * 130; // 20px to 150px
  const ballX = 50 + (currentBall?.ballType === 'curve' ? Math.sin(ballProgress * Math.PI) * 15 : 0);
  const ballY = 50 + (currentBall?.ballType === 'slider' ? ballProgress * 8 : 0)
               + (currentBall?.ballType === 'changeup' ? Math.sin(ballProgress * Math.PI * 1.5) * 5 : 0);

  const ballColor = currentBall ? BALL_CONFIG[currentBall.ballType].color : '#e8380d';

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none">
      {/* Phase: Ready */}
      {phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 w-full"
        >
          <div className="text-6xl mb-6">⚡</div>
          <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            ピッチャーリアクション
          </h2>
          <p className="text-white/60 mb-2 text-sm">難易度 {difficulty} / 5</p>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
            ストライクの球が来たらタップ！ボール球とフェイクには反応しないで。
            反応速度をミリ秒で計測します。
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            {[
              { emoji: '⚾', label: 'ストライク → タップ！', color: 'text-green-400' },
              { emoji: '💨', label: 'ボール球 → 見逃し', color: 'text-white/50' },
              { emoji: '👁', label: 'フェイク → 反応しない', color: 'text-brand-gold' },
            ].map((item, i) => (
              <div key={i} className="card-glass rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className={`text-xs ${item.color}`}>{item.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setPhase('countdown'); }}
            className="btn-primary text-xl py-5 px-12 rounded-2xl"
          >
            🎮 スタート
          </button>
        </motion.div>
      )}

      {/* Phase: Countdown */}
      {phase === 'countdown' && (
        <div className="flex items-center justify-center py-24 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-8xl font-extrabold text-white"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {countdown > 0 ? countdown : '⚡'}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Phase: Playing */}
      {phase === 'playing' && (
        <div className="w-full">
          {/* HUD */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-white/50 text-xs">スコア</div>
                <div className="text-white font-extrabold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {score.toLocaleString()}
                </div>
              </div>
              {combo >= 2 && (
                <div className="text-center">
                  <div className="text-white/50 text-xs">コンボ</div>
                  <div className="text-brand-gold font-bold text-xl">{combo}x</div>
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-white/50 text-xs">残り時間</div>
              <div
                className={`font-extrabold text-2xl ${timeLeft <= 10 ? 'text-brand-red' : 'text-white'}`}
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                {timeLeft}
              </div>
            </div>
          </div>

          {/* Time bar */}
          <div className="w-full bg-white/10 rounded-full h-1 mb-4">
            <div
              className="bg-brand-red h-1 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / config.duration) * 100}%` }}
            />
          </div>

          {/* Game field */}
          <div
            className="relative w-full rounded-2xl overflow-hidden cursor-pointer active:opacity-90"
            style={{ aspectRatio: '4/3', maxHeight: '420px', background: 'radial-gradient(ellipse at center, #1a3a60 0%, #0d2240 70%, #081525 100%)' }}
            onClick={handleTap}
          >
            {/* Mound lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300">
              {/* Strike zone box */}
              <rect x="145" y="110" width="110" height="130" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="4,4" />
              {/* Pitcher's mound indicator */}
              <ellipse cx="200" cy="280" rx="30" ry="8" fill="rgba(255,255,255,0.05)" />
              {/* Perspective lines */}
              <line x1="0" y1="300" x2="200" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="400" y1="300" x2="200" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              {/* Home plate */}
              <polygon points="175,295 225,295 230,280 200,270 170,280" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </svg>

            {/* Ball */}
            <AnimatePresence>
              {ballVisible && currentBall && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${ballX}%`,
                    top: `${ballY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${ballSize}px`,
                    height: `${ballSize}px`,
                  }}
                >
                  {/* Ball glow */}
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-60"
                    style={{ background: ballColor, transform: 'scale(1.4)' }}
                  />
                  {/* Ball body */}
                  <div
                    className="relative w-full h-full rounded-full flex items-center justify-center font-extrabold text-white shadow-xl"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, white, ${ballColor})`,
                      fontSize: `${Math.max(8, ballSize * 0.35)}px`,
                      fontFamily: 'Syne, sans-serif',
                    }}
                  >
                    {currentBall.number ?? ''}
                  </div>
                  {/* Seams */}
                  <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
                    <path d="M30,20 Q50,40 30,60" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    <path d="M70,20 Q50,40 70,60" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ball type label */}
            {ballVisible && currentBall && ballProgress > 0.3 && (
              <div
                className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: ballColor + '40', color: ballColor, border: `1px solid ${ballColor}60` }}
              >
                {BALL_CONFIG[currentBall.ballType].label}
              </div>
            )}

            {/* Tap instruction */}
            {!ballVisible && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/20 text-sm">投球を待て...</div>
              </div>
            )}

            {/* Feedback overlay */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  key={feedback.text}
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div
                    className={`text-3xl font-extrabold ${
                      feedback.type === 'perfect' ? 'feedback-perfect' :
                      feedback.type === 'great' ? 'feedback-great' :
                      feedback.type === 'fake' ? 'text-brand-gold' :
                      'feedback-miss'
                    }`}
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    {feedback.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-white/30 text-xs text-center mt-3">
            ストライク球が来たら画面をタップ！
          </p>
        </div>
      )}

      {/* Phase: Result */}
      {phase === 'result' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 w-full"
        >
          <div className="text-5xl mb-4">🏆</div>
          <h2
            className="text-3xl font-extrabold text-white mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            セッション終了！
          </h2>
          <div
            className="text-5xl font-extrabold text-brand-gold my-6"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {score.toLocaleString()}
          </div>
          <p className="text-white/60 mb-4">スコアを保存しています...</p>
          <div className="flex justify-center">
            <div className="inline-flex gap-1">
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  className="w-2 h-2 rounded-full bg-brand-red"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
