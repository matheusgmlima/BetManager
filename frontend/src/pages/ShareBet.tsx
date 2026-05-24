import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'

const RESULT_LABEL: Record<string, string> = {
  won: 'Ganhou ✓', lost: 'Perdeu ✗', void: 'Void', pending: 'Pendente',
}
const RESULT_COLOR: Record<string, string> = {
  won: '#22c55e', lost: '#ef4444', void: '#6b7280', pending: '#eab308',
}

export default function ShareBet() {
  const { token } = useParams<{ token: string }>()
  const [bet, setBet] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/share/${token}`)
      .then(r => setBet(r.data.data))
      .catch(() => setError('Link inválido ou expirado.'))
  }, [token])

  const date = bet ? new Date(bet.date).toLocaleDateString('pt-BR') : ''

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a14', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>compartilhado via</p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.02em' }}>
            BetManager
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: 24, textAlign: 'center', color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        {bet && (
          <div style={{
            background: '#0f0f1e', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 0 40px rgba(124,58,237,0.15)',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {date} · {bet.betType === 'simple' ? 'Simples' : 'Combinada'}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3 }}>
                  {bet.match || bet.market}
                </p>
                {bet.match && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{bet.market}</p>
                )}
              </div>
              <span style={{
                padding: '6px 14px', borderRadius: 999,
                background: RESULT_COLOR[bet.result] + '22',
                color: RESULT_COLOR[bet.result],
                border: `1px solid ${RESULT_COLOR[bet.result]}44`,
                fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12,
              }}>
                {RESULT_LABEL[bet.result]}
              </span>
            </div>

            {/* Details */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bet.odds && (
                <Row label="Odd" value={`@ ${parseFloat(bet.odds).toFixed(2)}`} highlight />
              )}
              {bet.sport && (
                <Row label="Esporte" value={`${bet.sport.icon ?? ''} ${bet.sport.name}`} />
              )}
              <Row
                label="Casa"
                value={bet.bookmaker.name}
                dot={bet.bookmaker.color}
              />
              {bet.tipster && <Row label="Tipster" value={bet.tipster.name} />}
              {bet.profile && <Row label="Perfil" value={bet.profile.name} />}
              {bet.notes && (
                <div style={{
                  marginTop: 4, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                  fontSize: 13, color: '#9ca3af', fontStyle: 'italic',
                }}>
                  "{bet.notes}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight = false, dot }: {
  label: string; value: string; highlight?: boolean; dot?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: highlight ? 18 : 13,
        fontWeight: highlight ? 900 : 600,
        color: highlight ? '#a78bfa' : '#e2e8f0',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />}
        {value}
      </span>
    </div>
  )
}
