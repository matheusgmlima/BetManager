import { useState, useEffect, useRef } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useAuth } from '../contexts/AuthContext'
import { useBankroll, useAddBankroll, useRemoveBankroll } from '../hooks/useBankroll'
import {
  useSports, useCreateSport, useUpdateSport, useToggleSport,
  useBookmakers, useCreateBookmaker, useUpdateBookmaker, useToggleBookmaker,
  useProfiles, useCreateProfile, useUpdateProfile, useToggleProfile,
  useTipsters, useCreateTipster, useUpdateTipster, useToggleTipster, useDeleteTipster,
} from '../hooks/useConfig'
import { Sport, Bookmaker, BettingProfile, Tipster } from '../types/bet.types'

// ─── Utils ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Snake Runner ─────────────────────────────────────────────────────────────
// Pixel-art snake that crawls along the bottom strip of the content panel

function SnakeRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    const H   = 40
    const DPR = window.devicePixelRatio || 1
    let W = canvas.parentElement?.clientWidth || 600

    canvas.width  = W * DPR
    canvas.height = H * DPR
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'
    ctx.imageSmoothingEnabled = false
    ctx.scale(DPR, DPR)

    // Same pixel unit & drawing as SnakeLogo — P=4 fits a 40px strip
    const P     = 3
    const HW    = 8 * P   // 24px
    const HH    = 6 * P   // 18px
    const BODY  = 16
    const SPEED = 1.4

    const PURPLE = '#7c3aed'
    const DARK   = '#2d1f5e'
    const LIGHT  = '#a78bfa'
    const BORDER = '#1e0a3c'
    const WHITE  = '#f0f0ff'
    const PUPIL  = '#0a001a'
    const TONGUE = '#f472b6'
    const SHINE  = 'rgba(255,255,255,0.25)'

    const cy = Math.floor(H / 2)
    let hx   = HW + P
    let dir  = 1
    let trail: number[] = Array.from({ length: BODY + 1 }, (_, i) => hx - i * P * 3)
    let tongueOut = false; let tongueT = 0
    let blinking  = false; let blinkT  = 0
    let animId: number

    const resize = () => {
      W = canvas.parentElement?.clientWidth || 600
      canvas.width  = W * DPR
      canvas.height = H * DPR
      canvas.style.width = W + 'px'
      ctx.scale(DPR, DPR)
    }
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    function rnd(n: number) { return Math.round(n) }

    function drawSegment(cx: number, idx: number) {
      const ratio = 1 - idx / BODY
      const segP  = Math.max(2, Math.floor(P * (0.55 + ratio * 0.55)))
      const sz    = segP * 3
      const alpha = 0.3 + ratio * 0.65
      const sx    = rnd(cx - sz / 2)
      const sy    = cy - rnd(sz / 2)
      ctx.globalAlpha = alpha
      ctx.fillStyle = BORDER
      ctx.fillRect(sx, sy, sz, sz)
      ctx.fillStyle = idx < 2 ? LIGHT : idx < 5 ? PURPLE : DARK
      ctx.fillRect(sx + segP, sy + segP, sz - 2 * segP, sz - 2 * segP)
      ctx.fillStyle = SHINE
      ctx.fillRect(sx + segP, sy + segP, segP, segP)
      ctx.globalAlpha = 1
    }

    function drawHead(x: number) {
      const sx = dir > 0 ? rnd(x) : rnd(x) - HW
      const sy = cy - rnd(HH / 2)

      ctx.fillStyle = BORDER
      ctx.fillRect(sx, sy, HW, HH)
      ctx.fillStyle = PURPLE
      ctx.fillRect(sx + P, sy + P, HW - 2 * P, HH - 2 * P)
      ctx.fillStyle = LIGHT
      ctx.fillRect(sx + P, sy + P, HW - 2 * P, P)
      ctx.fillStyle = DARK
      ctx.fillRect(sx + 2 * P, sy + 3 * P, P, P)
      ctx.fillRect(sx + 4 * P, sy + 3 * P, P, P)

      for (let s = 0; s < 2; s++) {
        const eyeX = dir > 0
          ? (s === 0 ? sx + 5 * P : sx + 2 * P)
          : (s === 0 ? sx + 2 * P : sx + 5 * P)
        const eyeY = sy + P
        if (blinking) {
          ctx.fillStyle = BORDER
          ctx.fillRect(eyeX, eyeY + P, 2 * P, P)
        } else {
          ctx.fillStyle = WHITE
          ctx.fillRect(eyeX, eyeY, 2 * P, 2 * P)
          ctx.fillStyle = PUPIL
          ctx.fillRect(dir > 0 ? eyeX + P : eyeX, eyeY, P, P)
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.fillRect(eyeX, eyeY, Math.max(1, Math.floor(P / 2)), Math.max(1, Math.floor(P / 2)))
        }
      }

      if (tongueOut) {
        const ty = sy + 3 * P
        if (dir > 0) {
          ctx.fillStyle = TONGUE
          ctx.fillRect(sx + HW,           ty,     2 * P, P)
          ctx.fillRect(sx + HW + 2 * P,   ty - P, P,     P)
          ctx.fillRect(sx + HW + 2 * P,   ty + P, P,     P)
        } else {
          ctx.fillStyle = TONGUE
          ctx.fillRect(sx - 2 * P,         ty,     2 * P, P)
          ctx.fillRect(sx - 3 * P,         ty - P, P,     P)
          ctx.fillRect(sx - 3 * P,         ty + P, P,     P)
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = 'rgba(124,58,237,0.07)'
      for (let i = 0; i < Math.floor(W / 8); i++) {
        ctx.fillRect(i * 8 + 3, cy, 2, 1)
      }

      hx += dir * SPEED
      const margin = HW + 3 * P
      if (hx > W - margin) { hx = W - margin; dir = -1 }
      if (hx < margin)     { hx = margin;      dir  =  1 }

      trail.unshift(hx)
      trail = trail.slice(0, BODY + 1)

      for (let i = BODY - 1; i >= 0; i--) {
        if (trail[i + 1] !== undefined) drawSegment(trail[i + 1], i)
      }
      drawHead(hx)

      blinkT++
      if (blinkT > 150) blinking = true
      if (blinkT > 156) { blinking = false; blinkT = 0 }

      tongueT++
      if (tongueT > 110 && tongueT < 128) tongueOut = true
      else { tongueOut = false; if (tongueT > 150) tongueT = 0 }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', imageRendering: 'pixelated', width: '100%', height: '40px' }}
    />
  )
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const field: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const onFocus = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = '#7c3aed'
  e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.12)'
}
const onBlur = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow   = 'none'
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 7, border: 'none',
  background: '#7c3aed', color: '#fff', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 7,
  border: '1px solid var(--border-purple)',
  background: 'transparent', color: 'var(--text-secondary)',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
}

