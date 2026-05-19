import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import SnakeLogo from '../components/SnakeLogo'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function VerifyEmail() {
  const [params]  = useSearchParams()
  const token     = params.get('token')
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('Token não encontrado.'); return }
    axios.get(`${API}/auth/verify-email?token=${token}`)
      .then(r  => { setStatus('ok');    setMsg(r.data.message) })
      .catch(e => { setStatus('error'); setMsg(e?.response?.data?.error ?? 'Erro ao verificar.') })
  }, [token])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
          <SnakeLogo size={32} />
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>BetManager</span>
        </div>

        {status === 'loading' && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Verificando…</p>
        )}

        {status === 'ok' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Email confirmado!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{msg}</p>
            <Link to="/login" style={{
              display: 'inline-block', padding: '11px 28px', borderRadius: 10,
              background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
              color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}>Entrar agora →</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Link inválido</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{msg}</p>
            <Link to="/login" style={{ color: 'var(--purple-400)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
              Voltar ao login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
