import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import SnakeLogo from '../components/SnakeLogo'

const API = import.meta.env.VITE_API_URL || ''

export default function ResetPassword() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const token       = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8)  { setError('Mínimo de 8 caracteres.'); return }
    setLoading(true)
    try {
      await axios.post(`${API}/api/auth/reset-password`, { token, password })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err: any) {
      const code = err?.response?.data?.errorCode
      if (code === 'TOKEN_EXPIRED') setError('Link expirado. Solicite um novo.')
      else if (code === 'INVALID_TOKEN') setError('Link inválido ou já utilizado.')
      else setError('Erro ao redefinir. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--red)', fontSize: 14 }}>Token ausente. <Link to="/esqueci-senha" style={{ color: 'var(--purple-400)' }}>Solicitar novo link</Link></p>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
          <SnakeLogo size={32} />
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            BetManager
          </span>
        </div>

        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '32px 28px',
        }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Senha redefinida!</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecionando para o login…</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Nova senha</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                Crie uma senha com pelo menos 8 caracteres.
              </p>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Nova senha',       value: password, set: setPassword },
                  { label: 'Confirmar senha',  value: confirm,  set: setConfirm  },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      {label}
                    </label>
                    <input
                      type="password" value={value} required
                      onChange={e => set(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'var(--purple-500)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                ))}

                {error && (
                  <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-muted)', borderRadius: 8, padding: '10px 14px' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1, marginTop: 4, transition: 'opacity 0.15s',
                  }}
                >
                  {loading ? 'Salvando…' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
