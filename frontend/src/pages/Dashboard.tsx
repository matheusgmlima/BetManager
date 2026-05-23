import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { SkeletonPill, SkeletonCard, SkeletonBar } from '../components/Skeleton'
import FloatingParticles from '../components/FloatingParticles'
import SnakeBanner from '../components/SnakeBanner'
import { useCountUp } from '../hooks/useCountUp'
import { useMobile } from '../hooks/useMobile'
import { useDashboard, useSportStats, useBookmakerStats, useTipsterStats, useProfileStats } from '../hooks/useDashboard'
import { DashboardPeriod } from '../types/dashboard.types'
import { useState, useMemo } from 'react'
import { Icon } from '../components/Icon'
import { useUnit } from '../contexts/UnitContext'
import { useQuery } from 'react-query'
import { bankrollService } from '../services/bankrollService'
import { dashboardService } from '../services/dashboardService'
import { useBets } from '../hooks/useBets'

// ─── Tooltip style ────────────────────────────────────────────────────────────
const ttStyle     = { backgroundColor: '#0a0a12', border: '1px solid #2d1f5e', borderRadius: '10px', fontSize: '12px' }
const ttLabel     = { color: '#a78bfa', fontWeight: 700 }
const ttItem      = { color: '#e0e0ff' }

const PERIOD_OPTS: { value: DashboardPeriod; label: string }[] = [
  { value: 'day',   label: 'Hoje' },
  { value: 'week',  label: '7 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'year',  label: 'Ano' },
  { value: 'all',   label: 'Tudo' },
]

const PROFILE_COLORS = ['#a78bfa', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#60a5fa']

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ label, children, icon = '◈' }: { label: string; children: React.ReactNode; icon?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 14, color: '#8b5cf6', filter: 'drop-shadow(0 0 6px #8b5cf6)', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
          background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #a78bfa)',
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'shimmer 4s linear infinite',
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(139,92,246,0.4), rgba(139,92,246,0.05), transparent)' }} />
        <span style={{ fontSize: 14, color: '#8b5cf6', filter: 'drop-shadow(0 0 6px #8b5cf6)', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Badge de tendência ───────────────────────────────────────────────────────
function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const positive = value >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color: positive ? '#22c55e' : '#ef4444',
      border: `1px solid ${positive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
    }}>
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon, label, rawValue, prefix = '', suffix = '', trend, sub, delay = 0, accent, decimals, isMoney = false,
}: {
  icon: string; label: string; rawValue: number
  prefix?: string; suffix?: string; trend?: number
  sub?: string; delay?: number; accent?: string; decimals?: number; isMoney?: boolean
}) {
  const { showU, unitVal } = useUnit()
  const useUnits = isMoney && showU && unitVal > 0
  const displayValue = useUnits ? rawValue / unitVal : rawValue
  const dec = decimals ?? (displayValue % 1 !== 0 ? (useUnits ? 2 : 1) : 0)
  const val = useCountUp(displayValue, 1300, dec)
  const ac  = accent ?? '#7c3aed'

  const displayPrefix = useUnits ? '' : prefix
  const displaySuffix = useUnits ? 'u' : suffix

  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '18px 20px',
        position: 'relative', overflow: 'hidden',
        animationDelay: `${delay}ms`, zIndex: 1,
        transition: 'border-color 0.2s, box-shadow 0.2s', cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.boxShadow = `0 0 20px ${ac}33` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${ac}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div className="flex items-start justify-between mb-3">
        <div style={{ width: 36, height: 36, borderRadius: 10, fontSize: 17, background: `${ac}18`, border: `1px solid ${ac}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 4 }}>
        {displayPrefix}{val.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })}{displaySuffix}
      </p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ─── Tipster card ─────────────────────────────────────────────────────────────
