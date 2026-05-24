import { useMemo, useState } from 'react'
import { useMobile } from '../hooks/useMobile'
import { useQuery } from 'react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
} from 'recharts'
import { useProfileDetail, useDashboard, useProfileStats, useBetTypeStats, useComparePeriods } from '../hooks/useDashboard'
import { useUnit } from '../contexts/UnitContext'
import { dashboardService } from '../services/dashboardService'

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  purple:  '#8b5cf6',
  purpleL: '#a78bfa',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  muted:   '#6b7280',
  border:  'var(--border)',
  card:    'var(--bg-card)',
  text:    'var(--text-primary)',
  sub:     'var(--text-secondary)',
}

const ttStyle = {
  backgroundColor: '#0a0a12',
  border: '1px solid #2d1f5e',
  borderRadius: 10,
  fontSize: 12,
  padding: '12px 16px',
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

const PERIOD_OPTS = [
  { value: 'week',  label: '7 dias' },
  { value: 'month', label: '30 dias' },
  { value: 'year',  label: '12 meses' },
  { value: 'all',   label: 'Tudo' },
]

function periodToDates(period: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7);         return { dateFrom: fmt(d) } }
  if (period === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1);       return { dateFrom: fmt(d) } }
  if (period === 'year')  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return { dateFrom: fmt(d) } }
  return {}
}

