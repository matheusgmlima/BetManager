import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBet, useCreateBetsBatch, useExtractBets } from '../hooks/useBets'
import { useSports, useBookmakers, useProfiles, useTipsters } from '../hooks/useConfig'
import { betsService } from '../services/betsService'
import { useMobile } from '../hooks/useMobile'
import { BetResult, BetType, AiExtractedBet, BetCreateInput } from '../types/bet.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const RESULT_OPTS: { value: BetResult; label: string; icon: string; color: string }[] = [
  { value: 'won',     label: 'Ganhou',   icon: '✓', color: '#22c55e' },
  { value: 'lost',    label: 'Perdeu',   icon: '✗', color: '#ef4444' },
  { value: 'pending', label: 'Pendente', icon: '◷', color: '#eab308' },
  { value: 'void',    label: 'Void',     icon: '∅', color: '#7070a0' },
]

const CONFIDENCE_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: '#22c55e', label: 'Alta confiança'  },
  medium: { color: '#eab308', label: 'Média confiança' },
  low:    { color: '#ef4444', label: 'Baixa confiança' },
}

function fmtBRL(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 14px',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
}

const focus = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = 'var(--purple-600)'
  e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.12)'
}
const blur = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow   = 'none'
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{error}</span>}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(124,58,237,0.04)',
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--purple-400)',
        }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Live Preview Card ────────────────────────────────────────────────────────

