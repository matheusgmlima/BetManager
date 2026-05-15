import { useState, useEffect, useRef } from 'react'

// ─── Mini pixel-art snake (exact SnakeBanner style, small canvas) ─────────────

function TutorialSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = window.devicePixelRatio || 1
    const W = 340, H = 90
    canvas.width  = W * DPR
    canvas.height = H * DPR
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(DPR, DPR)
    ctx.imageSmoothingEnabled = false

    // ── Constants (same as SnakeBanner) ──────────────────────────────────────
    const P        = 3
    const NUM_SEGS = 10
    const SEG_DIST = P * 6
    const SPEED    = 1.1
    const MAX_HIST = NUM_SEGS * SEG_DIST * 2 + 10

    const HW = 8 * P   // 24px
    const HH = 6 * P   // 18px
    const BW = 4 * P   // 12px

    const C_BORDER = '#1e0a3c'
    const C_BODY   = '#7c3aed'
    const C_LIGHT  = '#a78bfa'
    const C_DARK   = '#2d1f5e'
    const C_WHITE  = '#f0f0ff'
    const C_PUPIL  = '#0a001a'
    const C_TONGUE = '#f472b6'

    const BODY_COLORS = [
      '#9d7ff5','#9373f0','#8967eb','#7f5be6',
      '#7c3aed','#7235d8','#6830c3','#5e2bae',
      '#542699','#4a2184',
    ]

    // ── State ─────────────────────────────────────────────────────────────────
    const history: { x: number; y: number }[] = []
    let hx = W * 0.3, hy = H * 0.5
    let vx = SPEED, vy = 0.3
    let t = 0
    let tongueT = 0, tongueOut = false
    let blinkT = 0, blinking = false
    let animId: number

    // Bounce velocity tracking for wall hits
    let bounceX = false, bounceY = false

    for (let i = 0; i < MAX_HIST; i++) {
      history.push({ x: hx - i * (SPEED * 0.8), y: hy })
    }

    const snap = (v: number) => Math.round(v / P) * P

    function getDir(vx: number, vy: number): 'R' | 'L' | 'U' | 'D' {
      if (Math.abs(vx) >= Math.abs(vy)) return vx >= 0 ? 'R' : 'L'
      return vy >= 0 ? 'D' : 'U'
    }

    function drawSegment(ax: number, ay: number, idx: number) {
      const rx = snap(ax)
      const ry = snap(ay)
      const half = BW / 2

      ctx.fillStyle = C_BORDER
      ctx.fillRect(rx - half, ry - half, BW, BW)

      ctx.fillStyle = BODY_COLORS[Math.min(idx, BODY_COLORS.length - 1)]
      ctx.fillRect(rx - half + P, ry - half + P, BW - 2 * P, BW - 2 * P)

      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillRect(rx - half + P, ry - half + P, P, P)
    }

    function drawHead(ax: number, ay: number, dir: 'R' | 'L' | 'U' | 'D', tongue: boolean, blink: boolean) {
      const rx = snap(ax)
      const ry = snap(ay)

      ctx.save()
      ctx.translate(rx, ry)
      if      (dir === 'L') ctx.rotate(Math.PI)
      else if (dir === 'U') ctx.rotate(-Math.PI / 2)
      else if (dir === 'D') ctx.rotate(Math.PI / 2)

      const left = -HW / 2
      const top  = -HH / 2

      ctx.fillStyle = C_BORDER
      ctx.fillRect(left, top, HW, HH)

      ctx.fillStyle = C_BODY
      ctx.fillRect(left + P, top + P, HW - 2 * P, HH - 2 * P)

      ctx.fillStyle = C_LIGHT
      ctx.fillRect(left + P, top + P, HW - 2 * P, P)

      ctx.fillStyle = C_DARK
      ctx.fillRect(left + 2 * P, top + 3 * P, P, P)
      ctx.fillRect(left + 2 * P, top + 4 * P, P, P)

      for (let s = 0; s < 2; s++) {
        const eyeX = left + 4 * P
        const eyeY = top + (s === 0 ? P : 3 * P)

        if (blink) {
          ctx.fillStyle = C_DARK
          ctx.fillRect(eyeX, eyeY + P, 2 * P, P)
        } else {
          ctx.fillStyle = C_WHITE
          ctx.fillRect(eyeX, eyeY, 2 * P, 2 * P)
          ctx.fillStyle = C_PUPIL
          ctx.fillRect(eyeX + P, eyeY, P, P)
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.fillRect(eyeX, eyeY, Math.ceil(P * 0.5), Math.ceil(P * 0.5))
        }
      }

      if (tongue) {
        const tx = left + HW
        const ty = top + HH / 2 - P / 2
        ctx.fillStyle = C_TONGUE
        ctx.fillRect(tx,         ty,     2 * P, P)
        ctx.fillRect(tx + 2 * P, ty - P, P,     P)
        ctx.fillRect(tx + 2 * P, ty + P, P,     P)
      }

      ctx.restore()
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.022

      // Sinusoidal drift (same as SnakeBanner)
      vx += Math.sin(t * 1.1) * 0.025
      vy += Math.cos(t * 0.85) * 0.022

      const spd = Math.sqrt(vx * vx + vy * vy)
      if (spd > SPEED * 1.5) { vx = (vx / spd) * SPEED * 1.5; vy = (vy / spd) * SPEED * 1.5 }
      if (spd < SPEED * 0.6) { vx = (vx / spd) * SPEED * 0.6; vy = (vy / spd) * SPEED * 0.6 }

      hx += vx; hy += vy

      // Bounce off walls (small canvas — wrapping would look odd)
      const margin = HW / 2 + P
      if (hx < margin)     { hx = margin;     vx = Math.abs(vx);  bounceX = true }
      if (hx > W - margin) { hx = W - margin; vx = -Math.abs(vx); bounceX = true }
      if (hy < HH / 2 + P) { hy = HH / 2 + P; vy = Math.abs(vy); bounceY = true }
      if (hy > H - HH / 2 - P) { hy = H - HH / 2 - P; vy = -Math.abs(vy); bounceY = true }
      bounceX = bounceY = false

      history.unshift({ x: hx, y: hy })
      if (history.length > MAX_HIST) history.pop()

      tongueT++
      if (tongueT > 100 && tongueT < 118) tongueOut = true
      else { tongueOut = false; if (tongueT > 140) tongueT = 0 }

      blinkT++
      if (blinkT > 150) blinking = true
      if (blinkT > 157) { blinking = false; blinkT = 0 }

      // Draw body tail → neck
      for (let i = NUM_SEGS - 1; i >= 1; i--) {
        const histIdx = i * Math.floor(SEG_DIST / SPEED)
        if (histIdx < history.length) {
          drawSegment(history[histIdx].x, history[histIdx].y, i)
        }
      }

      drawHead(hx, hy, getDir(vx, vy), tongueOut, blinking)

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        margin: '0 auto',
        imageRendering: 'pixelated',
      }}
    />
  )
}

