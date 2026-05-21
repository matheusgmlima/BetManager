import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string
}

const COLORS = [
  'rgba(124, 58, 237,',   // purple-600
  'rgba(139, 92, 246,',   // purple-500
  'rgba(167, 139, 250,',  // purple-400
  'rgba(109, 40, 217,',   // purple-700
]

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: Particle[] = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn particles
    for (let i = 0; i < 38; i++) {
      particles.push({
        x:      Math.random() * window.innerWidth,
        y:      Math.random() * window.innerHeight,
        vx:     (Math.random() - 0.5) * 0.35,
        vy:     -(Math.random() * 0.4 + 0.15),
        radius: Math.random() * 2.5 + 0.8,
        alpha:  Math.random() * 0.5 + 0.08,
        color:  COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        // draw glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4)
        grd.addColorStop(0,   `${p.color}${p.alpha})`)
        grd.addColorStop(0.5, `${p.color}${p.alpha * 0.4})`)
        grd.addColorStop(1,   `${p.color}0)`)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${Math.min(p.alpha * 2, 1)})`
        ctx.fill()

        // move
        p.x += p.vx
        p.y += p.vy

        // reset when off screen
        if (p.y < -10) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
        }
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
      })

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