function useHeatmap() {
  return useQuery(['stats', 'heatmap'], () => dashboardService.getHeatmap())
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(v: number | null) {
  return v != null ? `${v.toFixed(1)}%` : '—'
}

function computeDrawdown(data: { date: string; cumulativeProfit: number }[]) {
  let peak = -Infinity
  return data.map(p => {
    if (p.cumulativeProfit > peak) peak = p.cumulativeProfit
    const drawdown = p.cumulativeProfit - peak
    return { ...p, peak: parseFloat(peak.toFixed(2)), drawdown: parseFloat(drawdown.toFixed(2)) }
  })
}

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Stat block: label on top, value below — used in sidebar */
function Stat({ label, value, color = C.text, size = 'md' }: {
  label: string; value: string; color?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const fontSize = size === 'lg' ? 22 : size === 'sm' ? 13 : 17
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: C.muted,
      }}>
        {label}
      </span>
      <span style={{
        fontSize, fontWeight: 800, color,
        fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
}

function Row({ label, val, color = C.sub }: { label: string; val: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: C.muted, fontSize: 11 }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{val}</span>
    </div>
  )
}

function LegendItem({ color, label, dash }: { color: string; label: string; dash?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {dash
        ? <div style={{ width: 18, height: 0, borderTop: `2px dashed ${color}` }} />
        : <div style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
      }
      <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
    </div>
  )
}

/** Card container */
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Left sidebar inside a chart panel */
function Sidebar({ accent = C.purple, title, subtitle, children, isMobile = false }: {
  accent?: string; title: string; subtitle?: string; children: React.ReactNode; isMobile?: boolean
}) {
  return (
    <div style={{
      width: isMobile ? '100%' : 210, flexShrink: 0,
      borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
      borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
      padding: isMobile ? '16px 16px 14px' : '24px 20px',
      display: 'flex', flexDirection: isMobile ? 'row' : 'column',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      gap: isMobile ? 12 : 16,
      background: 'rgba(255,255,255,0.012)',
    }}>
      {/* Title strip */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        </div>
        {subtitle && (
          <p style={{ margin: 0, fontSize: 11, color: C.sub, lineHeight: 1.5 }}>{subtitle}</p>
        )}
      </div>
      <Divider />
      {children}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Panel>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 210, borderRight: `1px solid ${C.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ width: 120, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ width: 180, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ width: 90,  height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ width: 110, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          <div style={{ height: 300, borderRadius: 10, background: 'rgba(255,255,255,0.025)' }} />
        </div>
      </div>
    </Panel>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
      {msg}
    </div>
  )
}

// ─── 1. Calibração de Odds ────────────────────────────────────────────────────

function CalibrationChart() {
  const { data, isLoading } = useProfileDetail(undefined, true)
  const { fmtMoney } = useUnit()
  const isMobile = useMobile()

  const ranges: any[] = data?.oddsRanges ?? []

  const best = useMemo(() => {
    const q = ranges.filter(r => r.hitRatePct != null && r.expectedHitRatePct != null && r.total >= 3)
    return q.length
      ? q.reduce((a: any, b: any) =>
          (b.hitRatePct - b.expectedHitRatePct) > (a.hitRatePct - a.expectedHitRatePct) ? b : a)
      : null
  }, [ranges])

  const aboveCount = ranges.filter(r =>
    r.hitRatePct != null && r.expectedHitRatePct != null && r.hitRatePct >= r.expectedHitRatePct
  ).length
  const totalRanges = ranges.filter(r => r.hitRatePct != null && r.expectedHitRatePct != null).length

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const edge = d.hitRatePct != null && d.expectedHitRatePct != null
      ? d.hitRatePct - d.expectedHitRatePct : null
    return (
      <div style={ttStyle}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, color: C.purpleL }}>{d.label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Row label="Apostas"      val={String(d.total)} />
          <Row label="Acerto real"  val={fmtPct(d.hitRatePct)}         color={d.hitRatePct >= (d.expectedHitRatePct ?? 0) ? C.green : C.red} />
          <Row label="Breakeven"    val={fmtPct(d.expectedHitRatePct)} color={C.amber} />
          {edge != null && <Row label="Vantagem" val={`${edge >= 0 ? '+' : ''}${edge.toFixed(1)}%`} color={edge >= 0 ? C.green : C.red} />}
          <Row label="ROI"          val={fmtPct(d.roi)}                color={d.roi >= 0 ? C.green : C.red} />
          <Row label="Lucro"        val={fmtMoney(d.totalProfit)}      color={d.totalProfit >= 0 ? C.green : C.red} />
          <Row label="Odd média"    val={d.avgOdds ? d.avgOdds.toFixed(2) : '—'} />
        </div>
      </div>
    )
  }

  if (isLoading) return <ChartSkeleton />

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <Sidebar
          isMobile={isMobile}
          title="Calibração de Odds"
          subtitle="Acerto real vs. mínimo necessário para lucrar em cada faixa"
          accent={C.purple}
        >
          <Stat
            label="Faixas com valor"
            value={`${aboveCount} / ${totalRanges}`}
            color={aboveCount >= totalRanges / 2 ? C.green : C.amber}
            size="lg"
          />
          {best && <>
            <Divider />
            <Stat label="Melhor faixa"   value={best.label}                                                               color={C.purpleL} />
            {best.roi != null && <Stat label="ROI nessa faixa" value={`${best.roi >= 0 ? '+' : ''}${best.roi.toFixed(1)}%`} color={best.roi >= 0 ? C.green : C.red} />}
            {best.hitRatePct != null && <Stat label="Acerto nessa faixa" value={fmtPct(best.hitRatePct)} />}
          </>}
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LegendItem color={C.green} label="Acima do breakeven" />
            <LegendItem color={C.red}   label="Abaixo do breakeven" />
            <LegendItem color={C.amber} label="Breakeven (1 ÷ odd)" dash />
          </div>
        </Sidebar>

        <div style={{ flex: 1, padding: '20px 20px 16px 16px' }}>
          {ranges.length === 0 ? <EmptyState msg="Sem dados suficientes" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={ranges} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                <Bar dataKey="hitRatePct" radius={[5, 5, 0, 0]} maxBarSize={56}>
                  {ranges.map((r: any, i: number) => (
                    <Cell key={i} fill={r.hitRatePct >= (r.expectedHitRatePct ?? 0) ? C.green : C.red} fillOpacity={0.75} />
                  ))}
                </Bar>
                <Line
                  dataKey="expectedHitRatePct" type="linear"
                  stroke={C.amber} strokeWidth={2} strokeDasharray="5 3"
                  dot={{ fill: C.amber, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: C.amber }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ─── 2. Drawdown ──────────────────────────────────────────────────────────────

function DrawdownChart() {
  const { data: dashData, isLoading } = useDashboard('all')
  const { fmtMoney } = useUnit()
  const isMobile = useMobile()

  const { chartData, stats } = useMemo(() => {
    const raw = dashData?.profitChart ?? []
    if (!raw.length) return { chartData: [], stats: null }
    const data = computeDrawdown(raw)
    const maxDrawdown     = Math.min(...data.map(d => d.drawdown))
    const maxProfit       = Math.max(...data.map(d => d.cumulativeProfit))
    const last            = data[data.length - 1]
    const currentDrawdown = last?.drawdown ?? 0
    const currentProfit   = last?.cumulativeProfit ?? 0
    let maxDDDays = 0, cur = 0
    for (const d of data) {
      if (d.drawdown < 0) { cur++; maxDDDays = Math.max(maxDDDays, cur) }
      else cur = 0
    }
    const inDD = currentDrawdown < 0
    return { chartData: data, stats: { maxDrawdown, maxProfit, currentDrawdown, currentProfit, maxDDDays, inDD } }
  }, [dashData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div style={ttStyle}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, color: C.purpleL }}>{d.date}</p>
        <Row label="Acumulado" val={fmtMoney(d.cumulativeProfit)} color={d.cumulativeProfit >= 0 ? C.green : C.red} />
        <Row label="Pico"      val={fmtMoney(d.peak)}             color={C.purpleL} />
        <Row label="Drawdown"  val={fmtMoney(d.drawdown)}         color={d.drawdown < 0 ? C.red : C.muted} />
      </div>
    )
  }

  if (isLoading) return <ChartSkeleton />

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <Sidebar isMobile={isMobile} title="Drawdown" subtitle="Queda máxima em relação ao pico histórico da banca" accent={C.red}>
          {stats ? <>
            <Stat
              label="Lucro atual"
              value={fmtMoney(stats.currentProfit)}
              color={stats.currentProfit >= 0 ? C.green : C.red}
              size="lg"
            />
            <Divider />
            <Stat label="Pico histórico"   value={fmtMoney(stats.maxProfit)}    color={C.purpleL} />
            <Stat label="Max drawdown"     value={fmtMoney(stats.maxDrawdown)}  color={C.red} />
            <Stat
              label="Drawdown atual"
              value={stats.currentDrawdown < 0 ? fmtMoney(stats.currentDrawdown) : '—'}
              color={stats.currentDrawdown < 0 ? C.red : C.muted}
            />
            {stats.maxDDDays > 0 && (
              <Stat label="Maior período em queda" value={`${stats.maxDDDays} dias`} color={C.amber} />
            )}
            <Divider />
            <div style={{
              padding: '8px 10px', borderRadius: 8,
              background: stats.inDD ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${stats.inDD ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: stats.inDD ? C.red : C.green }}>
                {stats.inDD ? 'Em drawdown' : 'No pico / recuperado'}
              </span>
            </div>
          </> : <EmptyState msg="—" />}
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LegendItem color={C.purpleL}        label="Lucro acumulado" />
            <LegendItem color={`${C.red}99`}     label="Região de drawdown" />
          </div>
        </Sidebar>

        <div style={{ flex: 1, padding: '20px 20px 16px 12px' }}>
          {chartData.length === 0 ? <EmptyState msg="Sem dados suficientes" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.red} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.red} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={v => fmtMoney(v)} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(139,92,246,0.3)', strokeWidth: 1 }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="peak" fill="url(#gradPeak)" stroke="none" isAnimationActive={false} />
                <Area type="monotone" dataKey="cumulativeProfit" stroke={C.purpleL} strokeWidth={2} fill="url(#gradProfit)" dot={false} activeDot={{ r: 4, fill: C.purpleL, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ─── 3. Heatmap Semanal ───────────────────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Seg → Dom

function WeekHeatmap() {
  const { data: rawDays = [], isLoading } = useHeatmap()
  const { fmtMoney } = useUnit()
  const isMobile = useMobile()

  const days = useMemo(
    () => DAY_ORDER.map(d => rawDays.find((r: any) => r.day === d)).filter(Boolean) as any[],
    [rawDays]
  )

  const maxAbs     = useMemo(() => Math.max(...days.map((d: any) => Math.abs(d.totalProfit)), 1), [days])
  const bestDay    = useMemo(() => days.reduce((a: any, b: any) => b.totalProfit > a.totalProfit ? b : a, days[0] ?? {}), [days])
  const worstDay   = useMemo(() => days.reduce((a: any, b: any) => b.totalProfit < a.totalProfit ? b : a, days[0] ?? {}), [days])
  const totalBets  = days.reduce((s: number, d: any) => s + d.totalBets, 0)
  const totalProfit = days.reduce((s: number, d: any) => s + d.totalProfit, 0)

  if (isLoading) return (
    <Panel>
      <div style={{ padding: 24 }}>
        <div style={{ width: 160, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 160, borderRadius: 12, background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    </Panel>
  )

  return (
    <Panel>
      <div style={{ padding: '24px 24px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: C.amber, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Heatmap Semanal</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: C.sub, marginLeft: 11 }}>
              Lucro, apostas e taxa de acerto por dia da semana
            </p>
          </div>
          {/* Summary strip */}
          <div style={{ display: 'flex', gap: isMobile ? 12 : 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Stat label="Total geral"   value={fmtMoney(totalProfit)} color={totalProfit >= 0 ? C.green : C.red} size="sm" />
            <Stat label="Total apostas" value={String(totalBets)}    color={C.purpleL}                           size="sm" />
            <Stat label="Melhor dia"    value={bestDay?.label ?? '—'} color={C.green}                            size="sm" />
            <Stat label="Pior dia"      value={worstDay?.label ?? '—'} color={C.red}                             size="sm" />
          </div>
        </div>

        {days.length === 0 ? <EmptyState msg="Sem dados suficientes" /> : (
          <div style={{ overflowX: isMobile ? 'auto' : 'visible', marginRight: isMobile ? -16 : 0, paddingRight: isMobile ? 16 : 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(7, minmax(88px, 1fr))' : 'repeat(7, 1fr)', gap: 10, minWidth: isMobile ? 640 : 'auto' }}>
            {days.map((d: any) => {
              const isPos   = d.totalProfit >= 0
              const isBest  = d.day === bestDay?.day
              const isWorst = d.day === worstDay?.day && bestDay?.day !== worstDay?.day
              const barH    = Math.max(4, Math.round((Math.abs(d.totalProfit) / maxAbs) * 96))
              const accent  = isBest ? C.green : isWorst ? C.red : isPos ? `${C.green}88` : `${C.red}88`

              return (
                <div
                  key={d.day}
                  style={{
                    background: isBest
                      ? 'rgba(34,197,94,0.06)'
                      : isWorst
                      ? 'rgba(239,68,68,0.06)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isBest ? `${C.green}40` : isWorst ? `${C.red}40` : C.border}`,
                    borderRadius: 14,
                    padding: '14px 10px 14px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Day */}
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: isBest ? C.green : isWorst ? C.red : C.sub,
                  }}>
                    {d.label}
                  </span>

                  {/* Bar chart area */}
                  <div style={{
                    width: '100%', height: 104,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '55%', height: barH,
                      borderRadius: '4px 4px 0 0',
                      background: accent,
                    }} />
                  </div>

                  {/* Profit */}
                  <span style={{
                    fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                    color: isPos ? C.green : C.red, letterSpacing: '-0.02em',
                    textAlign: 'center',
                  }}>
                    {isPos ? '+' : ''}{fmtMoney(d.totalProfit)}
                  </span>

                  {/* Bets */}
                  <span style={{ fontSize: 10, color: C.muted }}>
                    {d.totalBets} aposta{d.totalBets !== 1 ? 's' : ''}
                  </span>

                  {/* Hit rate badge */}
                  {d.hitRatePct != null && d.totalBets > 0 && (
                    <div style={{
                      padding: '2px 7px', borderRadius: 6,
                      background: d.hitRatePct >= 50
                        ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${d.hitRatePct >= 50 ? 'rgba(34,197,94,0.2)' : C.border}`,
                    }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700,                        color: d.hitRatePct >= 50 ? C.green : C.muted,
                      }}>
                        {fmtPct(d.hitRatePct)} acerto
                      </span>
                    </div>
                  )}

                  {/* ROI */}
                  {d.roi != null && d.totalBets > 0 && (
                    <span style={{ fontSize: 9, color: d.roi >= 0 ? C.green : C.red, fontWeight: 700 }}>
                      ROI {d.roi >= 0 ? '+' : ''}{fmtPct(d.roi)}
                    </span>
                  )}

                  {/* Glow bottom */}
                  {(isBest || isWorst) && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                      background: `linear-gradient(to top, ${isBest ? C.green : C.red}18, transparent)`,
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

// ─── Profile comparison ──────────────────────────────────────────────────────────────────────────────────

const PROFILE_COLS = ['#a78bfa', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#60a5fa']

function ProfileChart({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data: profiles = [], isLoading } = useProfileStats(dateFrom, dateTo)
  const { fmtMoney } = useUnit()
  const isMobile = useMobile()

  const list = (profiles as any[]).filter((p: any) => p.totalBets > 0 && p.profileId !== null)
  const maxAbs = useMemo(() => Math.max(...list.map((p: any) => Math.abs(p.totalProfit)), 1), [list])

  if (isLoading) return (
    <Panel>
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 180, borderRadius: 14, background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    </Panel>
  )

  if (list.length === 0) return null

  return (
    <Panel>
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: C.purple, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Desempenho por Perfil</span>
        </div>
        <p style={{ margin: '4px 0 0 11px', fontSize: 11, color: C.sub }}>
          Lucro, ROI e taxa de acerto por estrategia de aposta
        </p>
      </div>
      <div style={{
        padding: 20,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${'$'}{Math.min(list.length, 3)}, 1fr)`,
        gap: 14,
      }}>
        {list.map((p: any, i: number) => {
          const cor = PROFILE_COLS[i % PROFILE_COLS.length]
          const isPos = p.totalProfit >= 0
          const barW = Math.max(3, Math.abs(p.totalProfit) / maxAbs * 100)
          const sigla = p.profile.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
          const roi: number | null = p.roi ?? null
          return (
            <div key={p.profile} style={{
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
              borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cor; e.currentTarget.style.boxShadow = `0 0 18px ${'$'}{cor}25` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${cor}, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${'$'}{cor}20`, border: `1px solid ${'$'}{cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: cor, flexShrink: 0 }}>
                  {sigla}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.profile}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{p.totalBets} aposta{p.totalBets !== 1 ? 's' : ''}</p>
                </div>
                {roi != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                    background: roi >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: roi >= 0 ? C.green : C.red,
                    border: `1px solid ${roi >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(1)}% ROI
                  </span>
                )}
              </div>
              <p style={{ fontSize: 30, fontWeight: 900, color: isPos ? C.green : C.red, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 12px', fontFamily: 'monospace' }}>
                {isPos ? '+' : ''}{fmtMoney(p.totalProfit)}
              </p>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barW}%`, background: isPos ? cor : C.red, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 10, alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Acerto</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: cor, margin: 0 }}>{p.hitRatePct?.toFixed(1) ?? '\u2014'}%</p>
                </div>
                <div style={{ height: 28, background: C.border }} />
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Vitorias</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.sub, margin: 0 }}>{p.won ?? '\u2014'}</p>
                </div>
                <div style={{ height: 28, background: C.border }} />
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Apostado</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.sub, margin: 0, fontFamily: 'monospace' }}>{fmtMoney(p.totalWagered)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// ─── Simples vs Combinadas ───────────────────────────────────────────────────────────────

function BetTypeChart({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data, isLoading } = useBetTypeStats(dateFrom, dateTo)
  const { fmtMoney } = useUnit()
  const isMobile = useMobile()

  const list: any[] = (data as any)?.data ?? []
  const rec: string = (data as any)?.recommendation ?? ''
  const simple   = list.find((d: any) => d.betType === 'simple')
  const combined = list.find((d: any) => d.betType === 'combined')

  if (isLoading) return <ChartSkeleton />
  if (!simple?.totalBets && !combined?.totalBets) return null

  const chartData = [
    simple   && { label: 'Simples',    roi: simple.roiPct,   hitRate: simple.hitRatePct,   profit: simple.totalProfit,   bets: simple.totalBets   },
    combined && { label: 'Combinadas', roi: combined.roiPct, hitRate: combined.hitRatePct, profit: combined.totalProfit, bets: combined.totalBets },
  ].filter(Boolean) as any[]

  const TypeCard = ({ d, accent }: { d: any; accent: string }) => (
    <div style={{ flex: 1, padding: '20px 22px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${accent}, transparent)` }} />
      <p style={{ fontSize: 12, fontWeight: 700, color: C.sub, margin: '0 0 14px' }}>{d.label}</p>
      <p style={{ fontSize: 28, fontWeight: 900, color: d.profit >= 0 ? C.green : C.red, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px', fontFamily: 'monospace' }}>
        {d.profit >= 0 ? '+' : ''}{fmtMoney(d.profit)}
      </p>
      <p style={{ fontSize: 11, color: C.muted, margin: '0 0 16px' }}>{d.bets} apostas</p>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>ROI</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: d.roi >= 0 ? accent : C.red, margin: 0 }}>{d.roi >= 0 ? '+' : ''}{d.roi?.toFixed(1) ?? '\u2014'}%</p>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Acerto</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: accent, margin: 0 }}>{d.hitRate?.toFixed(1) ?? '\u2014'}%</p>
        </div>
      </div>
    </div>
  )

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <Sidebar isMobile={isMobile} title="Simples vs Combinadas" subtitle="Qual estrategia traz mais retorno" accent={C.amber}>
          {rec && <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{rec}"</p>}
          <Divider />
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ backgroundColor: '#0a0a12', border: '1px solid #2d1f5e', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v?.toFixed(1)}%`, 'ROI']} />
              <Bar dataKey="roi" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chartData.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? C.purple : C.amber} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </Sidebar>
        <div style={{ flex: 1, padding: '20px 20px 20px 16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
          {simple   && <TypeCard d={{ label: 'Simples',    profit: simple.totalProfit,   roi: simple.roiPct,   hitRate: simple.hitRatePct,   bets: simple.totalBets   }} accent={C.purple} />}
          {combined && <TypeCard d={{ label: 'Combinadas', profit: combined.totalProfit, roi: combined.roiPct, hitRate: combined.hitRatePct, bets: combined.totalBets }} accent={C.amber}  />}
        </div>
      </div>
    </Panel>
  )
}

// ─── Sequencias + Top Apostas ───────────────────────────────────────────────────────────────

function StreaksAndTopBets() {
  const { data, isLoading } = useProfileDetail(undefined, true)
  const { fmtMoney } = useUnit()
  const isMobile = useMobile()

  const streaks   = data?.streaks    ?? null
  const topWins   = data?.topWins    ?? []
  const worstLoss = data?.worstLosses ?? []

  if (isLoading) return <ChartSkeleton />
  if (!streaks && !topWins.length) return null

  const BetRow = ({ b, isWin }: { b: any; isWin: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: isWin ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${isWin ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: isWin ? C.green : C.red, fontWeight: 700,
      }}>
        {isWin ? '+' : '−'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {b.match ?? b.market}
        </p>
        <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{b.market} · odd {Number(b.odds).toFixed(2)} · {b.date}</p>
      </div>
      <p style={{ fontSize: 13, fontWeight: 800, color: isWin ? C.green : C.red, margin: 0, fontFamily: 'monospace', flexShrink: 0 }}>
        {isWin ? '+' : '−'}{fmtMoney(isWin ? b.profit : b.loss)}
      </p>
    </div>
  )

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <Sidebar isMobile={isMobile} title="Sequencias" subtitle="Melhor e pior sequencia de resultados" accent={C.green}>
          {streaks && <>
            {streaks.current > 0 && streaks.currentType && (
              <>
                <Stat
                  label="Sequencia atual"
                  value={`${streaks.current}x ${streaks.currentType === 'won' ? 'Vitorias' : 'Derrotas'}`}
                  color={streaks.currentType === 'won' ? C.green : C.red}
                  size="lg"
                />
                <Divider />
              </>
            )}
            <Stat label="Maior seq. vitorias"  value={`${streaks.bestWin}x`}  color={C.green} />
            <Stat label="Maior seq. derrotas"  value={`${streaks.bestLoss}x`} color={C.red}   />
          </>}
        </Sidebar>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', borderTop: isMobile ? `1px solid ${C.border}` : 'none' }}>
          <div style={{ padding: '20px 20px 16px 16px', borderRight: isMobile ? 'none' : `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Top 5 Ganhos</p>
            {topWins.length === 0
              ? <p style={{ fontSize: 12, color: C.muted, padding: '16px 0' }}>Sem dados</p>
              : topWins.map((b: any, i: number) => <BetRow key={i} b={b} isWin />)
            }
          </div>
          <div style={{ padding: '20px 20px 16px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Top 5 Perdas</p>
            {worstLoss.length === 0
              ? <p style={{ fontSize: 12, color: C.muted, padding: '16px 0' }}>Sem dados</p>
              : worstLoss.map((b: any, i: number) => <BetRow key={i} b={b} isWin={false} />)
            }
          </div>
        </div>
      </div>
    </Panel>
  )
}

function SectionLabel({ icon, label, tag }: { icon: string; label: string; tag?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      <div style={{ width: 3, height: 20, borderRadius: 2, background: 'var(--purple-500)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {icon} {label}
      </span>
      {tag && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {tag}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
    </div>
  )
}




export default function Analytics() {
  const isMobile = useMobile()
  const [period, setPeriod] = useState('month')
  const { dateFrom, dateTo } = periodToDates(period)

  return (
    <div style={{
      maxWidth: 1160, margin: '0 auto',
      padding: isMobile ? '16px 12px 80px' : '32px 24px 72px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
            Analytics
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: C.sub }}>
            Onde você encontra valor, como sua banca se comporta, quando você aposta melhor.
          </p>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, flexShrink: 0 }}>
          {PERIOD_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                background: period === opt.value ? 'rgba(124,58,237,0.9)' : 'transparent',
                color: period === opt.value ? '#fff' : 'var(--text-muted)',
                boxShadow: period === opt.value ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analise por periodo */}
      <SectionLabel icon="◈" label={`Análise — ${PERIOD_OPTS.find(p => p.value === period)?.label ?? ''}`} tag="filtrado" />
      <ProfileChart dateFrom={dateFrom} dateTo={dateTo} />
      <BetTypeChart dateFrom={dateFrom} dateTo={dateTo} />

      {/* Historico geral */}
      <SectionLabel icon="◇" label="Histórico Geral" tag="todos os dados" />
      <StreaksAndTopBets />
      <CalibrationChart />
      <DrawdownChart />
      <WeekHeatmap />
    </div>
  )
}