const editCard: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 8,
  border: '1px solid #5b21b6',
  background: 'rgba(91,33,182,0.08)',
}

const itemRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 14px', borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-primary)',
}

const addBtn: React.CSSProperties = {
  width: '100%', padding: 9, borderRadius: 8,
  border: '1px dashed var(--border-purple)',
  background: 'transparent', color: '#7878a0',
  fontSize: 13, cursor: 'pointer',
  transition: 'border-color 0.15s, color 0.15s',
}

// Section label with gradient shimmer
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase',
        background: 'linear-gradient(90deg,#a78bfa,#c4b5fd,#a78bfa)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer 4s linear infinite',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.25),transparent)' }} />
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 44, borderRadius: 8, background: 'rgba(124,58,237,0.06)',
          animation: 'pulse 1.4s ease infinite', animationDelay: `${i * 60}ms`,
        }} />
      ))}
    </div>
  )
}

function Toggle({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled} style={{
      flexShrink: 0, width: 36, height: 20, borderRadius: 10, padding: 2,
      border: 'none',
      background: active ? '#7c3aed' : 'rgba(255,255,255,0.08)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.2s', display: 'flex', alignItems: 'center',
      opacity: disabled ? 0.5 : 1,
      boxShadow: active ? '0 0 8px rgba(124,58,237,0.4)' : 'none',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transform: active ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  )
}

const COLORS = [
  '#7c3aed','#6366f1','#3b82f6','#06b6d4','#10b981',
  '#22c55e','#f59e0b','#f97316','#ef4444','#ec4899',
  '#a855f7','#8b5cf6','#14b8a6','#eab308','#64748b',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          width: 16, height: 16, borderRadius: 4, pointerEvents: 'none',
          background: /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#6B7280',
          border: '1px solid rgba(255,255,255,0.08)',
        }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          placeholder="#6B7280"
          style={{ ...field, paddingLeft: 36 }} />
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)} style={{
            width: 20, height: 20, borderRadius: 5, background: c, border: 'none',
            cursor: 'pointer', outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: 2, opacity: value === c ? 1 : 0.7,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── BANCA ────────────────────────────────────────────────────────────────────

function BancaSection() {
  const isMobile = useMobile()
  const { data, isLoading } = useBankroll()
  const addEntry    = useAddBankroll()
  const removeEntry = useRemoveBankroll()

  const [mode,   setMode]   = useState<null | 'initial' | 'deposit' | 'withdrawal'>(null)
  const [amount, setAmount] = useState('')
  const [note,   setNote]   = useState('')

  const balance  = data?.balance ?? 0
  const entries  = data?.data ?? []
  const hasInit  = entries.some(e => e.type === 'initial')
  const deposited = entries.filter(e => e.type !== 'withdrawal').reduce((s, e) => s + e.amount, 0)
  const withdrawn = entries.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0)

  const typeLabel = (t: string) =>
    t === 'initial' ? 'Banca inicial' : t === 'deposit' ? 'Depósito' : 'Saque'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
        {[
          { label: 'Saldo atual',    value: isLoading ? '—' : fmt(balance),    accent: true },
          { label: 'Total depositado', value: isLoading ? '—' : fmt(deposited), accent: false },
          { label: 'Total sacado',   value: isLoading ? '—' : fmt(withdrawn),  accent: false },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--bg-primary)',
            border: `1px solid ${k.accent ? '#2a1d54' : 'var(--border)'}`,
            borderRadius: 9, padding: '14px 16px',
            boxShadow: k.accent ? 'inset 0 0 20px rgba(124,58,237,0.05)' : 'none',
          }}>
            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {k.label}
            </p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', color: k.accent ? '#a78bfa' : 'var(--text-primary)' }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {!mode && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!hasInit && (
            <button onClick={() => setMode('initial')} style={{ ...primaryBtn, flex: isMobile ? '1' : 'none' }}>
              Definir banca inicial
            </button>
          )}
          {hasInit && (
            <>
              <button onClick={() => setMode('deposit')} style={{ ...primaryBtn, flex: isMobile ? '1' : 'none' }}>Registrar depósito</button>
              <button onClick={() => setMode('withdrawal')} style={{ ...ghostBtn, flex: isMobile ? '1' : 'none' }}>Registrar saque</button>
            </>
          )}
        </div>
      )}

      {/* Form */}
      {mode && (
        <div style={editCard}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
            {mode === 'initial' ? 'Banca inicial' : mode === 'deposit' ? 'Depósito' : 'Saque'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Valor (R$)</p>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}
                placeholder="0,00" min="0.01" step="0.01" style={field} autoFocus />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Observação</p>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}
                placeholder="Opcional" style={field} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setMode(null); setAmount(''); setNote('') }} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!mode || parseFloat(amount) <= 0) return
              await addEntry.mutateAsync({ amount: parseFloat(amount), type: mode, note: note.trim() || undefined })
              setMode(null); setAmount(''); setNote('')
            }} disabled={addEntry.isLoading || !amount || parseFloat(amount) <= 0} style={primaryBtn}>
              {addEntry.isLoading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <SLabel>Histórico</SLabel>
        {isLoading && <Skeleton />}
        {!isLoading && entries.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Nenhuma movimentação registrada.</p>
        )}
        {entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {entries.map(e => (
              <div key={e.id} style={itemRow}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: e.type === 'withdrawal' ? 'var(--red)' : '#16a34a' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {typeLabel(e.type)}
                    {e.note && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> &middot; {e.note}</span>}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(e.date)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0, minWidth: 80, textAlign: 'right', color: e.type === 'withdrawal' ? 'var(--red)' : '#16a34a' }}>
                  {e.type === 'withdrawal' ? '-' : '+'}{fmt(e.amount)}
                </span>
                <button onClick={() => removeEntry.mutate(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>&times;</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── UNIDADE ──────────────────────────────────────────────────────────────────

function UnidadeSection() {
  const { user, updateUnit } = useAuth()
  const { data: bankroll }   = useBankroll()

  const [value,  setValue]  = useState(String(user?.unitValue ?? 10))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const unitNum = parseFloat(value) || 0
  const balance = bankroll?.balance ?? 0
  const pct     = balance > 0 ? ((unitNum / balance) * 100) : null

  const handleSave = async () => {
    if (unitNum <= 0) return
    setSaving(true)
    await updateUnit(unitNum)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const quickValues = balance > 0
    ? [1, 2, 3, 5].map(p => ({ label: `${p}%`, amount: parseFloat(((balance * p) / 100).toFixed(2)) }))
    : [{ label: 'R$ 5', amount: 5 }, { label: 'R$ 10', amount: 10 }, { label: 'R$ 25', amount: 25 }, { label: 'R$ 50', amount: 50 }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Current */}
      <div style={{
        background: 'var(--bg-primary)', border: '1px solid #2a1d54',
        borderRadius: 9, padding: '16px 20px',
        boxShadow: 'inset 0 0 24px rgba(124,58,237,0.05)',
      }}>
        <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Unidade atual
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.5px' }}>
            {fmt(user?.unitValue ?? 0)}
          </span>
          {pct !== null && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {pct.toFixed(2)}% da banca
            </span>
          )}
        </div>
      </div>

      {/* Edit */}
      <div>
        <SLabel>Alterar unidade</SLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {quickValues.map(q => {
            const isActive = parseFloat(value) === q.amount
            return (
              <button key={q.label} onClick={() => setValue(String(q.amount))} style={{
                flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${isActive ? '#7c3aed' : 'var(--border)'}`,
                background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: isActive ? '#a78bfa' : 'var(--text-muted)',
                boxShadow: isActive ? '0 0 8px rgba(124,58,237,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>
                {q.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}>R$</span>
            <input type="number" value={value} onChange={e => setValue(e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              placeholder="10.00" min="0.01" step="0.01"
              style={{ ...field, paddingLeft: 34 }} />
          </div>
          <button onClick={handleSave} disabled={saving || unitNum <= 0} style={{
            ...primaryBtn,
            background: saved ? '#16a34a' : '#7c3aed',
            transition: 'background 0.3s',
          }}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar'}
          </button>
        </div>
        {balance > 0 && unitNum > 0 && (
          <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            {fmt(unitNum)} &rarr; <strong style={{ color: 'var(--text-secondary)' }}>{((unitNum / balance) * 100).toFixed(2)}%</strong> de {fmt(balance)}
          </p>
        )}
      </div>

      {/* Reference table */}
      <div>
        <SLabel>Referência de gestão</SLabel>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 9 }}>
          {[
            { perfil: 'Conservador', pct: '1 – 2%', desc: 'Baixo risco, proteção da banca' },
            { perfil: 'Moderado',    pct: '2 – 3%', desc: 'Equilíbrio entre risco e retorno' },
            { perfil: 'Agressivo',   pct: '3 – 5%', desc: 'Maior variância, maior potencial' },
          ].map((r, i, arr) => (
            <div key={r.perfil} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', width: 52, flexShrink: 0 }}>{r.pct}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>{r.perfil}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CASAS ────────────────────────────────────────────────────────────────────

function BookmakersSection() {
  const { data: bookmakers = [], isLoading } = useBookmakers()
  const create = useCreateBookmaker()
  const update = useUpdateBookmaker()
  const toggle = useToggleBookmaker()

  const [adding,    setAdding]   = useState(false)
  const [newName,   setNewName]  = useState('')
  const [newColor,  setNewColor] = useState('#7c3aed')
  const [editId,    setEditId]   = useState<number | null>(null)
  const [editName,  setEditName] = useState('')
  const [editColor, setEditColor]= useState('')

  const startEdit = (b: Bookmaker) => { setEditId(b.id); setEditName(b.name); setEditColor(b.color); setAdding(false) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {isLoading && <Skeleton />}

      {bookmakers.map(b => editId === b.id ? (
        <div key={b.id} style={editCard}>
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome</p>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} style={field} placeholder="Nome da casa" />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cor</p>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditId(null)} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!editName.trim()) return
              await update.mutateAsync({ id: editId!, data: { name: editName.trim(), color: editColor } })
              setEditId(null)
            }} disabled={update.isLoading} style={primaryBtn}>{update.isLoading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      ) : (
        <div key={b.id} style={{ ...itemRow, opacity: b.active ? 1 : 0.5 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: b.color, flexShrink: 0, boxShadow: `0 0 6px ${b.color}88` }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{b.name}</span>
          {!b.active && <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)' }}>inativa</span>}
          <button onClick={() => startEdit(b)} style={{ ...ghostBtn, padding: '4px 12px', fontSize: 12 }}>Editar</button>
          <Toggle active={b.active} onToggle={() => toggle.mutate(b.id)} disabled={toggle.isLoading} />
        </div>
      ))}

      {adding ? (
        <div style={editCard}>
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome</p>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} style={field} placeholder="Ex: Betano" autoFocus />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cor</p>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setAdding(false); setNewName(''); setNewColor('#7c3aed') }} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!newName.trim()) return
              await create.mutateAsync({ name: newName.trim(), color: newColor })
              setAdding(false); setNewName(''); setNewColor('#7c3aed')
            }} disabled={create.isLoading || !newName.trim()} style={primaryBtn}>
              {create.isLoading ? 'Criando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>
          + Adicionar casa de apostas
        </button>
      )}
    </div>
  )
}

// ─── ESPORTES ─────────────────────────────────────────────────────────────────

const SPORT_ICONS = ['⚽','🏀','🎾','🏈','⚾','🏒','🏉','🏐','🎱','🏓','🥊','🏊','🏇','🚴','🏋️','🎯','🏆']

function SportsSection() {
  const { data: sports = [], isLoading } = useSports()
  const create = useCreateSport()
  const update = useUpdateSport()
  const toggle = useToggleSport()

  const [adding,   setAdding]  = useState(false)
  const [newName,  setNewName] = useState('')
  const [newIcon,  setNewIcon] = useState('')
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editName, setEditName]= useState('')
  const [editIcon, setEditIcon]= useState('')

  const startEdit = (s: Sport) => { setEditId(s.id); setEditName(s.name); setEditIcon(s.icon ?? ''); setAdding(false) }

  const IconGrid = ({ sel, onSel }: { sel: string; onSel: (i: string) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {SPORT_ICONS.map(ic => (
        <button key={ic} type="button" onClick={() => onSel(ic)} style={{
          width: 32, height: 32, borderRadius: 6, fontSize: 15,
          border: `1px solid ${sel === ic ? '#7c3aed' : 'var(--border)'}`,
          background: sel === ic ? 'rgba(124,58,237,0.15)' : 'transparent',
          cursor: 'pointer',
          boxShadow: sel === ic ? '0 0 6px rgba(124,58,237,0.25)' : 'none',
        }}>{ic}</button>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {isLoading && <Skeleton />}

      {sports.map(s => editId === s.id ? (
        <div key={s.id} style={editCard}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 10, marginBottom: 8 }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ícone</p>
              <input value={editIcon} onChange={e => setEditIcon(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}
                style={{ ...field, textAlign: 'center', fontSize: 18, padding: '7px 4px' }} maxLength={4} />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome</p>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} style={field} placeholder="Nome do esporte" />
            </div>
          </div>
          <IconGrid sel={editIcon} onSel={setEditIcon} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setEditId(null)} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!editName.trim()) return
              await update.mutateAsync({ id: editId!, data: { name: editName.trim(), icon: editIcon || null } })
              setEditId(null)
            }} disabled={update.isLoading} style={primaryBtn}>{update.isLoading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      ) : (
        <div key={s.id} style={{ ...itemRow, opacity: s.active ? 1 : 0.5 }}>
          {s.icon
            ? <span style={{ fontSize: 18, width: 22, textAlign: 'center', flexShrink: 0 }}>{s.icon}</span>
            : <span style={{ width: 22, flexShrink: 0 }} />}
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</span>
          {!s.active && <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)' }}>inativo</span>}
          <button onClick={() => startEdit(s)} style={{ ...ghostBtn, padding: '4px 12px', fontSize: 12 }}>Editar</button>
          <Toggle active={s.active} onToggle={() => toggle.mutate(s.id)} disabled={toggle.isLoading} />
        </div>
      ))}

      {adding ? (
        <div style={editCard}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 10, marginBottom: 8 }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ícone</p>
              <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}
                style={{ ...field, textAlign: 'center', fontSize: 18, padding: '7px 4px' }} maxLength={4} />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome</p>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onFocus={onFocus} onBlur={onBlur} style={field} placeholder="Ex: Futebol" autoFocus />
            </div>
          </div>
          <IconGrid sel={newIcon} onSel={setNewIcon} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => { setAdding(false); setNewName(''); setNewIcon('') }} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!newName.trim()) return
              await create.mutateAsync({ name: newName.trim(), icon: newIcon || null })
              setAdding(false); setNewName(''); setNewIcon('')
            }} disabled={create.isLoading || !newName.trim()} style={primaryBtn}>
              {create.isLoading ? 'Criando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>+ Adicionar esporte</button>
      )}
    </div>
  )
}

// ─── PERFIS ───────────────────────────────────────────────────────────────────

const PROFILE_PALETTE = ['#7c3aed','#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899']

function ProfilesSection() {
  const { data: profiles = [], isLoading } = useProfiles()
  const create = useCreateProfile()
  const update = useUpdateProfile()
  const toggle = useToggleProfile()

  const [adding,   setAdding]  = useState(false)
  const [newName,  setNewName] = useState('')
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editName, setEditName]= useState('')

  const startEdit = (p: BettingProfile) => { setEditId(p.id); setEditName(p.name); setAdding(false) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {isLoading && <Skeleton />}

      {profiles.map((p, i) => {
        const color   = PROFILE_PALETTE[i % PROFILE_PALETTE.length]
        const initials = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
        return editId === p.id ? (
          <div key={p.id} style={editCard}>
            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome do perfil</p>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              onFocus={onFocus} onBlur={onBlur} style={{ ...field, marginBottom: 12 }} placeholder="Nome" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditId(null)} style={ghostBtn}>Cancelar</button>
              <button onClick={async () => {
                if (!editName.trim()) return
                await update.mutateAsync({ id: editId!, data: { name: editName.trim() } })
                setEditId(null)
              }} disabled={update.isLoading} style={primaryBtn}>{update.isLoading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        ) : (
          <div key={p.id} style={{ ...itemRow, opacity: p.active ? 1 : 0.5 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: `${color}18`, border: `1px solid ${color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color,
            }}>{initials}</div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
            {!p.active && <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)' }}>inativo</span>}
            <button onClick={() => startEdit(p)} style={{ ...ghostBtn, padding: '4px 12px', fontSize: 12 }}>Editar</button>
            <Toggle active={p.active} onToggle={() => toggle.mutate(p.id)} disabled={toggle.isLoading} />
          </div>
        )
      })}

      {adding ? (
        <div style={editCard}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome do perfil</p>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...field, marginBottom: 12 }} placeholder="Ex: Valor, Back, Lay..." autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setAdding(false); setNewName('') }} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!newName.trim()) return
              await create.mutateAsync({ name: newName.trim() })
              setAdding(false); setNewName('')
            }} disabled={create.isLoading || !newName.trim()} style={primaryBtn}>
              {create.isLoading ? 'Criando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>+ Adicionar perfil</button>
      )}
    </div>
  )
}

