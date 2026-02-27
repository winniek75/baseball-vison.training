'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { DIFFICULTY_CONFIGS, calculateHitScore, getComboLabel, aggregateGameResult } from '@/lib/scoring'
import type { Difficulty } from '@/types/supabase'

// ============================================================
// Pitch Types
// ============================================================
const PITCH_TYPES = [
  {
    id: 'fastball',
    nameJa: '直球',
    color: '#e8380d',
    speedMul: 1.0,
    driftX: 0,
    driftY: 0,
    spinColor: '#ff8866',
  },
  {
    id: 'slider',
    nameJa: 'スライダー',
    color: '#3b82f6',
    speedMul: 0.88,
    driftX: 0.35,
    driftY: 0.15,
    spinColor: '#60a5fa',
  },
  {
    id: 'curve',
    nameJa: 'カーブ',
    color: '#a78bfa',
    speedMul: 0.78,
    driftX: -0.25,
    driftY: 0.3,
    spinColor: '#c4b5fd',
  },
  {
    id: 'change',
    nameJa: 'チェンジアップ',
    color: '#10b981',
    speedMul: 0.72,
    driftX: 0.1,
    driftY: 0.05,
    spinColor: '#34d399',
  },
]

interface ActiveBall {
  id: string
  x: number
  y: number
  z: number              // depth 0=far → 1=at plate
  radius: number
  pitch: typeof PITCH_TYPES[number]
  spin: number           // current spin angle
  isFake: boolean        // fake ball (don't tap)
  inZone: boolean        // currently in strike zone
  hit: boolean           // already tapped
  missed: boolean        // passed without tap
  startTime: number
}

interface PitcherReactionProps {
  onGameEnd: (result: ReturnType<typeof aggregateGameResult>) => void
}

