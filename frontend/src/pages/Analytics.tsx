import { useMemo } from 'react'
import { useQuery } from 'react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
} from 'recharts'
import { useProfileDetail, useDashboard } from '../hooks/useDashboard'
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
function Sidebar({ accent = C.purple, title, subtitle, children }: {
  accent?: string; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      width: 210, flexShrink: 0,
      borderRight: `1px solid ${C.border}`,
      padding: '24px 20px',
      display: 'flex', flexDirection: 'column', gap: 16,
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
      <div style={{ display: 'flex' }}>
        <Sidebar
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
      <div style={{ display: 'flex' }}>
        <Sidebar title="Drawdown" subtitle="Queda máxima em relação ao pico histórico da banca" accent={C.red}>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
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
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <Stat label="Total geral"   value={fmtMoney(totalProfit)} color={totalProfit >= 0 ? C.green : C.red} size="sm" />
            <Stat label="Total apostas" value={String(totalBets)}    color={C.purpleL}                           size="sm" />
            <Stat label="Melhor dia"    value={bestDay?.label ?? '—'} color={C.green}                            size="sm" />
            <Stat label="Pior dia"      value={worstDay?.label ?? '—'} color={C.red}                             size="sm" />
          </div>
        </div>

        {days.length === 0 ? <EmptyState msg="Sem dados suficientes" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
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
        )}
      </div>
    </Panel>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  return (
    <div style={{
      maxWidth: 1160, margin: '0 auto',
      padding: '32px 24px 72px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 800,
          color: C.text, letterSpacing: '-0.02em',
        }}>
          Analytics
        </h1>
        <p style={{ margin: '5px 0 0', fontSize: 12, color: C.sub }}>
          Onde voce encontra valor, como sua banca se comporta, quando voce aposta melhor.
        </p>
      </div>

      <CalibrationChart />
      <DrawdownChart />
      <WeekHeatmap />
    </div>
  )
}