// ─── TIPSTERS ────────────────────────────────────────────────────────────────

function TipstersSection() {
  const { data: tipsters = [], isLoading } = useTipsters()
  const create = useCreateTipster()
  const update = useUpdateTipster()
  const toggle = useToggleTipster()
  const remove = useDeleteTipster()

  const [adding,   setAdding]  = useState(false)
  const [newName,  setNewName] = useState('')
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editName, setEditName]= useState('')

  const startEdit = (t: Tipster) => { setEditId(t.id); setEditName(t.name); setAdding(false) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Tipsters e canais VIP cujas dicas você segue. Associe apostas a um tipster para acompanhar o desempenho de cada um.
      </p>

      {isLoading && <Skeleton />}

      {tipsters.map((t, i) => {
        const color    = PROFILE_PALETTE[i % PROFILE_PALETTE.length]
        const initials = t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
        return editId === t.id ? (
          <div key={t.id} style={editCard}>
            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome do tipster</p>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              onFocus={onFocus} onBlur={onBlur} style={{ ...field, marginBottom: 12 }} placeholder="Nome" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditId(null)} style={ghostBtn}>Cancelar</button>
              <button onClick={async () => {
                if (!editName.trim()) return
                await update.mutateAsync({ id: editId!, data: { name: editName.trim() } })
                setEditId(null)
              }} disabled={update.isLoading} style={primaryBtn}>{update.isLoading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        ) : (
          <div key={t.id} style={{ ...itemRow, opacity: t.active ? 1 : 0.5 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: `${color}18`, border: `1px solid ${color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color,
            }}>{initials}</div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{t.name}</span>
            {!t.active && <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)' }}>inativo</span>}
            <button onClick={() => startEdit(t)} style={{ ...ghostBtn, padding: '4px 12px', fontSize: 12 }}>Editar</button>
            <Toggle active={t.active} onToggle={() => toggle.mutate(t.id)} disabled={toggle.isLoading} />
            <button onClick={async () => {
              if (window.confirm(`Remover "${t.name}"?`)) await remove.mutateAsync(t.id)
            }} style={{ ...ghostBtn, padding: '4px 8px', fontSize: 12, color: 'var(--red)' }}>✕</button>
          </div>
        )
      })}

      {adding ? (
        <div style={editCard}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome do tipster / canal VIP</p>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onFocus={onFocus} onBlur={onBlur}
            style={{ ...field, marginBottom: 12 }} placeholder="Ex: Tipster João, Canal VIP X..." autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setAdding(false); setNewName('') }} style={ghostBtn}>Cancelar</button>
            <button onClick={async () => {
              if (!newName.trim()) return
              await create.mutateAsync({ name: newName.trim() })
              setAdding(false); setNewName('')
            }} disabled={create.isLoading || !newName.trim()} style={primaryBtn}>
              {create.isLoading ? 'Criando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>+ Adicionar tipster / VIP</button>
      )}
    </div>
  )
}

// ─── CONTA ────────────────────────────────────────────────────────────────────

function ContaSection() {
  const { user } = useAuth()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#5b21b6,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff',
          boxShadow: '0 0 16px rgba(124,58,237,0.4)',
        }}>
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.username}</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 9 }}>
        {[
          { label: 'Usuário', value: user?.username ?? '—' },
          { label: 'Email',   value: user?.email    ?? '—' },
          { label: 'Senha',   value: '••••••••••' },
        ].map((item, i, arr) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</span>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Alteração de email e senha estará disponível em breve.
      </p>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'banca',      label: 'Banca',           desc: 'Movimentações e saldo'              },
  { key: 'unidade',    label: 'Unidade',          desc: 'Tamanho da unidade de aposta'       },
  { key: 'tipsters',   label: 'Tipsters / VIPs',  desc: 'Tipsters e canais que você segue'   },
  { key: 'bookmakers', label: 'Casas de Apostas', desc: 'Casas onde você aposta'             },
  { key: 'sports',     label: 'Esportes',         desc: 'Esportes disponíveis'               },
  { key: 'profiles',   label: 'Perfis',           desc: 'Perfis de estratégia própria'       },
  { key: 'conta',      label: 'Conta',            desc: 'Informações da conta'               },
]

export default function Settings() {
  const isMobile = useMobile()
  const [tab, setTab] = useState('banca')

  const content: Record<string, React.ReactNode> = {
    banca:      <BancaSection />,
    unidade:    <UnidadeSection />,
    tipsters:   <TipstersSection />,
    bookmakers: <BookmakersSection />,
    sports:     <SportsSection />,
    profiles:   <ProfilesSection />,
    conta:      <ContaSection />,
  }

  const activeTab = TABS.find(t => t.key === tab)!

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: isMobile ? '16px 14px 80px' : '36px 44px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: isMobile ? 16 : 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg,#5b21b6,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 14px rgba(124,58,237,0.35)',
          }}>🐍</div>
          <div>
            <h1 style={{
              margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700,
              background: 'linear-gradient(90deg,#a78bfa,#c4b5fd)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Configurações
            </h1>
            {!isMobile && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Banca &middot; Unidade &middot; Tipsters &middot; Casas &middot; Esportes &middot; Perfis &middot; Conta
              </p>
            )}
          </div>
        </div>

        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '188px 1fr', gap: 16, alignItems: 'start' }}>

          {/* ── Sidebar / Mobile tabs ── */}
          {isMobile ? (
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto',
              paddingBottom: 4, marginBottom: 12,
              msOverflowStyle: 'none', scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              {TABS.map(t => {
                const isActive = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    flexShrink: 0, padding: '9px 16px', borderRadius: 10,
                    border: `1px solid ${isActive ? '#7c3aed' : '#1e1040'}`,
                    background: isActive ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)',
                    color: isActive ? '#a78bfa' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 0 10px rgba(124,58,237,0.2)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <nav style={{
              background: 'var(--bg-card)',
              border: '1px solid #1e1040',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {TABS.map((t, i) => {
                const isActive = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    width: '100%', display: 'block',
                    padding: '11px 16px', textAlign: 'left',
                    border: 'none',
                    borderLeft: `2px solid ${isActive ? '#7c3aed' : 'transparent'}`,
                    borderBottom: i < TABS.length - 1 ? '1px solid #1c1c2e' : 'none',
                    background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    boxShadow: isActive ? 'inset 0 0 20px rgba(124,58,237,0.05)' : 'none',
                  }}>
                    <span style={{
                      fontSize: 13, display: 'block',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#a78bfa' : 'var(--text-muted)',
                    }}>
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </nav>
          )}

          {/* ── Content ── */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid #1e1040',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* top accent */}
            <div style={{ height: 2, background: 'linear-gradient(90deg,#7c3aed,rgba(124,58,237,0.2),transparent)' }} />

            {/* panel header */}
            <div style={{ padding: isMobile ? '11px 14px' : '13px 20px', borderBottom: '1px solid #1c1c2e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'linear-gradient(90deg,#a78bfa,#c4b5fd,#a78bfa)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
              }}>
                ◈ {activeTab.label}
              </span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right,rgba(124,58,237,0.25),transparent)' }} />
              {!isMobile && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeTab.desc}</span>}
            </div>

            {/* body */}
            <div style={{ padding: isMobile ? '14px' : '20px' }}>
              {content[tab]}
            </div>

            {/* snake runner strip */}
            <div style={{ borderTop: '1px solid #1c1c2e', background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <SnakeRunner />
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes shimmer { to { background-position: -200% center; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </div>
  )
}