export default function PitcherReaction({ onGameEnd }: PitcherReactionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const gameStateRef = useRef({
    balls: [] as ActiveBall[],
    lastBallTime: 0,
    ballInterval: 1500,
    scores: [] as number[],
    reactionTimes: [] as number[],
    totalAttempts: 0,
    correctCount: 0,
    running: false,
  })

  const {
    phase, settings, score, combo, timeRemaining,
    startGame, endGame, addScore, incrementCombo, resetCombo,
    addReactionTime, incrementAttempts, setTimeRemaining, addFeedback,
  } = useGameStore()

  const diffConfig = DIFFICULTY_CONFIGS[settings.difficulty as Difficulty]

  // Canvas setup with HiDPI support
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

  // Draw field background
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Sky/field gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#080f1f')
    grad.addColorStop(0.5, '#0d2240')
    grad.addColorStop(1, '#0d4a2e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Mound perspective lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    const vanishX = w / 2
    const vanishY = h * 0.38
    for (let i = 0; i <= 10; i++) {
      const x = (w / 10) * i
      ctx.beginPath()
      ctx.moveTo(vanishX, vanishY)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    // Mound circle
    const moundGrad = ctx.createRadialGradient(vanishX, vanishY + 10, 0, vanishX, vanishY + 10, 60)
    moundGrad.addColorStop(0, 'rgba(193,154,107,0.3)')
    moundGrad.addColorStop(1, 'rgba(193,154,107,0)')
    ctx.fillStyle = moundGrad
    ctx.beginPath()
    ctx.ellipse(vanishX, vanishY + 10, 60, 25, 0, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  // Draw strike zone
  const drawStrikeZone = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const zoneW = w * 0.22
    const zoneH = h * 0.3
    const zoneX = w / 2 - zoneW / 2
    const zoneY = h * 0.55

    // Zone glow
    const glowGrad = ctx.createLinearGradient(zoneX, zoneY, zoneX, zoneY + zoneH)
    glowGrad.addColorStop(0, 'rgba(212,160,23,0.08)')
    glowGrad.addColorStop(1, 'rgba(212,160,23,0.02)')
    ctx.fillStyle = glowGrad
    ctx.fillRect(zoneX, zoneY, zoneW, zoneH)

    // Zone border
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(zoneX, zoneY, zoneW, zoneH)
    ctx.setLineDash([])

    // Zone grid (3x3)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(zoneX + (zoneW / 3) * i, zoneY)
      ctx.lineTo(zoneX + (zoneW / 3) * i, zoneY + zoneH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(zoneX, zoneY + (zoneH / 3) * i)
      ctx.lineTo(zoneX + zoneW, zoneY + (zoneH / 3) * i)
      ctx.stroke()
    }

    // Corner brackets
    const bLen = 12
    ctx.strokeStyle = 'rgba(212,160,23,0.7)'
    ctx.lineWidth = 2
    const corners = [
      [zoneX, zoneY, 1, 1],
      [zoneX + zoneW, zoneY, -1, 1],
      [zoneX, zoneY + zoneH, 1, -1],
      [zoneX + zoneW, zoneY + zoneH, -1, -1],
    ]
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath()
      ctx.moveTo(cx + dx * bLen, cy as number)
      ctx.lineTo(cx as number, cy as number)
      ctx.lineTo(cx as number, cy + dy * bLen)
      ctx.stroke()
    })

    return { zoneX, zoneY, zoneW, zoneH }
  }, [])

  // Draw a single ball
  const drawBall = useCallback((
    ctx: CanvasRenderingContext2D,
    ball: ActiveBall,
    w: number,
    _h: number
  ) => {
    if (ball.hit || ball.missed) return

    const { x, y, radius, pitch, spin, isFake } = ball

    ctx.save()
    ctx.translate(x, y)

    // Shadow
    const shadowAlpha = ball.z * 0.4
    const shadowGrad = ctx.createRadialGradient(0, radius * 0.7, 0, 0, radius * 0.7, radius)
    shadowGrad.addColorStop(0, `rgba(0,0,0,${shadowAlpha})`)
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shadowGrad
    ctx.beginPath()
    ctx.ellipse(0, radius * 0.7, radius * 0.9, radius * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Ball body
    const ballGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius)
    ballGrad.addColorStop(0, '#ffffff')
    ballGrad.addColorStop(0.4, '#f0f0f0')
    ballGrad.addColorStop(1, '#d8d8d8')
    ctx.fillStyle = ballGrad
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()

    // Seams (rotating)
    ctx.save()
    ctx.rotate(spin)
    ctx.strokeStyle = pitch.color
    ctx.lineWidth = Math.max(1, radius * 0.08)
    ctx.lineCap = 'round'

    // Left seam
    ctx.beginPath()
    ctx.arc(-radius * 0.2, 0, radius * 0.55, -0.8, 0.8)
    ctx.stroke()
    // Right seam
    ctx.beginPath()
    ctx.arc(radius * 0.2, 0, radius * 0.55, Math.PI - 0.8, Math.PI + 0.8)
    ctx.stroke()
    ctx.restore()

    // Pitch label
    if (radius > 18) {
      ctx.fillStyle = pitch.color
      ctx.font = `bold ${Math.round(radius * 0.38)}px var(--font-display, 'Syne', sans-serif)`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pitch.nameJa, 0, radius + 12)
    }

    // Fake indicator
    if (isFake) {
      ctx.strokeStyle = 'rgba(255,255,0,0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(0, 0, radius + 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [])

  // Spawn a new ball
  const spawnBall = useCallback((w: number, h: number) => {
    const pitch = PITCH_TYPES[Math.floor(Math.random() * PITCH_TYPES.length)]
    const isFake = Math.random() < diffConfig.fakeFrequency

    const ball: ActiveBall = {
      id: `${Date.now()}-${Math.random()}`,
      x: w / 2 + (Math.random() - 0.5) * w * 0.08,
      y: h * 0.38,
      z: 0,
      radius: 8,
      pitch,
      spin: 0,
      isFake,
      inZone: false,
      hit: false,
      missed: false,
      startTime: performance.now(),
    }
    return ball
  }, [diffConfig.fakeFrequency])

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const ctx = canvas.getContext('2d')!

    drawBackground(ctx, w, h)
    const zoneInfo = drawStrikeZone(ctx, w, h)

    const gs = gameStateRef.current
    if (!gs.running) return

    // Spawn balls
    if (timestamp - gs.lastBallTime > gs.ballInterval) {
      gs.balls.push(spawnBall(w, h))
      gs.lastBallTime = timestamp
    }

    // Update and draw balls
    gs.balls = gs.balls.filter((ball) => {
      if (ball.hit || ball.missed) return false

      const elapsed = timestamp - ball.startTime
      const duration = 2200 - diffConfig.ballSpeed * 80  // faster at higher difficulty
      const t = Math.min(elapsed / duration, 1)

      // Perspective projection: ball grows as it approaches
      ball.z = t
      ball.radius = 8 + t * 38

      // Position: from mound (center top) to plate (center bottom-ish)
      const targetX = w / 2 + ball.pitch.driftX * w * 0.12
      const targetY = h * 0.7
      ball.x = (w / 2) + (targetX - w / 2) * t + ball.pitch.driftX * w * 0.04 * t
      ball.y = h * 0.38 + (targetY - h * 0.38) * t - Math.sin(t * Math.PI) * h * 0.03 * ball.pitch.driftY

      ball.spin += diffConfig.spinRate

      // Check if in strike zone
      const inZoneX = ball.x > zoneInfo.zoneX && ball.x < zoneInfo.zoneX + zoneInfo.zoneW
      const inZoneY = ball.y > zoneInfo.zoneY && ball.y < zoneInfo.zoneY + zoneInfo.zoneH
      ball.inZone = inZoneX && inZoneY

      // Ball passed strike zone without being hit
      if (t >= 0.95) {
        if (!ball.isFake) {
          // Miss penalty
          gs.totalAttempts++
          incrementAttempts(false)
          resetCombo()
          addFeedback('Miss', ball.x, ball.y)
        }
        ball.missed = true
        return false
      }

      drawBall(ctx, ball, w, h)
      return true
    })

    animFrameRef.current = requestAnimationFrame(gameLoop)
  }, [drawBackground, drawStrikeZone, drawBall, spawnBall, diffConfig, incrementAttempts, resetCombo, addFeedback])

  // Handle tap/click on canvas
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const tapX = e.clientX - rect.left
    const tapY = e.clientY - rect.top
    const tapTime = performance.now()

    const gs = gameStateRef.current
    let hit = false

    for (const ball of gs.balls) {
      if (ball.hit || ball.missed) continue

      const dist = Math.hypot(tapX - ball.x, tapY - ball.y)
      const hitRadius = ball.radius + 12  // generous hit box

      if (dist <= hitRadius) {
        const reactionMs = tapTime - ball.startTime

        if (ball.isFake) {
          // Tapped a fake ball → penalty
          resetCombo()
          addFeedback('Miss', tapX, tapY)
          gs.totalAttempts++
          incrementAttempts(false)
        } else {
          // Good hit
          const scorePoints = calculateHitScore(
            reactionMs, diffConfig.strikeWindowMs, settings.difficulty as Difficulty, combo
          )
          const label = getComboLabel(reactionMs, diffConfig.strikeWindowMs)

          addScore(scorePoints)
          incrementCombo()
          addReactionTime(reactionMs)
          addFeedback(label, tapX, tapY, reactionMs)
          gs.scores.push(scorePoints)
          gs.reactionTimes.push(reactionMs)
          gs.totalAttempts++
          gs.correctCount++
          incrementAttempts(true)

          // Hit flash on ball
          ball.hit = true

          // Draw hit effect on canvas
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.save()
            const glowGrad = ctx.createRadialGradient(tapX, tapY, 0, tapX, tapY, ball.radius * 2.5)
            glowGrad.addColorStop(0, 'rgba(212,160,23,0.8)')
            glowGrad.addColorStop(1, 'rgba(212,160,23,0)')
            ctx.fillStyle = glowGrad
            ctx.beginPath()
            ctx.arc(tapX, tapY, ball.radius * 2.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        }

        hit = true
        break
      }
    }

    if (!hit) {
      // Tapped empty space — small miss indicator
      // No score penalty for air swings
    }
  }, [phase, combo, settings.difficulty, diffConfig, addScore, incrementCombo, resetCombo, addReactionTime, addFeedback, incrementAttempts])

  // Timer countdown
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
          'pitcher-reaction',
          gs.scores,
        )
        endGame(result)
        onGameEnd(result)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, settings, setTimeRemaining, endGame, onGameEnd])

  // Start game
  useEffect(() => {
    if (phase !== 'playing') return

    const dpr = window.devicePixelRatio || 1
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    const gs = gameStateRef.current
    gs.running = true
    gs.balls = []
    gs.scores = []
    gs.reactionTimes = []
    gs.totalAttempts = 0
    gs.correctCount = 0
    gs.lastBallTime = 0

    // Interval decreases with difficulty
    gs.ballInterval = 2000 - (settings.difficulty - 1) * 250

    animFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      gs.running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [phase, settings.difficulty, gameLoop])

  // Initialize canvas size
  useEffect(() => {
    const resize = () => setupCanvas()
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [setupCanvas])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full game-canvas"
      style={{ touchAction: 'manipulation' }}
      onPointerDown={handlePointerDown}
    />
  )
}
