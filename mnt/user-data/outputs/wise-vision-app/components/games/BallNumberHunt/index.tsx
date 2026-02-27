'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { DIFFICULTY_CONFIGS, calculateHitScore, aggregateGameResult } from '@/lib/scoring'
import type { Difficulty } from '@/types/supabase'

// ============================================================
// Ball state for number hunt
// ============================================================
interface NumberBall {
  id: string
  x: number
  y: number
  z: number            // depth 0→1
  radius: number
  number: number       // the number ON the ball (1-99)
  spin: number
  spinSpeed: number
  drift: { x: number; y: number }
  color: string
  answered: boolean
  startTime: number
  choices: number[]    // 4 choices including correct answer
  phase: 'flying' | 'answering' | 'done'
}

const BALL_COLORS = ['#e8380d', '#3b82f6', '#a78bfa', '#10b981', '#f59e0b']

interface BallNumberHuntProps {
  onGameEnd: (result: ReturnType<typeof aggregateGameResult>) => void
}

export default function BallNumberHunt({ onGameEnd }: BallNumberHuntProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const [activeBall, setActiveBall] = useState<NumberBall | null>(null)
  const [showChoices, setShowChoices] = useState(false)
  const [choiceResult, setChoiceResult] = useState<'correct' | 'wrong' | null>(null)

  const gameStateRef = useRef({
    ball: null as NumberBall | null,
    scores: [] as number[],
    reactionTimes: [] as number[],
    totalAttempts: 0,
    correctCount: 0,
    running: false,
    ballStartTime: 0,
    waitingForAnswer: false,
  })

  const {
    phase, settings, score, combo,
    startGame, endGame, addScore, incrementCombo, resetCombo,
    addReactionTime, incrementAttempts, setTimeRemaining, addFeedback,
  } = useGameStore()

  const diffConfig = DIFFICULTY_CONFIGS[settings.difficulty as Difficulty]

  // Generate 4 choices with one correct answer
  const generateChoices = (correct: number): number[] => {
    const choices = new Set<number>([correct])
    while (choices.size < 4) {
      const offset = Math.floor(Math.random() * 20) - 10
      const candidate = Math.max(1, Math.min(99, correct + offset))
      if (candidate !== correct) choices.add(candidate)
    }
    // Shuffle
    return [...choices].sort(() => Math.random() - 0.5)
  }

  // Spawn a new ball
  const spawnBall = useCallback((w: number, h: number): NumberBall => {
    const number = Math.floor(Math.random() * (settings.difficulty <= 2 ? 9 : 49)) + 1
    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]

    return {
      id: `${Date.now()}`,
      x: w / 2 + (Math.random() - 0.5) * w * 0.1,
      y: h * 0.4,
      z: 0,
      radius: 12,
      number,
      spin: 0,
      spinSpeed: diffConfig.spinRate * (settings.difficulty >= 4 ? 2 : 1),
      drift: {
        x: (Math.random() - 0.5) * 0.12,
        y: (Math.random() - 0.5) * 0.06,
      },
      color,
      answered: false,
      startTime: performance.now(),
      choices: generateChoices(number),
      phase: 'flying',
    }
  }, [settings.difficulty, diffConfig.spinRate])

  // Setup canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    return { ctx, w: rect.width, h: rect.height }
  }, [])

  // Draw background
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#080f1f')
    grad.addColorStop(0.4, '#0d2240')
    grad.addColorStop(1, '#0d4a2e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Perspective lines from mound
    const vanishX = w / 2
    const vanishY = h * 0.4
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath()
      ctx.moveTo(vanishX, vanishY)
      ctx.lineTo((w / 8) * i, h)
      ctx.stroke()
    }

    // Target circle at center
    ctx.strokeStyle = 'rgba(212,160,23,0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 8])
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.7, 50, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }, [])

  // Draw ball with number
  const drawBall = useCallback((ctx: CanvasRenderingContext2D, ball: NumberBall) => {
    if (ball.phase === 'done') return

    ctx.save()
    ctx.translate(ball.x, ball.y)

    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${ball.z * 0.35})`
    ctx.beginPath()
    ctx.ellipse(0, ball.radius * 0.7, ball.radius * 0.85, ball.radius * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Ball body with gradient
    const grad = ctx.createRadialGradient(-ball.radius * 0.3, -ball.radius * 0.3, 0, 0, 0, ball.radius)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.5, '#f0f0f0')
    grad.addColorStop(1, '#d0d0d0')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    // Seams
    ctx.save()
    ctx.rotate(ball.spin)
    ctx.strokeStyle = ball.color
    ctx.lineWidth = Math.max(1.5, ball.radius * 0.07)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(-ball.radius * 0.2, 0, ball.radius * 0.6, -0.7, 0.7)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(ball.radius * 0.2, 0, ball.radius * 0.6, Math.PI - 0.7, Math.PI + 0.7)
    ctx.stroke()
    ctx.restore()

    // Number on ball (visible when large enough)
    if (ball.radius >= 20) {
      // Clip to ball circle for text
      ctx.beginPath()
      ctx.arc(0, 0, ball.radius * 0.85, 0, Math.PI * 2)
      ctx.clip()

      const fontSize = Math.round(ball.radius * 0.62)
      ctx.font = `900 ${fontSize}px var(--font-display, 'Syne', sans-serif)`
      ctx.fillStyle = ball.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 4

      // Rotate number with ball (partially)
      ctx.save()
      ctx.rotate(ball.spin * 0.3)  // subtle rotation for realism
      ctx.fillText(ball.number.toString(), 0, 0)
      ctx.restore()
    }

    ctx.restore()
  }, [])

  // When ball reaches plate, stop and show choices
  const presentBallForAnswer = useCallback((ball: NumberBall) => {
    const gs = gameStateRef.current
    gs.waitingForAnswer = true
    ball.phase = 'answering'
    setActiveBall({ ...ball })
    setShowChoices(true)
  }, [])

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const ctx = canvas.getContext('2d')!

    drawBackground(ctx, w, h)

    const gs = gameStateRef.current
    if (!gs.running) return

    // If waiting for answer, draw frozen ball
    if (gs.waitingForAnswer && gs.ball) {
      drawBall(ctx, gs.ball)
      animFrameRef.current = requestAnimationFrame(gameLoop)
      return
    }

    // Spawn ball if none active
    if (!gs.ball) {
      gs.ball = spawnBall(w, h)
      gs.ballStartTime = timestamp
    }

    const ball = gs.ball
    const elapsed = timestamp - ball.startTime
    const duration = 2500 - diffConfig.ballSpeed * 90
    const t = Math.min(elapsed / duration, 1)

    ball.z = t
    ball.radius = 12 + t * 50

    // Position
    ball.x = w / 2 + ball.drift.x * w * t
    ball.y = h * 0.4 + (h * 0.3) * t

    ball.spin += ball.spinSpeed

    // When ball is large enough / close enough, present for answer
    if (t >= 0.85 && ball.phase === 'flying') {
      presentBallForAnswer(ball)
    }

    drawBall(ctx, ball)
    animFrameRef.current = requestAnimationFrame(gameLoop)
  }, [drawBackground, drawBall, spawnBall, diffConfig, presentBallForAnswer])

  // Handle answer selection
  const handleAnswer = useCallback((chosen: number) => {
    if (!showChoices || !activeBall) return

    const gs = gameStateRef.current
    const reactionMs = performance.now() - gs.ballStartTime

    const isCorrect = chosen === activeBall.number

    setChoiceResult(isCorrect ? 'correct' : 'wrong')
    setShowChoices(false)

    if (isCorrect) {
      const points = calculateHitScore(reactionMs, diffConfig.strikeWindowMs * 2, settings.difficulty as Difficulty, combo)
      addScore(points)
      incrementCombo()
      addReactionTime(reactionMs)
      gs.scores.push(points)
      gs.reactionTimes.push(reactionMs)
      gs.correctCount++
      addFeedback('Perfect', activeBall.x, activeBall.y - 60, reactionMs)
    } else {
      resetCombo()
      addFeedback('Miss', activeBall.x, activeBall.y - 60)
    }

    gs.totalAttempts++
    incrementAttempts(isCorrect)

    // Reset for next ball
    setTimeout(() => {
      setActiveBall(null)
      setChoiceResult(null)
      gs.ball = null
      gs.waitingForAnswer = false
    }, 600)
  }, [showChoices, activeBall, combo, settings.difficulty, diffConfig, addScore, incrementCombo, resetCombo, addReactionTime, addFeedback, incrementAttempts])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return

    const interval = setInterval(() => {
      const remaining = useGameStore.getState().timeRemaining - 1
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        const gs = gameStateRef.current
        gs.running = false
        cancelAnimationFrame(animFrameRef.current)

        const result = aggregateGameResult(
          gs.reactionTimes,
          gs.correctCount,
          gs.totalAttempts,
          settings.difficulty as Difficulty,
          settings.durationSec,
          'ball-number-hunt',
          gs.scores,
        )
        endGame(result)
        onGameEnd(result)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, settings, setTimeRemaining, endGame, onGameEnd])

  // Start
  useEffect(() => {
    if (phase !== 'playing') return

    const gs = gameStateRef.current
    gs.running = true
    gs.ball = null
    gs.scores = []
    gs.reactionTimes = []
    gs.totalAttempts = 0
    gs.correctCount = 0
    gs.waitingForAnswer = false

    setupCanvas()
    animFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      gs.running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [phase, gameLoop, setupCanvas])

  useEffect(() => {
    const resize = () => setupCanvas()
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [setupCanvas])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full game-canvas"
        style={{ touchAction: 'manipulation' }}
      />

      {/* Choice overlay */}
      <AnimatePresence>
        {showChoices && activeBall && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-6 z-20"
            style={{ background: 'linear-gradient(to top, rgba(8,15,31,0.95), transparent)' }}
          >
            <div
              className="text-center text-xs text-white/40 mb-4 tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ボールの数字は？
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              {activeBall.choices.map((choice) => (
                <motion.button
                  key={choice}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleAnswer(choice)}
                  className="py-5 rounded-2xl font-black text-2xl text-white transition-all game-touch-target"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.12)',
                    touchAction: 'manipulation',
                  }}
                >
                  {choice}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correct/Wrong flash */}
      <AnimatePresence>
        {choiceResult && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: choiceResult === 'correct'
                ? 'rgba(16, 185, 129, 0.25)'
                : 'rgba(232, 56, 13, 0.25)',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