// ─── Tutorial steps ───────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: '🐍',
    title: 'Bem-vindo ao BetManager!',
    subtitle: 'Seu sistema profissional de gestão de apostas',
    content: `O BetManager foi criado para você acompanhar suas apostas com seriedade — com dados reais, análises profundas e controle total da sua banca. Vamos te mostrar como tudo funciona em alguns passos rápidos.`,
    highlight: null,
    showSnake: true,
  },
  {
    icon: '💼',
    title: 'Perfis de Aposta',
    subtitle: 'Separe suas estratégias',
    content: `Perfis permitem segmentar suas apostas por estratégia ou mercado. Por exemplo: "Valor Esperado", "Over/Under", "Lay" — cada perfil tem suas próprias estatísticas. Você pode criar e gerenciar perfis em Configurações → Perfis.`,
    highlight: 'Útil para identificar qual estratégia te gera mais lucro.',
    showSnake: false,
  },
  {
    icon: '🏦',
    title: 'Banca',
    subtitle: 'O combustível das suas apostas',
    content: `A banca é o capital total disponível para apostar. Você define um valor inicial e pode registrar depósitos e saques ao longo do tempo. O sistema calcula automaticamente seu saldo atual. Configure em Configurações → Banca.`,
    highlight: 'Nunca aposte sem saber exatamente quanto você tem disponível.',
    showSnake: false,
  },
  {
    icon: '📏',
    title: 'Unidade',
    subtitle: 'Sua unidade de medida',
    content: `A unidade é um valor fixo em R$ que representa o tamanho padrão das suas apostas — geralmente 1% a 2% da banca. Isso padroniza a análise: "apostei 2u" significa o dobro da unidade, independente do valor em reais.`,
    highlight: 'Manter a unidade constante é a base da gestão de banca profissional.',
    showSnake: false,
  },
  {
    icon: '📈',
    title: 'ROI',
    subtitle: 'Return on Investment',
    content: `ROI é a métrica principal de desempenho: quanto você lucrou em relação ao que apostou, em porcentagem. ROI positivo = lucrativo. Um ROI de 5% já é considerado excelente no longo prazo para apostadores profissionais.`,
    highlight: 'ROI = (Lucro ÷ Total Apostado) × 100',
    showSnake: false,
  },
  {
    icon: '📉',
    title: 'Drawdown',
    subtitle: 'Controle de perdas',
    content: `Drawdown é a maior queda da banca a partir de um pico. Monitorar o drawdown te ajuda a avaliar o risco real da sua estratégia e saber quando reduzir stakes ou pausar.`,
    highlight: 'Um bom sistema tem drawdown controlado mesmo em sequências negativas.',
    showSnake: false,
  },
  {
    icon: '📊',
    title: 'Estatísticas & Analytics',
    subtitle: 'Seus números em detalhes',
    content: `Em Metas e Analytics você encontra: winrate, ROI por esporte, por perfil, por bookmaker, evolução da banca ao longo do tempo, desempenho por odd, stakes médios e muito mais.`,
    highlight: 'Dados são a diferença entre apostador profissional e amador.',
    showSnake: false,
  },
  {
    icon: '🎯',
    title: 'Sistema de Metas',
    subtitle: 'Foco e disciplina',
    content: `Defina metas de ROI, lucro ou número de apostas para períodos específicos. O sistema acompanha seu progresso em tempo real e te mantém focado nos objetivos. Acesse em Metas no menu.`,
    highlight: 'Metas te dão direção e medem evolução real.',
    showSnake: false,
  },
  {
    icon: '🚀',
    title: 'Tudo pronto!',
    subtitle: 'Hora de começar',
    content: `Configure sua banca e unidade em Configurações, registre suas primeiras apostas clicando em "+ Aposta" e acompanhe sua evolução no Dashboard. O BetManager vai crescer com você.`,
    highlight: null,
    showSnake: true,
  },
]

