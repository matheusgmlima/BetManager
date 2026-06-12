import { useState, useMemo, useRef, useEffect } from 'react'
import MonthlyReportModal from '../components/MonthlyReportModal'
import { toast as sonnerToast } from 'sonner'
import * as XLSX from 'xlsx'
import { useBets, useUpdateBet, useDeleteBet, useUpdateBetResult, useCreateBet } from '../hooks/useBets'
import ImportModal from './ImportModal'
import { EmptyState, EmptyStateRow } from '../components/EmptyState'
import { useSports, useBookmakers, useTipsters, useProfiles } from '../hooks/useConfig'
import { BetResult, BetType, Bet } from '../types/bet.types'
import { useUnit } from '../contexts/UnitContext'
import { useMobile } from '../hooks/useMobile'
import { Icon } from '../components/Icon'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESULT_LABELS: Record<BetResult, string> = {
  won: 'Ganhou', lost: 'Perdeu', void: 'Void', pending: 'Pendente', cashout: 'Cashout',
}

const RESULT_STYLES: Record<BetResult, { bg: string; color: string; border: string; dot: string }> = {
  won:     { bg: 'rgba(34,197,94,0.10)',  color: '#22c55e', border: 'rgba(34,197,94,0.25)',  dot: '#22c55e' },
  lost:    { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', border: 'rgba(239,68,68,0.25)',  dot: '#ef4444' },
  void:    { bg: 'rgba(90,90,120,0.15)',  color: '#7070a0', border: 'rgba(90,90,120,0.30)',  dot: '#7070a0' },
  pending: { bg: 'rgba(234,179,8,0.10)',  color: '#eab308', border: 'rgba(234,179,8,0.25)',  dot: '#eab308' },
  cashout: { bg: 'rgba(59,130,246,0.10)', color: '#3b82f6', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6' },
}

// Cores únicas por perfil (cycling se tiver mais de 4)
const PROFILE_COLORS = ['#a78bfa', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#60a5fa']

function ResultBadge({ result }: { result: BetResult }) {
  const s = RESULT_STYLES[result] ?? RESULT_STYLES['pending']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {RESULT_LABELS[result]}
    </span>
  )
}

// ─── Inline result picker ─────────────────────────────────────────────────────
const RESULT_ORDER: BetResult[] = ['won', 'lost', 'void', 'pending', 'cashout']

function InlineResultPicker({ current, onPick, onClose, anchorRect }: {
  current: BetResult
  onPick: (r: BetResult) => void
  onClose: () => void
  anchorRect: DOMRect
}) {
  const ref = useRef<HTMLDivElement>(null)
  const PICKER_H = 160 // altura estimada do picker

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Abre para cima se não houver espaço abaixo
  const spaceBelow = window.innerHeight - anchorRect.bottom
  const top = spaceBelow >= PICKER_H
    ? anchorRect.bottom + 4
    : anchorRect.top - PICKER_H - 4

  return (
    <div ref={ref} style={{
      position: 'fixed',
      top,
      left: anchorRect.left,
      zIndex: 99999,
      background: '#0d0d1a', border: '1px solid rgba(124,58,237,0.4)',
      borderRadius: 10, padding: '6px', display: 'flex', flexDirection: 'column', gap: 3,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 120,
    }}>
      {RESULT_ORDER.map(r => {
        const s = RESULT_STYLES[r] ?? RESULT_STYLES['pending']
        return (
          <button
            key={r}
            onClick={e => { e.stopPropagation(); onPick(r) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 10px', borderRadius: 7, border: 'none',
              background: r === current ? `${s.bg}` : 'transparent',
              cursor: 'pointer', transition: 'background 0.12s',
              outline: r === current ? `1px solid ${s.border}` : 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = s.bg }}
            onMouseLeave={e => { e.currentTarget.style.background = r === current ? s.bg : 'transparent' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{RESULT_LABELS[r]}</span>
            {r === current && <span style={{ marginLeft: 'auto', fontSize: 9, color: s.color }}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ label, children, icon = '◈' }: { label: string; children: React.ReactNode; icon?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, color: '#8b5cf6', filter: 'drop-shadow(0 0 6px #8b5cf6)', lineHeight: 1 }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
          background: 'linear-gradient(90deg, #a78bfa, #c4b5fd, #a78bfa)',
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'shimmer 4s linear infinite',
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(139,92,246,0.4), rgba(139,92,246,0.05), transparent)' }} />
        <span style={{ fontSize: 14, color: '#8b5cf6', filter: 'drop-shadow(0 0 6px #8b5cf6)', lineHeight: 1 }}>{icon}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = 'date' | 'description' | 'odds' | 'amountWagered' | 'payout' | 'profit' | 'result'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1, marginLeft: 4, opacity: active ? 1 : 0.3 }}>
      <span style={{ fontSize: 7, lineHeight: 1, color: active && dir === 'asc'  ? '#a78bfa' : '#5a5a78' }}>▲</span>
      <span style={{ fontSize: 7, lineHeight: 1, color: active && dir === 'desc' ? '#a78bfa' : '#5a5a78' }}>▼</span>
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKEL_WIDTHS = [50, '75%', '55%', '60%', '50%', '40%', '45%', '50%', '40%', '35%', '30%']

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {SKEL_WIDTHS.map((w, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div style={{
            height: 13, borderRadius: 6,
            background: 'linear-gradient(90deg, #1a1a2e 25%, #242438 50%, #1a1a2e 75%)',
            backgroundSize: '200% auto', animation: 'shimmer 1.4s linear infinite',
            width: w,
            animationDelay: `${i * 60}ms`,
          }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color = '#8b5cf6' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div
      className="anim-slide-up"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 18px',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 16px ${color}33` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ─── Pag button ───────────────────────────────────────────────────────────────

function PagBtn({ label, onClick, disabled = false, active = false }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 30, borderRadius: 7, fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
        background: active ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : 'var(--bg-card)',
        border: `1px solid ${active ? '#7c3aed' : 'var(--border)'}`,
        color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        boxShadow: active ? '0 0 12px rgba(124,58,237,0.35)' : 'none',
        opacity: disabled ? 0.4 : 1, padding: '0 6px',
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.borderColor = '#7c3aed' }}
      onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {label}
    </button>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ bet, onClose }: { bet: Bet; onClose: () => void }) {
  const { data: sports     = [] } = useSports()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles   = [] } = useProfiles()
  const { data: tipsters   = [] } = useTipsters()
  const updateBet = useUpdateBet()

  const [form, setForm] = useState({
    date:            bet.date.split('T')[0],
    match:           bet.match ?? '',
    market:          bet.market,
    sportId:         String(bet.sport?.id ?? ''),
    bookmakerId:     String(bet.bookmaker.id),
    betType:         bet.betType as BetType,
    odds:            bet.odds != null ? String(bet.odds) : '',
    amountWagered:   String(bet.amountWagered),
    payout:          String(bet.payout),
    result:          bet.result as BetResult,
    notes:           bet.notes ?? '',
    bettingProfileId: String((bet as any).bettingProfileId ?? ''),
    tipsterId:        String(bet.tipster?.id ?? ''),
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const inp: React.CSSProperties = {
    width: '100%', background: '#0d0d1a', border: '1px solid #2d1f5e',
    borderRadius: 8, padding: '8px 11px', color: '#e0e0ff', fontSize: 13,
    outline: 'none', transition: 'border-color 0.15s',
  }
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#6d5a9a', marginBottom: 4, display: 'block',
  }

  const set = (k: string, v: string) => {
    setForm(f => {
      const next: any = { ...f, [k]: v }
      if (k === 'odds' || k === 'amountWagered') {
        const amt = parseFloat(k === 'amountWagered' ? v : f.amountWagered)
        const odd = parseFloat(k === 'odds' ? v : f.odds)
        if (!isNaN(amt) && !isNaN(odd) && odd >= 1 && amt > 0) next.payout = (amt * odd).toFixed(2)
      }
      if (k === 'result') {
        const amt = parseFloat(f.amountWagered)
        const odd = parseFloat(f.odds)
        if (v === 'lost') next.payout = '0'
        else if (v === 'void' && !isNaN(amt)) next.payout = amt.toFixed(2)
        else if (v === 'won' && !isNaN(amt) && !isNaN(odd)) next.payout = (amt * odd).toFixed(2)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!form.market || !form.bookmakerId || !form.amountWagered) { setErr('Preencha os campos obrigatórios'); return }
    setSaving(true)
    try {
      await updateBet.mutateAsync({
        id: bet.id,
        data: {
          date:            form.date,
          match:           form.match || null,
          market:          form.market,
          sportId:         form.sportId ? Number(form.sportId) : undefined,
          bookmakerId:     Number(form.bookmakerId),
          betType:         form.betType,
          odds:            form.odds ? parseFloat(form.odds) : null,
          amountWagered:   parseFloat(form.amountWagered),
          payout:          parseFloat(form.payout),
          result:          form.result,
          notes:           form.notes || undefined,
          bettingProfileId: form.bettingProfileId ? Number(form.bettingProfileId) : null,
          tipsterId:        form.tipsterId ? Number(form.tipsterId) : null,
        },
      })
      sonnerToast.success('Aposta atualizada!')
      onClose()
    } catch {
      setErr('Erro ao salvar. Tente novamente.')
      sonnerToast.error('Erro ao salvar aposta.')
    }
    finally { setSaving(false) }
  }

  const RESULT_OPTS: { value: BetResult; label: string; color: string }[] = [
    { value: 'won',     label: '✓ Ganhou',   color: '#22c55e' },
    { value: 'lost',    label: '✗ Perdeu',   color: '#ef4444' },
    { value: 'pending', label: '◷ Pendente', color: '#eab308' },
    { value: 'void',    label: '∅ Void',     color: '#7070a0' },
    { value: 'cashout', label: '↩ Cashout',  color: '#3b82f6' },
  ]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 620, background: '#0a0a14',
        border: '1px solid #2d1f5e', borderRadius: 20, padding: '28px 28px 24px',
        boxShadow: '0 0 60px rgba(124,58,237,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>Editar Aposta</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6d5a9a', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Data */}
          <div><label style={lbl}>Data *</label><input type="date" style={inp} value={form.date} onChange={e => set('date', e.target.value)} /></div>
          {/* Perfil */}
          <div>
            <label style={lbl}>Perfil *</label>
            <select style={inp} value={form.bettingProfileId} onChange={e => set('bettingProfileId', e.target.value)}>
              <option value="">Selecionar…</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Tipster */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Tipster / VIP</label>
            <select style={inp} value={form.tipsterId} onChange={e => set('tipsterId', e.target.value)}>
              <option value="">— Nenhum —</option>
              {tipsters.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {/* Jogo */}
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Jogo (opcional)</label><input style={inp} placeholder="Ex: Sport x Flamengo" value={form.match} onChange={e => set('match', e.target.value)} /></div>
          {/* Mercado */}
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Mercado *</label><input style={inp} placeholder="Ex: +2.5 gols" value={form.market} onChange={e => set('market', e.target.value)} /></div>
          {/* Esporte */}
          <div>
            <label style={lbl}>Esporte</label>
            <select style={inp} value={form.sportId} onChange={e => set('sportId', e.target.value)}>
              <option value="">—</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>
          {/* Casa */}
          <div>
            <label style={lbl}>Casa *</label>
            <select style={inp} value={form.bookmakerId} onChange={e => set('bookmakerId', e.target.value)}>
              <option value="">Selecionar…</option>
              {bookmakers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {/* Tipo */}
          <div>
            <label style={lbl}>Tipo</label>
            <select style={inp} value={form.betType} onChange={e => set('betType', e.target.value)}>
              <option value="simple">Simples</option>
              <option value="combined">Combinada</option>
            </select>
          </div>
          {/* Odd */}
          <div><label style={lbl}>Odd</label><input type="number" style={inp} step="0.01" min="1" placeholder="1.80" value={form.odds} onChange={e => set('odds', e.target.value)} /></div>
          {/* Apostado */}
          <div><label style={lbl}>Apostado (R$) *</label><input type="number" style={inp} step="0.01" min="0.01" placeholder="0.00" value={form.amountWagered} onChange={e => set('amountWagered', e.target.value)} /></div>
          {/* Retorno */}
          <div><label style={lbl}>Retorno (R$)</label><input type="number" style={inp} step="0.01" min="0" placeholder="0.00" value={form.payout} onChange={e => set('payout', e.target.value)} /></div>
          {/* Resultado */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Resultado</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RESULT_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('result', opt.value)}
                  style={{
                    flex: '1 1 auto', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: form.result === opt.value ? `${opt.color}22` : '#0d0d1a',
                    border: `1px solid ${form.result === opt.value ? opt.color : '#2d1f5e'}`,
                    color: form.result === opt.value ? opt.color : '#6d5a9a',
                    boxShadow: form.result === opt.value ? `0 0 12px ${opt.color}40` : 'none',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          {/* Notas */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Notas</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} placeholder="Observações…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {err && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, background: 'none', border: '1px solid #2d1f5e', color: '#6d5a9a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
              border: '1px solid #7c3aed', color: '#fff', cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >{saving ? 'Salvando…' : '✓ Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ bet, onClose, onConfirm }: { bet: Bet; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'anim-fade-in 0.15s ease' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 400, background: '#0a0a14', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 18, padding: '32px 28px', boxShadow: '0 0 60px rgba(239,68,68,0.12), 0 24px 48px rgba(0,0,0,0.6)', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginLeft: 'auto', marginRight: 'auto' }}>
          <Icon name="trash" size={22} color="#ef4444" />
        </div>

        <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>Excluir aposta?</p>

        {/* Bet details */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, textAlign: 'left' }}>
          {bet.match && <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#a78bfa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.match}</p>}
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.market}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#7070a0' }}>{bet.bookmaker?.name}</span>
            <span style={{ fontSize: 11, color: '#7070a0' }}>R$ {Number(bet.amountWagered).toFixed(2)}</span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.6)', marginBottom: 24 }}>Esta ação não pode ser desfeita.</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose} disabled={loading}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#4a3a6a' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm} disabled={loading}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: loading ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.7)' } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
          >
            {loading ? (
              <><span style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Excluindo...</>
            ) : (
              'Excluir'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bet Row ──────────────────────────────────────────────────────────────────

// ─── CombinedDetailsPopup ─────────────────────────────────────────────────────

interface CombinedRow { game: string; selections: string[] }

function parseCombinedMatch(match: string): CombinedRow[] {
  // New format: "Jogo1 {Sel1, Sel2}; Jogo2 {Sel3}"
  const newFmt = /\{[^}]+\}/
  if (newFmt.test(match)) {
    return match.split(';').map(s => s.trim()).filter(Boolean).map(block => {
      const braceIdx = block.indexOf('{')
      if (braceIdx === -1) return { game: block, selections: [] }
      const game = block.slice(0, braceIdx).trim()
      const sels = block.slice(braceIdx + 1, block.lastIndexOf('}')).split(',').map(s => s.trim()).filter(Boolean)
      return { game, selections: sels }
    })
  }
  // Legacy format: games and markets were separate (semicolon-separated)
  return match.split(';').map(s => s.trim()).filter(Boolean).map(g => ({ game: g, selections: [] }))
}

function CombinedDetailsPopup({ bet, onClose }: { bet: Bet; onClose: () => void }) {
  // market holds "Jogo {Sel1, Sel2}; Jogo2 {Sel3}" for combined bets
  const rows = parseCombinedMatch(bet.market ?? '')

  // Legacy fallback: market was flat list, match had the games
  const legacyGames   = (bet.match  ?? '').split(';').map(s => s.trim()).filter(Boolean)
  const legacyMarkets = (bet.market ?? '').split(';').map(s => s.trim()).filter(Boolean)
  const useLegacy     = rows.every(r => r.selections.length === 0 && !r.game.includes(' x ') && !r.game.includes(' - '))

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '24px 28px', minWidth: 340, maxWidth: 520, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#a78bfa', textTransform: 'uppercase' }}>
              Combinada
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
              {rows.length} {rows.length === 1 ? 'seleção' : 'seleções'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 16,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(useLegacy ? legacyGames.map((g, i) => ({ game: g, selections: legacyMarkets[i] ? [legacyMarkets[i]] : [] })) : rows).map((row, i) => {
            const sels = row.selections
            return (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 6 }}>
                  JOGO {i + 1}
                </div>
                {row.game && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: sels.length ? 8 : 0 }}>
                    {row.game}
                  </div>
                )}
                {sels.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sels.map((sel, j) => (
                      <div key={j} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 6,
                        fontSize: 12, color: 'var(--text-secondary)',
                      }}>
                        <span style={{ color: '#6d28d9', marginTop: 1, flexShrink: 0 }}>›</span>
                        {sel}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {bet.odds != null && (
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Odd total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#eab308', fontFamily: 'monospace' }}>
              {bet.odds.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BulkDeleteConfirm ────────────────────────────────────────────────────────

function BulkDeleteConfirm({ count, onClose, onConfirm, loading }: { count: number; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 380, background: '#0a0a14', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 16, padding: '28px 24px', boxShadow: '0 0 40px rgba(239,68,68,0.15)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, marginLeft: 'auto', marginRight: 'auto', fontSize: 20, color: '#ef4444' }}>✕</div>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Excluir {count} aposta{count !== 1 ? 's' : ''}?</p>
        <p style={{ fontSize: 12, color: '#6d5a9a', margin: '0 0 20px' }}>Esta ação não pode ser desfeita.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '9px 20px', borderRadius: 8, background: 'none', border: '1px solid #2d1f5e', color: '#6d5a9a', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '9px 20px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Excluindo…' : 'Excluir tudo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BetRow ───────────────────────────────────────────────────────────────────

function BetRow({ bet, odd, selected, onToggle, onEdit, onDelete, onShare, onUpdateResult, onDuplicate, isMobile = false }: {
  bet: Bet; odd: boolean; selected: boolean; isMobile?: boolean
  onToggle: (id: number) => void; onEdit: (b: Bet) => void; onDelete: (b: Bet) => void; onShare: (b: Bet) => void
  onUpdateResult: (id: number, result: BetResult, payout: number) => void
  onDuplicate: (b: Bet) => void
}) {
  const [hovered,       setHovered]       = useState(false)
  const [showCombined,  setShowCombined]  = useState(false)
  const [showResultPicker, setShowResultPicker] = useState(false)
  const [pickerAnchor,     setPickerAnchor]     = useState<DOMRect | null>(null)
  const [updatingResult,   setUpdatingResult]   = useState(false)
  const [cashoutDialog,    setCashoutDialog]    = useState<{ open: boolean; value: string }>({ open: false, value: '' })
  const { fmtMoney }                      = useUnit()
  const td: React.CSSProperties = { padding: '11px 14px', fontSize: 12 }

  const isCombined = bet.isCombined
  const allGames   = isCombined
    ? (bet.match ?? '').split(';').map(s => s.trim()).filter(Boolean)
    : bet.match ? [bet.match] : []
  const gameCount  = allGames.length

  // Market subtitle: for combined, extract ALL selections across all games
  const marketSubtitle = (() => {
    if (!isCombined) return bet.market || null
    const raw = bet.market ?? ''
    if (raw.includes('{')) {
      // new format: "Jogo {Sel1, Sel2}; Jogo2 {Sel3}" → "Sel1, Sel2, Sel3"
      const sels: string[] = []
      const blocks = raw.split(';').map(s => s.trim())
      for (const block of blocks) {
        const start = block.indexOf('{')
        const end   = block.lastIndexOf('}')
        if (start !== -1 && end !== -1) {
          block.slice(start + 1, end).split(',').forEach(s => { const t = s.trim(); if (t) sels.push(t) })
        }
      }
      return sels.join('  ·  ') || null
    }
    // legacy flat format
    return raw.split(';').map(s => s.trim()).filter(Boolean).join('  ·  ') || null
  })()

  // Render game header based on count
  function GameHeader() {
    if (!isCombined || gameCount <= 1) {
      return allGames[0]
        ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 12 }}>{allGames[0]}</span>
        : null
    }
    if (gameCount === 2) {
      return (
        <button onClick={e => { e.stopPropagation(); setShowCombined(true) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
            {allGames[0]}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, margin: '0 5px' }}>·</span>
            {allGames[1]}
          </span>
        </button>
      )
    }
    // 3+ games
    return (
      <button onClick={e => { e.stopPropagation(); setShowCombined(true) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>
          {allGames[0]}
        </span>
        <span style={{
          flexShrink: 0, padding: '1px 7px', borderRadius: 5,
          border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.10)',
          color: '#a78bfa', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          +{gameCount - 1} jogos
        </span>
      </button>
    )
  }

  return (
    <>
      {showCombined && <CombinedDetailsPopup bet={bet} onClose={() => setShowCombined(false)} />}
      <tr
        style={{
          borderBottom: '1px solid var(--border)',
          background: selected ? 'rgba(124,58,237,0.08)' : hovered ? 'rgba(124,58,237,0.05)' : odd ? 'rgba(255,255,255,0.013)' : 'transparent',
          transition: 'background 0.12s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
      {/* Checkbox */}
      <td style={{ ...td, width: 36, paddingRight: 4 }} onClick={e => { e.stopPropagation(); onToggle(bet.id) }}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, cursor: 'pointer',
          border: `2px solid ${selected ? '#7c3aed' : 'rgba(255,255,255,0.2)'}`,
          background: selected ? '#7c3aed' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
        }}>
          {selected && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>
      </td>
      <td style={{ ...td, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
        {fmtDate(bet.date)}
      </td>
      <td style={{ ...td, color: 'var(--text-primary)', maxWidth: 280 }}>
        <GameHeader />
        {marketSubtitle && (
          <span style={{
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'var(--text-secondary)', fontSize: 11, marginTop: allGames.length ? 2 : 0,
          }}>
            {marketSubtitle}
          </span>
        )}
        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
          {isCombined && (
            <button
              onClick={e => { e.stopPropagation(); setShowCombined(true) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#a78bfa', textTransform: 'uppercase' }}
            >combinada ›</button>
          )}
          {bet.source === 'ai_extract' && <span style={{ fontSize: 9, fontWeight: 700, color: '#c084fc' }}>✦ IA</span>}
        </div>
      </td>
      <td style={{ ...td, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {bet.sport ? `${bet.sport.icon ?? ''} ${bet.sport.name}`.trim() : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
          background: `${bet.bookmaker.color ?? '#6d28d9'}18`,
          border: `1px solid ${bet.bookmaker.color ?? '#6d28d9'}33`,
          color: bet.bookmaker.color ?? '#a78bfa', fontSize: 11, fontWeight: 700,
        }}>
          {bet.bookmaker.name}
        </span>
      </td>
      <td style={{ ...td, textAlign: 'right', color: '#eab308', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {bet.odds != null ? bet.odds.toFixed(2) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td style={{ ...td, textAlign: 'right', color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
        {fmtMoney(bet.amountWagered)}
      </td>
      <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
        {fmtMoney(bet.payout)}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap', position: 'relative' }}>
        <button
          title="Clique para alterar resultado"
          onClick={e => {
            e.stopPropagation()
            setPickerAnchor(e.currentTarget.getBoundingClientRect())
            setShowResultPicker(v => !v)
          }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ResultBadge result={bet.result} />
          {updatingResult
            ? <span style={{ fontSize: 9, color: '#a78bfa', animation: 'pulse 1s infinite' }}>⟳</span>
            : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', opacity: (isMobile || hovered) ? 1 : 0, transition: 'opacity 0.15s' }}>▾</span>
          }
        </button>
        {showResultPicker && pickerAnchor && (
          <InlineResultPicker
            current={bet.result}
            anchorRect={pickerAnchor}
            onPick={async r => {
              setShowResultPicker(false)
              if (r === bet.result) return
              if (r === 'cashout') {
                setCashoutDialog({ open: true, value: String(bet.amountWagered) })
                return
              }
              setUpdatingResult(true)
              const payout = r === 'won' ? (bet.amountWagered * (bet.odds ?? 1)) : r === 'void' ? bet.amountWagered : 0
              await onUpdateResult(bet.id, r, payout)
              setUpdatingResult(false)
            }}
            onClose={() => setShowResultPicker(false)}
          />
        )}

        {/* ── Cashout dialog ── */}
        {cashoutDialog.open && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => { if (e.target === e.currentTarget) setCashoutDialog({ open: false, value: '' }) }}
          >
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 14, padding: '24px 28px', minWidth: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Valor do Cashout</p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>Apostado: R$ {bet.amountWagered.toFixed(2)}</p>
              <input
                autoFocus
                type="number"
                step="0.01"
                min="0"
                value={cashoutDialog.value}
                onChange={e => setCashoutDialog(d => ({ ...d, value: e.target.value }))}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    const v = parseFloat(cashoutDialog.value)
                    if (isNaN(v) || v < 0) return
                    setCashoutDialog({ open: false, value: '' })
                    setUpdatingResult(true)
                    await onUpdateResult(bet.id, 'cashout', v)
                    setUpdatingResult(false)
                  }
                  if (e.key === 'Escape') setCashoutDialog({ open: false, value: '' })
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.4)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                placeholder="Ex: 12.50"
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setCashoutDialog({ open: false, value: '' })} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button
                  onClick={async () => {
                    const v = parseFloat(cashoutDialog.value)
                    if (isNaN(v) || v < 0) return
                    setCashoutDialog({ open: false, value: '' })
                    setUpdatingResult(true)
                    await onUpdateResult(bet.id, 'cashout', v)
                    setUpdatingResult(false)
                  }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </td>
      <td style={{
        ...td, textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', whiteSpace: 'nowrap',
        color: bet.profit > 0 ? '#22c55e' : bet.profit < 0 ? '#ef4444' : 'var(--text-muted)',
      }}>
        {bet.profit > 0 ? '+' : bet.profit < 0 ? '−' : ''}
        {bet.profit !== 0 ? fmtMoney(Math.abs(bet.profit)) : '—'}
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', opacity: (isMobile || hovered) ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(bet) }}
            title="Duplicar"
            style={{
              width: 28, height: 28, borderRadius: 7, fontSize: 12, cursor: 'pointer',
              background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)',
              color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.22)'; e.currentTarget.style.borderColor = '#34d399' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.10)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)' }}
          >⎘</button>
          <button
            onClick={() => onShare(bet)}
            title="Compartilhar"
            style={{
              width: 28, height: 28, borderRadius: 7, fontSize: 13, cursor: 'pointer',
              background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.25)',
              color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.22)'; e.currentTarget.style.borderColor = '#38bdf8' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.10)'; e.currentTarget.style.borderColor = 'rgba(14,165,233,0.25)' }}
          >⤴</button>
          <button
            onClick={() => onEdit(bet)}
            title="Editar"
            style={{
              width: 28, height: 28, borderRadius: 7, fontSize: 13, cursor: 'pointer',
              background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.25)'; e.currentTarget.style.borderColor = '#7c3aed' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
          >✎</button>
          <button
            onClick={() => onDelete(bet)}
            title="Excluir"
            style={{
              width: 28, height: 28, borderRadius: 7, fontSize: 13, cursor: 'pointer',
              background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; e.currentTarget.style.borderColor = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
          >✕</button>
        </div>
      </td>
      </tr>
    </>
  )
}

// ─── Month group helpers ──────────────────────────────────────────────────────

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function monthKey(iso: string) {
  const [y, m] = iso.split('T')[0].split('-')
  return `${y}-${m}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
}
function calcMonthStats(bets: Bet[]) {
  const settled  = bets.filter(b => b.result !== 'pending')
  const won      = settled.filter(b => b.result === 'won').length
  const lost     = settled.filter(b => b.result === 'lost').length
  const cashout  = settled.filter(b => b.result === 'cashout').length
  const wagered  = settled.reduce((s, b) => s + Number(b.amountWagered), 0)
  const profit   = bets.reduce((s, b) => s + Number(b.profit ?? 0), 0)
  const total    = won + lost + cashout
  const hr       = total > 0 ? ((won + cashout * 0.5) / total) * 100 : null
  return { total: bets.length, won, lost, cashout, wagered, profit, hitRate: hr }
}

// ─── BetTable (tabela — reutilizada por cada tab) ─────────────────────────────

const PAGE_SIZES = [10, 25, 50]

function BetTable({ tipsterId, accentColor, isMobile = false }: { tipsterId: number | null; accentColor: string; isMobile?: boolean }) {
  const { fmtMoney } = useUnit()
  const [search,     setSearch]     = useState('')
  const [resultF,    setResultF]    = useState<BetResult | ''>('')
  const [betTypeF,   setBetTypeF]   = useState<BetType | ''>('')
  const [sportIdF,   setSportIdF]   = useState<number | ''>('')
  const [bookmakerF, setBookmakerF] = useState<number | ''>('')
  const [profileF,   setProfileF]   = useState<number | ''>('')
  const [oddsMinF,   setOddsMinF]   = useState('')
  const [oddsMaxF,   setOddsMaxF]   = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [page,       setPage]       = useState(1)
  const [perPage,    setPerPage]    = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<'grouped' | 'paginated'>('grouped')
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [editingBet, setEditingBet] = useState<Bet | null>(null)
  const [deletingBet, setDeletingBet] = useState<Bet | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const deleteBet = useDeleteBet()
  const updateResult = useUpdateBetResult()
  const createBet = useCreateBet()

  async function handleUpdateResult(id: number, result: BetResult, payout: number) {
    try {
      await updateResult.mutateAsync({ id, result, payout })
      sonnerToast.success('Resultado atualizado!')
    } catch {
      sonnerToast.error('Erro ao atualizar resultado')
    }
  }

  async function handleShare(bet: Bet) {
    try {
      const r = await import('../services/api').then(m => m.api.post<{ token: string }>(`/api/bets/${bet.id}/share`))
      const url = `${window.location.origin}/share/${r.data.token}`
      await navigator.clipboard.writeText(url)
      sonnerToast.success('Link copiado!', { description: url })
    } catch {
      sonnerToast.error('Erro ao gerar link')
    }
  }


  async function handleDuplicate(bet: Bet) {
    try {
      const today = new Date().toISOString().split('T')[0]
      await createBet.mutateAsync({
        date: today,
        match: bet.match,
        market: bet.market,
        sportId: bet.sport?.id,
        bookmakerId: bet.bookmaker.id,
        betType: bet.betType,
        amountWagered: bet.amountWagered,
        odds: bet.odds,
        payout: 0,
        result: 'pending',
        notes: bet.notes ?? undefined,
        tipsterId: bet.tipster?.id,
      })
      sonnerToast.success('Aposta duplicada!')
    } catch {
      sonnerToast.error('Erro ao duplicar aposta')
    }
  }

  function exportExcel() {
    const RESULT_PT: Record<string, string> = { won: 'Ganhou', lost: 'Perdeu', void: 'Void', pending: 'Pendente', cashout: 'Cashout' }
    const TYPE_PT: Record<string, string>   = { simple: 'Simples', combined: 'Combinada' }

    const rows = sorted.map(b => ({
      'Data':       b.date.split('T')[0],
      'Partida':    b.match ?? '',
      'Mercado':    b.market,
      'Esporte':    b.sport?.name ?? '',
      'Casa':       b.bookmaker.name,
      'Tipo':       TYPE_PT[b.betType] ?? b.betType,
      'Odd':        b.odds ?? '',
      'Apostado':   Number(b.amountWagered.toFixed(2)),
      'Retorno':    Number(b.payout.toFixed(2)),
      'Resultado':  RESULT_PT[b.result] ?? b.result,
      'Lucro':      Number(b.profit.toFixed(2)),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // Largura das colunas
    ws['!cols'] = [
      { wch: 12 }, { wch: 32 }, { wch: 24 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 8  }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Apostas')
    XLSX.writeFile(wb, `apostas_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Grouped mode: fetch all bets at once (large perPage)
  const effectivePage    = viewMode === 'grouped' ? 1 : page
  const effectivePerPage = viewMode === 'grouped' ? 2000 : perPage

  const { data, isLoading, isError } = useBets({
    page: effectivePage, perPage: effectivePerPage,
    search:           search      || undefined,
    result:           resultF     || undefined,
    betType:          betTypeF    || undefined,
    sportId:          sportIdF    || undefined,
    bookmakerId:      bookmakerF  || undefined,
    bettingProfileId: profileF    || undefined,
    oddsMin:          oddsMinF ? Number(oddsMinF) : undefined,
    oddsMax:          oddsMaxF ? Number(oddsMaxF) : undefined,
    dateFrom:         dateFrom    || undefined,
    dateTo:           dateTo      || undefined,
    tipsterId:        tipsterId   ?? undefined,
  })

  const { data: sports     = [] } = useSports()
  const { data: bookmakers = [] } = useBookmakers()
  const { data: profiles   = [] } = useProfiles()

  const bets       = data?.data ?? []
  const pagination = data?.pagination
  const summary    = data?.summary
  const totalPages = pagination?.totalPages ?? 1
  const hasFilters = !!(search || resultF || betTypeF || sportIdF || bookmakerF || profileF || oddsMinF || oddsMaxF || dateFrom || dateTo)

  const allIdsOnPage = bets.map((b: Bet) => b.id)
  const allSelected  = allIdsOnPage.length > 0 && allIdsOnPage.every((id: number) => selectedIds.has(id))
  const someSelected = allIdsOnPage.some((id: number) => selectedIds.has(id))

  function toggleMonth(key: string) {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleOne(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); allIdsOnPage.forEach((id: number) => next.delete(id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); allIdsOnPage.forEach((id: number) => next.add(id)); return next })
    }
  }
  async function handleBulkDelete() {
    setBulkLoading(true)
    const count = selectedIds.size
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteBet.mutateAsync(id)))
      setSelectedIds(new Set())
      setBulkDeleting(false)
      sonnerToast.success(`${count} aposta${count !== 1 ? 's' : ''} deletada${count !== 1 ? 's' : ''}.`)
    } catch {
      sonnerToast.error('Erro ao deletar apostas.')
    } finally {
      setBulkLoading(false)
    }
  }

  const sorted = useMemo(() => {
    const rows = [...bets]
    const primary = (a: Bet, b: Bet): number => {
      let va: string | number, vb: string | number
      if (sortKey === 'description') { va = a.market; vb = b.market }
      else if (sortKey === 'result') { va = a.result; vb = b.result }
      else { va = (a[sortKey] as number) ?? 0; vb = (b[sortKey] as number) ?? 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    }
    rows.sort((a, b) => {
      const p = primary(a, b)
      if (p !== 0) return p
      // Escada: empate no critério principal (ex.: mesma data) → mantém apostas
      // do mesmo jogo adjacentes, ordenadas por mercado para formar a sequência.
      const ma = (a.match ?? '').toLowerCase()
      const mb = (b.match ?? '').toLowerCase()
      if (ma < mb) return -1
      if (ma > mb) return 1
      return (a.market ?? '').localeCompare(b.market ?? '')
    })
    return rows
  }, [bets, sortKey, sortDir])

  // Month grouping — after sorted
  const monthGroups = useMemo(() => {
    if (viewMode !== 'grouped') return null
    const map = new Map<string, Bet[]>()
    for (const bet of sorted) {
      const k = monthKey(bet.date)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(bet)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [viewMode, sorted])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function resetFilters() {
    setSearch(''); setResultF(''); setBetTypeF('')
    setSportIdF(''); setBookmakerF(''); setProfileF('')
    setOddsMinF(''); setOddsMaxF(''); setDateFrom(''); setDateTo('')
    setPage(1)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '7px 10px', fontSize: 12,
    color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.15s',
  }

  const thBase: React.CSSProperties = {
    padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
    userSelect: 'none', background: 'rgba(9,9,15,0.6)',
  }
  const thSortable: React.CSSProperties = { ...thBase, cursor: 'pointer' }

  const selCount = selectedIds.size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: selCount > 0 ? 80 : 0 }}>
      {editingBet && <EditModal bet={editingBet} onClose={() => setEditingBet(null)} />}
      {deletingBet && (
        <DeleteConfirm
          bet={deletingBet}
          onClose={() => setDeletingBet(null)}
          onConfirm={async () => {
            await deleteBet.mutateAsync(deletingBet.id)
            setDeletingBet(null)
            sonnerToast.success('Aposta deletada.')
          }}
        />
      )}
      {bulkDeleting && (
        <BulkDeleteConfirm
          count={selCount}
          loading={bulkLoading}
          onClose={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
        />
      )}

      {/* Barra de ação em lote */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        transform: selCount > 0 ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        background: 'rgba(8,5,22,0.96)', backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(239,68,68,0.3)',
        padding: isMobile ? '10px 16px 20px' : '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#ef4444' }}>✕</div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{selCount} aposta{selCount !== 1 ? 's' : ''} selecionada{selCount !== 1 ? 's' : ''}</p>
            {!isMobile && <p style={{ margin: 0, fontSize: 11, color: '#6d5a9a' }}>Selecione mais ou confirme a ação</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#a0a0c0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >Desmarcar</button>
          <button
            onClick={() => setBulkDeleting(true)}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)',
              color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.28)'; e.currentTarget.style.borderColor = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
          ><Icon name="trash" size={14} color="#ef4444" style={{ marginRight: 5 }} /> Excluir {selCount}</button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          <SummaryCard label="Total apostado"    value={fmtMoney(summary.totalWagered)} color={accentColor} />
          <SummaryCard
            label="Lucro total"
            value={`${summary.totalProfit >= 0 ? '+' : ''}${fmtMoney(summary.totalProfit)}`}
            color={summary.totalProfit >= 0 ? '#22c55e' : '#ef4444'}
          />
          <SummaryCard label="Taxa de acerto" value={summary.hitRatePct != null ? `${summary.hitRatePct.toFixed(1)}%` : '—'} color="#a78bfa" />
          <SummaryCard label="Apostas" value={String(summary.totalBets)} sub={pagination ? `Pág. ${pagination.page}/${pagination.totalPages}` : ''} color="#c084fc" />
        </div>
      )}

      {/* Controles: view mode + filtros + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['grouped', 'paginated'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: viewMode === mode ? accentColor : 'transparent',
                color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                boxShadow: viewMode === mode ? `0 0 10px ${accentColor}60` : 'none',
              }}
            >
              <Icon name={mode === 'grouped' ? 'calendar' : 'grid'} size={13} color={viewMode === mode ? '#fff' : 'var(--text-muted)'} style={{ marginRight: 5 }} />
              {mode === 'grouped' ? 'Por mês' : 'Paginado'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportExcel}
            disabled={sorted.length === 0}
            title="Exportar Excel (.xlsx)"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: sorted.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', opacity: sorted.length === 0 ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (sorted.length > 0) { e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.color = '#34d399' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {isMobile ? '↓' : '↓ Excel'}
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: showFilters ? `${accentColor}20` : 'var(--bg-card)',
              border: `1px solid ${showFilters ? accentColor + '60' : 'var(--border)'}`,
              color: showFilters ? accentColor : 'var(--text-secondary)',
            }}
          >
            ⊟ Filtros {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />}
          </button>
        </div>
      </div>

      {/* Quick result filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([
          { value: '' as BetResult | '', label: 'Todos', color: '#6d5a9a' },
          { value: 'won' as BetResult, label: '✓ Ganhou', color: '#22c55e' },
          { value: 'lost' as BetResult, label: '✗ Perdeu', color: '#ef4444' },
          { value: 'pending' as BetResult, label: '◷ Pendente', color: '#eab308' },
          { value: 'void' as BetResult, label: '∅ Void', color: '#7070a0' },
          { value: 'cashout' as BetResult, label: '↩ Cashout', color: '#3b82f6' },
        ]).map(opt => (
          <button
            key={opt.value}
            onClick={() => { setResultF(opt.value as BetResult | ''); setPage(1) }}
            style={{
              padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              background: resultF === opt.value ? `${opt.color}18` : 'var(--bg-card)',
              border: `1px solid ${resultF === opt.value ? opt.color + '55' : 'var(--border)'}`,
              color: resultF === opt.value ? opt.color : 'var(--text-muted)',
              boxShadow: resultF === opt.value ? `0 0 10px ${opt.color}22` : 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="anim-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Busca</label>
              <input style={inputStyle} placeholder="Descrição..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
            </div>
            {[
              { label: 'Resultado', node: <select style={inputStyle} value={resultF} onChange={e => { setResultF(e.target.value as BetResult | ''); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}><option value="">Todos</option><option value="won">Ganhou</option><option value="lost">Perdeu</option><option value="pending">Pendente</option><option value="void">Void</option><option value="cashout">Cashout</option></select> },
              { label: 'Tipo', node: <select style={inputStyle} value={betTypeF} onChange={e => { setBetTypeF(e.target.value as BetType | ''); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}><option value="">Todos</option><option value="simple">Simples</option><option value="combined">Combinada</option></select> },
              { label: 'Esporte', node: <select style={inputStyle} value={sportIdF} onChange={e => { setSportIdF(e.target.value ? Number(e.target.value) : ''); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}><option value="">Todos</option>{sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select> },
              { label: 'Casa', node: <select style={inputStyle} value={bookmakerF} onChange={e => { setBookmakerF(e.target.value ? Number(e.target.value) : ''); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}><option value="">Todas</option>{bookmakers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select> },
              { label: 'Perfil', node: <select style={inputStyle} value={profileF} onChange={e => { setProfileF(e.target.value ? Number(e.target.value) : ''); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}><option value="">Todos</option>{profiles.filter((p: any) => p.active).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select> },
              { label: 'Odd mín.', node: <input type="number" step="0.01" min="1" placeholder="1.50" style={inputStyle} value={oddsMinF} onChange={e => { setOddsMinF(e.target.value); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} /> },
              { label: 'Odd máx.', node: <input type="number" step="0.01" min="1" placeholder="3.00" style={inputStyle} value={oddsMaxF} onChange={e => { setOddsMaxF(e.target.value); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} /> },
              { label: 'De', node: <input type="date" style={inputStyle} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} /> },
              { label: 'Até', node: <input type="date" style={inputStyle} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} onFocus={e => e.currentTarget.style.borderColor = accentColor} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} /> },
            ].map(({ label, node }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 140px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
                {node}
              </div>
            ))}
            {hasFilters && (
              <button onClick={resetFilters} style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', alignSelf: 'flex-end' }}>✕ Limpar</button>
            )}
          </div>
        </div>
      )}

      {/* ── Tabela: thead gerado por mês (seleção escoped) ─────────────── */}
      {(() => {
        function makeThead(monthIds: number[]) {
          const allSel  = monthIds.length > 0 && monthIds.every(id => selectedIds.has(id))
          const someSel = monthIds.some(id => selectedIds.has(id))
          function toggle() {
            if (allSel) {
              setSelectedIds(prev => { const next = new Set(prev); monthIds.forEach(id => next.delete(id)); return next })
            } else {
              setSelectedIds(prev => { const next = new Set(prev); monthIds.forEach(id => next.add(id)); return next })
            }
          }
          return (
            <thead>
              <tr>
                <th style={{ ...thBase, width: 36, paddingRight: 4 }} onClick={toggle}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, cursor: 'pointer',
                    border: `2px solid ${allSel ? '#7c3aed' : someSel ? '#7c3aed' : 'rgba(255,255,255,0.2)'}`,
                    background: allSel ? '#7c3aed' : someSel ? 'rgba(124,58,237,0.3)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                  }}>
                    {allSel  && <span style={{ color: '#fff',    fontSize: 9,  fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    {!allSel && someSel && <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>—</span>}
                  </div>
                </th>
                <th style={thSortable} onClick={() => handleSort('date')}>Data <SortIcon active={sortKey === 'date'} dir={sortDir} /></th>
                <th style={{ ...thSortable, minWidth: 200 }} onClick={() => handleSort('description')}>Descrição <SortIcon active={sortKey === 'description'} dir={sortDir} /></th>
                <th style={thBase}>Esporte</th>
                <th style={thBase}>Casa</th>
                <th style={{ ...thSortable, textAlign: 'right' }} onClick={() => handleSort('odds')}>Odd <SortIcon active={sortKey === 'odds'} dir={sortDir} /></th>
                <th style={{ ...thSortable, textAlign: 'right' }} onClick={() => handleSort('amountWagered')}>Apostado <SortIcon active={sortKey === 'amountWagered'} dir={sortDir} /></th>
                <th style={{ ...thSortable, textAlign: 'right' }} onClick={() => handleSort('payout')}>Retorno <SortIcon active={sortKey === 'payout'} dir={sortDir} /></th>
                <th style={thSortable} onClick={() => handleSort('result')}>Resultado <SortIcon active={sortKey === 'result'} dir={sortDir} /></th>
                <th style={{ ...thSortable, textAlign: 'right' }} onClick={() => handleSort('profit')}>Lucro <SortIcon active={sortKey === 'profit'} dir={sortDir} /></th>
                <th style={{ ...thBase, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
          )
        }

        // ── MODO AGRUPADO POR MÊS ──────────────────────────────────────────
        if (viewMode === 'grouped') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {isLoading && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                      {makeThead([])}
                      <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {isError && (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>Erro ao carregar.</div>
              )}
              {!isLoading && !isError && sorted.length === 0 && (
                hasFilters ? (
                  <EmptyState
                    icon="search"
                    title="Nenhuma aposta encontrada"
                    description="Tente ajustar os filtros ou limpar a busca."
                  />
                ) : (
                  <EmptyState
                    icon="target"
                    title="Nenhuma aposta ainda"
                    description="Registre sua primeira aposta para começar a acompanhar seus resultados."
                  />
                )
              )}
              {!isLoading && monthGroups && monthGroups.map(([key, monthBets]) => {
                const stats     = calcMonthStats(monthBets)
                const collapsed = collapsedMonths.has(key)
                const profitPos = stats.profit >= 0
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    {/* Month header */}
                    <button
                      onClick={() => toggleMonth(key)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 18px', background: 'rgba(124,58,237,0.06)',
                        border: '1px solid rgba(124,58,237,0.2)', borderRadius: collapsed ? 12 : '12px 12px 0 0',
                        cursor: 'pointer', transition: 'all 0.15s', gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.10)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)' }}
                    >
                      {/* Left: chevron + month name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, color: '#a78bfa', transition: 'transform 0.2s', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{monthLabel(key)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{stats.total} aposta{stats.total !== 1 ? 's' : ''}</span>
                      </div>
                      {/* Right: mini stats */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {!isMobile && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>{stats.won}G</span>
                            {' · '}
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>{stats.lost}P</span>
                            {stats.cashout > 0 && <>{' · '}<span style={{ color: '#3b82f6', fontWeight: 700 }}>{stats.cashout}C</span></>}
                            {stats.hitRate != null && <span style={{ color: '#a78bfa', fontWeight: 600, marginLeft: 6 }}>{stats.hitRate.toFixed(0)}%</span>}
                          </span>
                        )}
                        {isMobile && stats.hitRate != null && (
                          <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>{stats.hitRate.toFixed(0)}%</span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 800, color: profitPos ? '#22c55e' : '#ef4444', fontFamily: 'monospace', textAlign: 'right' }}>
                          {profitPos ? '+' : ''}{fmtMoney(stats.profit)}
                        </span>
                      </div>
                    </button>

                    {/* Month rows */}
                    {!collapsed && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(124,58,237,0.15)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                            {makeThead(monthBets.map((b: Bet) => b.id))}
                            <tbody>
                              {monthBets.map((bet: Bet, i: number) => (
                                <BetRow key={bet.id} bet={bet} odd={i % 2 === 1} selected={selectedIds.has(bet.id)} onToggle={toggleOne} onEdit={setEditingBet} onDelete={setDeletingBet} onShare={handleShare} onUpdateResult={handleUpdateResult} onDuplicate={handleDuplicate} isMobile={isMobile} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }

        // ── MODO PAGINADO (original) ───────────────────────────────────────
        return (
        <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                  {makeThead(allIdsOnPage)}
                  <tbody>
                    {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                    {isError && (
                      <tr><td colSpan={11} style={{ padding: '48px 20px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>Erro ao carregar. Verifique se o backend esta rodando.</td></tr>
                    )}
                    {!isLoading && !isError && sorted.length === 0 && (
                      hasFilters
                        ? <EmptyStateRow colSpan={11} icon="search" title="Nenhuma aposta encontrada" description="Tente ajustar os filtros ou limpar a busca." />
                        : <EmptyStateRow colSpan={11} icon="target" title="Nenhuma aposta ainda" description="Registre sua primeira aposta para começar a acompanhar seus resultados." />
                    )}
                    {!isLoading && sorted.map((bet: Bet, i: number) => (
                      <BetRow key={bet.id} bet={bet} odd={i % 2 === 1} selected={selectedIds.has(bet.id)} onToggle={toggleOne} onEdit={setEditingBet} onDelete={setDeletingBet} onShare={handleShare} onUpdateResult={handleUpdateResult} onDuplicate={handleDuplicate} isMobile={isMobile} />
                    ))}
                  </tbody>
                  {summary && !isLoading && sorted.length > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border-purple)' }}>
                        <td colSpan={5} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(9,9,15,0.5)' }}>
                          Totais ({summary.totalBets} apostas)
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(9,9,15,0.5)' }}>-</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', background: 'rgba(9,9,15,0.5)', whiteSpace: 'nowrap' }}>{fmtMoney(summary.totalWagered)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(9,9,15,0.5)' }}>-</td>
                        <td style={{ padding: '10px 14px', background: 'rgba(9,9,15,0.5)' }}>
                          {summary.hitRatePct != null && <span style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>{summary.hitRatePct.toFixed(1)}% acerto</span>}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', background: 'rgba(9,9,15,0.5)', color: summary.totalProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                          {summary.totalProfit >= 0 ? '+' : ''}{fmtMoney(summary.totalProfit)}
                        </td>
                        <td style={{ background: 'rgba(9,9,15,0.5)' }} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Paginacao */}
            {pagination && totalPages > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Linhas por pagina:</span>
                  <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }} style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }}>
                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>
                    {(page - 1) * perPage + 1}-{Math.min(page * perPage, pagination.total)} de {pagination.total}
                  </span>
                  <PagBtn label="first" disabled={page === 1} onClick={() => setPage(1)} />
                  <PagBtn label="prev" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                    return <PagBtn key={p} label={String(p)} active={p === page} onClick={() => setPage(p)} />
                  })}
                  <PagBtn label="next" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
                  <PagBtn label="last" disabled={page === totalPages} onClick={() => setPage(totalPages)} />
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}

// Page

export default function Spreadsheet() {
  const isMobile = useMobile()
  const { data: tipsters = [], isLoading: loadingTipsters } = useTipsters()
  const [activeTab, setActiveTab] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const tabs = [
    { id: null, label: 'Todas as apostas', color: '#8b5cf6' },
    ...tipsters.filter(t => t.active).map((t, i) => ({ id: t.id, label: t.name, color: PROFILE_COLORS[i % PROFILE_COLORS.length] })),
  ]

  const activeColor = tabs.find(t => t.id === activeTab)?.color ?? '#8b5cf6'

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 40px 60px', maxWidth: 1300, margin: '0 auto', color: 'var(--text-primary)', position: 'relative', zIndex: 1 }} className="space-y-8 anim-fade-in">

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showReport && <MonthlyReportModal onClose={() => setShowReport(false)} />}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>
            Planilha de Apostas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Filtre por tipster / VIP nas abas abaixo
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          <button
            onClick={() => setShowReport(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))',
              border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.6)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'; e.currentTarget.style.color = '#4ade80' }}
          >
            📄 Relatório Mensal
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.15))',
              border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(99,102,241,0.25))'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.15))'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.color = '#c4b5fd' }}
          >
            <Icon name="download" size={14} style={{ marginRight: 6 }} /> Importar planilha
          </button>
        </div>
      </div>

      <Section label="Tipsters / VIPs" icon="o">
        <div style={{
          display: 'flex', gap: 8, flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          borderBottom: '1px solid var(--border)', paddingBottom: 0,
          WebkitOverflowScrolling: 'touch' as any,
        }}>
          {loadingTipsters
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ width: 120, height: 40, borderRadius: '8px 8px 0 0', background: 'linear-gradient(90deg, #1a1a2e 25%, #23233a 50%, #1a1a2e 75%)', backgroundSize: '200% auto', animation: 'shimmer 1.5s linear infinite' }} />
              ))
            : tabs.map(tab => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    key={String(tab.id)}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '10px 20px', fontSize: 13, fontWeight: 700,
                      borderRadius: '8px 8px 0 0', cursor: 'pointer',
                      transition: 'all 0.15s', border: 'none', outline: 'none',
                      position: 'relative', marginBottom: -1,
                      background: isActive ? 'var(--bg-card)' : 'transparent',
                      color: isActive ? tab.color : 'var(--text-muted)',
                      borderTop: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                      borderLeft: isActive ? `1px solid var(--border)` : '1px solid transparent',
                      borderRight: isActive ? `1px solid var(--border)` : '1px solid transparent',
                      borderBottom: isActive ? '1px solid var(--bg-card)' : '1px solid transparent',
                      boxShadow: isActive ? `0 -4px 12px ${tab.color}20` : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = tab.color; e.currentTarget.style.background = `${tab.color}10` } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' } }}
                  >
                    {tab.id === null
                      ? <span>{tab.label}</span>
                      : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: tab.color, flexShrink: 0, boxShadow: isActive ? `0 0 6px ${tab.color}` : 'none' }} />
                          {tab.label}
                        </span>
                      )
                    }
                  </button>
                )
              })
          }
        </div>

        <div style={{ paddingTop: 4 }}>
          <BetTable key={String(activeTab)} tipsterId={activeTab} accentColor={activeColor} isMobile={isMobile} />
        </div>
      </Section>
    </div>
  )
}
