import { useEffect } from 'react'

// ─── Animated pixel-art snake favicon ────────────────────────────────────────
// Draws the snake face to a canvas and pumps it into the <link rel="icon">
// every frame, giving an animated favicon in supported browsers.

export function useFaviconSnake() {
  useEffect(() => {
    const SIZE = 64          // canvas px — renders crisply as 32-px favicon
    const canvas = document.createElement('canvas')
    canvas.width  = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    // Grab or create <link rel="icon">
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel   = 'icon'
      link.type  = 'image/png'
      document.head.appendChild(link)
    }

    // ── Pixel unit & dimensions ──────────────────────────────────────────────
    const P  = Math.max(2, Math.floor(SIZE / 13)) // = 4 at 64 px
    const HW = 8 * P   // 32 px
    const HH = 6 * P   // 24 px
    const ox = Math.floor((SIZE - HW) / 2)        // 16
    const oy = Math.floor((SIZE - HH) / 2)        // 20

    // ── Tail segments (drawn to the left of the head) ────────────────────────
    const TAIL = [
      { dx: -1, dy: 0, color: '#9373f0' },
      { dx: -2, dy: 0, color: '#7c3aed' },
      { dx: -3, dy: 1, color: '#6830c3' },
    ]
    const BW = 3 * P  // body segment size

    // ── Colors ───────────────────────────────────────────────────────────────
    const BORDER = '#1e0a3c'
    const PURPLE = '#7c3aed'
    const LIGHT  = '#a78bfa'
    const DARK   = '#2d1f5e'
    const WHITE  = '#f0f0ff'
    const PUPIL  = '#0a001a'
    const TONGUE = '#f472b6'

    // ── Timers ───────────────────────────────────────────────────────────────
    let blinkTimer = 0, blinking  = false
    let tongueT    = 0, tongueOut = false
    let animId: number

    function r(v: number) { return Math.round(v) }

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE)

      // Dark background circle (so the snake pops on any browser chrome)
      ctx.fillStyle = '#0f0820'
      ctx.beginPath()
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2)
      ctx.fill()

      // ── Tail segments ──────────────────────────────────────────────────────
      for (const seg of TAIL) {
        const sx = r(ox + seg.dx * (BW + P) + (HW / 2 - BW / 2))
        const sy = r(oy + HH / 2 - BW / 2 + seg.dy * BW)
        // Border
        ctx.fillStyle = BORDER
        ctx.fillRect(sx, sy, BW, BW)
        // Fill
        ctx.fillStyle = seg.color
        ctx.fillRect(sx + 1, sy + 1, BW - 2, BW - 2)
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.fillRect(sx + 1, sy + 1, 2, 2)
      }

      // ── Head ───────────────────────────────────────────────────────────────
      const x = ox, y = oy

      // Border
      ctx.fillStyle = BORDER
      ctx.fillRect(x, y, HW, HH)
      // Body fill
      ctx.fillStyle = PURPLE
      ctx.fillRect(x + P, y + P, HW - 2*P, HH - 2*P)
      // Highlight strip
      ctx.fillStyle = LIGHT
      ctx.fillRect(x + P, y + P, HW - 2*P, P)
      // Scale dots
      ctx.fillStyle = DARK
      ctx.fillRect(x + 2*P, y + 3*P, P, P)
      ctx.fillRect(x + 4*P, y + 3*P, P, P)

      // Eyes
      const eyeY = y + P
      for (let s = 0; s < 2; s++) {
        const eyeX = s === 0 ? x + 2*P : x + 5*P
        if (blinking) {
          ctx.fillStyle = DARK
          ctx.fillRect(eyeX, eyeY + P, 2*P, P)
        } else {
          ctx.fillStyle = WHITE
          ctx.fillRect(eyeX, eyeY, 2*P, 2*P)
          ctx.fillStyle = PUPIL
          ctx.fillRect(eyeX + P, eyeY, P, P)
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.fillRect(eyeX, eyeY, Math.max(1, Math.floor(P * 0.5)), Math.max(1, Math.floor(P * 0.5)))
        }
      }

      // Tongue
      if (tongueOut) {
        const tx = x + HW
        const ty = y + 3*P
        ctx.fillStyle = TONGUE
        ctx.fillRect(tx,         ty,       2*P, P)  // stem
        ctx.fillRect(tx + 2*P,   ty - P,   P,   P)  // fork top
        ctx.fillRect(tx + 2*P,   ty + P,   P,   P)  // fork bottom
      }

      // ── Push to favicon ────────────────────────────────────────────────────
      link!.href = canvas.toDataURL('image/png')

      // ── Timers ─────────────────────────────────────────────────────────────
      blinkTimer++
      if (blinkTimer > 120) blinking = true
      if (blinkTimer > 127) { blinking = false; blinkTimer = 0 }

      tongueT++
      if (tongueT > 90 && tongueT < 112) tongueOut = true
      else { tongueOut = false; if (tongueT > 135) tongueT = 0 }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])
}