function TipsterCard({ t, i }: { t: { tipster: string; totalProfit: number; totalBets: number; hitRatePct: number | null; roi: number | null }; i: number }) {
  const cor      = PROFILE_COLORS[i % PROFILE_COLORS.length]
  const sigla    = t.tipster.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const { showU, unitVal } = useUnit()
  const lucroAnim = useCountUp(showU && unitVal > 0 ? t.totalProfit / unitVal : t.totalProfit, 1400, 2)

  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px',
        animationDelay: `${i * 80}ms`,
        position: 'relative', overflow: 'hidden', zIndex: 1,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cor; e.currentTarget.style.boxShadow = `0 0 20px ${cor}30` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: `linear-gradient(to right, ${cor}, transparent)`, borderRadius: '16px 16px 0 0' }} />
      <div className="flex items-center gap-3 mb-4">
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cor}20`, border: `1px solid ${cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: cor }}>
          {sigla}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.tipster}</p>
          {t.roi != null && <TrendBadge value={t.roi} suffix="% ROI" />}
        </div>
      </div>
      <p style={{ fontSize: 30, fontWeight: 900, color: t.totalProfit >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {t.totalProfit >= 0 ? '+' : ''}{showU ? '' : 'R$ '}{lucroAnim.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
      </p>
      <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Apostas</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{t.totalBets}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acerto</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: cor }}>{t.hitRatePct?.toFixed(1) ?? '—'}%</p>
        </div>
      </div>
    </div>
  )
}

