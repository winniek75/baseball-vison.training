'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type GamePhase = 'ready' | 'countdown' | 'playing' | 'input' | 'feedback' | 'result';

interface Round {
  number: number;
  displayMs: number;
  reactionMs?: number;
  userAnswer?: number;
  isCorrect?: boolean;
}

interface BallNumberHuntGameProps {
  difficulty: 1 | 2 | 3 | 4 | 5;
  onComplete: (result: {
    score: number;
    accuracy: number;
    avgReactionMs: number;
    rounds: number;
  }) => void;
}

const DIFFICULTY_CONFIG = {
  1: { displayMs: 1000, totalRounds: 15, twoDigit: false, rotationSpeed: 0, approachDuration: 2000 },
  2: { displayMs: 700,  totalRounds: 18, twoDigit: false, rotationSpeed: 1, approachDuration: 1800 },
  3: { displayMs: 500,  totalRounds: 20, twoDigit: false, rotationSpeed: 2, approachDuration: 1500 },
  4: { displayMs: 350,  totalRounds: 22, twoDigit: true,  rotationSpeed: 3, approachDuration: 1300 },
  5: { displayMs: 200,  totalRounds: 25, twoDigit: true,  rotationSpeed: 4, approachDuration: 1000 },
};

export default function BallNumberHuntGame({ difficulty, onComplete }: BallNumberHuntGameProps) {
  const config = DIFFICULTY_CONFIG[difficulty];

  const [phase, setPhase] = useState<GamePhase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  // Ball animation state
  const [ballVisible, setBallVisible] = useState(false);
  const [ballProgress, setBallProgress] = useState(0); // 0 = far, 1 = close
  const [currentNumber, setCurrentNumber] = useState<number>(0);
  const [numberVisible, setNumberVisible] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [roundStartTime, setRoundStartTime] = useState(0);

  const animFrameRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const runRound = useCallback(() => {
    const number = config.twoDigit
      ? Math.floor(Math.random() * 90) + 10
      : Math.floor(Math.random() * 9) + 1;

    setCurrentNumber(number);
    setBallProgress(0);
    setBallVisible(true);
    setNumberVisible(false);
    setUserInput('');

    const startTime = performance.now();
    const approachDuration = config.approachDuration;

    // Animate ball approach
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / approachDuration, 1);
      setBallProgress(progress);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ball is fully visible — show number briefly
        setNumberVisible(true);
        setRoundStartTime(performance.now());

        timeoutRef.current = setTimeout(() => {
          setNumberVisible(false);
          setBallVisible(false);
          // Now wait for input
          setPhase('input');
        }, config.displayMs);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [config]);

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

  // Start round
  useEffect(() => {
    if (phase !== 'playing') return;
    runRound();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [phase, currentRound]);

  const submitAnswer = useCallback((answer: string) => {
    const answerNum = parseInt(answer, 10);
    const reactionMs = performance.now() - roundStartTime;
    const isCorrect = answerNum === currentNumber;

    const round: Round = {
      number: currentNumber,
      displayMs: config.displayMs,
      reactionMs,
      userAnswer: answerNum,
      isCorrect,
    };

    setRounds(prev => [...prev, round]);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      let pts = 100 + Math.floor((1000 - Math.min(reactionMs, 1000)) / 10);
      pts *= Math.max(1, Math.floor(newCombo / 3));
      setScore(s => s + pts);
      setFeedback({ text: `✅ ${currentNumber} — 正解！ +${pts}`, correct: true });
    } else {
      setCombo(0);
      setFeedback({ text: `❌ 正解は ${currentNumber}`, correct: false });
    }

    setPhase('feedback');
    setUserInput('');

    timeoutRef.current = setTimeout(() => {
      setFeedback(null);
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);

      if (nextRound >= config.totalRounds) {
        setPhase('result');
      } else {
        setPhase('playing');
      }
    }, 900);
  }, [currentNumber, combo, currentRound, config, roundStartTime]);

  // Keypad press
  const handleKeypad = useCallback((val: string) => {
    if (phase !== 'input') return;

    if (val === 'del') {
      setUserInput(prev => prev.slice(0, -1));
      return;
    }
    if (val === 'ok') {
      if (userInput.length > 0) submitAnswer(userInput);
      return;
    }

    const newInput = userInput + val;
    setUserInput(newInput);

    // Auto-submit for 1-digit mode
    if (!config.twoDigit && newInput.length === 1) {
      submitAnswer(newInput);
    } else if (config.twoDigit && newInput.length === 2) {
      submitAnswer(newInput);
    }
  }, [phase, userInput, config.twoDigit, submitAnswer]);

  // Result
  useEffect(() => {
    if (phase !== 'result') return;
    const correct = rounds.filter(r => r.isCorrect).length;
    const accuracy = rounds.length > 0 ? (correct / rounds.length) * 100 : 0;
    const times = rounds.filter(r => r.reactionMs != null).map(r => r.reactionMs!);
    const avgReactionMs = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    setTimeout(() => {
      onComplete({ score, accuracy, avgReactionMs, rounds: rounds.length });
    }, 1500);
  }, [phase]);

  const ballSize = 30 + ballProgress * 200;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none">
      {/* Ready */}
      {phase === 'ready' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-10 w-full"
        >
          <div className="text-6xl mb-6">🔢</div>
          <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            ボールナンバーハント
          </h2>
          <p className="text-white/60 mb-2 text-sm">難易度 {difficulty} / 5</p>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            飛んでくるボールに書かれた数字を読んでタップ！瞬時に情報を脳に焼き付けよう。
            {config.twoDigit ? '2桁の数字' : '1〜9の数字'}を読み取ります。
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8 max-w-xs mx-auto">
            {[
              { emoji: '⚾', label: 'ボールが飛んでくる', sub: `${config.displayMs}msで数字が消える` },
              { emoji: '🔢', label: '数字を入力', sub: 'テンキーでタップ' },
            ].map((item, i) => (
              <div key={i} className="card-glass rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-white text-sm font-semibold">{item.label}</div>
                <div className="text-white/40 text-xs mt-1">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="text-white/40 text-sm mb-6">
            全 {config.totalRounds} ラウンド
          </div>

          <button
            onClick={() => setPhase('countdown')}
            className="btn-primary text-xl py-5 px-12 rounded-2xl"
          >
            🎮 スタート
          </button>
        </motion.div>
      )}

      {/* Countdown */}
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
              {countdown > 0 ? countdown : '🔢'}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Playing / Input */}
      {(phase === 'playing' || phase === 'input' || phase === 'feedback') && (
        <div className="w-full">
          {/* HUD */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-white/50 text-xs">スコア</div>
                <div className="text-white font-extrabold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {score.toLocaleString()}
                </div>
              </div>
              {combo >= 2 && (
                <div>
                  <div className="text-white/50 text-xs">コンボ</div>
                  <div className="text-brand-gold font-bold text-xl">{combo}x</div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-white/50 text-xs">ラウンド</div>
              <div className="text-white font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                {currentRound + 1} / {config.totalRounds}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="w-full bg-white/10 rounded-full h-1 mb-4">
            <div
              className="bg-brand-red h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentRound) / config.totalRounds) * 100}%` }}
            />
          </div>

          {/* Game field */}
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: '4/3',
              maxHeight: '320px',
              background: 'radial-gradient(ellipse at center, #1a3a60 0%, #0d2240 70%, #081525 100%)',
            }}
          >
            {/* Field lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300">
              <rect x="145" y="110" width="110" height="130" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="0" y1="300" x2="200" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <line x1="400" y1="300" x2="200" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <polygon points="175,295 225,295 230,280 200,270 170,280" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            </svg>

            {/* Ball approach */}
            <AnimatePresence>
              {ballVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${ballSize}px`,
                    height: `${ballSize}px`,
                  }}
                >
                  {/* Glow */}
                  <div
                    className="absolute inset-0 rounded-full blur-lg opacity-50"
                    style={{ background: '#e8380d', transform: 'scale(1.3)' }}
                  />
                  {/* Ball */}
                  <div
                    className="relative w-full h-full rounded-full flex items-center justify-center font-extrabold text-white shadow-2xl"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #fff5f0, #e8380d)',
                      fontSize: numberVisible ? `${Math.max(12, ballSize * 0.38)}px` : '0px',
                      transition: 'font-size 0.05s',
                      fontFamily: 'Syne, sans-serif',
                    }}
                  >
                    {numberVisible ? currentNumber : ''}
                  </div>
                  {/* Seams */}
                  <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100">
                    <path d="M30,20 Q50,40 30,60" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    <path d="M70,20 Q50,40 70,60" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instruction when no ball */}
            {!ballVisible && phase === 'playing' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/20 text-sm">準備中...</div>
              </div>
            )}
          </div>

          {/* Input section */}
          <div className="mt-4">
            {/* Answer display */}
            <div className="text-center mb-3">
              {phase === 'input' && (
                <div>
                  <div className="text-white/50 text-sm mb-1">何番でしたか？</div>
                  <div
                    className="text-5xl font-extrabold text-white min-h-[60px]"
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    {userInput || '_'}
                  </div>
                </div>
              )}
              {phase === 'feedback' && feedback && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-xl font-bold py-3 rounded-xl ${
                    feedback.correct
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {feedback.text}
                </motion.div>
              )}
              {phase === 'playing' && (
                <div className="text-white/20 text-sm py-4">ボールを見ろ！</div>
              )}
            </div>

            {/* Keypad */}
            {phase === 'input' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-2 max-w-xs mx-auto"
              >
                {['1','2','3','4','5','6','7','8','9','del','0','ok'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleKeypad(key)}
                    className={`
                      h-14 rounded-xl font-bold text-xl transition-all active:scale-95 touch-manipulation
                      ${key === 'ok'
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : key === 'del'
                        ? 'bg-white/10 hover:bg-white/20 text-white/70 text-base'
                        : 'bg-white/15 hover:bg-white/25 text-white'
                      }
                    `}
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    {key === 'del' ? '⌫' : key === 'ok' ? '✓' : key}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 w-full"
        >
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            セッション終了！
          </h2>
          <div className="text-5xl font-extrabold text-brand-gold my-6" style={{ fontFamily: 'Syne, sans-serif' }}>
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
