import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBet, useCreateBetsBatch, useExtractBets } from '../hooks/useBets'
import { useSports, useBookmakers, useProfiles } from '../hooks/useConfig'
import { betsService } from '../services/betsService'
import { useMobile } from '../hooks/useMobile'
import { BetResult, BetType, AiExtractedBet, AiExtractionResponse, BetCreateInput } from '../types/bet.types'

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
            {form.betType === 'combined' ? '🔗 Múltipla' : '⚡ Simples'}
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
  bettingProfileId: string; amountWagered: string
  odds: string; payout: string; result: BetResult; notes: string
}

function ManualTab() {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const { data: sports    = [] } = useSports()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles  = [] } = useProfiles()
  const createBet = useCreateBet()

  const [form, setForm] = useState<ManualFormState>({
    date: today(), match: '', market: '', sportId: '', bookmakerId: '',
    betType: 'simple', bettingProfileId: '', amountWagered: '',
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
    if (!form.date)             e.date             = 'Obrigatório'
    if (!form.market)           e.market           = 'Obrigatório'
    if (!form.bookmakerId)      e.bookmakerId      = 'Obrigatório'
    if (!form.bettingProfileId) e.bettingProfileId = 'Obrigatório'
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
      bettingProfileId: form.bettingProfileId ? Number(form.bettingProfileId) : null,
    }
    await createBet.mutateAsync(payload)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); navigate('/planilha') }, 1400)
  }

  if (success) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
      <div style={{ fontSize: 56, animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>✅</div>
      <p style={{ color: 'var(--green)', fontWeight: 800, fontSize: 20 }}>Aposta registrada!</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Redirecionando para a planilha…</p>
    </div>
  )

  const formContent = (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Seção 1: Identificação ───────────────────────────── */}
      <SectionCard icon="📋" title="Identificação">
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

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 14 }}>
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
                  {t === 'simple' ? '⚡ Simples' : '🔗 Múltipla'}
                </button>
              ))}
            </div>
          </Field>

          {/* Perfil */}
          <Field label="Perfil VIP *" error={errors.bettingProfileId}>
            <select value={form.bettingProfileId} onChange={e => set('bettingProfileId', e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, borderColor: errors.bettingProfileId ? 'var(--red)' : 'var(--border)' }}
            >
              <option value="">Selecionar perfil…</option>
              {profiles.filter(p => p.active).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </SectionCard>

      {/* ── Seção 2: Jogo/Mercado ─────────────────────────────── */}
      <SectionCard icon="⚽" title="Jogo & Mercado">
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
      <SectionCard icon="💰" title="Valores">
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
      <SectionCard icon="🎯" title="Resultado">
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
  resultEdit: BetResult; bookmakerId: number | null; bettingProfileId: number | null; expanded: boolean
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

function AiTab() {
  const navigate   = useNavigate()
  const isMobile   = useMobile()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles   = [] } = useProfiles()
  const extractBets  = useExtractBets()
  const createBatch  = useCreateBetsBatch()

  const [model, setModel]       = useState<'haiku' | 'sonnet'>('haiku')
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview]   = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [extraction, setExtraction] = useState<AiExtractionResponse | null>(null)
  const [bets, setBets]         = useState<ExtractedBetEdit[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({})
  const [saved, setSaved]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    setFileName(file.name)
    setExtraction(null); setBets([])
    const result = await extractBets.mutateAsync({ file, model })
    setExtraction(result)
    setBets(result.bets.map(b => ({
      ...b, selected: true, expanded: true,
      dateEdit: b.date ?? today(), matchEdit: b.match ?? '',
      marketEdit: b.market ?? '', amountWageredEdit: String(b.amountWagered ?? ''),
      oddsEdit: String(b.odds ?? ''), payoutEdit: String(b.payout ?? ''),
      resultEdit: b.result ?? 'pending', bookmakerId: b.bookmakerId, bettingProfileId: null,
    })))
  }, [model, extractBets])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const toggleBet   = (i: number) => setBets(p => p.map((b, idx) => idx === i ? { ...b, selected: !b.selected } : b))
  const expandBet   = (i: number) => setBets(p => p.map((b, idx) => idx === i ? { ...b, expanded: !b.expanded } : b))
  const updateBet   = (i: number, patch: Partial<ExtractedBetEdit>) => setBets(p => p.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  const selectedBets = bets.filter(b => b.selected)

  const handleConfirm = async () => {
    if (!extraction || selectedBets.length === 0) return

    // Validate required fields per bet
    const errors: Record<number, string[]> = {}
    selectedBets.forEach((b) => {
      const idx = bets.indexOf(b)
      const errs: string[] = []
      if (!b.bookmakerId)      errs.push('casa')
      if (!b.bettingProfileId) errs.push('perfil')
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
    }))
    await createBatch.mutateAsync(payload)
    await betsService.confirmExtraction(extraction.extractionId, selectedBets.length)
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

  const hasResults = bets.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Model selector ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {[
          {
            value: 'haiku', icon: '⚡', label: 'Scout',
            sub: 'Llama 4 Scout · 17B',
            desc: 'Resposta rápida, ótimo para screenshots simples',
            badge: 'Recomendado',
            badgeColor: '#22c55e',
          },
          {
            value: 'sonnet', icon: '🧠', label: 'Maverick',
            sub: 'Llama 4 Maverick · 17B',
            desc: 'Maior precisão para apostas múltiplas complexas',
            badge: 'Mais preciso',
            badgeColor: '#a78bfa',
          },
        ].map(m => {
          const active = model === m.value
          return (
            <button key={m.value} type="button" onClick={() => setModel(m.value as any)} style={{
              textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
              border: active ? '2px solid #7c3aed' : '1px solid var(--border)',
              background: active
                ? 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(99,102,241,0.08))'
                : 'var(--bg-card)',
              boxShadow: active ? '0 0 24px rgba(124,58,237,0.18)' : 'none',
              transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}>
              {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6d28d9, #a78bfa, #6d28d9)', backgroundSize: '200%', animation: 'shimmer 2s linear infinite' }} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: active ? '#c4b5fd' : 'var(--text-primary)' }}>{m.label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.sub}</p>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: `${m.badgeColor}18`, color: m.badgeColor, border: `1px solid ${m.badgeColor}30`,
                }}>{m.badge}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{m.desc}</p>
              {active && (
                <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px #7c3aed' }} />
              )}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: -8 }}>
        via <span style={{ color: '#a78bfa', fontWeight: 700 }}>Groq</span> · gratuito · sem custo de tokens
      </p>

      {/* ── Dropzone ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(124,58,237,0.04)' }}>
          <span style={{ fontSize: 16 }}>📸</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa' }}>Screenshot</span>
          {preview && !extractBets.isLoading && (
            <button type="button" onClick={() => { setPreview(null); setFileName(null); setExtraction(null); setBets([]) }}
              style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}>
              Trocar imagem
            </button>
          )}
        </div>

        <div style={{ padding: '20px' }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !preview && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#7c3aed' : preview ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.3)'}`,
              borderRadius: 14,
              padding: preview ? '12px' : isMobile ? '40px 20px' : '52px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              cursor: preview ? 'default' : 'pointer',
              transition: 'all 0.2s',
              background: dragging
                ? 'rgba(124,58,237,0.06)'
                : preview
                  ? 'rgba(0,0,0,0.2)'
                  : 'linear-gradient(160deg, rgba(124,58,237,0.03) 0%, rgba(0,0,0,0) 60%)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {dragging && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.08)', zIndex: 2 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>📥</div>
                  <p style={{ margin: '8px 0 0', color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>Solte aqui</p>
                </div>
              </div>
            )}

            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />

            {preview ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <img src={preview} alt="preview" style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 10, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                {fileName && (
                  <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    📄 {fileName}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))',
                  border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                }}>
                  📱
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0, fontSize: 15 }}>
                    Arraste o screenshot aqui
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 0' }}>
                    ou <span style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                    >clique para selecionar</span>
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0', opacity: 0.7 }}>
                    PNG · JPG · WEBP
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Loading state */}
          {extractBets.isLoading && <ScanningAnimation />}

          {/* Error */}
          {extractBets.isError && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginTop: 14 }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Falha ao processar imagem</p>
                {extractBets.error instanceof Error && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef444488', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {(extractBets.error as any)?.response?.data?.detail ?? extractBets.error.message}
                  </p>
                )}
                <button onClick={() => preview && inputRef.current?.click()} style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#a78bfa', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Tentar novamente →
                </button>
              </div>
            </div>
          )}

          {/* Warnings */}
          {extraction?.warnings && extraction.warnings.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', marginTop: 14 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
              <div style={{ fontSize: 12, color: '#eab308', lineHeight: 1.5 }}>
                {extraction.warnings.map((w, i) => <p key={i} style={{ margin: 0 }}>{w}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Extracted bets ────────────────────────────────────────── */}
      {hasResults && (
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
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>✨</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#c4b5fd' }}>{bets.length} apostas detectadas</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                  Casa e perfil são obrigatórios em cada aposta
                </p>
              </div>
            </div>
            {Object.keys(validationErrors).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                  {Object.keys(validationErrors).length} aposta{Object.keys(validationErrors).length !== 1 ? 's' : ''} com campos obrigatórios
                </span>
              </div>
            )}
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
                      {/* Required fields: Casa + Perfil */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
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
                        <Field label="Perfil VIP *" error={hasError && betErrors.includes('perfil') ? 'Obrigatório' : undefined}>
                          <select
                            value={bet.bettingProfileId ?? ''}
                            onChange={e => {
                              updateBet(i, { bettingProfileId: e.target.value ? Number(e.target.value) : null })
                              setValidationErrors(prev => {
                                const next = { ...prev }
                                if (next[i]) next[i] = next[i].filter(x => x !== 'perfil')
                                if (next[i]?.length === 0) delete next[i]
                                return next
                              })
                            }}
                            onFocus={focus} onBlur={blur}
                            style={{ ...inp, borderColor: hasError && betErrors.includes('perfil') ? '#ef4444' : 'var(--border)' }}
                          >
                            <option value="">Selecionar perfil...</option>
                            {profiles.filter(p => p.active).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      {/* Numeric fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
                        <Field label="Data">
                          <input type="date" value={bet.dateEdit} max={today()}
                            onChange={e => updateBet(i, { dateEdit: e.target.value })}
                            onFocus={focus} onBlur={blur} style={inp}
                          />
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
  const [tab, setTab] = useState<'manual' | 'ai'>('manual')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: isMobile ? '56px 16px 24px' : '32px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--purple-400), var(--purple-300))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Nova Aposta
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Registre manualmente ou extraia automaticamente de um screenshot
        </p>
      </div>

      <div style={{
        display: 'inline-flex', gap: 4, marginBottom: 24,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 4,
      }}>
        {[
          { key: 'manual', label: 'Manual' },
          { key: 'ai',     label: 'Extracao por IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '8px 20px', borderRadius: 9, border: 'none',
            background: tab === t.key ? 'linear-gradient(135deg, var(--purple-700), var(--purple-600))' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--text-muted)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: tab === t.key ? '0 0 12px var(--purple-glow)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'manual' ? <ManualTab /> : <AiTab />}
    </div>
  )
}
