import { useState } from 'react'
import { toast } from 'sonner'
import { useGoals, useYearAnalytics, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals'
import { useTipsterDetail } from '../hooks/useDashboard'
import { Goal, MonthAnalytics, ProfileStat } from '../types/dashboard.types'
import { useUnit } from '../contexts/UnitContext'
import { useMobile } from '../hooks/useMobile'
import { Icon } from '../components/Icon'

// ─── constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}
function clr(v: number | null | undefined) {
  if (v == null) return 'var(--text-muted)'
  return v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-muted)'
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── design primitives ────────────────────────────────────────────────────────


/** Horizontal label : value row — used in the narrow left column */
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <span className="stat-value" style={{ fontSize: 13, fontWeight: 700, color: color ?? 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

/** Compact stat chip — label above, value below */
function Kpi({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <p style={{
        fontSize: 10, color: 'var(--text-label)', marginBottom: 5,
        textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</p>
      <p className="stat-value" style={{ fontSize: 17, fontWeight: 700, color: color ?? 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

/** Progress ring — simplified stroke */
function ProgressRing({ pct, size = 64, stroke = 5, color = 'var(--purple-400)' }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r   = (size - stroke) / 2
  const c   = 2 * Math.PI * r
  const off = c - (Math.min(Math.max(pct, 0), 100) / 100) * c
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 0.5s ease', strokeLinecap: 'round' }} />
    </svg>
  )
}

// ─── Goal form modal ───────────────────────────────────────────────────────────

function GoalModal({ editing, onClose }: {
  editing: { month: number; year: number; id?: number; target?: number }
  onClose: () => void
}) {
  const create  = useCreateGoal()
  const update  = useUpdateGoal()
  const isEdit  = !!editing.id

  const nowY = new Date().getFullYear()
  const yearOpts = Array.from({ length: 5 }, (_, i) => nowY - 1 + i)

  const [month,  setMonth]  = useState(editing.month)
  const [year,   setYear]   = useState(editing.year)
  const [target, setTarget] = useState(String(editing.target ?? ''))
  const [error,  setError]  = useState('')

  const inpStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    display: 'block', marginBottom: 6,
  }

  const save = () => {
    const t = parseFloat(target)
    if (isNaN(t) || t <= 0) { setError('Informe um valor maior que zero'); return }
    setError('')
    if (isEdit) {
      update.mutate({ id: editing.id!, data: { targetProfit: t } }, {
        onSuccess: () => { toast.success('Meta atualizada!'); onClose() },
        onError: () => { toast.error('Erro ao atualizar meta.') },
      })
    } else {
      create.mutate({ month, year, targetProfit: t }, {
        onSuccess: () => { toast.success('Meta criada!'); onClose() },
        onError: () => { toast.error('Erro ao criar meta.') },
      })
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid #2d1f5e',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 380,
        boxShadow: '0 0 48px rgba(124,58,237,0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {isEdit ? 'Editar meta' : 'Nova meta'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {isEdit ? `${MONTH_FULL[editing.month - 1]} ${editing.year}` : 'Defina o período e o objetivo'}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Month + Year — only when creating */}
          {!isEdit && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Mês</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} style={inpStyle}>
                  {MONTH_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ano</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} style={inpStyle}>
                  {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Target */}
          <div>
            <label style={labelStyle}>Meta de lucro (R$)</label>
            <input
              type="number" value={target} min="0.01" step="0.01"
              onChange={e => { setTarget(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="0,00"
              style={{ ...inpStyle, borderColor: error ? 'var(--red)' : 'var(--border)' }}
              autoFocus
            />
            {error && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}>Cancelar</button>
            <button
              onClick={save}
              disabled={create.isLoading || update.isLoading}
              style={{ ...btnPrimary, flex: 2, textAlign: 'center', opacity: (create.isLoading || update.isLoading) ? 0.7 : 1 }}
            >
              {(create.isLoading || update.isLoading) ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar meta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar month cell ───────────────────────────────────────────────────────

function MonthCell({ m, year, selectedMonth, onSelect, onNewGoal }: {
  m: MonthAnalytics
  year: number
  selectedMonth: number | null
  onSelect: (month: number) => void
  onNewGoal: (month: number) => void
}) {
  const { fmtMoney: fmtV } = useUnit()
  const now    = new Date()
  const nowY   = now.getFullYear()
  const nowM   = now.getMonth() + 1
  const isCurr = m.month === nowM && year === nowY
  const isFut  = year > nowY || (year === nowY && m.month > nowM)
  const isSel  = selectedMonth === m.month
  const hasGoal = m.goalId !== null
  const hasBets = m.totalBets > 0

  const borderColor = isSel
    ? 'var(--purple-500)'
    : isCurr ? 'var(--purple-700)'
    : m.achieved === true ? 'var(--green)'
    : m.achieved === false && hasBets ? 'var(--red)'
    : 'var(--border)'

  return (
    <div
      onClick={() => (hasBets || hasGoal) ? onSelect(m.month) : undefined}
      style={{
        background: isSel ? 'rgba(109,40,217,0.15)' : 'var(--bg-card)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12, padding: '12px 14px',
        cursor: (hasBets || hasGoal) ? 'pointer' : 'default',
        transition: 'all 0.15s',
        opacity: isFut && !hasGoal ? 0.45 : 1,
        position: 'relative', minHeight: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isCurr ? 'var(--purple-400)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {MONTH_NAMES[m.month - 1]}
        </span>
        {!hasGoal && (
          <button
            onClick={e => { e.stopPropagation(); onNewGoal(m.month) }}
            title="Adicionar meta"
            style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >+</button>
        )}
      </div>

      {/* Profit + ROI on same row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: hasGoal ? 8 : 0 }}>
        {hasBets ? (
          <p style={{ fontSize: 15, fontWeight: 700, color: clr(m.totalProfit), margin: 0 }}>
            {fmtV(m.totalProfit)}
          </p>
        ) : (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Sem apostas</p>
        )}
        {m.roi !== null && hasBets && (
          <span style={{ fontSize: 10, color: clr(m.roi), fontWeight: 600 }}>
            {m.roi > 0 ? '+' : ''}{m.roi}%
          </span>
        )}
      </div>

      {hasGoal && m.targetProfit !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
            <span>{fmtV(m.targetProfit)}</span>
            <span>{m.progressPct != null ? `${Math.min(m.progressPct, 100).toFixed(0)}%` : '—'}</span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.min(Math.max(m.progressPct ?? 0, 0), 100)}%`,
              background: m.achieved ? 'var(--green)' : 'var(--purple-500)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Goal detail (month selected) ─────────────────────────────────────────────

function GoalDetail({ month, year, goals, monthData, onEdit, onDelete }: {
  month: number; year: number
  goals: Goal[]
  monthData: MonthAnalytics | undefined
  onEdit: (g: Goal) => void
  onDelete: (id: number) => void
}) {
  const { fmtMoney: fmtV } = useUnit()
  const goal = goals.find(g => g.month === month && g.year === year)
  if (!goal && !monthData?.totalBets) return null
  const pct  = goal?.progressPct ?? 0
  const ring = Math.min(Math.max(pct, 0), 100)

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--purple-700)', borderRadius: 16, padding: 24, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{MONTH_FULL[month - 1]} {year}</h3>
        {goal && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(goal)} style={{ ...btnGhost, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="pencil" size={13} color="var(--text-secondary)" /> Editar meta</button>
            <button onClick={() => onDelete(goal.id)} style={{ ...btnGhost, borderColor: 'var(--red)', color: 'var(--red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, padding: 0 }}><Icon name="trash" size={14} color="var(--red)" /></button>
          </div>
        )}
      </div>

      {goal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <ProgressRing pct={ring} size={72} color={goal.achieved ? 'var(--green)' : '#7c3aed'} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: goal.achieved ? 'var(--green)' : 'var(--purple-400)' }}>
              {Math.round(ring)}%
            </span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Meta de lucro</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtV(goal.targetProfit)}</p>
            {goal.achieved
              ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Atingida</span>
              : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Faltam {fmtV(goal.targetProfit - goal.actualProfit)}</span>
            }
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Kpi label="Lucro real" value={fmtV(goal?.actualProfit ?? monthData?.totalProfit)} color={clr(goal?.actualProfit ?? monthData?.totalProfit)} />
        <Kpi label="Apostado" value={fmtV(goal?.totalWagered ?? monthData?.totalWagered)} />
        <Kpi label="Apostas" value={String(goal?.totalBets ?? monthData?.totalBets ?? 0)} />
        <Kpi label="Taxa" value={goal?.hitRatePct != null ? `${goal.hitRatePct}%` : monthData?.hitRatePct != null ? `${monthData.hitRatePct}%` : '—'} />
        <Kpi label="ROI" value={fmtPct(goal?.roi ?? monthData?.roi)} color={clr(goal?.roi ?? monthData?.roi)} />
      </div>

      {goal?.profileBreakdown && goal.profileBreakdown.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Por perfil</p>
          <ProfileTableSimple profiles={goal.profileBreakdown} onSelect={() => {}} />
        </>
      )}
    </div>
  )
}

// ─── Profile detail panel ──────────────────────────────────────────────────────

function ProfileDetailPanel({ profileId, profileName, onClose }: {
  profileId: number | null
  profileName: string
  onClose: () => void
}) {
  const { data, isLoading } = useTipsterDetail(profileId, true)
  const { fmtMoney: fmtV } = useUnit()
  const isMobile = useMobile()

  // derive initials for avatar
  const initials = profileName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: isMobile ? '16px 12px 32px' : '48px 16px 48px',
      }}
    >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%', maxWidth: 960,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Header bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'var(--purple-900)',
            border: '1px solid var(--border-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'var(--purple-300)',
            letterSpacing: '0.03em', flexShrink: 0,
          }}>{initials}</div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Tipster / VIP</p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{profileName}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.1s',
          }}
        >✕</button>
      </div>

      {/* ── Body: two-column horizontal layout ── */}
      <div style={{ padding: '0' }}>

        {isLoading && (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando análise…</p>
          </div>
        )}

        {data && !isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr' }}>

            {/* ── LEFT COLUMN — KPIs + sweet spot + streaks ── */}
            <div style={{
              padding: isMobile ? '16px 16px' : '24px 20px',
              borderRight: isMobile ? 'none' : '1px solid var(--border)',
              borderBottom: isMobile ? '1px solid var(--border)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}>

              {/* KPI stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <StatRow label="Apostas"  value={String(data.totalBets)} />
                <StatRow label="Vitórias" value={String(data.won)}  color="var(--green)" />
                <StatRow label="Derrotas" value={String(data.lost)} color="var(--red)" />
                {data.avgOddsWon  && <StatRow label="Odd média (ganhas)"  value={String(data.avgOddsWon)}  color="var(--green)" />}
                {data.avgOddsLost && <StatRow label="Odd média (perdidas)" value={String(data.avgOddsLost)} color="var(--red)" />}
              </div>

              {/* Sweet spot */}
              {data.sweetSpot && (
                <div style={{
                  marginTop: 20,
                  padding: '12px 14px',
                  background: 'var(--bg-card)',
                  borderLeft: '2px solid var(--purple-400)',
                  borderRadius: '0 6px 6px 0',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--purple-300)', marginBottom: 6 }}>Sweet spot</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{data.sweetSpot.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    ROI <strong style={{ color: 'var(--green)' }}>{fmtPct(data.sweetSpot.roi)}</strong>
                    {data.sweetSpot.hitRatePct != null && <span style={{ color: 'var(--text-muted)' }}> · {data.sweetSpot.hitRatePct}% acerto</span>}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{data.sweetSpot.total} apostas</p>
                </div>
              )}

              {/* Streaks */}
              {data.streaks && (data.streaks.bestWin > 0 || data.streaks.bestLoss > 0) && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Sequências</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.streaks.current > 0 && data.streaks.currentType && (
                      <div style={{
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        borderLeft: `2px solid ${data.streaks.currentType === 'won' ? 'var(--green)' : 'var(--red)'}`,
                        borderRadius: '0 6px 6px 0',
                      }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Atual</p>
                        <p className="stat-value" style={{ fontSize: 14, fontWeight: 700, color: data.streaks.currentType === 'won' ? 'var(--green)' : 'var(--red)' }}>
                          {data.streaks.current} {data.streaks.currentType === 'won' ? 'vitórias' : 'derrotas'}
                        </p>
                      </div>
                    )}
                    {data.streaks.bestWin > 0 && <StatRow label="Melhor sequência W" value={`${data.streaks.bestWin} seguidas`} color="var(--green)" />}
                    {data.streaks.bestLoss > 0 && <StatRow label="Pior sequência L"   value={`${data.streaks.bestLoss} seguidas`} color="var(--red)" />}
                  </div>
                </div>
              )}

              {/* Bingos */}
              {data.bingos && data.bingos.total > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Alto risco (odd ≥ 3.0)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <StatRow label="Total"      value={String(data.bingos.total)} />
                    <StatRow label="Ganhas"     value={String(data.bingos.won)}    color="var(--green)" />
                    <StatRow label="Taxa"       value={data.bingos.hitRatePct != null ? `${data.bingos.hitRatePct}%` : '—'} />
                    {data.bingos.biggestOdds && <StatRow label="Maior odd" value={`@${data.bingos.biggestOdds}`} color="var(--purple-300)" />}
                    {data.bingos.super.total > 0 && (
                      <StatRow label="Odd 5+ (super)" value={`${data.bingos.super.won}/${data.bingos.super.total}`} />
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* ── RIGHT COLUMN — odds dist + simples/combinadas + top bets ── */}
            <div style={{ padding: isMobile ? '16px 16px' : '24px 24px', overflowY: isMobile ? 'visible' : 'auto', maxHeight: isMobile ? 'none' : 'calc(90vh - 64px)' }}>

              {/* Odds distribution */}
              {data.oddsRanges.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Distribuição por faixa de odds</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.oddsRanges.map((r: any) => {
                      const hitPct = r.hitRatePct ?? 0
                      const barColor = hitPct >= 60 ? 'var(--green)' : hitPct >= 40 ? 'var(--yellow)' : 'var(--red)'
                      return (
                        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 110px 46px', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.label}</span>
                          <div style={{ height: 6, background: 'var(--bg-card)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${hitPct}%`,
                              background: barColor, borderRadius: 3,
                              transition: 'width 0.45s cubic-bezier(0.16,1,0.3,1)',
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {r.won}W · {r.lost}L · {r.total}
                          </span>
                          <span className="stat-value" style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: barColor }}>
                            {r.hitRatePct != null ? `${r.hitRatePct}%` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>Barra = taxa de acerto</p>
                </>
              )}

              {/* Simples vs Combinadas */}
              {data.simpleVsCombined && (data.simpleVsCombined.simple.total > 0 || data.simpleVsCombined.combined.total > 0) && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Simples vs Combinadas</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {(['simple', 'combined'] as const).map((key) => {
                      const s      = data.simpleVsCombined[key]
                      const label  = key === 'simple' ? 'Simples' : 'Combinadas'
                      const isBetter = key === 'simple'
                        ? (s.roi ?? -Infinity) >= (data.simpleVsCombined.combined.roi ?? -Infinity)
                        : (s.roi ?? -Infinity) > (data.simpleVsCombined.simple.roi ?? -Infinity)
                      const bothHaveData = data.simpleVsCombined.simple.total > 0 && data.simpleVsCombined.combined.total > 0
                      return (
                        <div key={key} style={{ background: 'var(--bg-card)', padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
                            {bothHaveData && isBetter && (
                              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--purple-300)', background: 'var(--purple-900)', padding: '2px 6px', borderRadius: 4 }}>melhor</span>
                            )}
                          </div>
                          {s.total === 0 ? (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem dados</p>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 8, columnGap: 8 }}>
                              {[
                                { l: 'Apostas', v: String(s.total),                                    c: undefined },
                                { l: 'Taxa',    v: s.hitRatePct != null ? `${s.hitRatePct}%` : '—',   c: undefined },
                                { l: 'Lucro',   v: fmtV(s.totalProfit),                                c: clr(s.totalProfit) },
                                { l: 'ROI',     v: fmtPct(s.roi),                                     c: clr(s.roi) },
                              ].map(({ l, v, c }) => (
                                <div key={l}>
                                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</p>
                                  <p className="stat-value" style={{ fontSize: 13, fontWeight: 700, color: c ?? 'var(--text-primary)' }}>{v}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Top wins & worst losses */}
              {(data.topWins.length > 0 || data.worstLosses.length > 0) && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
                    {data.topWins.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Melhores ganhos</p>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {data.topWins.map((w: any, i: number) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                              padding: '7px 0',
                              borderBottom: i < data.topWins.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            }}>
                              <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {w.match}
                                </p>
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                  @{w.odds} · {fmtDate(w.date)}
                                </p>
                              </div>
                              <span className="stat-value" style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>+{fmtV(w.profit)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.worstLosses.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Maiores perdas</p>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {data.worstLosses.map((l: any, i: number) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                              padding: '7px 0',
                              borderBottom: i < data.worstLosses.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            }}>
                              <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {l.match}
                                </p>
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                  @{l.odds} · {fmtDate(l.date)}
                                </p>
                              </div>
                              <span className="stat-value" style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>-{fmtV(l.loss)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

// ─── Year profile table (clickable rows) ──────────────────────────────────────

function ProfileTableSimple({ profiles, onSelect, selectedProfileId }: {
  profiles: ProfileStat[]
  onSelect: (p: ProfileStat) => void
  selectedProfileId?: number | null
}) {
  const { fmtMoney: fmtV } = useUnit()
  if (!profiles.length) return null
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Perfil','Apostas','Taxa','Apostado','Lucro','ROI',''].map(h => (
              <th key={h} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, textAlign: h === 'Perfil' ? 'left' : 'right', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const isSelected = p.profileId === selectedProfileId
            return (
              <tr
                key={p.profile}
                onClick={() => onSelect(p)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(109,40,217,0.12)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '9px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? 'var(--purple-400)' : 'var(--text-muted)',
                    }} />
                    {p.profile}
                  </span>
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{p.totalBets}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{p.hitRatePct != null ? `${p.hitRatePct}%` : '—'}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtV(p.totalWagered)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: clr(p.totalProfit), fontWeight: 600 }}>{fmtV(p.totalProfit)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: clr((p as any).roi) }}>{(p as any).roi != null ? `${(p as any).roi > 0 ? '+' : ''}${(p as any).roi}%` : '—'}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--purple-400)', fontSize: 12 }}>
                  {isSelected ? '▲' : '▼ Detalhe'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── button styles ─────────────────────────────────────────────────────────────

const btnGhost: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
}
const btnPrimary: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
}
const navBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-card)',
  color: 'var(--text-primary)', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Goals() {
  const now  = new Date()
  const nowY = now.getFullYear()
  const nowM = now.getMonth() + 1
  const isMobile = useMobile()

  const [year,       setYear]       = useState(nowY)
  const [selMonth,   setSelMonth]   = useState<number | null>(nowM)
  const [modal,      setModal]      = useState<{ month: number; year: number; id?: number; target?: number } | null>(null)
  const [delId,      setDelId]      = useState<number | null>(null)
  const [selProfile, setSelProfile] = useState<ProfileStat | null>(null)

  const { fmtMoney: fmtV } = useUnit()

  const changeYear = (delta: number) => {
    const ny = year + delta
    setYear(ny)
    setSelMonth(ny === nowY ? nowM : null)
    setSelProfile(null)
  }

  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: yearData,   isLoading: yearLoading }  = useYearAnalytics(year)
  const deleteGoal = useDeleteGoal()

  const goalsForYear = goals.filter(g => g.year === year)
  const s = yearData?.summary


  const handleProfileSelect = (p: ProfileStat) => {
    setSelProfile(prev => prev?.profile === p.profile ? null : p)
    setSelMonth(null)
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 24px 60px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Estatísticas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Metas mensais, calendário anual e análise detalhada por perfil</p>
        </div>
        <button
          onClick={() => setModal({ month: selMonth ?? nowM, year })}
          style={{
            ...btnPrimary,
            padding: '9px 18px',
            boxShadow: '0 0 20px rgba(124,58,237,0.25)',
            transition: 'box-shadow 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(124,58,237,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.25)' }}
        >
          Nova meta
        </button>
      </div>

      {/* Year nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => changeYear(-1)} style={navBtn}>‹</button>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>{year}</span>
        <button onClick={() => changeYear(+1)} style={navBtn}>›</button>
      </div>

      {/* Year KPI strip */}
      {s && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <Kpi label="Lucro no ano"    value={fmtV(s.totalProfit)}   color={clr(s.totalProfit)} />
          <Kpi label="Apostado"        value={fmtV(s.totalWagered)} />
          <Kpi label="Apostas"         value={String(s.totalBets)} />
          <Kpi label="ROI"             value={fmtPct(s.roi)}          color={clr(s.roi)} />
          <Kpi label="Taxa geral"      value={s.hitRatePct != null ? `${s.hitRatePct}%` : '—'} />
          {s.bestMonth  != null && <Kpi label="Melhor mês" value={`${MONTH_NAMES[s.bestMonth  - 1]} (${fmtV(s.bestProfit)})`}  color="var(--green)" />}
          {s.worstMonth != null && <Kpi label="Pior mês"   value={`${MONTH_NAMES[s.worstMonth - 1]} (${fmtV(s.worstProfit)})`} color="var(--red)" />}
        </div>
      )}

      {/* 12-month grid */}
      {(yearLoading || goalsLoading) ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {(yearData?.months ?? Array.from({ length: 12 }, (_, i) => ({
            month: i + 1, totalBets: 0, won: 0, lost: 0,
            totalWagered: 0, totalProfit: 0, hitRatePct: null, roi: null,
            targetProfit: null, goalId: null, achieved: null, progressPct: null,
          } as MonthAnalytics))).map((m: MonthAnalytics) => (
            <MonthCell
              key={m.month} m={m} year={year}
              selectedMonth={selMonth}
              onSelect={(mo) => { setSelMonth(mo); setSelProfile(null) }}
              onNewGoal={(mo) => setModal({ month: mo, year })}
            />
          ))}
        </div>
      )}

      {/* Selected month detail */}
      {selMonth && !selProfile && (
        <GoalDetail
          month={selMonth} year={year}
          goals={goalsForYear}
          monthData={yearData?.months.find(m => m.month === selMonth)}
          onEdit={g => setModal({ month: g.month, year: g.year, id: g.id, target: g.targetProfit })}
          onDelete={id => setDelId(id)}
        />
      )}

      {/* Year profile table */}
      {yearData?.profileBreakdown && yearData.profileBreakdown.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Desempenho por Tipster / VIP — {year}
            </h3>
            {!isMobile && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clique para ver análise →</p>}
          </div>
          <ProfileTableSimple
            profiles={yearData.profileBreakdown}
            onSelect={handleProfileSelect}
            selectedProfileId={selProfile?.profileId}
          />
        </div>
      )}

      {/* Profile detail panel */}
      {selProfile && (
        <ProfileDetailPanel
          profileId={selProfile.profileId}
          profileName={selProfile.profile}
          onClose={() => setSelProfile(null)}
        />
      )}

      {/* Goal form modal */}
      {modal && <GoalModal editing={modal} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {delId !== null && (
        <div onClick={() => setDelId(null)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 32, minWidth: 300, textAlign: 'center',
          }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Excluir meta?</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Essa ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDelId(null)} style={{ padding: '9px 20px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button
                onClick={async () => { await deleteGoal.mutateAsync(delId); setDelId(null); toast.success('Meta excluida!') }}
                style={{ padding: '9px 20px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