// ─── Profile card ─────────────────────────────────────────────────────────────
function ProfileCard({ p, i, maxProfit }: {
  p: { profile: string; totalProfit: number; totalBets: number; hitRatePct: number | null; roi?: number | null; totalWagered: number }
  i: number; maxProfit: number
}) {
  const cor = PROFILE_COLORS[i % PROFILE_COLORS.length]
  const sigla = p.profile.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const { showU, unitVal } = useUnit()
  const lucroAnim = useCountUp(showU && unitVal > 0 ? p.totalProfit / unitVal : p.totalProfit, 1400, 2)
  const isPos = p.totalProfit >= 0
  const barW = maxProfit > 0 ? Math.max(4, Math.abs(p.totalProfit) / maxProfit * 100) : 4

  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '18px 20px',
        position: 'relative', overflow: 'hidden', zIndex: 1,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cor; e.currentTarget.style.boxShadow = `0 0 20px ${cor}30` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${cor}, transparent)`, borderRadius: '16px 16px 0 0' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${cor}20`, border: `1px solid ${cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: cor, flexShrink: 0 }}>
          {sigla}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{p.profile}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{p.totalBets} aposta{p.totalBets !== 1 ? 's' : ''}</p>
        </div>
        {p.roi != null && (
          <TrendBadge value={p.roi} suffix="% ROI" />
        )}
      </div>

      {/* Lucro */}
      <p style={{ fontSize: 28, fontWeight: 900, color: isPos ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 14px' }}>
        {isPos ? '+' : ''}{showU ? '' : 'R$ '}{lucroAnim.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
      </p>

      {/* Barra de lucro relativa */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barW}%`, background: isPos ? cor : '#ef4444', borderRadius: 4, transition: 'width 1s ease' }} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>Acerto</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: cor, margin: 0 }}>{p.hitRatePct?.toFixed(1) ?? '—'}%</p>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>Apostado</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-secondary)', margin: 0, fontFamily: 'monospace' }}>
            {showU && unitVal > 0
              ? `${(p.totalWagered / unitVal).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}u`
              : `R$ ${p.totalWagered.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Gráfico wrapper ──────────────────────────────────────────────────────────
function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px',
        animationDelay: `${delay}ms`, position: 'relative', zIndex: 1,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3d1f8e'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.15)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyChart({ msg = 'Nenhum dado ainda' }: { msg?: string }) {
  return (
    <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 28, opacity: 0.25, color: 'var(--text-muted)' }}>◈</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{msg}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [period, setPeriod] = useState<DashboardPeriod>('month')

  const { data: dash, isLoading: loadingDash } = useDashboard(period)
  const { data: sportStats = [], isLoading: loadingSports } = useSportStats()
  const { data: bookmakerStats = [], isLoading: loadingBooks } = useBookmakerStats()
  const { data: tipsterStats = [], isLoading: loadingTipsters } = useTipsterStats()
  const { data: profileStats = [], isLoading: loadingProfiles } = useProfileStats()
  const { data: bankroll } = useQuery(['bankroll'], () => bankrollService.get())
  const { data: dashAll } = useDashboard('all')
  const { data: monthlyStatsRaw = [] } = useQuery(['stats', 'monthly'], () => dashboardService.getMonthlyStats())
  const { data: recentBetsData } = useBets({ perPage: 50 })

  // Streak computation
  const streak = useMemo(() => {
    const bets = recentBetsData?.data ?? []
    const settled = bets.filter((b: any) => b.result !== 'pending' && b.result !== 'void')
    if (settled.length === 0) return { count: 0, type: null as string | null }
    const first = settled[0].result as string
    let count = 0
    for (const bet of settled) {
      if (bet.result === first) count++
      else break
    }
    return { count, type: first }
  }, [recentBetsData])

  // Monthly stats - last 6 months
  const monthlyStats = useMemo(() => {
    const arr = Array.isArray(monthlyStatsRaw) ? monthlyStatsRaw : []
    return arr.slice(-6)
  }, [monthlyStatsRaw])

  const { showU, unitVal } = useUnit()
  const summary = dash?.summary
  const profitChart = dash?.profitChart ?? []

  const rawProfit   = summary?.totalProfit  ?? 0
  const rawWagered  = summary?.totalWagered ?? 0
  const totalProfit  = useCountUp(showU && unitVal > 0 ? rawProfit  / unitVal : rawProfit,  1500, showU ? 2 : 2)
  const totalWagered = useCountUp(showU && unitVal > 0 ? rawWagered / unitVal : rawWagered, 1400, showU ? 2 : 2)
  const hitRate       = useCountUp(summary?.hitRatePct    ?? 0, 1300, 1)
  const roi           = summary?.totalWagered
    ? (summary.totalProfit / summary.totalWagered) * 100
    : 0
  const roiAnim       = useCountUp(roi, 1200, 1)

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Distribution for donut
  const distribution = summary ? [
    { name: 'Ganhou',   value: summary.won,     color: '#22c55e' },
    { name: 'Perdeu',   value: summary.lost,    color: '#ef4444' },
    { name: 'Pendente', value: summary.pending, color: '#eab308' },
    { name: 'Void',     value: summary.void,    color: '#3b3b55' },
  ].filter(d => d.value > 0) : []

  // Format month label from chart date
  const fmtChartDate = (d: string) => {
    const parts = d.split('-')
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d
  }

  return (
    <>
      <FloatingParticles />

      <div
        style={{ padding: isMobile ? '20px 16px 80px' : '28px 40px 60px', maxWidth: 1300, margin: '0 auto', position: 'relative', zIndex: 1, color: 'var(--text-primary)' }}
        className="space-y-6 anim-scale-in"
      >
        {/* ── HEADER ────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>
              Visão Geral
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{hoje}</p>
          </div>

          {/* Period selector */}
          <div style={{
            display: 'flex', gap: 6,
            overflowX: isMobile ? 'auto' : 'visible',
            flexShrink: 0,
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          } as React.CSSProperties}>
            {PERIOD_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                style={{
                  flexShrink: 0,
                  padding: isMobile ? '6px 10px' : '6px 14px',
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: period === opt.value ? '1px solid var(--purple-600)' : '1px solid var(--border)',
                  background: period === opt.value
                    ? 'linear-gradient(135deg, var(--purple-700), var(--purple-600))'
                    : 'var(--bg-card)',
                  color: period === opt.value ? '#fff' : 'var(--text-secondary)',
                  boxShadow: period === opt.value ? '0 0 12px var(--purple-glow)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── HERO CARD ─────────────────────────────────────── */}
        <div style={{
          borderRadius: 20, padding: isMobile ? '24px 20px' : '32px 36px',
          background: 'linear-gradient(135deg, #1a0a3e 0%, #0f0f1a 50%, #0a1628 100%)',
          border: '1px solid #2d1f5e', boxShadow: '0 0 60px rgba(124,58,237,0.12)',
          position: 'relative', overflow: 'hidden', zIndex: 1,
        }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: 100, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          {!isMobile && <SnakeBanner width={900} height={200} />}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'flex-end',
              justifyContent: 'space-between', gap: isMobile ? 12 : 0,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#6d5a9a', textTransform: 'uppercase', marginBottom: 8 }}>
                  Lucro total — {PERIOD_OPTS.find(p => p.value === period)?.label}
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  {loadingDash ? (
                    <div style={{ height: 64, width: 220, borderRadius: 10, background: 'rgba(139,92,246,0.1)', animation: 'pulse 1.5s ease infinite' }} />
                  ) : (
                    <span style={{ fontSize: isMobile ? 40 : 64, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: rawProfit >= 0 ? '#fff' : '#ef4444' }}>
                      {rawProfit >= 0 ? '' : '-'}{showU ? '' : 'R$ '}{Math.abs(totalProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
                    </span>
                  )}
                  {!loadingDash && roi !== 0 && <TrendBadge value={roi} />}
                </div>
                {!loadingDash && (
                  <p style={{ fontSize: 13, color: '#6d5a9a', marginTop: 8 }}>
                    Total apostado:&nbsp;
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                      {showU ? '' : 'R$ '}{totalWagered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
                    </span>
                  </p>
                )}
              </div>

              {/* Sparkline */}
              {!isMobile && profitChart.length > 1 && (
                <div style={{ opacity: 0.7 }}>
                  <ResponsiveContainer width={200} height={70}>
                    <LineChart data={profitChart}>
                      <Line type="monotone" dataKey="cumulativeProfit" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: 10, textAlign: 'center', color: '#4a3a6a', marginTop: 4 }}>lucro acumulado</p>
                </div>
              )}
            </div>

            {/* Pills + botão planilha */}
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between', gap: 12, marginTop: 20,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {loadingDash ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonPill key={i} />)
                ) : (
                  [
                    { label: 'ROI',       value: `${roiAnim.toFixed(1)}%`,                          color: roi >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Win Rate',  value: `${hitRate.toFixed(1)}%`,                          color: '#a78bfa' },
                    { label: 'Apostas',   value: String(summary?.totalBets ?? 0),                   color: '#818cf8' },
                    { label: 'Odd média', value: summary?.avgOdds ? summary.avgOdds.toFixed(2) : '—', color: '#c084fc' },
                  ].map(p => (
                    <div key={p.label} style={{ padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', flex: isMobile ? '1 1 auto' : 'none', textAlign: isMobile ? 'center' : 'left' }}>
                      <p style={{ fontSize: 10, color: '#6d5a9a', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.label}</p>
                      <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: p.color, lineHeight: 1.2, marginTop: 2 }}>{p.value}</p>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => navigate('/planilha')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.15))',
                  border: '1px solid rgba(124,58,237,0.45)', color: '#c4b5fd',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  width: isMobile ? '100%' : 'auto',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.38), rgba(99,102,241,0.28))'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.8)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.3)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.15))'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.color = '#c4b5fd' }}
              >
                <span style={{ fontSize: 16 }}>⊞</span> Ver Planilha <span style={{ fontSize: 12, opacity: 0.6 }}>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── KPIs ──────────────────────────────────────────── */}
        <div className="anim-slide-up" style={{ animationDelay: '80ms' }}>
          <Section label="Métricas do período">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon="Σ"  label="Total apostado" rawValue={summary?.totalWagered ?? 0} prefix="R$ " decimals={2} delay={0}   accent="#8b5cf6" isMoney />
              <KpiCard icon="#"  label="Apostas"        rawValue={summary?.totalBets    ?? 0}              decimals={0} delay={60}  accent="#818cf8"
                sub={summary ? `${summary.simpleCount} simples · ${summary.combinedCount} combinadas` : undefined} />
              <KpiCard icon="%"  label="Taxa de acerto" rawValue={summary?.hitRatePct   ?? 0} suffix="%" decimals={1}  delay={120} accent="#a78bfa" sub={`${summary?.won ?? 0} ganhou · ${summary?.lost ?? 0} perdeu`} />
              <KpiCard icon="↑"  label="ROI"            rawValue={roi}                         suffix="%" decimals={1}  delay={180} accent="#c084fc" sub={`Odd média: ${summary?.avgOdds?.toFixed(2) ?? '—'}`} />
            </div>

            {/* Streak card */}
            {streak.count > 0 && streak.type && (
              <div className="anim-slide-up" style={{ marginTop: 12 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 12,
                  padding: '10px 18px', borderRadius: 12,
                  background: streak.type === 'won' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${streak.type === 'won' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  <Icon name={streak.type === 'won' ? 'fire' : 'snowflake'} size={20} color={streak.type === 'won' ? '#22c55e' : '#60a5fa'} />
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: streak.type === 'won' ? '#22c55e' : '#ef4444' }}>
                      Sequência atual
                    </p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                      <span style={{ color: streak.type === 'won' ? '#22c55e' : '#ef4444', fontSize: 22 }}>{streak.count}</span>
                      {' '}{streak.type === 'won' ? `vitória${streak.count !== 1 ? 's' : ''} seguida${streak.count !== 1 ? 's' : ''}` : `derrota${streak.count !== 1 ? 's' : ''} seguida${streak.count !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── BANCA ────────────────────────────────────────── */}
        {bankroll && (bankroll.balance > 0 || bankroll.data.length > 0) && (() => {
          const entries      = bankroll.data
          const inicial      = entries.find(e => e.type === 'initial')
          const totalDep     = entries.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0)
          const totalSaq     = entries.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0)
          const allProfit    = dashAll?.summary?.totalProfit ?? 0
          const saldoReal    = bankroll.balance + allProfit
          const saldoPos     = saldoReal >= 0
          const retornoPct   = bankroll.balance > 0 ? ((allProfit / bankroll.balance) * 100) : 0
          return (
            <div className="anim-slide-up" style={{ animationDelay: '120ms' }}>
              <Section label="Banca" icon="◈">
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16,10,40,0.9) 0%, rgba(10,8,20,0.95) 100%)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: 16, padding: isMobile ? '20px 16px' : '24px 28px',
                  display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 20 : 32, alignItems: isMobile ? 'stretch' : 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* glow bg */}
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  {/* Saldo principal */}
                  <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#6d5a9a', textTransform: 'uppercase', marginBottom: 6 }}>
                      Saldo estimado da banca
                    </p>
                    <p style={{ fontSize: isMobile ? 36 : 48, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: saldoPos ? '#22c55e' : '#ef4444', margin: 0 }}>
                      {showU ? '' : 'R$ '}{(showU && unitVal > 0 ? Math.abs(saldoReal) / unitVal : Math.abs(saldoReal)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
                    </p>
                    <p style={{ fontSize: 12, color: '#6d5a9a', marginTop: 6 }}>
                      Capital:{' '}
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                        {showU ? '' : 'R$ '}{(showU && unitVal > 0 ? bankroll.balance / unitVal : bankroll.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
                      </span>
                      {' · '}Lucro total:{' '}
                      <span style={{ color: allProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                        {allProfit >= 0 ? '+' : ''}{showU ? '' : 'R$ '}{(showU && unitVal > 0 ? allProfit / unitVal : allProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{showU ? 'u' : ''}
                      </span>
                    </p>
                  </div>

                  {/* Separador */}
                  {!isMobile && <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(124,58,237,0.2)' }} />}

                  {/* Mini KPIs */}
                  <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                    {[
                      { label: 'Banca inicial', value: inicial ? `${showU ? '' : 'R$ '}${(showU && unitVal > 0 ? inicial.amount / unitVal : inicial.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${showU ? 'u' : ''}` : '—', color: '#c084fc' },
                      { label: 'Depósitos', value: totalDep > 0 ? `+${showU ? '' : 'R$ '}${(showU && unitVal > 0 ? totalDep / unitVal : totalDep).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${showU ? 'u' : ''}` : '—', color: '#34d399' },
                      { label: 'Saques', value: totalSaq > 0 ? `-${showU ? '' : 'R$ '}${(showU && unitVal > 0 ? totalSaq / unitVal : totalSaq).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${showU ? 'u' : ''}` : '—', color: '#f87171' },
                      { label: 'Retorno', value: `${retornoPct >= 0 ? '+' : ''}${retornoPct.toFixed(1)}%`, color: retornoPct >= 0 ? '#22c55e' : '#ef4444' },
                    ].map(k => (
                      <div key={k.label} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 90 }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            </div>
          )
        })()}

        {/* ── TIPSTERS ─────────────────────────────────────── */}
        {(loadingTipsters || tipsterStats.length > 0) && (
          <div className="anim-slide-up" style={{ animationDelay: '160ms' }}>
            <Section label="Desempenho por tipster">
              <div style={{ overflowX: 'auto', marginRight: -4, paddingBottom: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
                <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
                  {loadingTipsters
                    ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ width: 260, flexShrink: 0 }}><SkeletonCard h={160} /></div>)
                    : tipsterStats.map((t, i) => (
                        <div key={t.tipster} style={{ width: 260, flexShrink: 0 }}>
                          <TipsterCard t={t} i={i} />
                        </div>
                      ))
                  }
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ── PERFIS ────────────────────────────────────────── */}
        {(loadingProfiles || (profileStats as any[]).some((p: any) => p.profileId !== null)) && (
          <div className="anim-slide-up" style={{ animationDelay: '200ms' }}>
            <Section label="Desempenho por perfil">
              {(() => {
                const filtered = (profileStats as any[]).filter((p: any) => p.profileId !== null)
                const maxP = Math.max(...filtered.map((p: any) => Math.abs(p.totalProfit)), 1)
                return (
                  <div style={{ overflowX: 'auto', marginRight: -4, paddingBottom: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
                    <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
                      {loadingProfiles
                        ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ width: 260, flexShrink: 0 }}><SkeletonCard h={160} /></div>)
                        : filtered.map((p: any, i: number) => (
                            <div key={p.profileId ?? p.profile} style={{ width: 260, flexShrink: 0 }}>
                              <ProfileCard p={p} i={i} maxProfit={maxP} />
                            </div>
                          ))
                      }
                    </div>
                  </div>
                )
              })()}
            </Section>
          </div>
        )}

        {/* ── GRÁFICOS ──────────────────────────────────────── */}
        <div className="anim-slide-up" style={{ animationDelay: '240ms' }}>
          <Section label="Análise gráfica">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Lucro acumulado */}
              <ChartCard title="Lucro acumulado" delay={80}>
                {profitChart.length >= 1 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={profitChart}>
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6d28d9" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                      <XAxis dataKey="date" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtChartDate} />
                      <YAxis tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Lucro acum.']} />
                      <Line type="monotone" dataKey="cumulativeProfit" stroke="url(#lineGrad)" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#c4b5fd' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart msg="Registre apostas para ver o gráfico" />}
              </ChartCard>

              {/* Donut distribuição */}
              <ChartCard title="Distribuição de resultados" delay={140}>
                {distribution.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="55%" height={210}>
                      <PieChart>
                        <Pie data={distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" startAngle={90} endAngle={450}>
                          {distribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number, n: string) => [`${v} apostas`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-3 flex-1">
                      {distribution.map(e => {
                        const total = distribution.reduce((a, b) => a + b.value, 0)
                        return (
                          <div key={e.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{e.value}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(e.value / total * 100)}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : <EmptyChart />}
              </ChartCard>

              {/* Por esporte */}
              <ChartCard title="Lucro por esporte (R$)" delay={200}>
                {loadingSports ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                    {Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} width={`${80 - i * 12}%`} />)}
                  </div>
                ) : sportStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={sportStats.slice(0, 7)} barSize={30}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                      <XAxis dataKey="sport" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Lucro']} />
                      <Bar dataKey="totalProfit" radius={[8, 8, 0, 0]}>
                        {sportStats.slice(0, 7).map((e, i) => <Cell key={i} fill={e.totalProfit >= 0 ? '#7c3aed' : '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </ChartCard>

              {/* Por casa */}
              <ChartCard title="Lucro por casa de apostas (R$)" delay={260}>
                {loadingBooks ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                    {Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} width={`${75 - i * 10}%`} />)}
                  </div>
                ) : bookmakerStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={bookmakerStats.slice(0, 6)} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <YAxis type="category" dataKey="bookmaker" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} width={68} />
                      <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Lucro']} />
                      <Bar dataKey="totalProfit" radius={[0, 8, 8, 0]}>
                        {bookmakerStats.slice(0, 6).map((e, i) => <Cell key={i} fill={e.totalProfit >= 0 ? '#8b5cf6' : '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </ChartCard>

              {/* Comparativo mensal */}
              {monthlyStats.length >= 2 && (
                <ChartCard title="Comparativo mes a mes (Lucro R$)" delay={320}>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={monthlyStats} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: string) => { const [y, m] = v.split('-'); const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${names[parseInt(m)-1]}/${y.slice(2)}` }} />
                      <YAxis tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                      <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem}
                        labelFormatter={(v: string) => { const [y, m] = v.split('-'); const names = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']; return `${names[parseInt(m)-1]} ${y}` }}
                        formatter={(v: number, n: string) => [`R$ ${v.toFixed(2)}`, n === 'totalProfit' ? 'Lucro' : n === 'totalBets' ? 'Apostas' : n]} />
                      <Bar dataKey="totalProfit" radius={[6, 6, 0, 0]}>
                        {monthlyStats.map((e: any, i: number) => <Cell key={i} fill={e.totalProfit >= 0 ? '#7c3aed' : '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {monthlyStats.length >= 2 && (() => {
                    const cur  = monthlyStats[monthlyStats.length - 1] as any
                    const prev = monthlyStats[monthlyStats.length - 2] as any
                    const diff = (cur?.totalProfit ?? 0) - (prev?.totalProfit ?? 0)
                    return (
                      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Mes anterior</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: (prev?.totalProfit ?? 0) >= 0 ? '#22c55e' : '#ef4444', margin: 0, fontFamily: 'monospace' }}>
                            {(prev?.totalProfit ?? 0) >= 0 ? '+' : ''}R$ {(prev?.totalProfit ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Mes atual</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: (cur?.totalProfit ?? 0) >= 0 ? '#22c55e' : '#ef4444', margin: 0, fontFamily: 'monospace' }}>
                            {(cur?.totalProfit ?? 0) >= 0 ? '+' : ''}R$ {(cur?.totalProfit ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: diff >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${diff >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Variacao</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: diff >= 0 ? '#22c55e' : '#ef4444', margin: 0, fontFamily: 'monospace' }}>
                            {diff >= 0 ? '+' : ''}R$ {diff.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </ChartCard>
              )}

            </div>
          </Section>
        </div>

        {/* Apostas pendentes */}
        {(dash?.pendingBets?.length ?? 0) > 0 && (
          <div className="anim-slide-up" style={{ animationDelay: '300ms' }}>
            <Section label="Apostas pendentes">
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                {dash!.pendingBets.map((b, i) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '12px 18px',
                      borderBottom: i < dash!.pendingBets.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {b.match && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.match}</p>}
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.market}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{(b.bookmaker as any)?.name ?? b.bookmaker}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>R$ {Number(b.amountWagered).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
  </>
  )
}
