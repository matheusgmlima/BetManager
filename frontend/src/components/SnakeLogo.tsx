import { useEffect, useRef } from 'react'

export default function SnakeLogo({ size = 36 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const S = size * (window.devicePixelRatio || 1)
    canvas.width  = S
    canvas.height = S
    canvas.style.width  = `${size}px`
    canvas.style.height = `${size}px`

    const cx = S / 2
    const cy = S / 2
    const R  = S * 0.34     // orbit radius
    const SEG = 22
    const SPEED = 0.022
    const BR = S * 0.065    // body radius

    let t = 0
    let tongueT = 0
    let tongueOut = 0
    let animId: number

    // Build path: lemniscate (figure-8) so it looks like a coiled snake
    function getPos(angle: number) {
      const scale = R / (1 + Math.sin(angle) ** 2)
      return {
        x: cx + scale * Math.cos(angle),
        y: cy + scale * Math.sin(angle) * Math.cos(angle),
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, S, S)
      t += SPEED

      // Build segments
      const segments: { x: number; y: number }[] = []
      for (let i = 0; i < SEG; i++) {
        segments.push(getPos(t - i * 0.18))
      }

      // Draw body
      for (let i = segments.length - 1; i >= 0; i--) {
        const ratio = 1 - i / segments.length
        const r     = BR * (0.25 + ratio * 0.75)
        const alpha = 0.2 + ratio * 0.8
        const hue   = 260 + ratio * 25
        const lit   = 35  + ratio * 38

        // glow
        const grd = ctx.createRadialGradient(segments[i].x, segments[i].y, 0, segments[i].x, segments[i].y, r * 4)
        grd.addColorStop(0, `hsla(${hue},85%,${lit}%,${alpha * 0.4})`)
        grd.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(segments[i].x, segments[i].y, r * 4, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // body
        ctx.beginPath()
        ctx.arc(segments[i].x, segments[i].y, r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue},85%,${lit}%,${alpha})`
        ctx.fill()
      }

      // Head
      const head  = segments[0]
      const prev  = segments[1] ?? head
      const angle = Math.atan2(head.y - prev.y, head.x - prev.x)

      // Corona
      const hgrd = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, BR * 3)
      hgrd.addColorStop(0, 'rgba(196,181,253,0.7)')
      hgrd.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(head.x, head.y, BR * 3, 0, Math.PI * 2)
      ctx.fillStyle = hgrd
      ctx.fill()

      // Head shape
      ctx.save()
      ctx.translate(head.x, head.y)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.ellipse(0, 0, BR * 1.45, BR * 1.05, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'hsla(272,85%,62%,0.95)'
      ctx.fill()
      ctx.restore()

      // Eyes
      const eyeOff = BR * 0.62
      const perp   = { x: -Math.sin(angle), y: Math.cos(angle) }
      const fwd    = { x: Math.cos(angle) * BR * 0.5, y: Math.sin(angle) * BR * 0.5 }

      for (const side of [-1, 1]) {
        const ex = head.x + fwd.x + perp.x * side * eyeOff
        const ey = head.y + fwd.y + perp.y * side * eyeOff

        const egrd = ctx.createRadialGradient(ex, ey, 0, ex, ey, BR * 1.1)
        egrd.addColorStop(0, 'rgba(255,255,255,0.95)')
        egrd.addColorStop(0.5, 'rgba(200,170,255,0.5)')
        egrd.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(ex, ey, BR * 1.1, 0, Math.PI * 2)
        ctx.fillStyle = egrd
        ctx.fill()

        ctx.beginPath()
        ctx.arc(ex, ey, BR * 0.48, 0, Math.PI * 2)
        ctx.fillStyle = '#05000f'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(ex - BR * 0.14, ey - BR * 0.14, BR * 0.18, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()
      }

      // Tongue
      tongueT++
      if (tongueT > 60) tongueOut = Math.min(tongueOut + 0.15, 1)
      if (tongueT > 76) tongueOut = Math.max(tongueOut - 0.18, 0)
      if (tongueT > 88) tongueT = 0

      if (tongueOut > 0.01) {
        const tLen  = BR * 3.5 * tongueOut
        const forkL = BR * 1.8 * tongueOut
        const tx0   = head.x + Math.cos(angle) * BR * 1.5
        const ty0   = head.y + Math.sin(angle) * BR * 1.5
        const tx1   = tx0 + Math.cos(angle) * tLen
        const ty1   = ty0 + Math.sin(angle) * tLen
        const px    = -Math.sin(angle) * forkL * 0.45
        const py    =  Math.cos(angle) * forkL * 0.45

        ctx.save()
        ctx.globalAlpha = tongueOut
        ctx.strokeStyle = '#ff4daa'
        ctx.lineWidth   = S * 0.018
        ctx.lineCap     = 'round'
        ctx.shadowColor = '#ff4daa'
        ctx.shadowBlur  = 4
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx1 + Math.cos(angle) * forkL + px, ty1 + Math.sin(angle) * forkL + py); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx1 + Math.cos(angle) * forkL - px, ty1 + Math.sin(angle) * forkL - py); ctx.stroke()
        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [size])

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '50%' }} />
}