function PreviewCard({ form, profiles, bookmakers, profit }: {
  form: any; profiles: any[]; bookmakers: any[]; profit: number
}) {
  const profile  = profiles.find(p  => p.id  === Number(form.bettingProfileId))
  const bookmaker = bookmakers.find(b => b.id === Number(form.bookmakerId))
  const result   = RESULT_OPTS.find(r => r.value === form.result)

  const hasData = form.market || form.amountWagered

  return (
    <div style={{
      background: 'linear-gradient(160deg, #1a0a3e 0%, #0f0f1a 60%, #0a1628 100%)',
      border: '1px solid #2d1f5e',
      borderRadius: 16,
      padding: '24px',
      position: 'sticky',
      top: 24,
      boxShadow: '0 0 40px rgba(124,58,237,0.1)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6d5a9a', marginBottom: 6 }}>
          Preview da Aposta
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: form.betType === 'combined' ? 'rgba(129,140,248,0.15)' : 'rgba(124,58,237,0.15)',
            color: form.betType === 'combined' ? '#818cf8' : '#a78bfa',
            border: `1px solid ${form.betType === 'combined' ? 'rgba(129,140,248,0.3)' : 'rgba(124,58,237,0.3)'}`,
          }}>
            {form.betType === 'combined' ? '⋈ Múltipla' : '· Simples'}
          </span>
          {result && (
            <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: `${result.color}18`, color: result.color,
              border: `1px solid ${result.color}44`,
            }}>
              {result.icon} {result.label}
            </span>
          )}
        </div>
      </div>

      {/* Match/Market */}
      {hasData ? (
        <div style={{ marginBottom: 20 }}>
          {form.match && (
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {form.match}
            </p>
          )}
          {form.market && (
            <p style={{ fontSize: 12, color: 'var(--purple-300)' }}>{form.market}</p>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 20, padding: '16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preencha o formulário para ver o preview</p>
        </div>
      )}

      {/* Financial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Apostado',  value: form.amountWagered ? `R$ ${fmtBRL(parseFloat(form.amountWagered))}` : '—', color: 'var(--text-primary)' },
          { label: 'Odd',       value: form.odds || '—',                                                            color: '#a78bfa' },
          { label: 'Retorno',   value: form.payout ? `R$ ${fmtBRL(parseFloat(form.payout))}` : '—',                color: 'var(--text-primary)' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6d5a9a' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Profit */}
      <div style={{
        padding: '14px', borderRadius: 12,
        background: profit > 0 ? 'rgba(34,197,94,0.08)' : profit < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${profit > 0 ? 'rgba(34,197,94,0.2)' : profit < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
        marginBottom: 16,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 10, color: '#6d5a9a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Lucro estimado</p>
        <p style={{ fontSize: 28, fontWeight: 900, color: profit > 0 ? '#22c55e' : profit < 0 ? '#ef4444' : 'var(--text-muted)', lineHeight: 1 }}>
          {profit !== 0 ? `${profit > 0 ? '+' : ''}R$ ${fmtBRL(profit)}` : '—'}
        </p>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bookmaker && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#6d5a9a' }}>Casa</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: bookmaker.color, marginRight: 6 }} />
              {bookmaker.name}
            </span>
          </div>
        )}
        {profile && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#6d5a9a' }}>Perfil</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-300)' }}>{profile.name}</span>
          </div>
        )}
        {form.date && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#6d5a9a' }}>Data</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Manual Form ──────────────────────────────────────────────────────────────

interface ManualFormState {
  date: string; match: string; market: string
  sportId: string; bookmakerId: string; betType: BetType
  tipsterId: string; bettingProfileId: string; amountWagered: string
  odds: string; payout: string; result: BetResult; notes: string
}

function ManualTab() {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const { data: sports    = [] } = useSports()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles  = [] } = useProfiles()
  const { data: tipsters  = [] } = useTipsters()
  const createBet = useCreateBet()

  const [form, setForm] = useState<ManualFormState>({
    date: today(), match: '', market: '', sportId: '', bookmakerId: '',
    betType: 'simple', tipsterId: '', bettingProfileId: '', amountWagered: '',
    odds: '', payout: '', result: 'pending', notes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ManualFormState, string>>>({})
  const [success, setSuccess] = useState(false)
  const [multiMatches, setMultiMatches] = useState<string[]>(['', ''])

  const set = (k: keyof ManualFormState, v: string | BetType | BetResult) => {
    setErrors(e => ({ ...e, [k]: undefined }))
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'odds' || k === 'amountWagered') {
        const amount = parseFloat(k === 'amountWagered' ? String(v) : f.amountWagered)
        const odds   = parseFloat(k === 'odds'          ? String(v) : f.odds)
        if (!isNaN(amount) && !isNaN(odds) && odds >= 1 && amount > 0)
          next.payout = (amount * odds).toFixed(2)
      }
      if (k === 'result') {
        const amount = parseFloat(f.amountWagered)
        const odds   = parseFloat(f.odds)
        if      (v === 'lost')                                              next.payout = '0'
        else if (v === 'void' && !isNaN(amount) && amount > 0)             next.payout = amount.toFixed(2)
        else if (v === 'won'  && !isNaN(amount) && !isNaN(odds) && odds >= 1 && amount > 0)
          next.payout = (amount * odds).toFixed(2)
      }
      return next
    })
  }

  const computedMatch = form.betType === 'combined'
    ? multiMatches.filter(m => m.trim()).join(' + ') || null
    : (form.match || null)

  const addMatch    = () => setMultiMatches(p => [...p, ''])
  const removeMatch = (i: number) => setMultiMatches(p => p.filter((_, idx) => idx !== i))
  const updateMatch = (i: number, v: string) => setMultiMatches(p => p.map((m, idx) => idx === i ? v : m))

  const profit = form.result === 'lost'
    ? -(parseFloat(form.amountWagered || '0'))
    : parseFloat(form.payout || '0') - parseFloat(form.amountWagered || '0')

  const validate = () => {
    const e: typeof errors = {}
    if (!form.date)        e.date        = 'Obrigatório'
    if (!form.tipsterId)   e.tipsterId   = 'Obrigatório'
    if (!form.market)      e.market      = 'Obrigatório'
    if (!form.bookmakerId) e.bookmakerId = 'Obrigatório'
    if (!form.amountWagered || parseFloat(form.amountWagered) <= 0) e.amountWagered = 'Deve ser > 0'
    if (form.payout === '' || parseFloat(form.payout) < 0)          e.payout        = 'Obrigatório'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const payload: BetCreateInput = {
      date: form.date, match: computedMatch, market: form.market,
      bookmakerId: Number(form.bookmakerId), betType: form.betType,
      amountWagered: parseFloat(form.amountWagered),
      odds: form.odds ? parseFloat(form.odds) : null,
      payout: parseFloat(form.payout), result: form.result,
      notes: form.notes || undefined,
      sportId: form.sportId ? Number(form.sportId) : undefined,
      tipsterId: form.tipsterId ? Number(form.tipsterId) : null,
      bettingProfileId: form.bettingProfileId ? Number(form.bettingProfileId) : null,
    }
    await createBet.mutateAsync(payload)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); navigate('/planilha') }, 1400)
  }

  if (success) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#22c55e', animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>✓</div>
      <p style={{ color: 'var(--green)', fontWeight: 800, fontSize: 20 }}>Aposta registrada!</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Redirecionando para a planilha…</p>
    </div>
  )

  const formContent = (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Seção 1: Identificação ───────────────────────────── */}
      <SectionCard icon="◈" title="Identificação">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Data *" error={errors.date}>
            <input type="date" value={form.date} max={today()}
              onChange={e => set('date', e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, borderColor: errors.date ? 'var(--red)' : 'var(--border)' }}
            />
          </Field>
          <Field label="Casa de Apostas *" error={errors.bookmakerId}>
            <select value={form.bookmakerId} onChange={e => set('bookmakerId', e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, borderColor: errors.bookmakerId ? 'var(--red)' : 'var(--border)' }}
            >
              <option value="">Selecionar…</option>
              {bookmakers.filter(b => b.active).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Esporte">
            <select value={form.sportId} onChange={e => set('sportId', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}
            >
              <option value="">Nenhum</option>
              {sports.filter(s => s.active).map(s => (
                <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
          {/* Tipo */}
          <Field label="Tipo de Aposta">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['simple', 'combined'] as BetType[]).map(t => (
                <button key={t} type="button" onClick={() => set('betType', t)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: form.betType === t ? '1px solid var(--purple-500)' : '1px solid var(--border)',
                  background: form.betType === t ? 'rgba(124,58,237,0.18)' : 'var(--bg-primary)',
                  color: form.betType === t ? 'var(--purple-300)' : 'var(--text-muted)',
                  boxShadow: form.betType === t ? '0 0 12px rgba(124,58,237,0.15)' : 'none',
                }}>
                  {t === 'simple' ? 'Simples' : 'Múltipla'}
                </button>
              ))}
            </div>
          </Field>

          {/* Tipster / VIP */}
          <Field label="Tipster / VIP *" error={errors.tipsterId}>
            <select value={form.tipsterId} onChange={e => set('tipsterId', e.target.value)}
              onFocus={focus} onBlur={blur} style={{ ...inp, borderColor: errors.tipsterId ? 'var(--red)' : 'var(--border)' }}
            >
              <option value="">Nenhum</option>
              {tipsters.filter(t => t.active).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>

          {/* Perfil de estratégia */}
          <Field label="Perfil">
            <select value={form.bettingProfileId} onChange={e => set('bettingProfileId', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}
            >
              <option value="">Nenhum</option>
              {profiles.filter(p => p.active).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </SectionCard>

      {/* ── Seção 2: Jogo/Mercado ─────────────────────────────── */}
      <SectionCard icon="◇" title="Jogo & Mercado">
        {form.betType === 'simple' ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <Field label="Jogo">
              <input type="text" value={form.match} placeholder="Ex: Flamengo x Vasco"
                onChange={e => set('match', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp}
              />
            </Field>
            <Field label="Mercado *" error={errors.market}>
              <input type="text" value={form.market} placeholder="Ex: +2.5 gols, 1X2, BTTS Sim"
                onChange={e => set('market', e.target.value)}
                onFocus={focus} onBlur={blur}
                style={{ ...inp, borderColor: errors.market ? 'var(--red)' : 'var(--border)' }}
              />
            </Field>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Jogos da múltipla</p>
            {multiMatches.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{i + 1}.</span>
                <input type="text" value={m} placeholder={`Jogo ${i + 1}`}
                  onChange={e => updateMatch(i, e.target.value)}
                  onFocus={focus} onBlur={blur}
                  style={{ ...inp, flex: 1 }}
                />
                {multiMatches.length > 2 && (
                  <button type="button" onClick={() => removeMatch(i)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--red)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addMatch} style={{
              padding: '8px', borderRadius: 8, border: '1px dashed var(--border-purple)',
              background: 'transparent', color: 'var(--purple-400)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              + Adicionar jogo
            </button>
            {multiMatches.some(m => m.trim()) && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Preview: </span>
                <span style={{ fontSize: 12, color: 'var(--purple-300)', fontWeight: 600 }}>{computedMatch}</span>
              </div>
            )}
            <Field label="Mercado da Múltipla *" error={errors.market}>
              <input type="text" value={form.market} placeholder="Ex: Todos ganham, BTTS Sim em todos"
                onChange={e => set('market', e.target.value)}
                onFocus={focus} onBlur={blur}
                style={{ ...inp, borderColor: errors.market ? 'var(--red)' : 'var(--border)' }}
              />
            </Field>
          </div>
        )}
      </SectionCard>

      {/* ── Seção 3: Valores ──────────────────────────────────── */}
      <SectionCard icon="◆" title="Valores">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Apostado (R$) *" error={errors.amountWagered}>
            <input type="number" min="0.01" step="0.01" value={form.amountWagered}
              placeholder="0,00" onChange={e => set('amountWagered', e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, borderColor: errors.amountWagered ? 'var(--red)' : 'var(--border)' }}
            />
          </Field>
          <Field label="Odd">
            <input type="number" min="1" step="0.01" value={form.odds}
              placeholder="1.00" onChange={e => set('odds', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}
            />
          </Field>
          <Field label="Retorno Total (R$) *" error={errors.payout}>
            <input type="number" min="0" step="0.01" value={form.payout}
              placeholder="0,00" onChange={e => set('payout', e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, borderColor: errors.payout ? 'var(--red)' : 'var(--border)', gridColumn: isMobile ? '1 / -1' : 'auto' }}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Seção 4: Resultado ────────────────────────────────── */}
      <SectionCard icon="◉" title="Resultado">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {RESULT_OPTS.map(r => (
            <button key={r.value} type="button" onClick={() => set('result', r.value)} style={{
              padding: isMobile ? '12px 6px' : '14px 10px',
              borderRadius: 12,
              border: form.result === r.value ? `2px solid ${r.color}` : '1px solid var(--border)',
              background: form.result === r.value ? `${r.color}15` : 'var(--bg-primary)',
              color: form.result === r.value ? r.color : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              boxShadow: form.result === r.value ? `0 0 16px ${r.color}22` : 'none',
            }}>
              <span style={{ fontSize: isMobile ? 18 : 22 }}>{r.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{r.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Notas ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px' }}>
        <Field label="Notas (opcional)">
          <textarea value={form.notes} rows={2} placeholder="Observações, estratégia usada…"
            onChange={e => set('notes', e.target.value)}
            onFocus={focus as any} onBlur={blur as any}
            style={{ ...inp, resize: 'vertical' }}
          />
        </Field>
      </div>

      {/* ── Ações ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => navigate('/planilha')} style={{
          padding: '11px 24px', borderRadius: 10, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Cancelar
        </button>
        <button type="submit" disabled={createBet.isLoading} style={{
          padding: '11px 32px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, var(--purple-700), var(--purple-600))',
          color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 0 20px var(--purple-glow)',
          opacity: createBet.isLoading ? 0.7 : 1,
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {createBet.isLoading ? (
            <>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
              Salvando…
            </>
          ) : '✓ Registrar Aposta'}
        </button>
      </div>

      {createBet.isError && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13 }}>
          Erro ao salvar. Verifique os campos e tente novamente.
        </div>
      )}
    </form>
  )

  return isMobile ? formContent : (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
      <div>{formContent}</div>
      <PreviewCard form={form} profiles={profiles} bookmakers={bookmakers} profit={profit} />
    </div>
  )
}

// ─── AI Tab ───────────────────────────────────────────────────────────────────

interface ExtractedBetEdit extends AiExtractedBet {
  selected: boolean; dateEdit: string; matchEdit: string; marketEdit: string
  amountWageredEdit: string; oddsEdit: string; payoutEdit: string
  resultEdit: BetResult; bookmakerId: number | null; bettingProfileId: number | null
  tipsterId: number | null; sportId: number | null; expanded: boolean
}

// Scanning steps animation
function ScanningAnimation() {
  const steps = ['Enviando imagem…', 'Analisando apostas…', 'Extraindo dados…']
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1100)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{
      marginTop: 20, padding: '20px 24px', borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(99,102,241,0.04))',
      border: '1px solid rgba(124,58,237,0.25)',
    }}>
      {/* Scan line */}
      <div style={{ position: 'relative', height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.04)', marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, #7c3aed, #a78bfa, transparent)', animation: 'scanLine 1.4s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.4)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#c4b5fd' }}>IA processando screenshot</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6d5a9a', transition: 'all 0.3s' }}>{steps[step]}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === step ? '#a78bfa' : 'rgba(124,58,237,0.2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface PhotoEntry { url: string; name: string; status: 'processing' | 'done' | 'error' }

function AiTab() {
  const navigate   = useNavigate()
  const isMobile   = useMobile()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles   = [] } = useProfiles()
  const { data: tipsters   = [] } = useTipsters()
  const { data: sports     = [] } = useSports()
  const extractBets  = useExtractBets()
  const createBatch  = useCreateBetsBatch()

  const model = 'haiku'
  const [dragging, setDragging]       = useState(false)
  const [photos, setPhotos]           = useState<PhotoEntry[]>([])
  const [extractionIds, setExtractionIds] = useState<number[]>([])
  const [bets, setBets]               = useState<ExtractedBetEdit[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({})
  const [saved, setSaved]             = useState(false)
  const [processingCount, setProcessingCount] = useState(0)
  // bulk edit
  const [bulkBookmakerId, setBulkBookmakerId] = useState('')
  const [bulkTipsterId,   setBulkTipsterId]   = useState('')
  const [bulkProfileId,   setBulkProfileId]   = useState('')
  const [bulkSportId,     setBulkSportId]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const tipstersRef = useRef(tipsters)
  useEffect(() => { tipstersRef.current = tipsters }, [tipsters])

  const fixDate = (d: string | null | undefined): string => {
    const base = d ?? today()
    if (new Date(base + 'T00:00:00') > new Date(today() + 'T23:59:59')) {
      const [y, m, day] = base.split('-')
      return `${Number(y) - 1}-${m}-${day}`
    }
    return base
  }

  const processFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    for (const file of imageFiles) {
      const url = URL.createObjectURL(file)
      const entry: PhotoEntry = { url, name: file.name, status: 'processing' }
      setPhotos(prev => [...prev, entry])
      setProcessingCount(c => c + 1)
      try {
        const result = await extractBets.mutateAsync({ file, model })
        setPhotos(prev => prev.map(p => p.url === url ? { ...p, status: 'done' } : p))
        setExtractionIds(prev => [...prev, result.extractionId])
        const activeTipsters = tipstersRef.current.filter(t => t.active)
        const defaultTipster = activeTipsters.find(t => t.name === 'Aposta Própria') ?? activeTipsters[0] ?? null
        setBets(prev => [
          ...prev,
          ...result.bets.map(b => ({
            ...b, selected: true, expanded: true,
            dateEdit: fixDate(b.date), matchEdit: b.match ?? '',
            marketEdit: b.market ?? '', amountWageredEdit: String(b.amountWagered ?? ''),
            oddsEdit: String(b.odds ?? ''), payoutEdit: String(b.payout ?? ''),
            resultEdit: b.result ?? 'pending' as BetResult,
            bookmakerId: b.bookmakerId, bettingProfileId: null,
            tipsterId: defaultTipster?.id ?? null, sportId: null,
          }))
        ])
      } catch {
        setPhotos(prev => prev.map(p => p.url === url ? { ...p, status: 'error' } : p))
      } finally {
        setProcessingCount(c => c - 1)
      }
    }
  }, [extractBets, model])

  const clearAll = () => {
    setPhotos([]); setBets([]); setExtractionIds([])
    setValidationErrors({}); setProcessingCount(0)
  }

  const applyBulkEdit = () => {
    setBets(prev => prev.map(b => {
      if (!b.selected) return b
      return {
        ...b,
        ...(bulkBookmakerId ? { bookmakerId: Number(bulkBookmakerId) } : {}),
        ...(bulkTipsterId   ? { tipsterId:   Number(bulkTipsterId)   } : {}),
        ...(bulkProfileId   ? { bettingProfileId: Number(bulkProfileId) } : {}),
        ...(bulkSportId     ? { sportId:     Number(bulkSportId)     } : {}),
      }
    }))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) processFiles(files)
  }, [processFiles])

  const isDateFuture = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr + 'T00:00:00') > new Date(today() + 'T23:59:59')
  }

  const toggleBet   = (i: number) => setBets(p => p.map((b, idx) => idx === i ? { ...b, selected: !b.selected } : b))
  const expandBet   = (i: number) => setBets(p => p.map((b, idx) => idx === i ? { ...b, expanded: !b.expanded } : b))
  const updateBet   = (i: number, patch: Partial<ExtractedBetEdit>) => setBets(p => p.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  const selectedBets = bets.filter(b => b.selected)

  const handleConfirm = async () => {
    if (extractionIds.length === 0 || selectedBets.length === 0) return

    // Validate required fields per bet
    const errors: Record<number, string[]> = {}
    selectedBets.forEach((b) => {
      const idx = bets.indexOf(b)
      const errs: string[] = []
      if (!b.bookmakerId) errs.push('casa')
      if (!b.tipsterId)   errs.push('tipster')
      if (isDateFuture(b.dateEdit)) errs.push('data')
      if (errs.length) errors[idx] = errs
    })
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      // Expand cards with errors
      setBets(p => p.map((b, idx) => errors[idx] ? { ...b, expanded: true } : b))
      return
    }
    setValidationErrors({})

    const payload: BetCreateInput[] = selectedBets.map(b => ({
      date: b.dateEdit || today(), match: b.matchEdit || null,
      market: b.marketEdit || 'Sem mercado',
      bookmakerId: b.bookmakerId!,
      betType: b.betType ?? 'simple',
      amountWagered: parseFloat(b.amountWageredEdit) || 0,
      odds: b.oddsEdit ? parseFloat(b.oddsEdit) : null,
      payout: parseFloat(b.payoutEdit) || 0,
      result: b.resultEdit,
      bettingProfileId: b.bettingProfileId,
      tipsterId: b.tipsterId,
      sportId: b.sportId ?? undefined,
    }))
    await createBatch.mutateAsync(payload)
    await Promise.all(extractionIds.map(id => betsService.confirmExtraction(id, selectedBets.length)))
    setSaved(true)
    setTimeout(() => navigate('/planilha'), 1600)
  }

  if (saved) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>✓</div>
      <p style={{ color: '#22c55e', fontWeight: 800, fontSize: 20, margin: 0 }}>{selectedBets.length} apostas confirmadas!</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Redirecionando para a planilha…</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Drop zone card ───────────────────────────────────────── */}
      <div style={{
        borderRadius: 20,
        border: `1.5px solid ${dragging ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.18)'}`,
        background: dragging
          ? 'rgba(124,58,237,0.07)'
          : 'linear-gradient(160deg, rgba(124,58,237,0.05) 0%, rgba(10,5,25,0.0) 60%)',
        transition: 'all 0.2s',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Glow top edge */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)', pointerEvents: 'none' }} />

        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) processFiles(files); e.target.value = '' }}
        />

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #4c1d95, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, boxShadow: '0 0 12px rgba(109,40,217,0.4)',
            }}>⚡</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Llama 4 Scout</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>via Groq</span>
          </div>
          {photos.length > 0 ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => inputRef.current?.click()}
                style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>
                + Adicionar foto
              </button>
              <button type="button" onClick={clearAll}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>
                ✕ Limpar
              </button>
            </div>
          ) : (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.2)', letterSpacing: '0.05em',
            }}>gratuito</span>
          )}
        </div>

        {/* Drop area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !photos.length && inputRef.current?.click()}
          style={{
            margin: '0 16px 16px',
            borderRadius: 14,
            border: `1.5px dashed ${dragging ? '#7c3aed' : photos.length ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.22)'}`,
            padding: photos.length ? '14px' : isMobile ? '44px 20px' : '56px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            cursor: photos.length ? 'default' : 'pointer',
            background: photos.length ? 'rgba(0,0,0,0.15)' : 'transparent',
            transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
          }}
        >
          {dragging && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(109,40,217,0.1)', zIndex: 2, gap: 8 }}>
              <div style={{ fontSize: 28, color: '#a78bfa' }}>↓</div>
              <p style={{ margin: 0, color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>Solte para analisar</p>
            </div>
          )}

          {photos.length > 0 ? (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `2px solid ${p.status === 'error' ? '#ef4444' : p.status === 'processing' ? '#7c3aed' : '#22c55e'}` }}>
                    <img src={p.url} alt={p.name} style={{ height: 90, width: 'auto', maxWidth: 140, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.status === 'processing' ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
                      {p.status === 'processing' && <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />}
                      {p.status === 'done' && <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 800 }}>✓</div>}
                      {p.status === 'error' && <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 800 }}>✕</div>}
                    </div>
                  </div>
                ))}
                {/* Add more tile */}
                <div onClick={() => inputRef.current?.click()} style={{ height: 90, width: 80, borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, color: '#7c3aed' }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
                  <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7 }}>ADICIONAR</span>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                {photos.filter(p => p.status === 'done').length} de {photos.length} foto{photos.length !== 1 ? 's' : ''} processada{photos.length !== 1 ? 's' : ''}
                {processingCount > 0 ? ` · processando ${processingCount}...` : ''}
              </p>
            </div>
          ) : (
            <>
              {/* Icon */}
              <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(109,40,217,0.2), rgba(99,102,241,0.1))',
                border: '1px solid rgba(124,58,237,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 32px rgba(109,40,217,0.15)',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center', lineHeight: 1 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Arraste o screenshot aqui
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  ou{' '}
                  <span
                    style={{ color: '#a78bfa', fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid rgba(167,139,250,0.4)' }}
                    onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                  >clique para selecionar</span>
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)', opacity: 0.5, letterSpacing: '0.08em' }}>
                  PNG · JPG · WEBP
                </p>
              </div>
            </>
          )}
        </div>

        {/* Loading indicator */}
        {processingCount > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <ScanningAnimation />
          </div>
        )}

        {/* Error photos */}
        {photos.some(p => p.status === 'error') && (
          <div style={{ margin: '0 16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                {photos.filter(p => p.status === 'error').length} foto{photos.filter(p => p.status === 'error').length !== 1 ? 's' : ''} com falha ao processar
              </p>
              <button onClick={() => inputRef.current?.click()} style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#a78bfa', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                Adicionar novamente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Extracted bets ────────────────────────────────────────── */}
      {bets.length > 0 && (
        <>
          {/* Header strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            padding: '16px 20px', borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(99,102,241,0.06))',
            border: `1px solid ${Object.keys(validationErrors).length > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.2)'}`,
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#a78bfa', fontWeight: 800 }}>✦</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#c4b5fd' }}>{bets.length} apostas detectadas · {photos.length} foto{photos.length !== 1 ? 's' : ''}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                  Casa e tipster são obrigatórios em cada aposta
                </p>
              </div>
            </div>
            {Object.keys(validationErrors).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span style={{ fontSize: 14, color: '#ef4444' }}>!</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                  {Object.keys(validationErrors).length} aposta{Object.keys(validationErrors).length !== 1 ? 's' : ''} com campos obrigatórios
                </span>
              </div>
            )}
          </div>

          {/* ── Bulk edit drawer (fixed right panel) ─────────────── */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 200,
            width: 280,
            transform: selectedBets.length >= 2 ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            display: 'flex', flexDirection: 'column',
            background: 'rgba(10,6,28,0.97)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(124,58,237,0.25)',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          }}>
            {/* Glow line */}
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(124,58,237,0.6), transparent)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid rgba(124,58,237,0.15)',
              background: 'linear-gradient(180deg, rgba(109,40,217,0.12) 0%, transparent 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, boxShadow: '0 0 14px rgba(124,58,237,0.5)',
                }}>⚡</div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#e9d5ff', letterSpacing: '-0.01em' }}>Edição em Lote</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#7c3aed' }}>{selectedBets.length} apostas selecionadas</p>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Deixe em branco para manter o valor atual de cada aposta.
              </p>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Casa de Apostas', value: bulkBookmakerId, set: setBulkBookmakerId, opts: bookmakers.filter(b => b.active).map(b => ({ id: b.id, name: b.name })) },
                { label: 'Tipster / VIP',   value: bulkTipsterId,   set: setBulkTipsterId,   opts: tipsters.filter(t => t.active).map(t => ({ id: t.id, name: t.name })) },
                { label: 'Perfil',          value: bulkProfileId,   set: setBulkProfileId,   opts: profiles.filter(p => p.active).map(p => ({ id: p.id, name: p.name })) },
                { label: 'Esporte',         value: bulkSportId,     set: setBulkSportId,     opts: sports.filter(s => s.active).map(s => ({ id: s.id, name: s.icon ? `${s.icon} ${s.name}` : s.name })) },
              ].map(({ label, value, set, opts }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7c6dab', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>{label}</label>
                  <select value={value} onChange={e => set(e.target.value)} style={{
                    ...inp,
                    background: value ? 'rgba(109,40,217,0.12)' : 'var(--bg-primary)',
                    borderColor: value ? 'rgba(124,58,237,0.5)' : 'var(--border)',
                  }}>
                    <option value="">— manter —</option>
                    {opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(124,58,237,0.15)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" onClick={() => {
                applyBulkEdit()
                setBulkBookmakerId(''); setBulkTipsterId(''); setBulkProfileId(''); setBulkSportId('')
              }} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 0 20px rgba(124,58,237,0.4)',
                transition: 'opacity 0.2s',
              }}>
                Aplicar a {selectedBets.length} apostas
              </button>
              <button type="button" onClick={() => setBets(p => p.map(b => ({ ...b, selected: false })))} style={{
                width: '100%', padding: '9px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Desmarcar todas
              </button>
            </div>
          </div>

          {/* Bet cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bets.map((bet, i) => {
              const conf      = CONFIDENCE_STYLE[bet.confidence]
              const result    = RESULT_OPTS.find(r => r.value === bet.resultEdit)
              const profit    = bet.resultEdit === 'lost'
                ? -(parseFloat(bet.amountWageredEdit || '0'))
                : parseFloat(bet.payoutEdit || '0') - parseFloat(bet.amountWageredEdit || '0')
              const betErrors = validationErrors[i] ?? []
              const hasError  = bet.selected && betErrors.length > 0

              return (
                <div key={i} style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: `1px solid ${hasError ? 'rgba(239,68,68,0.5)' : bet.selected ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                  background: bet.selected ? 'rgba(20,10,45,0.6)' : 'rgba(255,255,255,0.02)',
                  opacity: bet.selected ? 1 : 0.45,
                  transition: 'all 0.2s',
                  boxShadow: hasError ? '0 0 16px rgba(239,68,68,0.1)' : bet.selected && bet.expanded ? '0 4px 20px rgba(124,58,237,0.08)' : 'none',
                }}>
                  {/* Card header */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                      borderBottom: bet.expanded ? '1px solid rgba(124,58,237,0.15)' : 'none',
                    }}
                    onClick={() => expandBet(i)}
                  >
                    <div
                      onClick={e => { e.stopPropagation(); toggleBet(i) }}
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                        border: `2px solid ${bet.selected ? '#7c3aed' : 'rgba(255,255,255,0.15)'}`,
                        background: bet.selected ? '#7c3aed' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {bet.selected && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: hasError ? '#ef4444' : 'var(--text-primary)' }}>Aposta {i + 1}</span>
                        {hasError && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            ⚠ {betErrors.map(e => e === 'casa' ? 'Casa' : 'Perfil').join(' e ')} obrigatório{betErrors.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {!hasError && bet.matchEdit && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {bet.matchEdit}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: `${conf.color}18`, color: conf.color, border: `1px solid ${conf.color}30` }}>
                          {conf.label}
                        </span>
                        {result && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: `${result.color}18`, color: result.color, border: `1px solid ${result.color}30` }}>
                            {result.icon} {result.label}
                          </span>
                        )}
                        {bet.amountWageredEdit && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            R$ {bet.amountWageredEdit} → R$ {bet.payoutEdit || '?'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      {parseFloat(bet.amountWageredEdit) > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 800, color: profit > 0 ? '#22c55e' : profit < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {profit > 0 ? '+' : ''}R$ {Math.abs(profit).toFixed(2)}
                        </span>
                      )}
                      <span style={{ fontSize: 14, color: 'var(--text-muted)', display: 'inline-block', transform: bet.expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded fields */}
                  {bet.expanded && (
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                        <Field label="Jogo">
                          <input value={bet.matchEdit} placeholder="Ex: Flamengo x Vasco"
                            onChange={e => updateBet(i, { matchEdit: e.target.value })}
                            onFocus={focus} onBlur={blur} style={inp}
                          />
                        </Field>
                        <Field label="Mercado *">
                          <input value={bet.marketEdit} placeholder="Ex: +2.5 gols"
                            onChange={e => updateBet(i, { marketEdit: e.target.value })}
                            onFocus={focus} onBlur={blur} style={inp}
                          />
                        </Field>
                      </div>
                      {/* Required fields: Casa + Perfil + Esporte */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                        <Field label="Casa de Apostas *" error={hasError && betErrors.includes('casa') ? 'Obrigatório' : undefined}>
                          <select
                            value={bet.bookmakerId ?? ''}
                            onChange={e => {
                              updateBet(i, { bookmakerId: e.target.value ? Number(e.target.value) : null })
                              setValidationErrors(prev => {
                                const next = { ...prev }
                                if (next[i]) next[i] = next[i].filter(x => x !== 'casa')
                                if (next[i]?.length === 0) delete next[i]
                                return next
                              })
                            }}
                            onFocus={focus} onBlur={blur}
                            style={{ ...inp, borderColor: hasError && betErrors.includes('casa') ? '#ef4444' : 'var(--border)' }}
                          >
                            <option value="">Selecionar...</option>
                            {bookmakers.filter(b => b.active).map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Tipster / VIP *" error={hasError && betErrors.includes('tipster') ? 'Obrigatório' : undefined}>
                          <select
                            value={bet.tipsterId ?? ''}
                            onChange={e => {
                              updateBet(i, { tipsterId: e.target.value ? Number(e.target.value) : null })
                              setValidationErrors(prev => {
                                const next = { ...prev }
                                if (next[i]) next[i] = next[i].filter(x => x !== 'tipster')
                                if (next[i]?.length === 0) delete next[i]
                                return next
                              })
                            }}
                            onFocus={focus} onBlur={blur}
                            style={{ ...inp, borderColor: hasError && betErrors.includes('tipster') ? '#ef4444' : 'var(--border)' }}
                          >
                            <option value="">Selecionar tipster...</option>
                            {tipsters.filter(t => t.active).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Esporte">
                          <select
                            value={bet.sportId ?? ''}
                            onChange={e => updateBet(i, { sportId: e.target.value ? Number(e.target.value) : null })}
                            onFocus={focus} onBlur={blur}
                            style={inp}
                          >
                            <option value="">— opcional —</option>
                            {sports.filter(s => s.active).map(s => (
                              <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      {/* Numeric fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
                        <Field label="Data" error={hasError && betErrors.includes('data') ? 'Data futura — corrija para hoje ou antes' : undefined}>
                          <input type="date" value={bet.dateEdit} max={today()}
                            onChange={e => updateBet(i, { dateEdit: e.target.value })}
                            onFocus={focus} onBlur={blur}
                            style={{ ...inp, borderColor: hasError && betErrors.includes('data') ? '#ef4444' : isDateFuture(bet.dateEdit) ? '#f59e0b' : 'var(--border)' }}
                          />
                          {isDateFuture(bet.dateEdit) && !betErrors.includes('data') && (
                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                              ⚠ Data futura detectada — a aposta deve ser do dia atual ou anterior
                            </p>
                          )}
                        </Field>
                        <Field label="Apostado (R$)">
                          <input type="number" min="0" step="0.01" value={bet.amountWageredEdit}
                            onChange={e => updateBet(i, { amountWageredEdit: e.target.value })}
                            onFocus={focus} onBlur={blur} style={inp}
                          />
                        </Field>
                        <Field label="Retorno (R$)">
                          <input type="number" min="0" step="0.01" value={bet.payoutEdit}
                            onChange={e => updateBet(i, { payoutEdit: e.target.value })}
                            onFocus={focus} onBlur={blur} style={inp}
                          />
                        </Field>
                      </div>
                      <Field label="Resultado">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {RESULT_OPTS.map(r => (
                            <button key={r.value} type="button" onClick={() => updateBet(i, { resultEdit: r.value })} style={{
                              padding: '9px 6px', borderRadius: 10,
                              border: bet.resultEdit === r.value ? `2px solid ${r.color}` : '1px solid var(--border)',
                              background: bet.resultEdit === r.value ? `${r.color}12` : 'var(--bg-primary)',
                              color: bet.resultEdit === r.value ? r.color : 'var(--text-muted)',
                              cursor: 'pointer', transition: 'all 0.15s',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                              boxShadow: bet.resultEdit === r.value ? `0 0 12px ${r.color}22` : 'none',
                            }}>
                              <span style={{ fontSize: 16 }}>{r.icon}</span>
                              <span style={{ fontSize: 10, fontWeight: 700 }}>{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Confirm bar */}
          <div style={{
            position: 'sticky', bottom: 16, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            padding: '14px 18px', borderRadius: 14,
            background: 'rgba(10,8,20,0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(124,58,237,0.35)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#c4b5fd', fontSize: 16 }}>{selectedBets.length}</strong>
                <span style={{ color: 'var(--text-muted)' }}> / {bets.length} selecionadas</span>
              </span>
              <button type="button" onClick={() => setBets(p => p.map(b => ({ ...b, selected: true })))} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)',
                background: 'transparent', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Selec. todas
              </button>
            </div>
            <button type="button" onClick={handleConfirm} disabled={selectedBets.length === 0 || createBatch.isLoading}
              style={{
                padding: '11px 28px', borderRadius: 10, border: 'none',
                background: selectedBets.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                color: selectedBets.length === 0 ? 'var(--text-muted)' : '#fff',
                fontSize: 14, fontWeight: 800, cursor: selectedBets.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedBets.length > 0 ? '0 0 24px rgba(124,58,237,0.4)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {createBatch.isLoading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                  Salvando...
                </>
              ) : `Confirmar ${selectedBets.length} aposta${selectedBets.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes scanLine { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes shimmer  { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        @keyframes scaleIn  { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewBet() {
  const isMobile = useMobile()
  const [showManual, setShowManual] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: isMobile ? '56px 16px 24px' : '32px 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{
              margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900,
              background: 'linear-gradient(135deg, var(--purple-400), var(--purple-300))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Nova Aposta
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', padding: '3px 8px',
              borderRadius: 999, background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', textTransform: 'uppercase',
            }}>✦ IA</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Envie um screenshot e a IA extrai os dados automaticamente
          </p>
        </div>

        <button
          onClick={() => setShowManual(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
            border: showManual ? '1px solid rgba(124,58,237,0.5)' : '1px solid var(--border)',
            background: showManual ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
            color: showManual ? '#a78bfa' : 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 15 }}>✎</span>
          {showManual ? 'Ocultar manual' : 'Inserir manualmente'}
        </button>
      </div>

      {/* ── Manual (collapsible) ── */}
      {showManual && (
        <div style={{
          marginBottom: 24, borderRadius: 16,
          border: '1px solid rgba(124,58,237,0.2)',
          background: 'rgba(124,58,237,0.04)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid rgba(124,58,237,0.12)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inserção manual</span>
          </div>
          <div style={{ padding: '20px' }}>
            <ManualTab />
          </div>
        </div>
      )}

      {/* ── AI (always visible) ── */}
      <AiTab />
    </div>
  )
}

