import { useEffect, useRef } from 'react'

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

    const W = width
    const H = height

    const NUM_SEGS = 28
    const SEG_GAP  = 11      // distance between segment centers
    const HEAD_R   = 11      // head radius
    const SPEED    = 1.9
    const MARGIN   = HEAD_R + 20

    // Body segments
    const sx = new Float32Array(NUM_SEGS)
    const sy = new Float32Array(NUM_SEGS)
    for (let i = 0; i < NUM_SEGS; i++) {
      sx[i] = W * 0.25 - i * SEG_GAP
      sy[i] = H * 0.5
    }

    let headX = W * 0.25
    let headY = H * 0.5
    let vx = SPEED, vy = 0.3
    let t = 0
    let tongueTimer = 0
    let tongueOut   = 0
    let animId: number

    // Segment colors: head → tail (purple palette, clean)
    const COLORS = [
      '#a78bfa', '#9d7ff5', '#9373f0', '#8967eb',
      '#7f5be6', '#7c3aed', '#7235d8', '#6830c3',
      '#5e2bae', '#542699', '#4a2184', '#401c6f',
    ]

    function segColor(i: number) {
      const idx = Math.floor((i / NUM_SEGS) * (COLORS.length - 1))
      return COLORS[Math.min(idx, COLORS.length - 1)]
    }

    function segRadius(i: number) {
      const ratio = 1 - i / NUM_SEGS
      // slither.io style: head is biggest, tapers to tail
      return HEAD_R * (0.38 + ratio * 0.62)
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.02

      // ── Move head ────────────────────────────────────────────
      if (headX < MARGIN)     { vx =  Math.abs(vx); vy += (Math.random() - 0.5) * 0.5 }
      if (headX > W - MARGIN) { vx = -Math.abs(vx); vy += (Math.random() - 0.5) * 0.5 }
      if (headY < MARGIN)     { vy =  Math.abs(vy); vx += (Math.random() - 0.5) * 0.5 }
      if (headY > H - MARGIN) { vy = -Math.abs(vy); vx += (Math.random() - 0.5) * 0.5 }

      vx += Math.sin(t * 1.1) * 0.06
      vy += Math.cos(t * 0.9) * 0.06

      const spd = Math.sqrt(vx * vx + vy * vy)
      if (spd > SPEED * 1.6) { vx = vx / spd * SPEED * 1.6; vy = vy / spd * SPEED * 1.6 }
      if (spd < SPEED * 0.7) { vx = vx / spd * SPEED * 0.7; vy = vy / spd * SPEED * 0.7 }

      headX += vx; headY += vy

      // Shift body
      for (let i = NUM_SEGS - 1; i > 0; i--) { sx[i] = sx[i - 1]; sy[i] = sy[i - 1] }
      sx[0] = headX; sy[0] = headY

      // ── Draw body (tail → head so head is on top) ─────────────
      for (let i = NUM_SEGS - 1; i >= 1; i--) {
        const r     = segRadius(i)
        const color = segColor(i)

        // Soft shadow under segment
        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur  = r * 0.9

        ctx.beginPath()
        ctx.arc(sx[i], sy[i], r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        ctx.restore()

        // Top shine
        ctx.beginPath()
        ctx.arc(sx[i] - r * 0.28, sy[i] - r * 0.28, r * 0.38, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fill()
      }

      // ── Head ────────────────────────────────────────────────────
      const angle = Math.atan2(vy, vx)

      // Head glow
      ctx.save()
      ctx.shadowColor = '#c4b5fd'
      ctx.shadowBlur  = HEAD_R * 2

      ctx.beginPath()
      ctx.arc(headX, headY, HEAD_R, 0, Math.PI * 2)
      ctx.fillStyle = '#a78bfa'
      ctx.fill()
      ctx.restore()

      // Head shine
      ctx.beginPath()
      ctx.arc(headX - HEAD_R * 0.28, headY - HEAD_R * 0.28, HEAD_R * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fill()

      // ── Eyes ────────────────────────────────────────────────────
      const perpX = -Math.sin(angle)
      const perpY =  Math.cos(angle)
      const fwdX  =  Math.cos(angle)
      const fwdY  =  Math.sin(angle)
      const EYE_R = HEAD_R * 0.42
      const EYE_D = HEAD_R * 0.52  // distance from center

      for (const side of [-1, 1]) {
        const ex = headX + fwdX * HEAD_R * 0.42 + perpX * side * EYE_D
        const ey = headY + fwdY * HEAD_R * 0.42 + perpY * side * EYE_D

        // White
        ctx.beginPath()
        ctx.arc(ex, ey, EYE_R, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // Pupil — slightly offset toward direction of movement
        const px = ex + fwdX * EYE_R * 0.22
        const py = ey + fwdY * EYE_R * 0.22
        ctx.beginPath()
        ctx.arc(px, py, EYE_R * 0.52, 0, Math.PI * 2)
        ctx.fillStyle = '#1a0030'
        ctx.fill()

        // Shine
        ctx.beginPath()
        ctx.arc(ex - EYE_R * 0.2, ey - EYE_R * 0.2, EYE_R * 0.22, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()
      }

      // ── Tongue ───────────────────────────────────────────────
      tongueTimer++
      if (tongueTimer > 70)  tongueOut = Math.min(tongueOut + 0.18, 1)
      if (tongueTimer > 88)  tongueOut = Math.max(tongueOut - 0.22, 0)
      if (tongueTimer > 100) tongueTimer = 0

      if (tongueOut > 0.01) {
        const len   = HEAD_R * 2.8 * tongueOut
        const fkLen = HEAD_R * 1.2 * tongueOut
        const tx0   = headX + fwdX * HEAD_R * 0.95
        const ty0   = headY + fwdY * HEAD_R * 0.95
        const tx1   = tx0 + fwdX * len
        const ty1   = ty0 + fwdY * len

        ctx.save()
        ctx.globalAlpha = tongueOut
        ctx.strokeStyle = '#f9a8d4'
        ctx.lineWidth   = 2
        ctx.lineCap     = 'round'
        ctx.shadowColor = '#f472b6'
        ctx.shadowBlur  = 5

        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke()

        ctx.beginPath(); ctx.moveTo(tx1, ty1)
        ctx.lineTo(tx1 + fwdX * fkLen + perpX *  0.5 * fkLen, ty1 + fwdY * fkLen + perpY *  0.5 * fkLen)
        ctx.stroke()

        ctx.beginPath(); ctx.moveTo(tx1, ty1)
        ctx.lineTo(tx1 + fwdX * fkLen + perpX * -0.5 * fkLen, ty1 + fwdY * fkLen + perpY * -0.5 * fkLen)
        ctx.stroke()

        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        borderRadius: 20,
      }}
    />
  )
}
