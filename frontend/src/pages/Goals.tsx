import { useState } from 'react'
import { useGoals, useYearAnalytics, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals'
import { useProfileDetail } from '../hooks/useDashboard'
import { Goal, MonthAnalytics, ProfileStat } from '../types/dashboard.types'

// ─── constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const str = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${v < 0 ? '-' : ''}R$ ${str}`
}
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

// ─── sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 72, stroke = 6, color = '#7c3aed' }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r   = (size - stroke) / 2
  const c   = 2 * Math.PI * r
  const off = c - (Math.min(Math.max(pct, 0), 100) / 100) * c
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 0.6s ease', strokeLinecap: 'round' }} />
    </svg>
  )
}

function Kpi({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 18px', minWidth: 110,
    }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: color ?? 'var(--text-primary)' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

// ─── Goal form modal ───────────────────────────────────────────────────────────

function GoalModal({ editing, onClose }: {
  editing: { month: number; year: number; id?: number; target?: number }
  onClose: () => void
}) {
  const create = useCreateGoal()
  const update = useUpdateGoal()
  const [target, setTarget] = useState(String(editing.target ?? ''))

  const save = () => {
    const t = parseFloat(target)
    if (isNaN(t) || t <= 0) return
    if (editing.id) {
      update.mutate({ id: editing.id, data: { targetProfit: t } }, { onSuccess: onClose })
    } else {
      create.mutate({ month: editing.month, year: editing.year, targetProfit: t }, { onSuccess: onClose })
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 32, minWidth: 320,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
          {editing.id ? 'Editar meta' : 'Nova meta'} — {MONTH_FULL[editing.month - 1]} {editing.year}
        </h3>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meta de lucro (R$)</label>
        <input
          type="number" value={target} onChange={e => setTarget(e.target.value)}
          placeholder="ex: 500"
          onKeyDown={e => e.key === 'Enter' && save()}
          style={{
            width: '100%', marginTop: 6, marginBottom: 20,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
            fontSize: 15, outline: 'none',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={save} disabled={create.isLoading || update.isLoading} style={btnPrimary}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar month cell ───────────────────────────────────────────────────────

function MonthCell({ m, selectedMonth, onSelect, onNewGoal }: {
  m: MonthAnalytics
  selectedMonth: number | null
  onSelect: (month: number) => void
  onNewGoal: (month: number) => void
}) {
  const now    = new Date()
  const isCurr = m.month === now.getMonth() + 1
  const isFut  = m.month > now.getMonth() + 1
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

      {hasBets ? (
        <p style={{ fontSize: 15, fontWeight: 700, color: clr(m.totalProfit), marginBottom: 2 }}>
          {fmt(m.totalProfit)}
        </p>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem apostas</p>
      )}

      {hasGoal && m.targetProfit !== null && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
            <span>{fmt(m.targetProfit)}</span>
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

      {m.roi !== null && hasBets && (
        <span style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, color: clr(m.roi), fontWeight: 600 }}>
          {m.roi > 0 ? '+' : ''}{m.roi}%
        </span>
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
            <button onClick={() => onEdit(goal)} style={btnGhost}>✏ Editar meta</button>
            <button onClick={() => onDelete(goal.id)} style={{ ...btnGhost, borderColor: 'var(--red)', color: 'var(--red)' }}>🗑</button>
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
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(goal.targetProfit)}</p>
            {goal.achieved
              ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Atingida</span>
              : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Faltam {fmt(goal.targetProfit - goal.actualProfit)}</span>
            }
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Kpi label="Lucro real" value={fmt(goal?.actualProfit ?? monthData?.totalProfit)} color={clr(goal?.actualProfit ?? monthData?.totalProfit)} />
        <Kpi label="Apostado" value={fmt(goal?.totalWagered ?? monthData?.totalWagered)} />
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
  const { data, isLoading } = useProfileDetail(profileId, true)

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--purple-700)', borderRadius: 16, padding: 24, marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Perfil</p>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{profileName}</h3>
        </div>
        <button onClick={onClose} style={{ ...btnGhost, padding: '6px 14px' }}>✕ Fechar</button>
      </div>

      {isLoading && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando análise…</p>}

      {data && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Top-line KPIs */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Kpi label="Apostas" value={String(data.totalBets)} />
            <Kpi label="Vitórias" value={String(data.won)} color="var(--green)" />
            <Kpi label="Derrotas" value={String(data.lost)} color="var(--red)" />
            {data.avgOddsWon && <Kpi label="Odd média (ganhas)" value={String(data.avgOddsWon)} color="var(--green)" />}
            {data.avgOddsLost && <Kpi label="Odd média (perdidas)" value={String(data.avgOddsLost)} color="var(--red)" />}
          </div>

          {/* Sweet spot recommendation */}
          {data.sweetSpot && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(109,40,217,0.15), rgba(124,58,237,0.08))',
              border: '1px solid var(--purple-700)',
              borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>💡</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Zona sweet spot</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Suas apostas em odds <strong style={{ color: 'var(--purple-400)' }}>{data.sweetSpot.label}</strong> têm o melhor retorno:{' '}
                  ROI <strong style={{ color: clr(data.sweetSpot.roi) }}>{fmtPct(data.sweetSpot.roi)}</strong>
                  {data.sweetSpot.hitRatePct != null && ` · Taxa ${data.sweetSpot.hitRatePct}%`}
                  {` · ${data.sweetSpot.total} apostas`}
                </p>
              </div>
            </div>
          )}

          {/* Odds distribution */}
          {data.oddsRanges.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Distribuição por faixa de odds</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.oddsRanges.map((r: any) => {
                  const maxTotal = Math.max(...data.oddsRanges.map((x: any) => x.total))
                  const barWidth = maxTotal > 0 ? (r.total / maxTotal) * 100 : 0
                  const winWidth = r.total > 0 ? (r.won / r.total) * barWidth : 0
                  return (
                    <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 70px', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                        {r.emoji} {r.label}
                      </span>
                      <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barWidth}%`, background: 'rgba(109,40,217,0.25)', borderRadius: 6 }} />
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${winWidth}%`, background: 'var(--green)', borderRadius: 6, opacity: 0.8 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        {r.won}W / {r.lost}L ({r.total})
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: r.roi != null ? clr(r.roi) : 'var(--text-muted)' }}>
                        {r.hitRatePct != null ? `${r.hitRatePct}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} /> Vitórias
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(109,40,217,0.4)', display: 'inline-block' }} /> Total
                </span>
              </div>
            </div>
          )}

          {/* Simple vs Combined */}
          {data.simpleVsCombined && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Simples vs Combinadas</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([['simple', 'Simples', '🎯'], ['combined', 'Combinadas', '🎲']] as const).map(([key, label, emoji]) => {
                  const s = data.simpleVsCombined[key]
                  if (!s.total) return (
                    <div key={key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, opacity: 0.4 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emoji} {label}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sem dados</p>
                    </div>
                  )
                  const isBetter = key === 'simple'
                    ? (data.simpleVsCombined.simple.roi ?? -Infinity) >= (data.simpleVsCombined.combined.roi ?? -Infinity)
                    : (data.simpleVsCombined.combined.roi ?? -Infinity) > (data.simpleVsCombined.simple.roi ?? -Infinity)
                  return (
                    <div key={key} style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${isBetter ? 'var(--purple-700)' : 'var(--border)'}`,
                      borderRadius: 12, padding: 16, position: 'relative',
                    }}>
                      {isBetter && (
                        <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, color: 'var(--purple-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✓ Melhor</span>
                      )}
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{emoji} {label}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Apostas</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{s.total}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Taxa</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{s.hitRatePct != null ? `${s.hitRatePct}%` : '—'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lucro</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: clr(s.totalProfit) }}>{fmt(s.totalProfit)}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>ROI</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: clr(s.roi) }}>{fmtPct(s.roi)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bingos */}
          {data.bingos && data.bingos.total > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Bingos (odd ≥ 3.0)</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Kpi label="🎯 Apostas" value={String(data.bingos.total)} />
                <Kpi label="✅ Ganhos" value={String(data.bingos.won)} color="var(--green)" />
                <Kpi label="Taxa de bingo" value={data.bingos.hitRatePct != null ? `${data.bingos.hitRatePct}%` : '—'} />
                {data.bingos.biggestOdds && <Kpi label="Maior odd ganha" value={`@${data.bingos.biggestOdds}`} color="var(--purple-400)" />}
                {data.bingos.super.total > 0 && (
                  <Kpi label="🔥 Super (5+)" value={`${data.bingos.super.won}/${data.bingos.super.total}`}
                    sub={data.bingos.super.hitRatePct != null ? `${data.bingos.super.hitRatePct}% taxa` : undefined}
                    color="var(--purple-400)"
                  />
                )}
              </div>
            </div>
          )}

          {/* Streaks */}
          {data.streaks && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Sequências</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {data.streaks.current > 0 && data.streaks.currentType && (
                  <div style={{
                    background: 'var(--bg-card)', border: `1px solid ${data.streaks.currentType === 'won' ? 'var(--green)' : 'var(--red)'}`,
                    borderRadius: 12, padding: '12px 18px',
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Sequência atual</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: data.streaks.currentType === 'won' ? 'var(--green)' : 'var(--red)' }}>
                      {data.streaks.current} {data.streaks.currentType === 'won' ? '🔥 vitórias' : '❄️ derrotas'}
                    </p>
                  </div>
                )}
                {data.streaks.bestWin > 0 && (
                  <Kpi label="Maior série de vitórias" value={`${data.streaks.bestWin} seguidas`} color="var(--green)" />
                )}
                {data.streaks.bestLoss > 0 && (
                  <Kpi label="Maior série de derrotas" value={`${data.streaks.bestLoss} seguidas`} color="var(--red)" />
                )}
              </div>
            </div>
          )}

          {/* Top wins / worst losses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top wins */}
            {data.topWins.length > 0 && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>🏆 Top 5 melhores</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.topWins.map((w: any, i: number) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {w.isCombined ? '🎲' : '🎯'} {w.match}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>@{w.odds} · {fmtDate(w.date)}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>+{fmt(w.profit)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worst losses */}
            {data.worstLosses.length > 0 && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>💸 Top 5 maiores perdas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.worstLosses.map((l: any, i: number) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.isCombined ? '🎲' : '🎯'} {l.match}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>@{l.odds} · {fmtDate(l.date)}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>-{fmt(l.loss)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Year profile table (clickable rows) ──────────────────────────────────────

function ProfileTableSimple({ profiles, onSelect, selectedProfileId }: {
  profiles: ProfileStat[]
  onSelect: (p: ProfileStat) => void
  selectedProfileId?: number | null
}) {
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
                <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(p.totalWagered)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: clr(p.totalProfit), fontWeight: 600 }}>{fmt(p.totalProfit)}</td>
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
  const [year,       setYear]       = useState(now.getFullYear())
  const [selMonth,   setSelMonth]   = useState<number | null>(now.getMonth() + 1)
  const [modal,      setModal]      = useState<{ month: number; year: number; id?: number; target?: number } | null>(null)
  const [delId,      setDelId]      = useState<number | null>(null)
  const [selProfile, setSelProfile] = useState<ProfileStat | null>(null)

  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: yearData,   isLoading: yearLoading }  = useYearAnalytics(year)
  const deleteGoal = useDeleteGoal()

  const goalsForYear = goals.filter(g => g.year === year)
  const s = yearData?.summary

  const handleDelete = (id: number) => {
    deleteGoal.mutate(id)
    setDelId(null)
    setSelMonth(null)
  }

  const handleProfileSelect = (p: ProfileStat) => {
    setSelProfile(prev => prev?.profile === p.profile ? null : p)
    setSelMonth(null)
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Estatísticas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Metas mensais, calendário anual e análise detalhada por perfil</p>
      </div>

      {/* Year nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => { setYear(y => y - 1); setSelMonth(null); setSelProfile(null) }} style={navBtn}>‹</button>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>{year}</span>
        <button onClick={() => { setYear(y => y + 1); setSelMonth(null); setSelProfile(null) }} style={navBtn}>›</button>
      </div>

      {/* Year KPI strip */}
      {s && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <Kpi label="Lucro no ano"    value={fmt(s.totalProfit)}   color={clr(s.totalProfit)} />
          <Kpi label="Apostado"        value={fmt(s.totalWagered)} />
          <Kpi label="Apostas"         value={String(s.totalBets)} />
          <Kpi label="ROI"             value={fmtPct(s.roi)}         color={clr(s.roi)} />
          <Kpi label="Taxa geral"      value={s.hitRatePct != null ? `${s.hitRatePct}%` : '—'} />
          <Kpi label="Metas atingidas" value={s.goalsSet > 0 ? `${s.goalsHit}/${s.goalsSet}` : '—'}
            color={s.goalsHit === s.goalsSet && s.goalsSet > 0 ? 'var(--green)' : undefined}
          />
          {s.bestMonth != null && <Kpi label="Melhor mês" value={`${MONTH_NAMES[s.bestMonth - 1]} (${fmt(s.bestProfit)})`} color="var(--green)" />}
          {s.worstMonth != null && <Kpi label="Pior mês"  value={`${MONTH_NAMES[s.worstMonth - 1]} (${fmt(s.worstProfit)})`} color="var(--red)" />}
        </div>
      )}

      {/* 12-month grid */}
      {(yearLoading || goalsLoading) ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {(yearData?.months ?? Array.from({ length: 12 }, (_, i) => ({
            month: i + 1, totalBets: 0, won: 0, lost: 0,
            totalWagered: 0, totalProfit: 0, hitRatePct: null, roi: null,
            targetProfit: null, goalId: null, achieved: null, progressPct: null,
          } as MonthAnalytics))).map((m: MonthAnalytics) => (
            <MonthCell
              key={m.month} m={m}
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
              Desempenho por perfil — {year}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clique num perfil para ver análise detalhada →</p>
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
              <button onClick={() => setDelId(null)} style={btnGhost}>Cancelar</button>
              <button onClick={() => handleDelete(delId)} style={{ ...btnPrimary, background: 'var(--red)' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
