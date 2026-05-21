import { useEffect, useRef } from 'react'

// ─── Pixel-art mascot banner ──────────────────────────────────────────────────
// Chunky pixel snake that glides around and wraps through walls (Pac-Man style)

export default function SnakeBanner({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = window.devicePixelRatio || 1
    canvas.width  = width  * DPR
    canvas.height = height * DPR
    canvas.style.width  = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(DPR, DPR)
    ctx.imageSmoothingEnabled = false

    const W = width
    const H = height

    // ── Constants ────────────────────────────────────────────────────────────
    const P        = 3          // logical pixel size (3 canvas px per "pixel")
    const NUM_SEGS = 12         // body segment count
    const SEG_DIST = P * 6      // pixels between segment centers (18px)
    const SPEED    = 0.9        // px per frame
    const MAX_HIST = NUM_SEGS * SEG_DIST * 2 + 10

    // Head sprite dimensions (in logical pixels)
    const HW = 8 * P  // head width  (40px)
    const HH = 6 * P  // head height (30px)

    // Body segment dimensions
    const BW = 4 * P  // 20px

    // ── Colors ───────────────────────────────────────────────────────────────
    const C_BORDER  = '#1e0a3c'
    const C_BODY    = '#7c3aed'
    const C_LIGHT   = '#a78bfa'
    const C_DARK    = '#2d1f5e'
    const C_WHITE   = '#f0f0ff'
    const C_PUPIL   = '#0a001a'
    const C_TONGUE  = '#f472b6'

    const BODY_COLORS = [
      '#9d7ff5','#9373f0','#8967eb','#7f5be6',
      '#7c3aed','#7235d8','#6830c3','#5e2bae',
      '#542699','#4a2184','#401c6f','#3b1a60',
      '#341757','#2d1f5e',
    ]

    // ── State ────────────────────────────────────────────────────────────────
    // Store absolute positions (can grow beyond canvas — we wrap on render)
    const history: { x: number; y: number }[] = []

    let hx = W * 0.25, hy = H * 0.5
    let vx = SPEED, vy = 0.5
    let t = 0
    let tongueT = 0, tongueOut = false
    let blinkT = 0, blinking = false
    let animId: number

    // Pre-fill history so body appears immediately
    for (let i = 0; i < MAX_HIST; i++) {
      history.push({ x: hx - i * (SPEED * 0.8), y: hy })
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    const snap = (v: number) => Math.round(v / P) * P

    // Wrap render coordinate to canvas
    const wrapX = (x: number) => ((x % W) + W) % W
    const wrapY = (y: number) => ((y % H) + H) % H

    // Quantize velocity to 4 directions for head sprite
    function getDir(vx: number, vy: number): 'R' | 'L' | 'U' | 'D' {
      if (Math.abs(vx) >= Math.abs(vy)) return vx >= 0 ? 'R' : 'L'
      return vy >= 0 ? 'D' : 'U'
    }

    // ── Draw body segment ────────────────────────────────────────────────────
    function drawSegment(ax: number, ay: number, idx: number) {
      const rx = snap(wrapX(ax))
      const ry = snap(wrapY(ay))
      const half = BW / 2

      // Border
      ctx.fillStyle = C_BORDER
      ctx.fillRect(rx - half, ry - half, BW, BW)

      // Fill
      ctx.fillStyle = BODY_COLORS[Math.min(idx, BODY_COLORS.length - 1)]
      ctx.fillRect(rx - half + P, ry - half + P, BW - 2 * P, BW - 2 * P)

      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillRect(rx - half + P, ry - half + P, P, P)
    }

    // ── Draw head ─────────────────────────────────────────────────────────────
    // Always designed facing RIGHT, then rotated via ctx transform
    function drawHead(ax: number, ay: number, dir: 'R' | 'L' | 'U' | 'D', tongue: boolean, blink: boolean) {
      const rx = snap(wrapX(ax))
      const ry = snap(wrapY(ay))

      ctx.save()
      ctx.translate(rx, ry)
      if      (dir === 'L') ctx.rotate(Math.PI)
      else if (dir === 'U') ctx.rotate(-Math.PI / 2)
      else if (dir === 'D') ctx.rotate(Math.PI / 2)
      // 'R' = no rotation

      // All coords below are relative to (0,0) = head center, facing right
      const left = -HW / 2
      const top  = -HH / 2

      // ── Border ──────────────────────────────────────────────────────
      ctx.fillStyle = C_BORDER
      ctx.fillRect(left, top, HW, HH)

      // ── Body fill ────────────────────────────────────────────────────
      ctx.fillStyle = C_BODY
      ctx.fillRect(left + P, top + P, HW - 2 * P, HH - 2 * P)

      // ── Highlight strip ──────────────────────────────────────────────
      ctx.fillStyle = C_LIGHT
      ctx.fillRect(left + P, top + P, HW - 2 * P, P)

      // ── Scale dots ───────────────────────────────────────────────────
      ctx.fillStyle = C_DARK
      ctx.fillRect(left + 2 * P, top + 3 * P, P, P)
      ctx.fillRect(left + 2 * P, top + 4 * P, P, P)

      // ── Eyes (right half of head = front) ───────────────────────────
      for (let s = 0; s < 2; s++) {
        const eyeX = left + (s === 0 ? 4 : 4) * P  // both centered
        const eyeY = top + (s === 0 ? P : 3 * P)

        if (blink) {
          // Closed = dark line
          ctx.fillStyle = C_DARK
          ctx.fillRect(eyeX, eyeY + P, 2 * P, P)
        } else {
          // White
          ctx.fillStyle = C_WHITE
          ctx.fillRect(eyeX, eyeY, 2 * P, 2 * P)
          // Pupil (offset toward front = right)
          ctx.fillStyle = C_PUPIL
          ctx.fillRect(eyeX + P, eyeY, P, P)
          // Shine
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.fillRect(eyeX, eyeY, Math.ceil(P * 0.5), Math.ceil(P * 0.5))
        }
      }

      // ── Tongue (extends from right/front edge) ───────────────────────
      if (tongue) {
        const tx = left + HW
        const ty = top + HH / 2 - P / 2
        ctx.fillStyle = C_TONGUE
        ctx.fillRect(tx,           ty,       2 * P, P)   // stem
        ctx.fillRect(tx + 2 * P,   ty - P,   P,     P)   // fork top
        ctx.fillRect(tx + 2 * P,   ty + P,   P,     P)   // fork bottom
      }

      ctx.restore()
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.018

      // ── Steering — organic sinusoidal drift ─────────────────────────
      vx += Math.sin(t * 1.1) * 0.03
      vy += Math.cos(t * 0.85) * 0.028

      // Speed clamp
      const spd = Math.sqrt(vx * vx + vy * vy)
      if (spd > SPEED * 1.5) { vx = (vx / spd) * SPEED * 1.5; vy = (vy / spd) * SPEED * 1.5 }
      if (spd < SPEED * 0.6) { vx = (vx / spd) * SPEED * 0.6; vy = (vy / spd) * SPEED * 0.6 }

      // Move head (absolute coords, no modulo yet)
      hx += vx; hy += vy

      // Prevent absolute coords from drifting to infinity (mod every 20 canvas lengths)
      if (Math.abs(hx) > W * 20) hx -= W * 20 * Math.sign(hx)
      if (Math.abs(hy) > H * 20) hy -= H * 20 * Math.sign(hy)

      // ── Trail ────────────────────────────────────────────────────────
      history.unshift({ x: hx, y: hy })
      if (history.length > MAX_HIST) history.pop()

      // ── Tongue & blink timers ─────────────────────────────────────────
      tongueT++
      if (tongueT > 100 && tongueT < 118) tongueOut = true
      else { tongueOut = false; if (tongueT > 140) tongueT = 0 }

      blinkT++
      if (blinkT > 150) blinking = true
      if (blinkT > 157) { blinking = false; blinkT = 0 }

      // ── Draw body segments (tail → head) ─────────────────────────────
      for (let i = NUM_SEGS - 1; i >= 1; i--) {
        const histIdx = i * Math.floor(SEG_DIST / SPEED)
        if (histIdx < history.length) {
          drawSegment(history[histIdx].x, history[histIdx].y, i)
        }
      }

      // ── Draw head ─────────────────────────────────────────────────────
      drawHead(hx, hy, getDir(vx, vy), tongueOut, blinking)

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
        borderRadius: 20,
        imageRendering: 'pixelated',
      }}
    />
  )
}
