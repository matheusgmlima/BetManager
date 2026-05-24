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
      .catch(() => setError('Link invalido ou expirado.'))
  }, [token])

  const date = bet ? new Date(bet.date).toLocaleDateString('pt-BR') : ''

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #08050f 0%, #0d0a1a 50%, #060410 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 999, padding: '5px 16px', marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              compartilhado via
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.03em', lineHeight: 1 }}>
            BetManager
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 14, padding: '28px 24px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 32 }}>🔗</p>
            <p style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 700, color: '#ef4444' }}>Link invalido</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Este link expirou ou nao existe.</p>
          </div>
        )}

        {/* Loading */}
        {!bet && !error && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid rgba(124,58,237,0.25)',
              borderTopColor: '#7c3aed',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
          </div>
        )}

        {/* Bet card */}
        {bet && (
          <div style={{
            background: 'rgba(15,12,30,0.95)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 20px 40px rgba(0,0,0,0.5)',
          }}>
            {/* accent bar */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a78bfa)' }} />

            {/* Header */}
            <div style={{ padding: '20px 22px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#5b4b8a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {date} · {bet.betType === 'simple' ? 'Simples' : 'Combinada'}
                  </p>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.35, wordBreak: 'break-word' }}>
                    {bet.match || bet.market}
                  </p>
                  {bet.match && (
                    <p style={{ margin: '5px 0 0', fontSize: 12, color: '#5b4b8a' }}>{bet.market}</p>
                  )}
                </div>
                <span style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                  background: RESULT_COLOR[bet.result] + '18',
                  color: RESULT_COLOR[bet.result],
                  border: '1px solid ' + RESULT_COLOR[bet.result] + '33',
                  fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                }}>
                  {RESULT_LABEL[bet.result]}
                </span>
              </div>

              {bet.odds && (
                <div style={{
                  marginTop: 16, padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#5b4b8a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Odd</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.02em' }}>
                    @ {parseFloat(bet.odds).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 22px' }} />

            {/* Details */}
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bet.sport && (
                <Row label="Esporte" value={(bet.sport.icon || '') + ' ' + bet.sport.name} />
              )}
              <Row label="Casa" value={bet.bookmaker.name} dot={bet.bookmaker.color} />
              {bet.tipster && <Row label="Tipster" value={bet.tipster.name} />}
              {bet.profile && <Row label="Perfil" value={bet.profile.name} />}
              {bet.notes && (
                <div style={{
                  marginTop: 4, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 13, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.6,
                }}>
                  "{bet.notes}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#3d3550', lineHeight: 1.6 }}>
            Gerencie suas apostas com dados reais e analises profissionais.
          </p>
          <a
            href={window.location.origin}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 24px', borderRadius: 999,
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.3)',
              color: '#a78bfa', fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Usar BetManager
          </a>
        </div>

      </div>
    </div>
  )
}

function Row({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#4b4469', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right' }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />}
        {value}
      </span>
    </div>
  )
}
