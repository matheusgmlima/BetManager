import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import FloatingParticles from '../components/FloatingParticles'
import SnakeBanner from '../components/SnakeBanner'
import { useCountUp } from '../hooks/useCountUp'

// ─── Mock data ────────────────────────────────────────────────────────────────
const lucroMensal = [
  { dia: '01', lucro: 0   },
  { dia: '02', lucro: 45  },
  { dia: '03', lucro: 20  },
  { dia: '04', lucro: 95  },
  { dia: '05', lucro: 60  },
  { dia: '06', lucro: 130 },
  { dia: '07', lucro: 110 },
  { dia: '08', lucro: 185 },
  { dia: '09', lucro: 210 },
]

const lucroPorEsporte = [
  { esporte: 'Futebol',  lucro: 120 },
  { esporte: 'Basquete', lucro: 45  },
  { esporte: 'Tênis',    lucro: 30  },
  { esporte: 'MMA',      lucro: 15  },
  { esporte: 'Outros',   lucro: -10 },
]

const distribuicao = [
  { name: 'Ganhou',   value: 28, color: '#22c55e' },
  { name: 'Perdeu',   value: 18, color: '#ef4444' },
  { name: 'Pendente', value: 6,  color: '#eab308' },
  { name: 'Nula',     value: 2,  color: '#3b3b55' },
]

const lucroPorCasa = [
  { casa: 'Bet365',   lucro: 95 },
  { casa: 'Betano',   lucro: 60 },
  { casa: 'Superbet', lucro: 40 },
  { casa: 'KTO',      lucro: 15 },
  { casa: 'Outros',   lucro: 0  },
]

const perfis = [
  { nome: 'Vip Extraordinário', sigla: 'VE', lucro: 130, apostas: 22, acerto: 68, cor: '#a78bfa' },
  { nome: 'Vip Herculano',      sigla: 'VH', lucro: 55,  apostas: 18, acerto: 61, cor: '#818cf8' },
  { nome: 'Apostas Próprias',   sigla: 'AP', lucro: 25,  apostas: 14, acerto: 57, cor: '#c084fc' },
]

// ─── Tooltip style ────────────────────────────────────────────────────────────
const ttStyle     = { backgroundColor: '#0a0a12', border: '1px solid #2d1f5e', borderRadius: '10px', fontSize: '12px' }
const ttLabel     = { color: '#a78bfa', fontWeight: 700 }
const ttItem      = { color: '#e0e0ff' }

// ─── Section header estilo único ─────────────────────────────────────────────
function Section({ label, children, icon = '◈' }: { label: string; children: React.ReactNode; icon?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {/* Ícone diamante com glow */}
        <span style={{
          fontSize: 14, color: '#8b5cf6',
          filter: 'drop-shadow(0 0 6px #8b5cf6)',
          lineHeight: 1, flexShrink: 0,
        }}>
          {icon}
        </span>

        {/* Título com gradiente animado */}
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.18em',
          textTransform: 'uppercase',
          background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #a78bfa)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'shimmer 4s linear infinite',
        }}>
          {label}
        </span>

        {/* Linha decorativa com glow */}
        <div style={{
          flex: 1, height: 1,
          background: 'linear-gradient(to right, rgba(139,92,246,0.4), rgba(139,92,246,0.05), transparent)',
        }} />

        {/* Ícone espelho */}
        <span style={{
          fontSize: 14, color: '#8b5cf6',
          filter: 'drop-shadow(0 0 6px #8b5cf6)',
          lineHeight: 1, flexShrink: 0,
        }}>
          {icon}
        </span>
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
      {positive ? '↑' : '↓'} {Math.abs(value)}{suffix}
    </span>
  )
}

