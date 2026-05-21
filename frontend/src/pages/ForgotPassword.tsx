import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import SnakeLogo from '../components/SnakeLogo'

const API = import.meta.env.VITE_API_URL || ''

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post(`${API}/api/auth/forgot-password`, { email })
      setSent(true)
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Email enviado!</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Se o email existir na nossa base, você receberá um link para redefinir sua senha. Verifique também a caixa de spam.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Esqueceu a senha?</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                Digite seu email e enviaremos um link de redefinição.
              </p>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email" value={email} autoFocus required
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
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
                  {loading ? 'Enviando…' : 'Enviar link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--purple-400)', fontWeight: 600, textDecoration: 'none' }}>
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