// ─── Tutorial modal ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'betmanager_tutorial_done'

interface TutorialProps {
  onClose: () => void
}

export function Tutorial({ onClose }: TutorialProps) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const isFirst = step === 0

  function next() {
    if (isLast) { finish(); return }
    setStep(s => s + 1)
  }
  function prev() { setStep(s => Math.max(0, s - 1)) }
  function finish() {
    localStorage.setItem(STORAGE_KEY, '1')
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-secondary)',
        border: '1px solid #2a1d54',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(124,58,237,0.25), 0 24px 64px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Top purple bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a78bfa)',
        }} />

        {/* Header */}
        <div style={{
          padding: '24px 28px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 22,
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid #3b1d8a',
              borderRadius: 10,
              padding: '4px 10px',
              lineHeight: 1,
            }}>{current.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--purple-400)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Passo {step + 1} de {STEPS.length}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {current.title}
              </div>
            </div>
          </div>
          <button
            onClick={finish}
            title="Pular tutorial"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 18, padding: 4,
              lineHeight: 1, borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >✕</button>
        </div>

        {/* Snake animation */}
        {current.showSnake && (
          <div style={{
            margin: '16px 0 0',
            background: 'rgba(124,58,237,0.06)',
            borderTop: '1px solid #2a1d54',
            borderBottom: '1px solid #2a1d54',
          }}>
            <TutorialSnake />
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 28px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--purple-300)', fontWeight: 500, marginBottom: 8 }}>
            {current.subtitle}
          </div>
          <p style={{
            fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
            margin: 0,
          }}>
            {current.content}
          </p>
          {current.highlight && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid #3b1d8a',
              borderRadius: 10,
              fontSize: 13, color: 'var(--purple-300)', fontWeight: 500,
              fontStyle: 'italic',
            }}>
              {current.highlight}
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6,
          padding: '20px 28px 0',
        }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                border: 'none',
                cursor: 'pointer',
                background: i === step ? '#7c3aed' : i < step ? '#4c1d95' : '#2a1d54',
                transition: 'all 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{
          padding: '20px 28px 24px',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
          {!isFirst && (
            <button
              onClick={prev}
              style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'transparent',
                border: '1px solid #2a1d54',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a1d54'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >← Anterior</button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={next}
            style={{
              padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(124,58,237,0.4)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isLast ? 'Começar 🚀' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTutorial(userId?: number) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!userId) return
    const key = `${STORAGE_KEY}_${userId}`
    const done = localStorage.getItem(key)
    if (!done) {
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [userId])

  function close() {
    if (userId) localStorage.setItem(`${STORAGE_KEY}_${userId}`, '1')
    setShow(false)
  }

  return { show, close }
}
