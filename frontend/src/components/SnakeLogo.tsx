import { useEffect, useRef } from 'react'

// ─── Pixel art snake logo ─────────────────────────────────────────────────────
// Draws a cute pixel-art snake face that blinks and flicks its tongue

export default function SnakeLogo({ size = 36 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = window.devicePixelRatio || 1
    const S = size * DPR
    canvas.width  = S
    canvas.height = S
    canvas.style.width  = `${size}px`
    canvas.style.height = `${size}px`
    ctx.imageSmoothingEnabled = false

    // Logical pixel unit — at size=36 with DPR=1: P=3 → face = 8P×6P = 24×18 logical px
    const P = Math.max(2, Math.floor(S / 13))

    // Head dimensions in logical pixels
    const HW = 8 * P  // head width
    const HH = 6 * P  // head height

    // Center the face in canvas
    const ox = Math.floor((S - HW) / 2)  // origin x
    const oy = Math.floor((S - HH) / 2)  // origin y

    let t = 0
    let blinkTimer = 0
    let blinking   = false
    let tongueT    = 0
    let tongueOut  = false
    let animId: number

    // Pixel body segments orbiting behind the head
    const NUM_ORBS = 6
    const ORBIT_R  = S * 0.38

    const PURPLE  = '#7c3aed'
    const DARK    = '#2d1f5e'
    const LIGHT   = '#a78bfa'
    const BORDER  = '#1e0a3c'
    const WHITE   = '#f0f0ff'
    const PUPIL   = '#0a001a'
    const TONGUE  = '#f472b6'
    const SHINE   = 'rgba(255,255,255,0.25)'

    function r(x: number) { return Math.round(x) }

    function drawSegment(cx: number, cy: number, idx: number) {
      const ratio  = 1 - idx / NUM_ORBS
      const segP   = Math.max(2, Math.floor(P * (0.5 + ratio * 0.5)))
      const size   = segP * 3
      const alpha  = 0.3 + ratio * 0.6
      const sx     = r(cx - size / 2)
      const sy     = r(cy - size / 2)

      // Border
      ctx.globalAlpha = alpha
      ctx.fillStyle = BORDER
      ctx.fillRect(sx, sy, size, size)

      // Fill
      ctx.fillStyle = idx < 2 ? LIGHT : idx < 4 ? PURPLE : DARK
      ctx.fillRect(sx + segP, sy + segP, size - 2 * segP, size - 2 * segP)

      // Shine pixel
      ctx.fillStyle = SHINE
      ctx.fillRect(sx + segP, sy + segP, segP, segP)
      ctx.globalAlpha = 1
    }

    function drawHead(showTongue: boolean, eyesClosed: boolean) {
      const x = ox, y = oy

      // ── Border ──────────────────────────────────────────────
      ctx.fillStyle = BORDER
      ctx.fillRect(x, y, HW, HH)

      // ── Body fill ────────────────────────────────────────────
      ctx.fillStyle = PURPLE
      ctx.fillRect(x + P, y + P, HW - 2 * P, HH - 2 * P)

      // ── Highlight strip ──────────────────────────────────────
      ctx.fillStyle = LIGHT
      ctx.fillRect(x + P, y + P, HW - 2 * P, P)

      // ── Scale dots (decorative) ──────────────────────────────
      ctx.fillStyle = DARK
      ctx.fillRect(x + 2 * P, y + 3 * P, P, P)
      ctx.fillRect(x + 4 * P, y + 3 * P, P, P)

      // ── Eyes ─────────────────────────────────────────────────
      const eyeY = y + P
      for (let s = 0; s < 2; s++) {
        const eyeX = s === 0 ? x + 2 * P : x + 5 * P

        if (eyesClosed) {
          // Blink: just a dark horizontal line
          ctx.fillStyle = BORDER
          ctx.fillRect(eyeX, eyeY + P, 2 * P, P)
        } else {
          // White
          ctx.fillStyle = WHITE
          ctx.fillRect(eyeX, eyeY, 2 * P, 2 * P)
          // Pupil
          ctx.fillStyle = PUPIL
          ctx.fillRect(eyeX + P, eyeY, P, P)
          // Shine
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.fillRect(eyeX, eyeY, Math.max(1, Math.floor(P / 2)), Math.max(1, Math.floor(P / 2)))
        }
      }

      // ── Tongue ───────────────────────────────────────────────
      if (showTongue) {
        const tx = x + HW
        const ty = y + 3 * P
        ctx.fillStyle = TONGUE
        ctx.fillRect(tx,           ty, 2 * P, P)    // stem
        ctx.fillRect(tx + 2 * P,   ty - P, P, P)   // fork top
        ctx.fillRect(tx + 2 * P,   ty + P, P, P)   // fork bottom
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, S, S)
      t += 0.04

      // ── Orbiting body segments ────────────────────────────────
      for (let i = NUM_ORBS - 1; i >= 0; i--) {
        const angle = t - i * (Math.PI * 2 / NUM_ORBS) * 0.7
        const cx    = S / 2 + Math.cos(angle) * ORBIT_R
        const cy    = S / 2 + Math.sin(angle) * ORBIT_R * 0.5
        drawSegment(cx, cy, i)
      }

      // ── Blink logic ───────────────────────────────────────────
      blinkTimer++
      if (blinkTimer > 120) { blinking = true }
      if (blinkTimer > 126) { blinking = false; blinkTimer = 0 }

      // ── Tongue logic ──────────────────────────────────────────
      tongueT++
      if (tongueT > 90  && tongueT < 110) tongueOut = true
      else { tongueOut = false; if (tongueT > 130) tongueT = 0 }

      // ── Head ─────────────────────────────────────────────────
      drawHead(tongueOut, blinking)

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [size])

  return <canvas ref={canvasRef} style={{ display: 'block', imageRendering: 'pixelated' }} />
}
