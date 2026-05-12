import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals'
import { Goal } from '../services/goalsService'

// ─── Utils ────────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const now = new Date()

// ─── Design tokens ────────────────────────────────────────────────────────────

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

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, achieved }: { pct: number; achieved: boolean }) {
  const r   = 34
  const circ = 2 * Math.PI * r
  const pctCapped = Math.min(Math.max(pct, 0), 100)
  const dash = (pctCapped / 100) * circ

  const color = achieved ? '#22c55e' : pct >= 80 ? '#a78bfa' : pct >= 50 ? '#eab308' : '#ef4444'

  return (
    <svg width={84} height={84} viewBox="0 0 84 84">
      <circle cx={42} cy={42} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
      <circle
        cx={42} cy={42} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 42 42)"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x={42} y={46} textAnchor="middle" fill={color} fontSize={13} fontWeight={800} fontFamily="inherit">
        {pct > 999 ? '>999' : `${Math.round(pct)}%`}
      </text>
    </svg>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: (g: Goal) => void; onDelete: (id: number) => void }) {
  const deleteGoal = useDeleteGoal()
  const [confirming, setConfirming] = useState(false)

  const isFuture  = goal.year > now.getFullYear() || (goal.year === now.getFullYear() && goal.month > now.getMonth() + 1)
  const isPast    = !goal.isCurrentMonth && !isFuture

  const statusColor = goal.achieved ? '#22c55e' : isPast ? '#ef4444' : '#a78bfa'
  const statusLabel = goal.achieved ? '🏆 Alcançada' : isFuture ? '📅 Futura' : goal.isCurrentMonth ? '⏳ Em progresso' : '❌ Não alcançada'

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    await deleteGoal.mutateAsync(goal.id)
    onDelete(goal.id)
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${goal.isCurrentMonth ? '#3d1f8e' : 'var(--border)'}`,
      borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: goal.isCurrentMonth ? '0 0 30px rgba(124,58,237,0.1)' : 'none',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b21b6'; e.currentTarget.style.boxShadow = '0 0 24px rgba(124,58,237,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = goal.isCurrentMonth ? '#3d1f8e' : 'var(--border)'; e.currentTarget.style.boxShadow = goal.isCurrentMonth ? '0 0 30px rgba(124,58,237,0.1)' : 'none' }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: `linear-gradient(to right, ${statusColor}, transparent)`, borderRadius: '16px 16px 0 0' }} />

      {/* Current month badge */}
      {goal.isCurrentMonth && (
        <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 9px', borderRadius: 999, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', fontSize: 10, fontWeight: 800, color: '#a78bfa' }}>
          MÊS ATUAL
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Ring */}
        <ProgressRing pct={goal.progressPct} achieved={goal.achieved} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {MONTHS[goal.month - 1]}
          </p>
          <p style={{ margin: '2px 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>{goal.year}</p>

          <span style={{
            display: 'inline-block', padding: '2px 9px', borderRadius: 999,
            fontSize: 11, fontWeight: 700,
            background: `${statusColor}18`, color: statusColor,
            border: `1px solid ${statusColor}30`,
          }}>
            {statusLabel}
          </span>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Meta</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>R$ {fmtBRL(goal.targetProfit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Realizado</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: goal.actualProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                {goal.actualProfit >= 0 ? '+' : ''}R$ {fmtBRL(goal.actualProfit)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Faltam</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: goal.achieved ? '#22c55e' : '#a78bfa' }}>
                {goal.achieved ? '✓ Concluído' : `R$ ${fmtBRL(Math.max(0, goal.targetProfit - goal.actualProfit))}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(Math.max(goal.progressPct, 0), 100)}%`,
          background: goal.achieved ? '#22c55e' : 'linear-gradient(to right, #6d28d9, #a78bfa)',
          borderRadius: 999,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onEdit(goal)} style={{
          flex: 1, padding: '7px 0', borderRadius: 8,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          ✏️ Editar
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteGoal.isLoading}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8,
            border: `1px solid ${confirming ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
            background: confirming ? 'rgba(239,68,68,0.1)' : 'transparent',
            color: confirming ? '#ef4444' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}
          onBlur={() => setConfirming(false)}
        >
          {confirming ? '⚠️ Confirmar' : '🗑️ Excluir'}
        </button>
      </div>
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid #2d1f5e',
        borderRadius: 20, padding: '28px', width: '100%', maxWidth: 420,
        boxShadow: '0 0 60px rgba(124,58,237,0.2)',
        animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
              {initial ? 'Editar Meta' : 'Nova Meta'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Defina seu objetivo de lucro mensal
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Mês</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} onFocus={focus} onBlur={blur} style={inp}>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
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
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Meta de Lucro (R$)</label>
            <input
              type="number" min="0.01" step="0.01" value={target}
              onChange={e => setTarget(e.target.value)}
              onFocus={focus} onBlur={blur}
              placeholder="Ex: 500.00"
              style={{ ...inp, borderColor: error ? '#ef4444' : 'var(--border)' }}
            />
            {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
          </div>

          {!initial && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
              <textarea value={notes} rows={2} placeholder="Estratégia, observações…"
                onChange={e => setNotes(e.target.value)}
                onFocus={focus as any} onBlur={blur as any}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={isLoading} style={{
              flex: 2, padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 20px rgba(124,58,237,0.3)',
              opacity: isLoading ? 0.7 : 1,
            }}>
              {isLoading ? 'Salvando…' : initial ? '✓ Salvar alterações' : '+ Criar meta'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ goals }: { goals: Goal[] }) {
  const total    = goals.length
  const achieved = goals.filter(g => g.achieved).length
  const current  = goals.find(g => g.isCurrentMonth)

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
      {[
        { label: 'Metas criadas',  value: String(total),     color: '#8b5cf6' },
        { label: 'Alcançadas',     value: String(achieved),  color: '#22c55e' },
        { label: 'Taxa de sucesso', value: total > 0 ? `${Math.round((achieved / total) * 100)}%` : '—', color: '#a78bfa' },
        {
          label: 'Progresso atual',
          value: current ? `${Math.round(current.progressPct)}%` : '—',
          color: current?.achieved ? '#22c55e' : '#eab308',
        },
      ].map(s => (
        <div key={s.label} style={{
          flex: '1 1 120px', padding: '14px 18px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
        }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyGoals({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 56, filter: 'grayscale(0.5)', opacity: 0.7 }}>🎯</div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Nenhuma meta definida</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Crie sua primeira meta mensal de lucro</p>
      </div>
      <button onClick={onAdd} style={{
        padding: '12px 28px', borderRadius: 12, border: 'none',
        background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
        color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 0 20px rgba(124,58,237,0.3)',
      }}>
        + Criar primeira meta
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Goals() {
  const isMobile = useMobile()
  const { data: goals = [], isLoading } = useGoals()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Goal | null>(null)

  const openAdd  = () => { setEditing(null); setShowForm(true) }
  const openEdit = (g: Goal) => { setEditing(g); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  // Sort: current month first, then most recent
  const sorted = [...goals].sort((a, b) => {
    if (a.isCurrentMonth) return -1
    if (b.isCurrentMonth) return 1
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: isMobile ? '56px 16px 32px' : '32px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--purple-400), var(--purple-300))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Metas
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Acompanhe seus objetivos mensais de lucro
          </p>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 0 20px rgba(124,58,237,0.3)',
          transition: 'transform 0.15s',
          flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          🎯 Nova Meta
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 240, borderRadius: 16, background: 'var(--bg-card)', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyGoals onAdd={openAdd} />
      ) : (
        <>
          <SummaryBar goals={goals} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {sorted.map(g => (
              <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={() => {}} />
            ))}
          </div>
        </>
      )}

      {showForm && <GoalForm initial={editing} onClose={closeForm} />}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
