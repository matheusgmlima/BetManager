import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SnakeLogo from '../components/SnakeLogo'

export default function Register() {
  const { register } = useAuth()

  const [username,  setUsername]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [loading,   setLoading]   = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    if (password.length < 8)  { setError('A senha deve ter pelo menos 8 caracteres'); return }
    setLoading(true)
    try {
      const msg = await register(username, email, password)
      setSuccess(msg)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar conta.')
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

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
          <SnakeLogo size={32} />
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            BetManager
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '32px 28px',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Criar conta</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
            Sua banca, seus dados, tudo separado
          </p>

          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Verifique seu email
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{success}</p>
              <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: 'var(--purple-400)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                Ir para o login →
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Nome de usuário" type="text" value={username}
                onChange={setUsername} placeholder="apostador123" autoFocus />
              <Field label="Email" type="email" value={email}
                onChange={setEmail} placeholder="seu@email.com" />
              <Field label="Senha" type="password" value={password}
                onChange={setPassword} placeholder="Mínimo 8 caracteres" />
              <Field label="Confirmar senha" type="password" value={confirm}
                onChange={setConfirm} placeholder="Repita a senha" />

              {error && (
                <p style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-muted)', borderRadius: 8, padding: '10px 14px' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, marginTop: 4,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Criando conta…' : 'Criar conta'}
              </button>
            </form>
          )}
        </div>

        {!success && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--purple-400)', fontWeight: 600, textDecoration: 'none' }}>
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, autoFocus }: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type} value={value} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
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
  )
}
