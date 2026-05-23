import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth, UserRole } from '../contexts/AuthContext'

const API = import.meta.env.VITE_API_URL || '/api'

type AdminUser = {
  id: number
  username: string
  email: string
  role: UserRole
  emailVerified: boolean
  unitValue: number
  accessExpiresAt: string | null
  mustChangePassword: boolean
  createdAt: string
  stats: {
    totalBets: number
    wonBets: number
    settledBets: number
    netProfit: number
    totalWagered: number
    bankrollBalance: number
    lastBetDate: string | null
    aiCount: number
  }
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin', permanent: 'Perma', partner: 'Partner', subscriber: 'Sub',
}
const ROLE_COLOR: Record<UserRole, string> = {
  admin: 'var(--purple-400)', permanent: '#f59e0b', partner: '#38bdf8', subscriber: 'var(--text-muted)',
}
const ROLES: UserRole[] = ['admin', 'permanent', 'partner', 'subscriber']

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLOR[role]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${c}18`, border: `1px solid ${c}40`, color: c, letterSpacing: '0.05em' }}>
      {ROLE_LABEL[role]}
    </span>
  )
}

function StatusDot({ role, expiresAt }: { role: UserRole; expiresAt: string | null }) {
  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'
  const d = daysLeft(expiresAt)
  const color = isLifetime || d === null || d > 7 ? 'var(--green)' : d > 0 ? '#f59e0b' : 'var(--red)'
  const label = isLifetime ? 'Vitalicio' : d === null ? '-' : d <= 0 ? 'Expirado' : `${d}d`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  )
}

function Avatar({ username, size = 32 }: { username: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'var(--purple-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#fff' }}>
      {username[0].toUpperCase()}
    </div>
  )
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: wide ? 560 : 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: { value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <input type={type} value={value} placeholder={placeholder} disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: disabled ? 'var(--bg-primary)' : 'var(--bg-card)', border: '1px solid var(--border)', color: disabled ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text' }}
      onFocus={e => !disabled && (e.target.style.borderColor = 'var(--purple-500)')}
      onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
    />
  )
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
      {children}
    </select>
  )
}

function Btn({ onClick, variant = 'primary', disabled, full, children }: { onClick?: () => void; variant?: 'primary' | 'danger' | 'ghost'; disabled?: boolean; full?: boolean; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    primary: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
    danger:  'var(--red-muted)',
    ghost:   'var(--bg-card)',
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '9px 18px', borderRadius: 8, border: variant === 'danger' ? '1px solid var(--red)' : '1px solid var(--border)', background: styles[variant], color: variant === 'danger' ? 'var(--red)' : variant === 'ghost' ? 'var(--text-secondary)' : '#fff', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, width: full ? '100%' : undefined }}>
      {children}
    </button>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: () => void }) {
  const [role, setRole]           = useState<string>(user.role)
  const [expiry, setExpiry]       = useState(user.accessExpiresAt ? user.accessExpiresAt.split('T')[0] : '')
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [resetSent, setResetSent] = useState(false)
  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'

  const save = async () => {
    setLoading(true); setErr('')
    try {
      await axios.patch(`${API}/admin/users/${user.id}`, { role, accessExpiresAt: isLifetime ? null : (expiry || null) })
      onSave(); onClose()
    } catch (e: any) { setErr(e?.response?.data?.error ?? 'Erro ao salvar') }
    finally { setLoading(false) }
  }

  const sendReset = async () => {
    setLoading(true); setErr('')
    try { await axios.post(`${API}/admin/users/${user.id}/send-reset`); setResetSent(true) }
    catch (e: any) { setErr(e?.response?.data?.error ?? 'Erro ao enviar reset') }
    finally { setLoading(false) }
  }

  return (
    <Modal title={`Editar - ${user.username}`} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="Username"><Input value={user.username} disabled /></Field>
        <Field label="Email"><Input value={user.email} disabled /></Field>
        <Field label="Role">
          <SelectField value={role} onChange={setRole}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </SelectField>
        </Field>
        {!isLifetime ? (
          <Field label="Acesso ate"><Input type="date" value={expiry} onChange={setExpiry} /></Field>
        ) : (
          <Field label="Acesso"><Input value="Vitalicio" disabled /></Field>
        )}
        <Field label="Membro desde"><Input value={new Date(user.createdAt).toLocaleDateString('pt-BR')} disabled /></Field>
        <Field label="Email">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36 }}>
            {user.emailVerified
              ? <span style={{ fontSize: 12, color: 'var(--green)' }}>Verificado</span>
              : <span style={{ fontSize: 12, color: '#f59e0b' }}>Nao verificado</span>
            }
          </div>
        </Field>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Resumo de atividade</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Apostas',       value: String(user.stats.totalBets) },
            { label: 'Ganhas',        value: String(user.stats.wonBets) },
            { label: 'Total apostado',value: `R$ ${fmt(user.stats.totalWagered)}` },
            { label: 'Lucro liquido', value: `R$ ${fmt(user.stats.netProfit)}`, color: user.stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Saldo banca',   value: `R$ ${fmt(user.stats.bankrollBalance)}` },
            { label: 'Apostas IA',    value: String(user.stats.aiCount) },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: s.color ?? 'var(--text-primary)', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {err && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{err}</p>}
      {resetSent && <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 12 }}>Email de reducao enviado para {user.email}</p>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
        <Btn variant="ghost" onClick={sendReset} disabled={loading || resetSent}>
          {resetSent ? 'Email enviado' : 'Enviar reset por email'}
        </Btn>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState<string>('subscriber')
  const [expiry, setExpiry]   = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [created, setCreated] = useState<{ email: string } | null>(null)
  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'

  const create = async () => {
    setLoading(true); setErr('')
    try {
      const { data } = await axios.post(`${API}/admin/users`, { email, role, accessExpiresAt: isLifetime ? undefined : (expiry || undefined) })
      setCreated({ email: data.email }); onSave()
    } catch (e: any) { setErr(e?.response?.data?.error ?? 'Erro ao criar') }
    finally { setLoading(false) }
  }

  if (created) return (
    <Modal title="Usuario criado!" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>email</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Email enviado!</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Um email com as credenciais de acesso foi enviado para<br />
          <strong style={{ color: 'var(--text-primary)' }}>{created.email}</strong>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No primeiro login, o usuario escolhera seu username e senha.</p>
      </div>
      <Btn full onClick={onClose}>Fechar</Btn>
    </Modal>
  )

  return (
    <Modal title="Criar usuario" onClose={onClose}>
      <Field label="Email"><Input type="email" value={email} onChange={setEmail} placeholder="usuario@email.com" /></Field>
      <Field label="Role">
        <SelectField value={role} onChange={setRole}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </SelectField>
      </Field>
      {!isLifetime && (
        <Field label="Acesso ate (opcional)"><Input type="date" value={expiry} onChange={setExpiry} /></Field>
      )}
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 12px' }}>
        O usuario recebera um email com as credenciais de acesso temporarias.
      </p>
      {err && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={create} disabled={loading || !email}>{loading ? 'Criando...' : 'Criar e enviar email'}</Btn>
      </div>
    </Modal>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: () => void }) {
  const [loading, setLoading] = useState(false)
  const del = async () => {
    setLoading(true)
    try { await axios.delete(`${API}/admin/users/${user.id}`); onSave(); onClose() }
    finally { setLoading(false) }
  }
  return (
    <Modal title="Deletar usuario" onClose={onClose}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
        Deletar <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong> e todos os seus dados? Acao irreversivel.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" onClick={del} disabled={loading}>{loading ? 'Deletando...' : 'Deletar'}</Btn>
      </div>
    </Modal>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--bg-card)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function StatCard({ label, value, sub, color = 'var(--text-primary)', icon }: { label: string; value: string | number; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

function DashboardTab({ users }: { users: AdminUser[] }) {
  const subs      = users.filter(u => u.role !== 'admin')
  const active    = subs.filter(u => {
    if (u.role === 'permanent' || u.role === 'partner') return true
    const d = daysLeft(u.accessExpiresAt)
    return d === null || d > 0
  })
  const expired   = subs.filter(u => {
    if (u.role === 'permanent' || u.role === 'partner') return false
    const d = daysLeft(u.accessExpiresAt)
    return d !== null && d <= 0
  })
  const expiring  = active.filter(u => {
    if (u.role === 'permanent' || u.role === 'partner') return false
    const d = daysLeft(u.accessExpiresAt)
    return d !== null && d <= 7
  })
  const partners  = users.filter(u => u.role === 'partner')
  const permanent = users.filter(u => u.role === 'permanent')

  const totalBets   = subs.reduce((s, u) => s + u.stats.totalBets, 0)
  const totalProfit = subs.reduce((s, u) => s + u.stats.netProfit, 0)
  const aiUses      = subs.reduce((s, u) => s + u.stats.aiCount, 0)
  const avgBets     = subs.length ? (totalBets / subs.length).toFixed(1) : '0'

  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)
  const newThisMonth = users.filter(u => new Date(u.createdAt) >= thisMonth).length

  const next30 = subs.filter(u => {
    if (u.role === 'permanent' || u.role === 'partner') return false
    const d = daysLeft(u.accessExpiresAt)
    return d !== null && d > 0 && d <= 30
  }).sort((a, b) => daysLeft(a.accessExpiresAt)! - daysLeft(b.accessExpiresAt)!)

  const topUsers = [...subs].sort((a, b) => b.stats.totalBets - a.stats.totalBets).slice(0, 5)
  const maxBets  = topUsers[0]?.stats.totalBets || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Assinantes ativos" value={active.length}   sub={`de ${subs.length} total`}        color="var(--green)"      icon="checkmark" />
        <StatCard label="Expirados"         value={expired.length}  sub="precisam renovar"                 color="var(--red)"        icon="lock" />
        <StatCard label="Parcerias"         value={partners.length} sub={`${permanent.length} vitalícios`} color="#38bdf8"           icon="handshake" />
        <StatCard label="Novos este mes"    value={newThisMonth}    sub="cadastros recentes"               color="var(--purple-400)" icon="new" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>Engajamento da plataforma</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Total de apostas',  value: totalBets.toLocaleString('pt-BR'),                                         color: 'var(--text-primary)' },
              { label: 'Media por usuario', value: avgBets + ' apostas',                                                      color: 'var(--text-primary)' },
              { label: 'Apostas via IA',    value: aiUses.toLocaleString('pt-BR'),                                            color: 'var(--purple-400)' },
              { label: 'Lucro agregado',    value: `${totalProfit >= 0 ? '+' : ''}R$ ${fmt(totalProfit)}`,                   color: totalProfit >= 0 ? 'var(--green)' : 'var(--red)' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>Distribuicao por role</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.filter(r => r !== 'admin').map(r => {
              const count = users.filter(u => u.role === r).length
              const color = ROLE_COLOR[r]
              return (
                <div key={r}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ROLE_LABEL[r]}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                  </div>
                  <MiniBar value={count} max={users.length || 1} color={color} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            Expiracoes nos proximos 30 dias
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            {expiring.length} expirando em 7 dias · {next30.length} no mes
          </p>
          {next30.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma expiracao proxima.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {next30.slice(0, 6).map(u => {
                const d = daysLeft(u.accessExpiresAt)!
                const c = d <= 3 ? 'var(--red)' : d <= 7 ? '#f59e0b' : 'var(--text-muted)'
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--purple-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.username}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{d}d</span>
                  </div>
                )
              })}
              {next30.length > 6 && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>+{next30.length - 6} mais...</p>}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Top usuarios por apostas</p>
          {topUsers.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem dados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topUsers.map((u, i) => (
                <div key={u.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 14, textAlign: 'right' }}>#{i + 1}</span>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--purple-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.username}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: u.stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)', minWidth: 70, textAlign: 'right' }}>
                        {u.stats.netProfit >= 0 ? '+' : ''}R${fmt(u.stats.netProfit)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>{u.stats.totalBets} ap.</span>
                    </div>
                  </div>
                  <MiniBar value={u.stats.totalBets} max={maxBets} color="var(--purple-500)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {partners.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 14, padding: '20px 22px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
            Parcerias ativas ({partners.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {partners.map(u => (
              <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{u.username}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{u.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.stats.totalBets} apostas</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: u.stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {u.stats.netProfit >= 0 ? '+' : ''}R${fmt(u.stats.netProfit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user: me } = useAuth()
  const [tab, setTab]               = useState<'dashboard' | 'users'>('dashboard')
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [editUser, setEditUser]     = useState<AdminUser | null>(null)
  const [delUser, setDelUser]       = useState<AdminUser | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await axios.get<AdminUser[]>(`${API}/admin/users`); setUsers(data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filterRole === 'all' || u.role === filterRole)
  })

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 400,
    background: active ? 'var(--bg-surface)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    cursor: 'pointer',
  })

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1200, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Painel Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Gerencie usuarios, roles e acessos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
            <button style={tabStyle(tab === 'dashboard')} onClick={() => setTab('dashboard')}>Dashboard</button>
            <button style={tabStyle(tab === 'users')}     onClick={() => setTab('users')}>Usuarios</button>
          </div>
          {tab === 'users' && (
            <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Criar usuario
            </button>
          )}
        </div>
      </div>

      {tab === 'dashboard' && (
        loading
          ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
          : <DashboardTab users={users} />
      )}

      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = 'var(--purple-500)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
            />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              <option value="all">Todas as roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 90px 90px 90px 90px 110px 90px', padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <span>Usuario</span><span>Email</span><span>Role</span><span>Status</span>
              <span>Apostas</span><span>Lucro</span><span>Saldo banca</span><span style={{ textAlign: 'right' }}>Acoes</span>
            </div>

            {loading && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum usuario encontrado.</div>}

            {!loading && filtered.map((u, i) => (
              <div key={u.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 90px 90px 90px 90px 110px 90px', padding: '13px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar username={u.username} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {u.username}
                      {u.id === me?.id && <span style={{ fontSize: 9, color: 'var(--purple-400)', fontWeight: 700 }}>EU</span>}
                      {!u.emailVerified && <span style={{ fontSize: 9, color: '#f59e0b' }}>email nao verificado</span>}
                      {u.mustChangePassword && <span style={{ fontSize: 9, color: 'var(--red)' }}>troca senha</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {u.stats.lastBetDate ? `Ultima aposta ${new Date(u.stats.lastBetDate).toLocaleDateString('pt-BR')}` : `Desde ${new Date(u.createdAt).toLocaleDateString('pt-BR')}`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                <div><RoleBadge role={u.role} /></div>
                <div><StatusDot role={u.role} expiresAt={u.accessExpiresAt} /></div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.stats.totalBets} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({u.stats.wonBets}G)</span></span>
                <span style={{ fontSize: 12, fontWeight: 600, color: u.stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {u.stats.netProfit >= 0 ? '+' : ''}R${fmt(u.stats.netProfit)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>R${fmt(u.stats.bankrollBalance)}</span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditUser(u)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--purple-400)'; el.style.color = 'var(--purple-400)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-secondary)' }}
                  >Editar</button>
                  {u.id !== me?.id && (
                    <button onClick={() => setDelUser(u)}
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--red)'; el.style.color = 'var(--red)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-muted)' }}
                    >x</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {editUser   && <EditModal   user={editUser} onClose={() => setEditUser(null)} onSave={load} />}
          {delUser    && <DeleteModal user={delUser}  onClose={() => setDelUser(null)}  onSave={load} />}
          {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={load} />}
        </>
      )}
    </div>
  )
}
