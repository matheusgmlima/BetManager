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
  const label = isLifetime ? 'Vitalício' : d === null ? '—' : d <= 0 ? 'Expirado' : `${d}d`
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

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: wide ? 560 : 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>✕</button>
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div onClick={() => onChange(!checked)} style={{ width: 36, height: 20, borderRadius: 10, background: checked ? 'var(--purple-500)' : 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.15s' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: checked ? 18 : 2, transition: 'left 0.15s' }} />
      </div>
    </div>
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
  const [emailVerified, setEmailVerified]         = useState(user.emailVerified)
  const [mustChangePwd, setMustChangePwd]         = useState(user.mustChangePassword)
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [tempPass, setTempPass]   = useState('')

  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'

  const save = async () => {
    setLoading(true); setErr('')
    try {
      await axios.patch(`${API}/admin/users/${user.id}`, {
        role,
        accessExpiresAt: isLifetime ? null : (expiry || null),
        emailVerified,
        mustChangePassword: mustChangePwd,
      })
      onSave(); onClose()
    } catch (e: any) { setErr(e?.response?.data?.error ?? 'Erro ao salvar') }
    finally { setLoading(false) }
  }

  const resetPwd = async () => {
    setLoading(true); setErr('')
    try {
      const { data } = await axios.post(`${API}/admin/users/${user.id}/reset-password`)
      setTempPass(data.tempPassword)
    } catch (e: any) { setErr(e?.response?.data?.error ?? 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <Modal title={`Editar — ${user.username}`} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <Field label="Username"><Input value={user.username} disabled /></Field>
        <Field label="Email"><Input value={user.email} disabled /></Field>
        <Field label="Role">
          <SelectField value={role} onChange={setRole}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </SelectField>
        </Field>
        {!isLifetime && (
          <Field label="Acesso até">
            <Input type="date" value={expiry} onChange={setExpiry} />
          </Field>
        )}
        {isLifetime && (
          <Field label="Acesso">
            <Input value="Vitalício" disabled />
          </Field>
        )}
        <Field label="Membro desde">
          <Input value={new Date(user.createdAt).toLocaleDateString('pt-BR')} disabled />
        </Field>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 12px' }}>
        <Toggle checked={emailVerified} onChange={setEmailVerified} label="Email verificado" />
        <Toggle checked={mustChangePwd} onChange={setMustChangePwd} label="Forçar troca de senha no próximo login" />
      </div>

      {/* Stats read-only */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Resumo de atividade</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Apostas', value: String(user.stats.totalBets) },
            { label: 'Ganhas', value: String(user.stats.wonBets) },
            { label: 'Total apostado', value: `R$ ${fmt(user.stats.totalWagered)}` },
            { label: 'Lucro líquido', value: `R$ ${fmt(user.stats.netProfit)}`, color: user.stats.netProfit >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Saldo banca', value: `R$ ${fmt(user.stats.bankrollBalance)}` },
            { label: 'Apostas IA', value: String(user.stats.aiCount) },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: s.color ?? 'var(--text-primary)', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {err && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{err}</p>}

      {tempPass && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, border: '1px solid #f59e0b40' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Senha temporária:</p>
          <code style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em' }}>{tempPass}</code>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Anote — não será exibida novamente.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
        <Btn variant="ghost" onClick={resetPwd} disabled={loading}>Resetar senha</Btn>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={loading}>{loading ? 'Salvando…' : 'Salvar'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [role, setRole]         = useState<string>('subscriber')
  const [expiry, setExpiry]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [created, setCreated]   = useState<{ username: string; tempPassword: string } | null>(null)
  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'

  const create = async () => {
    setLoading(true); setErr('')
    try {
      const { data } = await axios.post(`${API}/admin/users`, {
        username, email, role,
        accessExpiresAt: isLifetime ? undefined : (expiry || undefined),
      })
      setCreated({ username: data.username, tempPassword: data.tempPassword })
      onSave()
    } catch (e: any) { setErr(e?.response?.data?.error ?? 'Erro ao criar') }
    finally { setLoading(false) }
  }

  if (created) return (
    <Modal title="Usuário criado!" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Conta de <strong style={{ color: 'var(--text-primary)' }}>{created.username}</strong> criada.
        </p>
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px 20px', border: '1px solid #f59e0b40' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>SENHA TEMPORÁRIA</p>
          <code style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.12em' }}>{created.tempPassword}</code>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>O usuário deverá trocar no primeiro login.</p>
        </div>
      </div>
      <Btn full onClick={onClose}>Fechar</Btn>
    </Modal>
  )

  return (
    <Modal title="Criar usuário" onClose={onClose}>
      <Field label="Username"><Input value={username} onChange={setUsername} placeholder="joao123" /></Field>
      <Field label="Email"><Input type="email" value={email} onChange={setEmail} placeholder="joao@email.com" /></Field>
      <Field label="Role">
        <SelectField value={role} onChange={setRole}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </SelectField>
      </Field>
      {!isLifetime && <Field label="Acesso até (opcional)"><Input type="date" value={expiry} onChange={setExpiry} /></Field>}
      {err && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={create} disabled={loading || !username || !email}>{loading ? 'Criando…' : 'Criar'}</Btn>
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
    <Modal title="Deletar usuário" onClose={onClose}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
        Deletar <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong> e todos os seus dados? Ação irreversível.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" onClick={del} disabled={loading}>{loading ? 'Deletando…' : 'Deletar'}</Btn>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user: me } = useAuth()
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

  const stats = {
    total:    users.length,
    active:   users.filter(u => { const d = daysLeft(u.accessExpiresAt); return d === null || d > 0 }).length,
    expired:  users.filter(u => { const d = daysLeft(u.accessExpiresAt); return d !== null && d <= 0 }).length,
    revenue:  users.reduce((s, u) => s + u.stats.netProfit, 0),
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Painel Admin</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Gerencie usuários, roles e acessos</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <span style={{ fontSize: 16 }}>+</span> Criar usuário
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total usuários',  value: stats.total,   color: 'var(--text-primary)', prefix: '' },
          { label: 'Ativos',          value: stats.active,  color: 'var(--green)',         prefix: '' },
          { label: 'Expirados',       value: stats.expired, color: 'var(--red)',           prefix: '' },
          { label: 'Lucro agregado',  value: stats.revenue, color: stats.revenue >= 0 ? 'var(--green)' : 'var(--red)', prefix: 'R$ ' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.prefix}{typeof s.value === 'number' && s.prefix ? fmt(s.value) : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email…"
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

      {/* Table */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 90px 90px 90px 90px 110px 90px', padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          <span>Usuário</span><span>Email</span><span>Role</span><span>Status</span>
          <span>Apostas</span><span>Lucro</span><span>Saldo banca</span><span style={{ textAlign: 'right' }}>Ações</span>
        </div>

        {loading && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</div>}
        {!loading && filtered.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum usuário encontrado.</div>}

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
                  {!u.emailVerified && <span style={{ fontSize: 9, color: '#f59e0b' }}>✕ email</span>}
                  {u.mustChangePassword && <span style={{ fontSize: 9, color: 'var(--red)' }}>troca senha</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {u.stats.lastBetDate ? `Última aposta ${new Date(u.stats.lastBetDate).toLocaleDateString('pt-BR')}` : `Desde ${new Date(u.createdAt).toLocaleDateString('pt-BR')}`}
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
                >✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editUser    && <EditModal   user={editUser} onClose={() => setEditUser(null)} onSave={load} />}
      {delUser     && <DeleteModal user={delUser}  onClose={() => setDelUser(null)}  onSave={load} />}
      {showCreate  && <CreateModal onClose={() => setShowCreate(false)} onSave={load} />}
    </div>
  )
}