// ─── KPI card com design único ────────────────────────────────────────────────
function KpiCard({
  icon, label, rawValue, prefix = '', suffix = '', trend, sub, delay = 0, accent,
}: {
  icon: string; label: string; rawValue: number
  prefix?: string; suffix?: string; trend?: number
  sub?: string; delay?: number; accent?: string
}) {
  const val = useCountUp(rawValue, 1300, rawValue % 1 !== 0 ? 1 : 0)
  const ac = accent ?? '#7c3aed'

  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        zIndex: 1,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = ac
        el.style.boxShadow = `0 0 20px ${ac}33`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--border)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* BG decoration */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${ac}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="flex items-start justify-between mb-3">
        <div style={{
          width: 36, height: 36, borderRadius: 10, fontSize: 17,
          background: `${ac}18`, border: `1px solid ${ac}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 4 }}>
        {prefix}{val.toLocaleString('pt-BR')}{suffix}
      </p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ─── Gráfico wrapper ──────────────────────────────────────────────────────────
function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px',
        animationDelay: `${delay}ms`,
        position: 'relative', zIndex: 1,
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const lucroTotal  = useCountUp(210,    1500, 2)
  const saldo       = useCountUp(1210,   1400, 2)
  const roi         = useCountUp(21,     1200, 1)
  const winRate     = useCountUp(62.5,   1300, 1)

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <>
      <FloatingParticles />

      <div style={{ padding: '28px 32px', position: 'relative', zIndex: 1, color: 'var(--text-primary)' }} className="space-y-10 anim-fade-in">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
                Visão Geral
              </h1>
              <span style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                border: '1px solid rgba(124,58,237,0.3)',
              }}>
                LIVE MOCK
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{hoje}</p>
          </div>
        </div>

        {/* ── HERO CARD ───────────────────────────────────────── */}
        <div style={{
          borderRadius: 20, padding: '32px 36px',
          background: 'linear-gradient(135deg, #1a0a3e 0%, #0f0f1a 50%, #0a1628 100%)',
          border: '1px solid #2d1f5e',
          boxShadow: '0 0 60px rgba(124,58,237,0.12)',
          position: 'relative', overflow: 'hidden', zIndex: 1,
        }}>
          {/* BG blobs */}
          <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: 100, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Cobra animada */}
          <SnakeBanner width={900} height={200} />

          <div className="flex items-end justify-between">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: '#6d5a9a', textTransform: 'uppercase', marginBottom: 8 }}>
                Lucro total do projeto
              </p>
              <div className="flex items-baseline gap-3">
                <span style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>
                  R$ {lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <TrendBadge value={21} />
              </div>
              <p style={{ fontSize: 13, color: '#6d5a9a', marginTop: 8 }}>
                Saldo da banca:&nbsp;
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                  R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            {/* Mini linha sparkline */}
            <div style={{ opacity: 0.7 }}>
              <ResponsiveContainer width={200} height={70}>
                <LineChart data={lucroMensal}>
                  <Line type="monotone" dataKey="lucro" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 10, textAlign: 'center', color: '#4a3a6a', marginTop: 4 }}>maio/2026</p>
            </div>
          </div>

          {/* Pills rápidas */}
          <div className="flex gap-4 mt-6">
            {[
              { label: 'ROI',       value: `${roi.toFixed(1)}%`,       color: '#22c55e' },
              { label: 'Win Rate',  value: `${winRate.toFixed(1)}%`,    color: '#a78bfa' },
              { label: 'Apostas',   value: '54',                        color: '#818cf8' },
              { label: 'Yield',     value: '4.8%',                      color: '#c084fc' },
            ].map(p => (
              <div key={p.label} style={{
                padding: '8px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <p style={{ fontSize: 10, color: '#6d5a9a', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.label}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: p.color, lineHeight: 1.2, marginTop: 2 }}>{p.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPIs ────────────────────────────────────────────── */}
        <Section label="Métricas do período">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard icon="💰" label="Lucro Hoje"         rawValue={25}   prefix="R$ " trend={12}  sub="3 apostas hoje"           delay={0}   accent="#22c55e" />
            <KpiCard icon="📅" label="Lucro do Mês"       rawValue={210}  prefix="R$ " trend={8.4} sub="Mai/2026 · 54 apostas"    delay={60}  accent="#8b5cf6" />
            <KpiCard icon="🎯" label="Taxa de Acerto"     rawValue={62.5} suffix="%"   trend={3.2} sub="28 de 45 encerradas"      delay={120} accent="#a78bfa" />
            <KpiCard icon="📈" label="Maior Sequência"    rawValue={7}               sub="apostas consecutivas"   delay={180} accent="#c084fc" />
          </div>
        </Section>

        {/* ── PERFIS ──────────────────────────────────────────── */}
        <Section label="Desempenho por perfil">
          <div className="grid grid-cols-3 gap-4">
            {perfis.map((p, i) => {
              const lucroAnim   = useCountUp(p.lucro,   1400)
              const acertoAnim  = useCountUp(p.acerto,  1200)
              const apostasAnim = useCountUp(p.apostas, 1000)

              return (
                <div
                  key={p.nome}
                  className="anim-slide-up"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '20px',
                    animationDelay: `${i * 80}ms`,
                    position: 'relative', overflow: 'hidden', zIndex: 1,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = p.cor; e.currentTarget.style.boxShadow = `0 0 20px ${p.cor}30` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: `linear-gradient(to right, ${p.cor}, transparent)`, borderRadius: '16px 16px 0 0' }} />

                  <div className="flex items-center gap-3 mb-4">
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${p.cor}20`, border: `1px solid ${p.cor}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: p.cor,
                    }}>
                      {p.sigla}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.nome}</p>
                      <TrendBadge value={p.acerto - 55} />
                    </div>
                  </div>

                  <p style={{ fontSize: 32, fontWeight: 900, color: p.lucro >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {p.lucro >= 0 ? '+' : ''}R$ {lucroAnim}
                  </p>

                  <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Apostas</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{apostasAnim}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acerto</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: p.cor }}>{acertoAnim}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── GRÁFICOS ─────────────────────────────────────────── */}
        <Section label="Análise gráfica">
          <div className="grid grid-cols-2 gap-4">

            <ChartCard title="📈  Lucro acumulado — Maio/2026" delay={80}>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={lucroMensal}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6d28d9" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                  <XAxis dataKey="dia" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number) => [`R$ ${v}`, 'Lucro']} />
                  <Line type="monotone" dataKey="lucro" stroke="url(#lineGrad)" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#c4b5fd' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Donut + legenda custom */}
            <ChartCard title="🎯  Distribuição de resultados" delay={140}>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="55%" height={210}>
                  <PieChart>
                    <Pie data={distribuicao} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" startAngle={90} endAngle={450}>
                      {distribuicao.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number, n: string) => [`${v} apostas`, n]} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-col gap-3 flex-1">
                  {distribuicao.map(e => (
                    <div key={e.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{e.value}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {Math.round(e.value / distribuicao.reduce((a, b) => a + b.value, 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="⚽  Lucro por esporte (R$)" delay={200}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={lucroPorEsporte} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                  <XAxis dataKey="esporte" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number) => [`R$ ${v}`, 'Lucro']} />
                  <Bar dataKey="lucro" radius={[8, 8, 0, 0]}>
                    {lucroPorEsporte.map((e, i) => <Cell key={i} fill={e.lucro >= 0 ? '#7c3aed' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="🏠  Lucro por casa de apostas (R$)" delay={260}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={lucroPorCasa} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="casa" tick={{ fill: '#4a4a68', fontSize: 11 }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip contentStyle={ttStyle} labelStyle={ttLabel} itemStyle={ttItem} formatter={(v: number) => [`R$ ${v}`, 'Lucro']} />
                  <Bar dataKey="lucro" radius={[0, 8, 8, 0]}>
                    {lucroPorCasa.map((e, i) => <Cell key={i} fill={e.lucro >= 0 ? '#8b5cf6' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        </Section>

      </div>
    </>
  )
}
