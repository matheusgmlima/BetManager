import { useState, useRef, useCallback } from 'react'
import { useSports, useBookmakers } from '../hooks/useConfig'
import { useCreateBetsBatch } from '../hooks/useBets'
import { BetCreateInput, BetResult, BetType } from '../types/bet.types'
import { api } from '../services/api'
import { toast } from 'sonner'
import { Icon } from '../components/Icon'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'done'

interface AiExtractedBet {
  date: string | null
  match: string | null
  market: string | null
  bookmaker: string | null
  bookmakerId: number | null
  amountWagered: number | null
  odds: number | null
  payout: number | null
  result: BetResult | null
  confidence: 'high' | 'medium' | 'low'
  betType: 'simple' | 'combined'
}

interface AiExtractionResponse {
  extractionId: number
  modelUsed: string
  betsDetected: number
  bets: AiExtractedBet[]
  warnings: string[]
}

interface ParsedRow {
  _raw:          Record<string, any>
  _rowIndex:     number
  _errors:       string[]
  _valid:        boolean
  date:          string
  match:         string
  market:        string
  sportId:       number | undefined
  bookmakerId:   number | undefined
  bookmakerRaw:  string
  betType:       BetType
  odds:          number | undefined
  amountWagered: number
  payout:        number
  result:        BetResult
  notes:         string
  tipsterId:     number | undefined
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [step,          setStep]          = useState<Step>('upload')
  const [parsed,        setParsed]        = useState<ParsedRow[]>([])
  const [importing,     setImporting]     = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [dragOver,      setDragOver]      = useState(false)
  const [fileName,      setFileName]      = useState('')
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiError,       setAiError]       = useState('')
  const [aiWarnings,    setAiWarnings]    = useState<string[]>([])
  const [importError,   setImportError]   = useState('')
  const imageRef = useRef<HTMLInputElement>(null)

  useSports()
  const { data: bookmakers = [] } = useBookmakers()
  const createBatch               = useCreateBetsBatch()

  // ── AI: convert extracted bets to ParsedRow ─────────────────────────────────
  function aiExtractedToRows(bets: AiExtractedBet[]): ParsedRow[] {
    return bets.map((b, i) => {
      const errors: string[] = []
      if (!b.date || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) errors.push('Data invalida')
      if (!b.market) errors.push('Mercado obrigatorio')
      const amountWagered = b.amountWagered ?? 0
      if (!amountWagered || amountWagered <= 0) errors.push('Valor apostado invalido')
      if (!b.bookmakerId) errors.push('Casa nao encontrada')
      const result: BetResult = b.result ?? 'pending'
      const payout = b.payout
        ?? (result === 'won'  ? amountWagered * (b.odds ?? 1)
          : result === 'void' ? amountWagered
          : 0)
      return {
        _raw: b as any,
        _rowIndex: i + 1,
        _errors: errors,
        _valid: errors.length === 0,
        date: b.date ?? '',
        match: b.match ?? '',
        market: b.market ?? '',
        sportId: undefined,
        bookmakerId: b.bookmakerId ?? undefined,
        bookmakerRaw: b.bookmaker ?? '',
        betType: b.betType as BetType,
        odds: b.odds ?? undefined,
        amountWagered,
        payout,
        result,
        notes: '',
        tipsterId: undefined,
      }
    })
  }

  // ── Step 1: send image to AI ────────────────────────────────────────────────
  const processImage = useCallback(async (file: File) => {
    setAiError('')
    setAiWarnings([])
    setAiLoading(true)
    setFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<AiExtractionResponse>('/api/ai/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      const data = res.data
      if (data.warnings?.length) setAiWarnings(data.warnings)
      const rows = aiExtractedToRows(data.bets)
      setParsed(rows)
      setStep('preview')
    } catch (err: any) {
      setAiError(err?.response?.data?.detail ?? err?.message ?? 'Erro ao processar imagem.')
    } finally {
      setAiLoading(false)
    }
  }, [bookmakers]) // eslint-disable-line

  // ── Step 2: import ──────────────────────────────────────────────────────────
  async function doImport() {
    setImportError('')
    const valid = parsed.filter(r => r._valid && r.bookmakerId)
    setImporting(true)
    try {
      const bets: BetCreateInput[] = valid.map(r => ({
        date:          r.date,
        match:         r.match || undefined,
        market:        r.market,
        sportId:       r.sportId,
        bookmakerId:   r.bookmakerId!,
        betType:       r.betType,
        odds:          r.odds,
        amountWagered: r.amountWagered,
        payout:        r.payout,
        result:        r.result,
        notes:         r.notes || undefined,
        tipsterId:     r.tipsterId,
      }))
      let total = 0
      for (let i = 0; i < bets.length; i += 100) {
        const res = await createBatch.mutateAsync(bets.slice(i, i + 100))
        total += res.created
      }
      setImportedCount(total)
      toast.success(`${total} aposta${total !== 1 ? 's' : ''} importada${total !== 1 ? 's' : ''}!`)
      setStep('done')
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.error ?? err?.message ?? 'Erro ao importar.'
      setImportError(msg)
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const validCount   = parsed.filter(r => r._valid && r.bookmakerId).length
  const invalidCount = parsed.length - validCount

  // ─── Render ────────────────────────────────────────────────────────────────
  const STEPS: Step[] = ['upload', 'preview', 'done']
  const STEP_LABELS: Record<Step, string> = { upload: 'Foto', preview: 'Preview', done: 'Concluido' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: step === 'preview' ? 960 : 560,
        background: '#0a0a14', border: '1px solid rgba(124,58,237,0.35)',
        borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
        transition: 'max-width 0.3s ease',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Importar por Foto</h2>
            <div style={{ display: 'flex', gap: 4, marginTop: 10, alignItems: 'center' }}>
              {STEPS.map((s, i) => {
                const past = STEPS.indexOf(s) < STEPS.indexOf(step)
                const curr = s === step
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {i > 0 && <div style={{ width: 20, height: 1, background: past ? '#7c3aed' : 'var(--border)' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: curr ? 'var(--purple-600)' : past ? 'rgba(34,197,94,0.2)' : 'var(--border)',
                        color: curr ? '#fff' : past ? '#22c55e' : 'var(--text-muted)',
                        border: curr ? '1px solid #a78bfa' : '1px solid transparent',
                      }}>
                        {past ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: curr ? '#a78bfa' : past ? '#22c55e' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {STEP_LABELS[s]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>x</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processImage(f) }}
                onClick={() => !aiLoading && imageRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#0ea5e9' : 'rgba(14,165,233,0.35)'}`,
                  borderRadius: 16, padding: '52px 24px', textAlign: 'center',
                  cursor: aiLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  background: dragOver ? 'rgba(14,165,233,0.06)' : aiLoading ? 'rgba(14,165,233,0.03)' : 'rgba(14,165,233,0.01)',
                }}
              >
                {aiLoading ? (
                  <>
                    <div style={{ marginBottom: 14 }}><Icon name="sparkle" size={44} strokeWidth={1.2} /></div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>Analisando com IA...</p>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{fileName}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>Pode levar alguns segundos</p>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 14 }}><Icon name="camera" size={48} strokeWidth={1.2} /></div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Arraste um print aqui</p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>ou clique para selecionar</p>
                    <p style={{ margin: '14px 0 0', fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>JPG · PNG · WEBP</p>
                  </>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) processImage(e.target.files[0]) }} />

              {aiError && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                  x {aiError}
                </div>
              )}

              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.18)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Como funciona</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  Mande um print da sua casa de apostas (Bet365, Betano, Superbet...). A IA extrai data, mercado, odd, valor e resultado automaticamente. Voce revisa antes de importar.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                  ✓ {validCount} prontas
                </div>
                {invalidCount > 0 && (
                  <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                    x {invalidCount} com erro (puladas)
                  </div>
                )}
                <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', fontSize: 12, fontWeight: 600, color: '#38bdf8' }}>
                  ✨ Extraido por IA
                </div>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: 'rgba(9,9,15,0.9)', position: 'sticky', top: 0, zIndex: 1 }}>
                      {['#','Status','Data','Partida','Mercado','Casa','Odd','Apostado','Resultado'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => {
                      const ok = row._valid && !!row.bookmakerId
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: ok ? 'transparent' : 'rgba(239,68,68,0.04)' }}>
                          <td style={{ padding: '5px 10px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 10 }}>{row._rowIndex}</td>
                          <td style={{ padding: '5px 10px' }}>
                            {ok
                              ? <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 700 }}>✓</span>
                              : <span title={row._errors.join(' · ')} style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'help' }}>x {row._errors[0] ?? (!row.bookmakerId && row.bookmakerRaw ? 'Casa desconhecida' : 'erro')}</span>
                            }
                          </td>
                          <td style={{ padding: '5px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td style={{ padding: '5px 10px', color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.match || '-'}</td>
                          <td style={{ padding: '5px 10px', color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.market}</td>
                          <td style={{ padding: '5px 10px', color: row.bookmakerId ? '#a78bfa' : '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.bookmakerRaw || '-'}</td>
                          <td style={{ padding: '5px 10px', color: '#eab308', fontFamily: 'monospace' }}>{row.odds?.toFixed(2) ?? '-'}</td>
                          <td style={{ padding: '5px 10px', fontFamily: 'monospace', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>R$ {row.amountWagered.toFixed(2)}</td>
                          <td style={{ padding: '5px 10px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: row.result === 'won' ? '#22c55e' : row.result === 'lost' ? '#ef4444' : row.result === 'void' ? '#7070a0' : '#eab308' }}>
                              {row.result === 'won' ? 'Ganhou' : row.result === 'lost' ? 'Perdeu' : row.result === 'void' ? 'Void' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {aiWarnings.length > 0 && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.3)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#eab308' }}>Avisos da IA</p>
                  {aiWarnings.map((w, wi) => (
                    <p key={wi} style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{w}</p>
                  ))}
                </div>
              )}

              {importError && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                  x {importError}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: DONE ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ marginBottom: 16 }}><Icon name="checkCircle" size={52} color="#22c55e" strokeWidth={1.2} /></div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', margin: '0 0 8px' }}>{importedCount} apostas importadas!</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>As apostas ja aparecem na planilha.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={step === 'preview' ? () => setStep('upload') : onClose}
            style={{ padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {step === 'preview' ? 'Voltar' : 'Fechar'}
          </button>

          {step === 'preview' && validCount > 0 && (
            <button
              onClick={doImport}
              disabled={importing}
              style={{
                padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #166534, #16a34a)',
                cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {importing ? 'Importando...' : `Importar ${validCount} aposta${validCount !== 1 ? 's' : ''}`}
            </button>
          )}

          {step === 'preview' && validCount === 0 && (
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Nenhuma linha valida para importar</span>
          )}
        </div>
      </div>
    </div>
  )
}
