import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals'
import { Goal } from '../services/goalsService'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const now = new Date()

// ─── Design helpers ───────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg-primary)',
  border: '1px solid var(--border)', borderRadius: 10,
  padding: '10px 14px', color: 'var(--text-primary)',
  fontSize: 14, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit',
}

const focus = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = '#7c3aed'
  e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.12)'
}
const blur = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow   = 'none'
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

function getPace(goal: Goal) {
  const total     = daysInMonth(goal.month, goal.year)
  const elapsed   = Math.min(now.getDate(), total)
  const remaining = total - elapsed
  const dailyAvg  = elapsed > 0 ? goal.actualProfit / elapsed : 0
  const projected = dailyAvg * total
  const onTrack   = projected >= goal.targetProfit
  return { total, elapsed, remaining, dailyAvg, projected, onTrack }
}

function computeStreak(goals: Goal[]): number {
  const past = [...goals]
    .filter(g => !g.isCurrentMonth)
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
  let streak = 0
  for (const g of past) {
    if (g.achieved) streak++
    else break
  }
  return streak
}

function statusOf(goal: Goal): { label: string; color: string } {
  const isFuture = goal.year > now.getFullYear() ||
    (goal.year === now.getFullYear() && goal.month > now.getMonth() + 1)
  if (goal.achieved)         return { label: 'Alcançada',     color: '#22c55e' }
  if (isFuture)              return { label: 'Agendada',       color: '#64748b' }
  if (goal.isCurrentMonth)   return { label: 'Em progresso',  color: '#a78bfa' }
  return                            { label: 'Não alcançada', color: '#ef4444' }
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({
  pct, achieved, size = 80, stroke = 7,
}: { pct: number; achieved: boolean; size?: number; stroke?: number }) {
  const r    = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const pctC = Math.min(Math.max(pct, 0), 100)
  const dash = (pctC / 100) * circ
  const cx   = size / 2
  const cy   = size / 2
  const color = achieved ? '#22c55e' : pct >= 80 ? '#a78bfa' : pct >= 50 ? '#eab308' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color}
        fontSize={size < 80 ? 11 : 13} fontWeight={800} fontFamily="inherit">
        {pct > 999 ? '>999' : `${Math.round(pctC)}%`}
      </text>
    </svg>
  )
}

// ─── Thin progress bar ────────────────────────────────────────────────────────

