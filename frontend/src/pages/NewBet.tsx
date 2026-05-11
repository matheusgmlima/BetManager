import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBet, useCreateBetsBatch, useExtractBets } from '../hooks/useBets'
import { useSports, useBookmakers, useProfiles } from '../hooks/useConfig'
import { betsService } from '../services/betsService'
import { BetResult, BetType, AiExtractedBet, AiExtractionResponse, BetCreateInput } from '../types/bet.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RESULT_OPTS: { value: BetResult; label: string; color: string }[] = [
  { value: 'won',     label: '✓ Ganhou',   color: '#22c55e' },
  { value: 'lost',    label: '✗ Perdeu',   color: '#ef4444' },
  { value: 'pending', label: '◷ Pendente', color: '#eab308' },
  { value: 'void',    label: '∅ Void',     color: '#7070a0' },
]

const CONFIDENCE_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: '#22c55e', label: 'Alta confiança' },
  medium: { color: '#eab308', label: 'Média confiança' },
  low:    { color: '#ef4444', label: 'Baixa confiança' },
}

function fmtBRL(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 6,
  display: 'block',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

// ─── Section header (same as Spreadsheet) ────────────────────────────────────

function Section({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <span style={{ fontSize: 14, color: '#8b5cf6', filter: 'drop-shadow(0 0 6px #8b5cf6)' }}>◈</span>
      <span style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
        background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #a78bfa)',
        backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        animation: 'shimmer 4s linear infinite',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(139,92,246,0.4), transparent)' }} />
      <span style={{ fontSize: 14, color: '#8b5cf6', filter: 'drop-shadow(0 0 6px #8b5cf6)' }}>◈</span>
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 24px',
        borderRadius: 8,
        border: active ? '1px solid var(--purple-600)' : '1px solid var(--border)',
        background: active
          ? 'linear-gradient(135deg, var(--purple-700), var(--purple-600))'
          : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-secondary)',
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: active ? '0 0 16px var(--purple-glow)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

// ─── Manual Form ──────────────────────────────────────────────────────────────

interface ManualFormState {
  date: string
  match: string
  market: string
  sportId: string
  bookmakerId: string
  betType: BetType
  bettingProfileId: string
  amountWagered: string
  odds: string
  payout: string
  result: BetResult
  notes: string
}

function ManualTab() {
  const navigate = useNavigate()
  const { data: sports = [] } = useSports()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles = [] } = useProfiles()
  const createBet = useCreateBet()

  const [form, setForm] = useState<ManualFormState>({
    date: today(),
    match: '',
    market: '',
    sportId: '',
    bookmakerId: '',
    betType: 'simple',
    bettingProfileId: '',
    amountWagered: '',
    odds: '',
    payout: '',
    result: 'pending',
    notes: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ManualFormState, string>>>({})
  const [success, setSuccess] = useState(false)
  // Lista de jogos para aposta múltipla
  const [multiMatches, setMultiMatches] = useState<string[]>(['', ''])

  const set = (k: keyof ManualFormState, v: string | BetType | BetResult) => {
    setErrors((e) => ({ ...e, [k]: undefined }))
    setForm((f) => {
      const next = { ...f, [k]: v }

      // auto-calc payout from odds × amountWagered
      if (k === 'odds' || k === 'amountWagered') {
        const amount = parseFloat(k === 'amountWagered' ? String(v) : f.amountWagered)
        const odds   = parseFloat(k === 'odds'          ? String(v) : f.odds)
        if (!isNaN(amount) && !isNaN(odds) && odds >= 1 && amount > 0) {
          next.payout = (amount * odds).toFixed(2)
        }
      }

      // resultado → ajusta retorno automaticamente
      if (k === 'result') {
        const amount = parseFloat(f.amountWagered)
        const odds   = parseFloat(f.odds)
        if (v === 'lost') {
          next.payout = '0'
        } else if (v === 'void' && !isNaN(amount) && amount > 0) {
          next.payout = amount.toFixed(2)
        } else if (v === 'won' && !isNaN(amount) && !isNaN(odds) && odds >= 1 && amount > 0) {
          next.payout = (amount * odds).toFixed(2)
        }
      }

      return next
    })
  }

  // Valor de match computado: simples = campo direto, múltipla = joins dos jogos
  const computedMatch = form.betType === 'combined'
    ? multiMatches.filter(m => m.trim()).join(' + ') || null
    : (form.match || null)

  const addMatch   = () => setMultiMatches(prev => [...prev, ''])
  const removeMatch = (i: number) => setMultiMatches(prev => prev.filter((_, idx) => idx !== i))
  const updateMatch = (i: number, v: string) =>
    setMultiMatches(prev => prev.map((m, idx) => idx === i ? v : m))

  const profit = form.result === 'lost'
    ? -(parseFloat(form.amountWagered || '0'))
    : parseFloat(form.payout || '0') - parseFloat(form.amountWagered || '0')

  const validate = () => {
    const e: typeof errors = {}
    if (!form.date)              e.date             = 'Obrigatório'
    if (!form.market)            e.market           = 'Obrigatório'
    if (!form.bookmakerId)       e.bookmakerId      = 'Obrigatório'
    if (!form.bettingProfileId)  e.bettingProfileId = 'Obrigatório'
    if (!form.amountWagered || parseFloat(form.amountWagered) <= 0)
      e.amountWagered = 'Deve ser > 0'
    if (form.payout === '' || parseFloat(form.payout) < 0)
      e.payout = 'Obrigatório'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const payload: BetCreateInput = {
      date:            form.date,
      match:           computedMatch,
      market:          form.market,
      bookmakerId:     Number(form.bookmakerId),
      betType:         form.betType,
      amountWagered:   parseFloat(form.amountWagered),
      odds:            form.odds ? parseFloat(form.odds) : null,
      payout:          parseFloat(form.payout),
      result:          form.result,
      notes:           form.notes || undefined,
      sportId:         form.sportId ? Number(form.sportId) : undefined,
      bettingProfileId: form.bettingProfileId ? Number(form.bettingProfileId) : null,
    }

    await createBet.mutateAsync(payload)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); navigate('/planilha') }, 1400)
  }

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--purple-600)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--border)'
  }

  if (success) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 280, gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <p style={{ color: 'var(--green)', fontWeight: 700, fontSize: 18 }}>Aposta registrada!</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Redirecionando para a planilha…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ── Bloco 1: Dados gerais ─────────────────────────────── */}
      <Section label="Dados da Aposta" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label="Data *">
          <input
            type="date" value={form.date} max={today()}
            onChange={(e) => set('date', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={{ ...inputStyle, borderColor: errors.date ? 'var(--red)' : 'var(--border)' }}
          />
          {errors.date && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.date}</span>}
        </Field>

        <Field label="Casa de Apostas *">
          <select
            value={form.bookmakerId} onChange={(e) => set('bookmakerId', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={{ ...inputStyle, borderColor: errors.bookmakerId ? 'var(--red)' : 'var(--border)' }}
          >
            <option value="">Selecionar…</option>
            {bookmakers.filter(b => b.active).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {errors.bookmakerId && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.bookmakerId}</span>}
        </Field>

        <Field label="Esporte">
          <select
            value={form.sportId} onChange={(e) => set('sportId', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={inputStyle}
          >
            <option value="">Nenhum</option>
            {sports.filter(s => s.active).map(s => (
              <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Tipo + Perfil */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Tipo de Aposta">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['simple', 'combined'] as BetType[]).map(t => (
              <button
                key={t} type="button"
                onClick={() => set('betType', t)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: form.betType === t ? '1px solid var(--purple-600)' : '1px solid var(--border)',
                  background: form.betType === t ? 'rgba(124,58,237,0.2)' : 'var(--bg-secondary)',
                  color: form.betType === t ? 'var(--purple-300)' : 'var(--text-secondary)',
                }}
              >
                {t === 'simple' ? '⚡ Simples' : '🔗 Múltipla'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Perfil *">
          <select
            value={form.bettingProfileId} onChange={(e) => set('bettingProfileId', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={{ ...inputStyle, borderColor: errors.bettingProfileId ? 'var(--red)' : 'var(--border)' }}
          >
            <option value="">Selecionar perfil…</option>
            {profiles.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.bettingProfileId && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.bettingProfileId}</span>}
        </Field>
      </div>

      {/* ── Jogos ────────────────────────────────────────────────── */}
      {form.betType === 'simple' ? (
        /* Simples: jogo único + mercado */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Jogo">
            <input
              type="text" value={form.match} placeholder="Ex: Flamengo x Vasco"
              onChange={(e) => set('match', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur}
              style={inputStyle}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Opcional — times ou evento</span>
          </Field>
          <Field label="Mercado *">
            <input
              type="text" value={form.market} placeholder="Ex: +2.5 gols, 1X2, BTTS Sim"
              onChange={(e) => set('market', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur}
              style={{ ...inputStyle, borderColor: errors.market ? 'var(--red)' : 'var(--border)' }}
            />
            {errors.market && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.market}</span>}
          </Field>
        </div>
      ) : (
        /* Múltipla: lista dinâmica de jogos + mercado global */
        <div style={{
          borderRadius: 10, border: '1px solid var(--border-purple)',
          background: 'rgba(45,31,94,0.08)', padding: '18px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple-300)' }}>🔗 Jogos da Múltipla</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(139,92,246,0.3), transparent)' }} />
          </div>

          {multiMatches.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, minWidth: 20, textAlign: 'right' }}>
                {i + 1}.
              </span>
              <input
                type="text"
                value={m}
                placeholder={`Ex: Flamengo x Vasco`}
                onChange={(e) => updateMatch(i, e.target.value)}
                onFocus={inputFocus} onBlur={inputBlur}
                style={{ ...inputStyle, flex: 1 }}
              />
              {multiMatches.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeMatch(i)}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)', color: 'var(--red)',
                    fontSize: 16, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  title="Remover jogo"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            type="button" onClick={addMatch}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              padding: '8px', borderRadius: 8, border: '1px dashed var(--border-purple)',
              background: 'transparent', color: 'var(--purple-400)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.borderColor = 'var(--purple-500)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-purple)' }}
          >
            + Adicionar jogo
          </button>

          {/* Preview dos jogos */}
          {multiMatches.some(m => m.trim()) && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Combinação: </span>
              <span style={{ fontSize: 12, color: 'var(--purple-300)', fontWeight: 600 }}>{computedMatch}</span>
            </div>
          )}

          {/* Mercado da múltipla */}
          <Field label="Mercado *">
            <input
              type="text" value={form.market} placeholder="Ex: Todos ganham, BTTS Sim em todos"
              onChange={(e) => set('market', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur}
              style={{ ...inputStyle, borderColor: errors.market ? 'var(--red)' : 'var(--border)' }}
            />
            {errors.market && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.market}</span>}
          </Field>
        </div>
      )}

      {/* ── Bloco 2: Financeiro ───────────────────────────────── */}
      <Section label="Valores & Resultado" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label="Valor Apostado (R$) *">
          <input
            type="number" min="0.01" step="0.01" value={form.amountWagered}
            placeholder="0,00"
            onChange={(e) => set('amountWagered', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={{ ...inputStyle, borderColor: errors.amountWagered ? 'var(--red)' : 'var(--border)' }}
          />
          {errors.amountWagered && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.amountWagered}</span>}
        </Field>

        <Field label="Odd">
          <input
            type="number" min="1" step="0.01" value={form.odds}
            placeholder="1.00"
            onChange={(e) => set('odds', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Preencher calcula o retorno</span>
        </Field>

        <Field label="Retorno Total (R$) *">
          <input
            type="number" min="0" step="0.01" value={form.payout}
            placeholder="0,00"
            onChange={(e) => set('payout', e.target.value)}
            onFocus={inputFocus} onBlur={inputBlur}
            style={{ ...inputStyle, borderColor: errors.payout ? 'var(--red)' : 'var(--border)' }}
          />
          {errors.payout && <span style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errors.payout}</span>}
        </Field>
      </div>

      {/* Profit preview + resultado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Profit card */}
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: profit > 0
            ? 'rgba(34,197,94,0.08)'
            : profit < 0
            ? 'rgba(239,68,68,0.08)'
            : 'var(--bg-secondary)',
          border: `1px solid ${profit > 0 ? 'rgba(34,197,94,0.2)' : profit < 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Lucro estimado
          </span>
          <div style={{
            fontSize: 22, fontWeight: 800, marginTop: 4,
            color: profit > 0 ? '#22c55e' : profit < 0 ? '#ef4444' : 'var(--text-muted)',
          }}>
            {profit !== 0 ? `${profit > 0 ? '+' : ''}R$ ${fmtBRL(profit)}` : '—'}
          </div>
        </div>

        <Field label="Resultado">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {RESULT_OPTS.map(r => (
              <button
                key={r.value} type="button"
                onClick={() => set('result', r.value)}
                style={{
                  padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: form.result === r.value
                    ? `1px solid ${r.color}`
                    : '1px solid var(--border)',
                  background: form.result === r.value
                    ? `${r.color}22`
                    : 'var(--bg-secondary)',
                  color: form.result === r.value ? r.color : 'var(--text-secondary)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Notes */}
      <Field label="Notas">
        <textarea
          value={form.notes} rows={3}
          placeholder="Observações opcionais…"
          onChange={(e) => set('notes', e.target.value)}
          onFocus={inputFocus as any} onBlur={inputBlur as any}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      {/* Submit */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button
          type="button" onClick={() => navigate('/planilha')}
          style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={createBet.isLoading}
          style={{
            padding: '10px 32px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, var(--purple-700), var(--purple-600))',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 0 20px var(--purple-glow)',
            opacity: createBet.isLoading ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {createBet.isLoading ? 'Salvando…' : '✓ Registrar Aposta'}
        </button>
      </div>

      {createBet.isError && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontSize: 13,
        }}>
          Erro ao salvar. Verifique os campos e tente novamente.
        </div>
      )}
    </form>
  )
}

// ─── AI Extraction Tab ────────────────────────────────────────────────────────

interface ExtractedBetEdit extends AiExtractedBet {
  selected: boolean
  dateEdit: string
  matchEdit: string
  marketEdit: string
  amountWageredEdit: string
  oddsEdit: string
  payoutEdit: string
  resultEdit: BetResult
  bookmakerId: number | null
}

function AiTab() {
  const navigate = useNavigate()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles = [] } = useProfiles()

  const extractBets = useExtractBets()
  const createBatch = useCreateBetsBatch()

  const [model, setModel] = useState<'haiku' | 'sonnet'>('haiku')
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [extraction, setExtraction] = useState<AiExtractionResponse | null>(null)
  const [bets, setBets] = useState<ExtractedBetEdit[]>([])
  const [profileId, setProfileId] = useState('')
  const [saved, setSaved] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    setExtraction(null)
    setBets([])

    const result = await extractBets.mutateAsync({ file, model })
    setExtraction(result)
    setBets(result.bets.map((b) => ({
      ...b,
      selected: true,
      dateEdit: b.date ?? today(),
      matchEdit: b.match ?? '',
      marketEdit: b.market ?? '',
      amountWageredEdit: String(b.amountWagered ?? ''),
      oddsEdit: String(b.odds ?? ''),
      payoutEdit: String(b.payout ?? ''),
      resultEdit: b.result ?? 'pending',
      bookmakerId: b.bookmakerId,
    })))
  }, [model, extractBets])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const toggleBet = (i: number) =>
    setBets(prev => prev.map((b, idx) => idx === i ? { ...b, selected: !b.selected } : b))

  const updateBet = (i: number, patch: Partial<ExtractedBetEdit>) =>
    setBets(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b))

  const selectedBets = bets.filter(b => b.selected)

  const handleConfirm = async () => {
    if (!extraction || selectedBets.length === 0) return

    const payload: BetCreateInput[] = selectedBets.map(b => ({
      date:             b.dateEdit || today(),
      match:            b.matchEdit || null,
      market:           b.marketEdit || 'Sem mercado',
      bookmakerId:      b.bookmakerId ?? bookmakers[0]?.id ?? 1,
      betType:          b.betType ?? 'simple',
      amountWagered:    parseFloat(b.amountWageredEdit) || 0,
      odds:             b.oddsEdit ? parseFloat(b.oddsEdit) : null,
      payout:           parseFloat(b.payoutEdit) || 0,
      result:           b.resultEdit,
      bettingProfileId: profileId ? Number(profileId) : null,
    }))

    await createBatch.mutateAsync(payload)
    await betsService.confirmExtraction(extraction.extractionId, selectedBets.length)
    setSaved(true)
    setTimeout(() => navigate('/planilha'), 1400)
  }

  if (saved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 16 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <p style={{ color: 'var(--green)', fontWeight: 700, fontSize: 18 }}>{selectedBets.length} apostas confirmadas!</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Redirecionando…</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Section label="Extração por IA" />

      {/* Model selector */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Modelo:</span>
        {[
          { value: 'haiku', label: '⚡ Flash', desc: 'Rápido e gratuito' },
          { value: 'sonnet', label: '🧠 Pro', desc: 'Mais preciso' },
        ].map(m => (
          <button
            key={m.value} type="button"
            onClick={() => setModel(m.value as 'haiku' | 'sonnet')}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              border: model === m.value ? '1px solid var(--purple-600)' : '1px solid var(--border)',
              background: model === m.value ? 'rgba(124,58,237,0.18)' : 'var(--bg-secondary)',
              color: model === m.value ? 'var(--purple-300)' : 'var(--text-secondary)',
            }}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gemini 1.5 Flash / Pro</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--purple-500)' : 'var(--border-purple)'}`,
          borderRadius: 12,
          padding: '40px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer', transition: 'all 0.15s',
          background: dragging ? 'rgba(124,58,237,0.06)' : 'var(--bg-secondary)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef} type="file" accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
        />
        {preview ? (
          <img src={preview} alt="preview"
            style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
        ) : (
          <>
            <div style={{ fontSize: 40 }}>📸</div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
              Arraste um screenshot aqui
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              ou clique para selecionar — PNG, JPG, WEBP
            </p>
          </>
        )}
      </div>

      {/* Loading */}
      {extractBets.isLoading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', borderRadius: 10,
          background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-purple)',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid var(--purple-700)', borderTopColor: 'var(--purple-400)',
            animation: 'spin 0.7s linear infinite',
          }} />
          <span style={{ color: 'var(--purple-300)', fontWeight: 600, fontSize: 14 }}>
            Analisando imagem com IA…
          </span>
        </div>
      )}

      {/* Error */}
      {extractBets.isError && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#ef4444', fontSize: 13,
        }}>
          <strong>Erro ao processar imagem.</strong>
          {extractBets.error instanceof Error && (
            <p style={{ marginTop: 6, fontSize: 11, opacity: 0.8, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {(extractBets.error as any)?.response?.data?.detail ?? extractBets.error.message}
            </p>
          )}
        </div>
      )}

      {/* Warnings */}
      {extraction?.warnings && extraction.warnings.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
          fontSize: 12, color: '#eab308',
        }}>
          <strong>⚠ Avisos:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {extraction.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Extracted bets */}
      {bets.length > 0 && (
        <>
          <Section label={`${bets.length} Apostas Detectadas`} />

          {/* Profile selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Perfil VIP:
            </span>
            <select
              value={profileId} onChange={(e) => setProfileId(e.target.value)}
              style={{ ...inputStyle, maxWidth: 280 }}
            >
              <option value="">Nenhum / Própria</option>
              {profiles.filter(p => p.active).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bets.map((bet, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${bet.selected ? 'var(--border-purple)' : 'var(--border)'}`,
                  background: bet.selected ? 'rgba(45,31,94,0.12)' : 'var(--bg-secondary)',
                  opacity: bet.selected ? 1 : 0.55,
                  transition: 'all 0.15s',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: bet.selected ? 'rgba(45,31,94,0.3)' : 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <input
                    type="checkbox" checked={bet.selected}
                    onChange={() => toggleBet(i)}
                    style={{ width: 15, height: 15, accentColor: 'var(--purple-500)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                    Aposta {i + 1}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: `${CONFIDENCE_STYLE[bet.confidence].color}22`,
                    color: CONFIDENCE_STYLE[bet.confidence].color,
                    border: `1px solid ${CONFIDENCE_STYLE[bet.confidence].color}44`,
                  }}>
                    {CONFIDENCE_STYLE[bet.confidence].label}
                  </span>
                </div>

                {/* Fields */}
                <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label="Jogo">
                    <input
                      value={bet.matchEdit}
                      placeholder="Ex: Flamengo x Vasco"
                      onChange={(e) => updateBet(i, { matchEdit: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Mercado *">
                    <input
                      value={bet.marketEdit}
                      placeholder="Ex: +2.5 gols"
                      onChange={(e) => updateBet(i, { marketEdit: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Data">
                    <input
                      type="date" value={bet.dateEdit} max={today()}
                      onChange={(e) => updateBet(i, { dateEdit: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Casa de Apostas">
                    <select
                      value={bet.bookmakerId ?? ''}
                      onChange={(e) => updateBet(i, { bookmakerId: e.target.value ? Number(e.target.value) : null })}
                      style={inputStyle}
                    >
                      <option value="">Selecionar…</option>
                      {bookmakers.filter(b => b.active).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Apostado (R$)">
                    <input
                      type="number" min="0" step="0.01" value={bet.amountWageredEdit}
                      onChange={(e) => updateBet(i, { amountWageredEdit: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Odd">
                    <input
                      type="number" min="1" step="0.01" value={bet.oddsEdit}
                      onChange={(e) => updateBet(i, { oddsEdit: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Retorno (R$)">
                    <input
                      type="number" min="0" step="0.01" value={bet.payoutEdit}
                      onChange={(e) => updateBet(i, { payoutEdit: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Resultado">
                      <div style={{ display: 'flex', gap: 8 }}>
                        {RESULT_OPTS.map(r => (
                          <button
                            key={r.value} type="button"
                            onClick={() => updateBet(i, { resultEdit: r.value })}
                            style={{
                              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.15s',
                              border: bet.resultEdit === r.value ? `1px solid ${r.color}` : '1px solid var(--border)',
                              background: bet.resultEdit === r.value ? `${r.color}22` : 'var(--bg-secondary)',
                              color: bet.resultEdit === r.value ? r.color : 'var(--text-secondary)',
                            }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border-purple)',
            marginTop: 4,
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--purple-300)' }}>{selectedBets.length}</strong> de {bets.length} apostas selecionadas
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setBets(prev => prev.map(b => ({ ...b, selected: true })))}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Selec. todas
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedBets.length === 0 || createBatch.isLoading}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: selectedBets.length === 0
                    ? 'var(--bg-secondary)'
                    : 'linear-gradient(135deg, var(--purple-700), var(--purple-600))',
                  color: selectedBets.length === 0 ? 'var(--text-muted)' : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: selectedBets.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: selectedBets.length > 0 ? '0 0 16px var(--purple-glow)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {createBatch.isLoading ? 'Salvando…' : `✓ Confirmar ${selectedBets.length} aposta${selectedBets.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewBet() {
  const [tab, setTab] = useState<'manual' | 'ai'>('manual')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '32px 40px',
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          margin: 0, fontSize: 26, fontWeight: 800,
          background: 'linear-gradient(135deg, var(--purple-400), var(--purple-300))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Nova Aposta
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Registre manualmente ou extraia automaticamente de um screenshot
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')}>
          ✏️ Manual
        </TabBtn>
        <TabBtn active={tab === 'ai'} onClick={() => setTab('ai')}>
          🤖 Extração por IA
        </TabBtn>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '28px 32px',
        maxWidth: 900,
      }}>
        {tab === 'manual' ? <ManualTab /> : <AiTab />}
      </div>
    </div>
  )
}