function ProgressBar({ pct, achieved }: { pct: number; achieved: boolean }) {
  return (
    <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min(Math.max(pct, 0), 100)}%`,
        background: achieved ? '#22c55e' : 'linear-gradient(to right, #6d28d9, #a78bfa)',
        borderRadius: 999,
        transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  )
}

// ─── Hero Card (current month) ────────────────────────────────────────────────

function HeroGoalCard({ goal, onEdit }: { goal: Goal; onEdit: (g: Goal) => void }) {
  const pace   = getPace(goal)
  const status = statusOf(goal)

  const paceColor  = goal.achieved ? '#22c55e' : pace.onTrack ? '#22c55e' : '#ef4444'
  const paceLabel  = goal.achieved
    ? 'Meta atingida'
    : pace.onTrack
    ? `No ritmo — projeção R$ ${fmtBRL(pace.projected)}`
    : `Abaixo do ritmo — projeção R$ ${fmtBRL(pace.projected)}`

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid #2d1f5e',
      borderRadius: 20,
      padding: '28px 32px',
      marginBottom: 28,
      boxShadow: '0 0 48px rgba(124,58,237,0.12)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow orb */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(to right, #6d28d9, #a78bfa, transparent)',
        borderRadius: '20px 20px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>

        {/* Ring */}
        <ProgressRing pct={goal.progressPct} achieved={goal.achieved} size={100} stroke={8} />

        {/* Details */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>
              {MONTHS[goal.month - 1]} {goal.year}
            </h2>
            <span style={{
              padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'rgba(124,58,237,0.18)', color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.3)',
            }}>
              Mês atual
            </span>
          </div>

          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            {pace.remaining > 0 ? `${pace.remaining} dias restantes` : 'Último dia do mês'} ·{' '}
            Média diária: <span style={{ color: 'var(--text-secondary)' }}>R$ {fmtBRL(pace.dailyAvg)}</span>
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Meta',      value: `R$ ${fmtBRL(goal.targetProfit)}`,                           color: 'var(--text-secondary)' },
              { label: 'Realizado', value: `${goal.actualProfit >= 0 ? '+' : ''}R$ ${fmtBRL(goal.actualProfit)}`, color: goal.actualProfit >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Faltam',    value: goal.achieved ? 'Concluído' : `R$ ${fmtBRL(Math.max(0, goal.targetProfit - goal.actualProfit))}`, color: goal.achieved ? '#22c55e' : '#a78bfa' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 16, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>

          <ProgressBar pct={goal.progressPct} achieved={goal.achieved} />

          {/* Pace indicator */}
          <div style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: paceColor, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ color: paceColor, fontWeight: 600 }}>{paceLabel}</span>
            </p>
          </div>
        </div>

        {/* Edit */}
        <button
          onClick={() => onEdit(goal)}
          style={{
            padding: '8px 18px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b21b6'; e.currentTarget.style.color = '#a78bfa' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Editar
        </button>
      </div>
    </div>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: (g: Goal) => void }) {
  const deleteGoal = useDeleteGoal()
  const [confirming, setConfirming] = useState(false)
  const status = statusOf(goal)

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    await deleteGoal.mutateAsync(goal.id)
    setConfirming(false)
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#3d1f8e'
        e.currentTarget.style.boxShadow   = '0 0 24px rgba(124,58,237,0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 16, bottom: 16,
        width: 3, borderRadius: '0 3px 3px 0',
        background: status.color,
        opacity: 0.7,
      }} />

      <div style={{ paddingLeft: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              {MONTHS_SHORT[goal.month - 1]} {goal.year}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: status.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
            </div>
          </div>
          <ProgressRing pct={goal.progressPct} achieved={goal.achieved} size={60} stroke={5} />
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'Meta',      value: `R$ ${fmtBRL(goal.targetProfit)}` },
            { label: 'Realizado', value: `${goal.actualProfit >= 0 ? '+' : ''}R$ ${fmtBRL(goal.actualProfit)}`, valueColor: goal.actualProfit >= 0 ? '#22c55e' : '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: (s as any).valueColor ?? 'var(--text-secondary)' }}>{s.value}</span>
            </div>
          ))}
        </div>

        <ProgressBar pct={goal.progressPct} achieved={goal.achieved} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={() => onEdit(goal)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b21b6'; e.currentTarget.style.color = '#a78bfa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteGoal.isLoading}
            onBlur={() => setConfirming(false)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8,
              border: `1px solid ${confirming ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
              background: confirming ? 'rgba(239,68,68,0.08)' : 'transparent',
              color: confirming ? '#ef4444' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {confirming ? 'Confirmar?' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function SummaryStats({ goals }: { goals: Goal[] }) {
  const total    = goals.length
  const achieved = goals.filter(g => g.achieved).length
  const rate     = total > 0 ? Math.round((achieved / total) * 100) : null
  const streak   = computeStreak(goals)
  const current  = goals.find(g => g.isCurrentMonth)

  const stats = [
    { label: 'Metas criadas',    value: String(total),           color: '#8b5cf6' },
    { label: 'Alcançadas',       value: String(achieved),        color: '#22c55e' },
    { label: 'Taxa de sucesso',  value: rate !== null ? `${rate}%` : '—', color: '#a78bfa' },
    { label: 'Sequência atual',  value: streak > 0 ? `${streak} ${streak === 1 ? 'mês' : 'meses'}` : '—', color: streak >= 3 ? '#22c55e' : streak >= 1 ? '#eab308' : 'var(--text-muted)' },
  ]

  if (current && !current.achieved) {
    // Replace last stat with current month progress
    const pace = getPace(current)
    stats[3] = {
      label: 'Ritmo atual',
      value: pace.onTrack ? 'No ritmo' : 'Abaixo',
      color: pace.onTrack ? '#22c55e' : '#ef4444',
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
        }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {s.label}
          </p>
          <p style={{ margin: '5px 0 0', fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Goal Form ────────────────────────────────────────────────────────────────

interface GoalFormProps {
  initial?: Goal | null
  onClose: () => void
}

function GoalForm({ initial, onClose }: GoalFormProps) {
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()

  const [month,  setMonth]  = useState<number>(initial?.month  ?? now.getMonth() + 1)
  const [year,   setYear]   = useState<number>(initial?.year   ?? now.getFullYear())
  const [target, setTarget] = useState<string>(initial?.targetProfit ? String(initial.targetProfit) : '')
  const [notes,  setNotes]  = useState('')
  const [error,  setError]  = useState('')

  const yearOpts = Array.from({ length: 5 }, (_, i) => now.getFullYear() + i - 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = parseFloat(target)
    if (!t || t <= 0) { setError('Meta deve ser maior que zero'); return }
    setError('')
    try {
      if (initial) {
        await updateGoal.mutateAsync({ id: initial.id, data: { month, year, targetProfit: t } })
      } else {
        await createGoal.mutateAsync({ month, year, targetProfit: t, notes: notes || null })
      }
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar meta')
    }
  }

  const isLoading = createGoal.isLoading || updateGoal.isLoading

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid #2d1f5e',
        borderRadius: 20, padding: '28px', width: '100%', maxWidth: 420,
        boxShadow: '0 0 60px rgba(124,58,237,0.18)',
        animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
              {initial ? 'Editar meta' : 'Nova meta'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Defina seu objetivo de lucro mensal
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 18,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Mês</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} onFocus={focus} onBlur={blur} style={inp}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Ano</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} onFocus={focus} onBlur={blur} style={inp}>
                {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Meta de lucro (R$)</label>
            <input
              type="number" min="0.01" step="0.01" value={target}
              onChange={e => setTarget(e.target.value)}
              onFocus={focus} onBlur={blur}
              placeholder="0,00"
              style={{ ...inp, borderColor: error ? '#ef4444' : 'var(--border)' }}
            />
            {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
          </div>

          {!initial && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Observações <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
              <textarea
                value={notes} rows={2} placeholder="Estratégia, observações…"
                onChange={e => setNotes(e.target.value)}
                onFocus={focus as any} onBlur={blur as any}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={isLoading}
              style={{
                flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 0 20px rgba(124,58,237,0.25)',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyGoals({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 320, gap: 16, textAlign: 'center',
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="23" stroke="#2d1f5e" strokeWidth="2" />
        <circle cx="24" cy="24" r="15" stroke="#3d1f8e" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="6"  fill="#6d28d9" opacity="0.6" />
        <line x1="24" y1="1" x2="24" y2="10" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="38" x2="24" y2="47" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="1" y1="24" x2="10" y2="24" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="24" x2="47" y2="24" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Nenhuma meta definida</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Crie sua primeira meta mensal de lucro</p>
      </div>
      <button
        onClick={onAdd}
        style={{
          padding: '12px 28px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 0 20px rgba(124,58,237,0.25)',
        }}
      >
        Criar primeira meta
      </button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      height: 200, borderRadius: 16, background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      animation: 'pulse 1.5s ease infinite',
    }} />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Goals() {
  const isMobile = useMobile()
  const { data: goals = [], isLoading } = useGoals()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Goal | null>(null)

  const openAdd   = () => { setEditing(null);  setShowForm(true) }
  const openEdit  = (g: Goal) => { setEditing(g); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null)  }

  const currentGoal = goals.find(g => g.isCurrentMonth) ?? null
  const otherGoals  = [...goals]
    .filter(g => !g.isCurrentMonth)
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: isMobile ? '56px 16px 32px' : '36px 40px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16,
        marginBottom: 32, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--purple-400), var(--purple-300))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Metas
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Objetivos mensais de lucro e disciplina
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 0 20px rgba(124,58,237,0.25)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(124,58,237,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.25)' }}
        >
          Nova meta
        </button>
      </div>

      {isLoading ? (
        <>
          <div style={{ height: 180, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 28, animation: 'pulse 1.5s ease infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : goals.length === 0 ? (
        <EmptyGoals onAdd={openAdd} />
      ) : (
        <>
          {/* Summary stats always shown */}
          <SummaryStats goals={goals} />

          {/* Current month hero */}
          {currentGoal && <HeroGoalCard goal={currentGoal} onEdit={openEdit} />}

          {/* Past/future goals grid */}
          {otherGoals.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Histórico
                </p>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 14,
              }}>
                {otherGoals.map(g => (
                  <GoalCard key={g.id} goal={g} onEdit={openEdit} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showForm && <GoalForm initial={editing} onClose={closeForm} />}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
